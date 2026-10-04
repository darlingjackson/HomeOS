/* ============================================================
   HOMEOS // ACCOUNT RENDER

   Shared Account rendering and workspace state.
============================================================ */

(function registerAccountRenderModule() {
    "use strict";
    window.HomeOS = window.HomeOS || {};
    window.HomeOS.accountPageModules =
        window.HomeOS.accountPageModules || {};
    window.HomeOS.accountPageModules.render = {
        // --- Render / Permissions / Navigation ---
        renderAll() {
            this.renderPeople();
            this.renderHomeSetup();
            this.renderTaskWorkspace();
        },
        applyPermissionState() {
            const addAdult = document.getElementById("addAdultButton");
            const addChild = document.getElementById("addChildButton");
            if (addAdult) {
                addAdult.hidden =
                    !this.isAdmin();
            }
            if (addChild) {
                addChild.hidden =
                    !this.isAdmin();
            }
            const homeReset = document.getElementById("openHomeResetButton");
            if (homeReset) {
                homeReset.hidden = !this.isAdmin();
            }
            if (this.isAdmin())
                return;
            ["household", "people", "tasks", "home"].forEach(name => {
                const panel = document.querySelector(`[data-account-panel="${name}"]`);
                if (!panel)
                    return;
                panel.classList.add("is-readonly");
                panel.querySelectorAll("form input:not([readonly]), form select, form textarea, form button[type='submit'], .danger").forEach(control => {
                    control.disabled = true;
                });
            });
        },
        requireAdmin() {
            if (this.isAdmin())
                return true;
            this.notify("Owner or Admin permission is required for this change.", { tone: "attention", title: "Household settings" });
            return false;
        },
        tabFromHash() {
            const value = window.location.hash
                .replace("#", "")
                .trim();
            if (value ===
                "appearance") {
                return "household";
            }
            return this.validTabs.has(value)
                ? value
                : "profile";
        },
        openInitialTab() {
            const hash = window.location.hash.replace("#", "").trim();
            const homeMatch = hash.match(/^home-(layout|zones|inventory|laundry|care)$/);
            if (homeMatch) {
                this.openTab("home", { updateHash: false });
                this.openHomeTab(homeMatch[1], { updateHash: false });
                return;
            }
            this.openTab(this.tabFromHash(), { updateHash: false });
        },
        openTab(tab, { updateHash = true } = {}) {
            const safe = this.validTabs.has(tab) ? tab : "profile";
            document.querySelectorAll("[data-account-tab]").forEach(button => {
                const active = button.dataset.accountTab === safe;
                button.classList.toggle("is-active", active);
                button.setAttribute("aria-current", active ? "page" : "false");
            });
            document.querySelectorAll("[data-account-panel]").forEach(panel => {
                const active = panel.dataset.accountPanel === safe;
                panel.hidden = !active;
                panel.classList.toggle("is-active", active);
            });
            const mobile = document.getElementById("accountMobileSection");
            if (mobile)
                mobile.value = safe;
            const titles = {
                profile: ["Account & Home Settings", "Manage your personal HOME OS profile."],
                household: ["Home identity", "Manage the shared name and identity for this household."],
                people: ["People & Access", "Manage household people, logins, permissions and task eligibility here."],
                tasks: ["Task Assignments", "Choose a person, review what is already assigned, then add only what they need."],
                home: ["Home Setup", "Edit levels, areas, cleaning zones, Inventory, Laundry and Home Care here."],
                session: ["Session", "Manage the current signed-in HOME OS session."]
            };
            const [title, description] = titles[safe];
            this.setText("accountPageTitle", title);
            this.setText("accountPageDescription", description);
            if (updateHash)
                history.replaceState(null, "", `#${safe}`);
            if (safe === "tasks" &&
                this.selectedTaskPersonId) {
                this.loadSelectedTaskPersonTasks()
                    .then(() => this.refreshSelectedTaskPersonTodayStatus())
                    .catch(error => console.error("[HOME OS] Task person load failed.", error));
            }
        },
        openHomeTab(tab, { updateHash = true } = {}) {
            const safe = this.validHomeTabs.has(tab) ? tab : "layout";
            document.querySelectorAll("[data-home-setup-tab]").forEach(button => button.classList.toggle("is-active", button.dataset.homeSetupTab === safe));
            document.querySelectorAll("[data-home-setup-panel]").forEach(panel => {
                const active = panel.dataset.homeSetupPanel === safe;
                panel.hidden = !active;
                panel.classList.toggle("is-active", active);
            });
            if (updateHash) {
                history.replaceState(null, "", `#home-${safe}`);
            }
        },
        showHomeResetConfirm(show = true) {
            if (!this.requireAdmin())
                return;
            const panel = document.getElementById("homeResetConfirm");
            const check = document.getElementById("confirmHomeResetCheck");
            if (panel)
                panel.hidden = !show;
            if (!show && check)
                check.checked = false;
            if (show) {
                panel?.scrollIntoView({ behavior: "smooth", block: "center" });
            }
        },
        homeRebuildDraft() {
            const household = this.state?.household || {};
            return {
                rebuildExistingHome: true,
                household: {
                    name: household.name || "",
                    homeType: household.home_type || "",
                    tagline: household.tagline || ""
                },
                people: [],
                levels: [],
                zones: [],
                suppressedLevelZoneIds: [],
                inventory: [],
                laundry: [],
                features: []
            };
        },
        async prepareHomeRebuildFallback() {
            const householdId = this.householdId();
            if (!householdId) {
                throw new Error("HOME OS could not identify this household.");
            }
            const draft = this.homeRebuildDraft();
            // Keep reset working even if this database does not have the
            // dedicated restart call yet.
            const { error: householdError } = await this.supabase
                .from("households")
                .update({
                onboarding_status: "in_progress",
                onboarding_step: "household"
            })
                .eq("id", householdId);
            if (householdError)
                throw householdError;
            const { error: draftError } = await this.supabase.rpc("homeos_save_onboarding_draft", {
                p_current_step: "household",
                p_completed_steps: [],
                p_draft: draft
            });
            if (draftError)
                throw draftError;
        },
        async restartHomeSetup(button) {
            if (!this.requireAdmin())
                return;
            if (!this.checked("confirmHomeResetCheck")) {
                this.notify("Check the confirmation box before starting over.", { tone: "attention", title: "Home Setup" });
                return;
            }
            await this.withBusy(button, async () => {
                let usedFallback = false;
                const restart = await this.supabase.rpc("homeos_restart_home_layout");
                if (restart.error) {
                    console.warn("[HOME OS] Dedicated restart RPC was unavailable; using the compatibility reset path.", restart.error);
                    usedFallback = true;
                    await this.prepareHomeRebuildFallback();
                }
                let refreshed = null;
                if (window.HomeOS.session?.refresh) {
                    refreshed = await window.HomeOS.session.refresh();
                }
                // Make sure Home Setup really moved back into onboarding
                // before redirecting.
                if (!usedFallback &&
                    refreshed?.household?.onboarding_status === "complete") {
                    await this.prepareHomeRebuildFallback();
                    if (window.HomeOS.session?.refresh) {
                        refreshed = await window.HomeOS.session.refresh();
                    }
                }
                this.notify("Fresh Home Setup is ready. Opening guided setup…", { tone: "success", title: "Home Setup" });
                window.location.replace("onboarding.html?rebuild=1");
            }, "Starting over…").catch(error => this.handleError("HOME OS could not start a fresh home setup.", error));
        },
        async signOut() {
            const button = document.getElementById("accountPageSignOut");
            await this.withBusy(button, async () => {
                const { error } = await window.HomeOS.auth.signOut();
                if (error)
                    throw error;
                this.clearKidPinSessionCache();
                window.location.replace(window.HomeOS.auth.pageUrl(window.HomeOS.config?.routes?.login || "login.html"));
            }, "Signing out…").catch(error => this.handleError("We could not sign you out.", error));
        },
    };
})();
