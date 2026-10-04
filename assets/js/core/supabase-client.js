/* ============================================================
   HOMEOS // SUPABASE CLIENT

   Creates the one browser Supabase client used by HomeOS.
   Authentication may persist in the browser; household data does not.
============================================================ */

(function initializeHomeOSSupabase() {
    "use strict";

    window.HomeOS = window.HomeOS || {};

    const config = window.HomeOS.config;

    // Leave HomeOS in a clear failed state when the client cannot start.
    function fail(message) {
        console.error(`[HomeOS] ${message}`);
        window.HomeOS.supabase = null;
        window.HomeOS.supabaseReady = false;
    }

    if (!config) {
        fail("config.js must load before supabase-client.js.");
        return;
    }

    if (typeof window.supabase?.createClient !== "function") {
        fail("The Supabase browser library is not loaded.");
        return;
    }

    const url = String(config.supabaseUrl || "").trim();
    const key = String(config.supabasePublishableKey || "").trim();

    if (!url || url.includes("PASTE_YOUR")) {
        fail("Add the Supabase Project URL to assets/js/core/config.js.");
        return;
    }

    if (!key || key.includes("PASTE_YOUR")) {
        fail("Add the Supabase publishable key to assets/js/core/config.js.");
        return;
    }

    window.HomeOS.supabase = window.supabase.createClient(url, key, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            flowType: "pkce"
        }
    });

    window.HomeOS.supabaseReady = true;
})();
