/* ============================================================
   HOMEOS // ACCOUNT UTILITIES

   Small helpers shared by the Account modules.
============================================================ */

(function registerAccountUtilitiesModule() {
    "use strict";
    window.HomeOS = window.HomeOS || {};
    window.HomeOS.accountPageModules =
        window.HomeOS.accountPageModules || {};
    window.HomeOS.accountPageModules.utilities = {
        // --- Utilities ---
        handleError(message, error) {
            console.error(`[HOME OS] ${message}`, error);
            this.notify(error?.message || message, { tone: "attention", title: "HOME OS" });
        },
        pretty(value) {
            return String(value || "").replace(/_/g, " ").replace(/\b\w/g, char => char.toUpperCase());
        },
        escape(value) {
            return String(value ?? "")
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        },
        on(id, eventName, handler) {
            document.getElementById(id)?.addEventListener(eventName, handler);
        },
        value(id) { return document.getElementById(id)?.value || ""; },
        checked(id) { return Boolean(document.getElementById(id)?.checked); },
        setText(id, value) {
            const element = document.getElementById(id);
            if (element)
                element.textContent = String(value ?? "");
        },
        setValue(id, value) {
            const element = document.getElementById(id);
            if (element)
                element.value = value ?? "";
        },
        setChecked(id, value) {
            const element = document.getElementById(id);
            if (element)
                element.checked = Boolean(value);
        },
        setOptions(id, html) {
            const element = document.getElementById(id);
            if (element) {
                const current = element.value;
                element.innerHTML = html;
                if ([...element.options].some(option => option.value === current))
                    element.value = current;
            }
        }
    };
})();
