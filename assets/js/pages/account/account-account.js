/* ============================================================
   HOMEOS // ACCOUNT ACCOUNT

   Profile, household identity and appearance settings.
============================================================ */

(function registerAccountAccountModule() {
    "use strict";
    window.HomeOS = window.HomeOS || {};
    window.HomeOS.accountPageModules =
        window.HomeOS.accountPageModules || {};
    window.HomeOS.accountPageModules.account = {
        // --- Top-level Account ---
        renderIdentity() {
            const user = this.state.user || {};
            const displayName = String(user.displayName || user.email?.split("@")[0] || "HOME OS User").trim();
            const initial = displayName.charAt(0).toUpperCase() || "H";
            const role = String(this.state.role || "member").toUpperCase();
            this.setText("pageAccountAvatar", initial);
            this.setText("pageAccountName", displayName);
            this.setText("pageAccountEmail", user.email || "");
            this.setText("pageAccountRole", role);
            this.setText("profileRoleReadout", role);
            this.setText("householdRolePill", role);
            this.setValue("accountDisplayNameInput", displayName);
            this.setValue("accountEmailInput", user.email || "");
        },
        renderHousehold() {
            const household = this.state.household || {};
            const name = household.name || "HOME OS Household";
            const tagline = household.tagline || "A brighter home!";
            this.setText("householdSnapshotName", name);
            this.setText("householdSnapshotTagline", tagline);
            this.setValue("householdNameInput", name);
            this.setValue("householdTypeInput", household.home_type || "");
            this.setValue("householdTaglineInput", household.tagline || "");
            this.setText("householdPermissionCopy", this.isAdmin()
                ? "You can manage this household's shared settings."
                : "Only an Owner or Admin can change shared household settings.");
        },
        async saveProfile(event) {
            event.preventDefault();
            const displayName = this.value("accountDisplayNameInput").trim();
            if (!displayName)
                return this.notify("Enter a display name first.", { tone: "attention", title: "Profile" });
            const button = event.submitter;
            await this.withBusy(button, async () => {
                const profileUpdate = await this.supabase
                    .from("profiles")
                    .update({ display_name: displayName })
                    .eq("user_id", this.state.user.id);
                if (profileUpdate.error)
                    throw profileUpdate.error;
                const authUpdate = await window.HomeOS.auth.updateAccount({ displayName });
                if (authUpdate.error)
                    throw authUpdate.error;
                this.state = await window.HomeOS.session.refresh();
                this.renderIdentity();
                window.HomeOS.shell?.renderHeader?.();
                window.HomeOS.shell?.applySessionIdentity?.();
                this.setText("profileSaveState", "Saved.");
                this.notify("Your HOME OS profile was updated.", { tone: "success", title: "Profile saved" });
            }).catch(error => {
                console.error("[HOME OS] Could not save profile.", error);
                this.notify(error.message || "Your profile could not be saved.", { tone: "attention", title: "Save failed" });
            });
        },
        async saveHousehold(event) {
            event.preventDefault();
            if (!this.requireAdmin())
                return;
            const name = this.value("householdNameInput").trim();
            if (!name)
                return this.notify("Give the household a name first.", { tone: "attention", title: "Household settings" });
            const button = event.submitter;
            await this.withBusy(button, async () => {
                const { error } = await this.supabase
                    .from("households")
                    .update({
                    name,
                    home_type: this.value("householdTypeInput") || null,
                    tagline: this.value("householdTaglineInput").trim() || null
                })
                    .eq("id", this.householdId());
                if (error)
                    throw error;
                this.state = await window.HomeOS.session.refresh();
                this.renderHousehold();
                window.HomeOS.shell?.renderHeader?.();
                window.HomeOS.shell?.applySessionIdentity?.();
                this.notify("Household settings were updated.", { tone: "success", title: "Household saved" });
            }).catch(error => this.handleError("Household settings could not be saved.", error));
        },
        setTheme(theme) {
            const safe = theme === "dark" ? "dark" : "light";
            if (window.HomeOS.shell?.applyTheme) {
                window.HomeOS.shell.applyTheme(safe);
            }
            else {
                document.body.classList.toggle("dark", safe === "dark");
                document.documentElement.dataset.theme = safe;
                localStorage.setItem("homeos_theme_v2", safe);
            }
            this.syncAppearanceControls();
        },
        syncAppearanceControls() {
            const current = document.body.classList.contains("dark")
                ? "dark"
                : "light";
            document.querySelectorAll("[data-account-theme]").forEach(button => {
                const active = button.dataset.accountTheme === current;
                button.classList.toggle("is-active", active);
                button.setAttribute("aria-pressed", String(active));
            });
            this.setText("accountThemeState", current === "dark"
                ? "Dark mode"
                : "Light mode");
            const toggle = document.getElementById("accountThemeToggle");
            if (toggle) {
                toggle.textContent =
                    current === "dark"
                        ? "Use Light Mode"
                        : "Use Dark Mode";
            }
        },
    };
})();
