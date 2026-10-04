/* ============================================================
   HOMEOS // AUTH

   Supabase sign in, sign up, sign out and account updates.
============================================================ */

(function createHomeOSAuth() {
    "use strict";
    window.HomeOS = window.HomeOS || {};
    // --- Internal Helpers ---
    function client() {
        const supabase = window.HomeOS.supabase;
        if (!supabase) {
            throw new Error("HomeOS Supabase client is not ready.");
        }
        return supabase;
    }
    function pageUrl(file) {
        return new URL(file, document.baseURI).href;
    }
    function normalizeEmail(value) {
        return String(value || "").trim().toLowerCase();
    }
    // --- Account Creation + Sign In ---
    async function signUp({
        displayName,
        email,
        password,
        pendingInviteToken = ""
    }) {
        const normalizedName = String(displayName || "").trim();
        const normalizedEmail = normalizeEmail(email);
        const inviteToken = String(pendingInviteToken || "").trim();
        if (!normalizedName)
            throw new Error("Display name is required.");
        if (!normalizedEmail)
            throw new Error("Email is required.");
        if (!password)
            throw new Error("Password is required.");
        const { data, error } = await client().auth.signUp({
            email: normalizedEmail,
            password,
            options: {
                emailRedirectTo: pageUrl(`${window.HomeOS.config.routes.login}?confirmed=true`),
                data: {
                    display_name: normalizedName,
                    homeos_pending_invite_token: inviteToken || null
                }
            }
        });
        return { data, error };
    }
    async function signIn({ email, password }) {
        const { data, error } = await client().auth.signInWithPassword({
            email: normalizeEmail(email),
            password
        });
        return { data, error };
    }
    async function signOut() {
        const { error } = await client().auth.signOut();
        return { error };
    }
    // --- Session + Account Profile ---
    async function getSession() {
        const { data, error } = await client().auth.getSession();
        return {
            session: data?.session || null,
            error
        };
    }
    async function getUser() {
        const { data, error } = await client().auth.getUser();
        return {
            user: data?.user || null,
            error
        };
    }
    async function updateUserMetadata(metadata = {}) {
        const { data, error } = await client().auth.updateUser({
            data: metadata
        });
        return {
            user: data?.user || null,
            error
        };
    }
    async function updateAccount({ displayName }) {
        const { data, error } = await client().auth.updateUser({
            data: {
                display_name: String(displayName || "").trim()
            }
        });
        return {
            user: data?.user || null,
            error
        };
    }
    // --- Auth State Events ---
    function onAuthStateChange(callback) {
        return client().auth.onAuthStateChange((event, session) => {
            callback?.({ event, session });
        });
    }
    window.HomeOS.auth = {
        signUp,
        signIn,
        signOut,
        getSession,
        getUser,
        updateUserMetadata,
        updateAccount,
        onAuthStateChange,
        pageUrl
    };
})();
