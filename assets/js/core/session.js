/* ============================================================
   HOMEOS // SESSION

   Keeps the signed-in user, household and role available across HomeOS.
   Household context is loaded from Supabase, not browser storage.
============================================================ */

(function createHomeOSSession() {
    "use strict";

    window.HomeOS = window.HomeOS || {};

    let state = emptyState();
    let loadPromise = null;

    // Build a clean session state.
    function emptyState() {
        return {
            status: "idle",
            ready: false,
            authenticated: false,
            user: null,
            household: null,
            membership: null,
            person: null,
            role: null,
            error: null
        };
    }

    // Return a safe copy so page code cannot mutate session state directly.
    function cloneState() {
        return {
            ...state,
            user: state.user ? { ...state.user } : null,
            household: state.household ? { ...state.household } : null,
            membership: state.membership ? { ...state.membership } : null,
            person: state.person ? { ...state.person } : null
        };
    }

    // Tell the rest of HomeOS when session context changes.
    function emit() {
        window.dispatchEvent(
            new CustomEvent("homeos:sessionchange", {
                detail: cloneState()
            })
        );
    }

    // Update part of the current session state.
    function setState(patch) {
        state = {
            ...state,
            ...patch
        };

        emit();
    }

    // Clear signed-in household context after sign-out or an empty session.
    function reset({ status = "ready" } = {}) {
        state = {
            ...emptyState(),
            status,
            ready: status === "ready"
        };

        emit();
    }

    // Return the shared Supabase client or fail clearly.
    function client() {
        const supabase = window.HomeOS.supabase;

        if (!supabase) {
            throw new Error("HomeOS Supabase client is not ready.");
        }

        return supabase;
    }

    // Combine Supabase Auth data with the HomeOS profile returned by the database.
    function normalizedUser(context, authUser) {
        const profileUser = context?.user || null;

        return {
            id: authUser?.id || profileUser?.id || null,
            email: authUser?.email || null,
            displayName:
                profileUser?.display_name ||
                authUser?.user_metadata?.display_name ||
                authUser?.email?.split("@")[0] ||
                "HomeOS User",
            avatarUrl: profileUser?.avatar_url || null
        };
    }

    // Normalize database session context into the shape used by the app.
    function normalizeContext(context, authUser) {
        const membership = context?.membership || null;

        return {
            status: "ready",
            ready: true,
            authenticated: true,
            user: normalizedUser(context, authUser),
            household: context?.household || null,
            membership,
            person: context?.person || null,
            role: membership?.role || null,
            error: null
        };
    }

    // Load the current auth session and household context from Supabase.
    async function performLoad() {
        setState({
            status: "loading",
            ready: false,
            error: null
        });

        const {
            session,
            error: sessionError
        } = await window.HomeOS.auth.getSession();

        if (sessionError) {
            setState({
                status: "error",
                ready: true,
                authenticated: false,
                error: sessionError
            });

            return cloneState();
        }

        if (!session?.user) {
            reset();
            return cloneState();
        }

        const authUser = session.user;

        const {
            data,
            error
        } = await client().rpc("homeos_get_session_context");

        if (error) {
            setState({
                status: "error",
                ready: true,
                authenticated: true,
                user: normalizedUser(null, authUser),
                household: null,
                membership: null,
                person: null,
                role: null,
                error
            });

            return cloneState();
        }

        state = normalizeContext(data, authUser);
        emit();

        return cloneState();
    }

    // Reuse an in-progress load unless a fresh read is requested.
    function load({ force = false } = {}) {
        if (loadPromise && !force) {
            return loadPromise;
        }

        loadPromise = performLoad().finally(() => {
            loadPromise = null;
        });

        return loadPromise;
    }

    // Force a fresh household context read from Supabase.
    function refresh() {
        return load({ force: true });
    }

    // Return the current in-memory session state.
    function getState() {
        return cloneState();
    }

    // Choose the correct page after authentication.
    function routeAfterAuthentication() {
        const routes = window.HomeOS.config.routes;

        if (!state.authenticated) {
            return routes.login;
        }

        if (
            !state.household?.id ||
            state.household.onboarding_status !== "complete"
        ) {
            return routes.onboarding;
        }

        return routes.home;
    }

    // Redirect through the shared auth URL helper.
    function redirect(file) {
        const destination = window.HomeOS.auth.pageUrl(file);

        if (window.location.href !== destination) {
            window.location.replace(destination);
        }
    }

    // Protect app pages that require a signed-in, completed household.
    async function guard({
        allowUnauthenticated = false,
        allowWithoutHousehold = false,
        allowIncompleteOnboarding = false
    } = {}) {
        const current = await load();

        if (!current.authenticated) {
            if (!allowUnauthenticated) {
                redirect(window.HomeOS.config.routes.login);
            }

            return current;
        }

        if (!current.household?.id) {
            if (!allowWithoutHousehold) {
                redirect(window.HomeOS.config.routes.onboarding);
            }

            return current;
        }

        if (
            current.household.onboarding_status !== "complete" &&
            !allowIncompleteOnboarding
        ) {
            redirect(window.HomeOS.config.routes.onboarding);
        }

        return current;
    }

    window.HomeOS.session = {
        load,
        refresh,
        guard,
        getState,
        routeAfterAuthentication
    };

    // Keep household context in sync when the Supabase auth state changes.
    window.HomeOS.auth.onAuthStateChange(({ event }) => {
        if (event === "SIGNED_OUT") {
            reset();
            return;
        }

        if (
            ["SIGNED_IN", "USER_UPDATED", "TOKEN_REFRESHED"].includes(event)
        ) {
            void refresh();
        }
    });
})();
