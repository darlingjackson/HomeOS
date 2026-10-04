/* ============================================================
   HOMEOS // CONFIG

   Browser-safe project settings and shared page routes.
============================================================ */

window.HomeOS = window.HomeOS || {};
window.HomeOS.config = Object.freeze({
    // --- Supabase ---
    supabaseUrl: "https://jzjvguzxzrqtktkkblmk.supabase.co",
    supabasePublishableKey: "sb_publishable_bXvPzjAgkzhWbjho4df_zA_6aaNTrBf",
    // --- Routes ---
    routes: Object.freeze({
        home: "index.html",
        daily: "index.html",
        calendar: "calendar.html",
        cleaning: "cleaning.html",
        laundry: "laundry.html",
        inventory: "inventory.html",
        kids: "kids.html",
        login: "login.html",
        signup: "signup.html",
        onboarding: "onboarding.html",
        account: "account.html",
        spring: "seasons/spring.html",
        summer: "seasons/summer.html",
        fall: "seasons/fall.html",
        winter: "seasons/winter.html"
    })
});
