/* ============================================================
   HOMEOS // SESSION

   The signed-in user, household and role used across HomeOS.
============================================================ */

(function createHomeOSSession() {
    "use strict";
    window.HomeOS = window.HomeOS || {};
    let state = emptyState();
    let loadPromise = null;
    // --- State ---
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
    function cloneState() {
        return {
            ...state,
            user: state.user ? { ...state.user } : null,
            household: state.household ? { ...state.household } : null,
            membership: state.membership ? { ...state.membership } : null,
            person: state.person ? { ...state.person } : null
        };
    }
    function emit() {
        window.dispatchEvent(new CustomEvent("homeos:sessionchange", {
            detail: cloneState()
        }));
    }
    function setState(patch) {
        state = { ...state, ...patch };
        emit();
    }
    function reset({ status = "ready" } = {}) {
        state = {
            ...emptyState(),
            status,
            ready: status === "ready"
        };
        emit();
    }
    function client() {
        const supabase = window.HomeOS.supabase;
        if (!supabase) {
            throw new Error("HomeOS Supabase client is not ready.");
        }
        return supabase;
    }
    function normalizedUser(context, authUser) {
        const profileUser = context?.user || null;
        return {
            id: authUser?.id || profileUser?.id || null,
            email: authUser?.email || null,
            displayName: profileUser?.display_name ||
                authUser?.user_metadata?.display_name ||
                authUser?.email?.split("@")[0] ||
                "HomeOS User",
            avatarUrl: profileUser?.avatar_url || null
        };
    }
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
    // --- Load + Refresh ---
    async function performLoad() {
        setState({
            status: "loading",
            ready: false,
            error: null
        });
        const { session, error: sessionError } = await window.HomeOS.auth.getSession();
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
        const { data, error } = await client().rpc("homeos_get_session_context");
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
    function load({ force = false } = {}) {
        if (loadPromise && !force) {
            return loadPromise;
        }
        loadPromise = performLoad().finally(() => {
            loadPromise = null;
        });
        return loadPromise;
    }
    function refresh() {
        return load({ force: true });
    }
    function getState() {
        return cloneState();
    }
    // --- Routing + Page Guard ---
    function routeAfterAuthentication() {
        const routes = window.HomeOS.config.routes;
        if (!state.authenticated) {
            return routes.login;
        }
        if (!state.household?.id ||
            state.household.onboarding_status !== "complete") {
            return routes.onboarding;
        }
        return routes.home;
    }
    function redirect(file) {
        const destination = window.HomeOS.auth.pageUrl(file);
        if (window.location.href !== destination) {
            window.location.replace(destination);
        }
    }
    async function guard({ allowUnauthenticated = false, allowWithoutHousehold = false, allowIncompleteOnboarding = false } = {}) {
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
        if (current.household.onboarding_status !== "complete" &&
            !allowIncompleteOnboarding) {
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
    // 06. AUTH -> SESSION SYNCHRONIZATION INITIAL_SESSION is intentionally ignored because pages call load().
    window.HomeOS.auth.onAuthStateChange(({ event }) => {
        if (event === "SIGNED_OUT") {
            reset();
            return;
        }
        if (["SIGNED_IN", "USER_UPDATED", "TOKEN_REFRESHED"].includes(event)) {
            void refresh();
        }
    });
})();
