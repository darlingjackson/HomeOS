/* ============================================================
   HOMEOS // AUTH PAGE

   Login and Create Account behavior.
============================================================ */

document.addEventListener("DOMContentLoaded", async () => {
    "use strict";
    const page = document.body
        .dataset
        .authPage;
    // --- Page State ---
    const AuthPage = {
        page,
        pendingInviteToken: "",
        // --- Initialization ---
        async init() {
            this.bindPasswordToggles();
            this.bindForms();
            this.hydrateInviteFromUrl();
            this.bindHouseholdChoice();
            this.showConfirmationNotice();
            if (!window.HomeOS
                ?.supabaseReady) {
                this.showError("HomeOS could not connect right now. Refresh the page and try again.");
                return;
            }
            // If this browser is already authenticated, auth pages should not become a second source of routing logic. Session decides: onboarding home
            const state = await window.HomeOS
                .session
                .load({
                force: true
            });
            if (state
                .authenticated) {
                const join = await this
                    .acceptPendingInvite();
                if (join.error) {
                    if (state.household?.id &&
                        !this.hasExplicitInvite()) {
                        await this.clearPendingInvite();
                    }
                    else {
                        this.showError(this.friendlyInviteError(join.error));
                        return;
                    }
                }
                if (join.accepted) {
                    await window.HomeOS
                        .session
                        .refresh();
                }
                this.redirect(window.HomeOS
                    .session
                    .routeAfterAuthentication());
            }
        },
        // --- DOM Bindings + Signup Path UI ---
        bindForms() {
            document
                .getElementById("loginForm")
                ?.addEventListener("submit", event => this.handleLogin(event));
            document
                .getElementById("signupForm")
                ?.addEventListener("submit", event => this.handleSignup(event));
        },
        bindPasswordToggles() {
            document
                .querySelectorAll("[data-password-toggle]")
                .forEach(button => {
                button
                    .addEventListener("click", () => {
                    const input = document
                        .getElementById(button
                        .dataset
                        .passwordToggle);
                    if (!input) {
                        return;
                    }
                    const revealing = input.type ===
                        "password";
                    input.type =
                        revealing
                            ? "text"
                            : "password";
                    button.textContent =
                        revealing
                            ? "Hide"
                            : "Show";
                    button.setAttribute("aria-label", revealing
                        ? "Hide password"
                        : "Show password");
                });
            });
        },
        bindHouseholdChoice() {
            if (this.page !==
                "signup") {
                return;
            }
            document
                .querySelectorAll('input[name="homePath"]')
                .forEach(input => {
                input.addEventListener("change", () => this.syncHouseholdChoice());
            });
            this.syncHouseholdChoice();
        },
        syncHouseholdChoice() {
            if (this.page !==
                "signup") {
                return;
            }
            const path = document
                .querySelector('input[name="homePath"]:checked')
                ?.value ||
                "new";
            document
                .querySelectorAll("[data-home-choice-card]")
                .forEach(card => card.classList
                .toggle("active", card.dataset
                .homeChoiceCard ===
                path));
            const invite = document
                .getElementById("existingHomeInvite");
            const inviteInput = document
                .getElementById("signupInviteToken");
            if (invite) {
                invite.hidden =
                    path !==
                        "existing";
            }
            if (inviteInput) {
                inviteInput.required =
                    path ===
                        "existing";
            }
            if (path ===
                "new") {
                this.pendingInviteToken = "";
            }
        },
        // --- Invitation State ---
        explicitInviteToken() {
            const params = new URLSearchParams(window.location.search);
            return String(params.get("invite") || "").trim();
        },
        hasExplicitInvite() {
            return Boolean(this.explicitInviteToken());
        },
        hydrateInviteFromUrl() {
            const token = this.explicitInviteToken();

            if (token) {
                this.pendingInviteToken = token;
            }

            if (this.page !== "signup") {
                return;
            }

            if (!this.pendingInviteToken) {
                return;
            }

            const existing = document
                .querySelector('input[name="homePath"][value="existing"]');
            const inviteInput = document
                .getElementById("signupInviteToken");

            if (existing) {
                existing.checked = true;
            }

            if (inviteInput) {
                inviteInput.value = this.pendingInviteToken;
            }

            this.syncHouseholdChoice();
        },
        householdPath() {
            return (
                document
                    .querySelector('input[name="homePath"]:checked')
                    ?.value ||
                "new"
            );
        },
        pendingInvite() {
            return String(this.pendingInviteToken || "").trim();
        },
        async pendingInviteFromAccount() {
            const result = await window.HomeOS.auth.getUser?.();

            if (result?.error || !result?.user) {
                return "";
            }

            return String(
                result.user.user_metadata?.homeos_pending_invite_token || ""
            ).trim();
        },
        async clearPendingInvite() {
            this.pendingInviteToken = "";

            const result = await window.HomeOS.auth.updateUserMetadata?.({
                homeos_pending_invite_token: null
            });

            if (result?.error) {
                console.warn(
                    "[HomeOS] Household invitation was accepted, but its temporary account marker could not be cleared.",
                    result.error
                );
            }
        },
        async acceptPendingInvite() {
            const token =
                this.pendingInvite() ||
                await this.pendingInviteFromAccount();

            if (!token) {
                return {
                    accepted: false,
                    error: null
                };
            }

            const service = window.HomeOS
                ?.services
                ?.people;

            if (!service?.acceptInvite) {
                return {
                    accepted: false,
                    error: new Error("HomeOS invitation service is unavailable.")
                };
            }

            const result = await service.acceptInvite(token);

            if (result.error) {
                return {
                    accepted: false,
                    error: result.error
                };
            }

            await this.clearPendingInvite();

            return {
                accepted: true,
                error: null
            };
        },
        friendlyInviteError(error) {
            const message = String(error
                ?.message ||
                "");
            const lower = message
                .toLowerCase();
            if (lower.includes("different email")) {
                return "This HomeOS invitation was created for a different email address. Sign in with the email the household invited.";
            }
            if (lower.includes("expired")) {
                return "This HomeOS invitation has expired. Ask the household Owner or Admin for a new invite.";
            }
            if (lower.includes("not available")) {
                return "This HomeOS invitation is no longer available. Ask the household Owner or Admin for a new invite.";
            }
            return (message ||
                "HomeOS could not join this household.");
        },
        // --- Login Confirmation Notice ---
        showConfirmationNotice() {
            if (this.page !==
                "login") {
                return;
            }
            const params = new URLSearchParams(window.location
                .search);
            if (params.get("confirmed") ===
                "true") {
                const notice = document
                    .getElementById("authConfirmationNotice");
                if (notice) {
                    notice.hidden =
                        false;
                }
            }
        },
        // --- Login Flow ---
        async handleLogin(event) {
            event
                .preventDefault();
            this.clearError();
            const email = this.value("loginEmail")
                .trim();
            const password = this.value("loginPassword");
            if (!email ||
                !password) {
                this.showError("Enter your email and password.");
                return;
            }
            this.setBusy("loginSubmit", true, "Signing In…");
            try {
                const { error } = await window.HomeOS
                    .auth
                    .signIn({
                    email,
                    password
                });
                if (error) {
                    this.showError(this.friendlyAuthError(error));
                    return;
                }
                let state = await window.HomeOS
                    .session
                    .refresh();
                const join = await this
                    .acceptPendingInvite();
                if (join.error) {
                    if (state.household?.id &&
                        !this.hasExplicitInvite()) {
                        // Stale invite from an earlier flow. The account login itself succeeded, so discard the stale token and continue to the user's household.
                        await this.clearPendingInvite();
                    }
                    else {
                        this.showError(this.friendlyInviteError(join.error));
                        return;
                    }
                }
                if (join.accepted) {
                    state =
                        await window.HomeOS
                            .session
                            .refresh();
                }
                this.redirect(window.HomeOS
                    .session
                    .routeAfterAuthentication(state));
            }
            catch (error) {
                console.error("[HomeOS] Login failed.", error);
                this.showError(error.message ||
                    "HomeOS could not sign you in.");
            }
            finally {
                this.setBusy("loginSubmit", false, "Sign In");
            }
        },
        // --- Signup Flow ---
        async handleSignup(event) {
            event
                .preventDefault();
            this.clearError();
            const displayName = this.value("signupName")
                .trim();
            const email = this.value("signupEmail")
                .trim();
            const password = this.value("signupPassword");
            const passwordConfirm = this.value("signupPasswordConfirm");
            const homePath = this.householdPath();
            const inviteToken = this.value("signupInviteToken")
                .trim();
            if (!displayName ||
                !email ||
                !password ||
                !passwordConfirm) {
                this.showError("Complete all account fields.");
                return;
            }
            if (homePath ===
                "existing" &&
                !inviteToken) {
                this.markInvalid("signupInviteToken");
                this.showError("Paste the HomeOS invitation code from your household Owner or Admin.");
                return;
            }
            if (homePath ===
                "existing") {
                this.pendingInviteToken = inviteToken;
            }
            else {
                this.pendingInviteToken = "";
            }
            if (password.length <
                8) {
                this.showError("Use a password with at least 8 characters.");
                return;
            }
            if (password !==
                passwordConfirm) {
                this.markInvalid("signupPassword");
                this.markInvalid("signupPasswordConfirm");
                this.showError("The passwords do not match.");
                return;
            }
            this.setBusy("signupSubmit", true, "Creating Account…");
            try {
                const { data, error } = await window.HomeOS
                    .auth
                    .signUp({
                    displayName,
                    email,
                    password,
                    pendingInviteToken: homePath === "existing"
                        ? inviteToken
                        : ""
                });
                if (error) {
                    this.showError(this.friendlyAuthError(error));
                    return;
                }
                // If email confirmation is disabled in Supabase, signUp may return a live session immediately.
                if (data
                    ?.session) {
                    if (homePath ===
                        "existing") {
                        const join = await this
                            .acceptPendingInvite();
                        if (join.error) {
                            this.showError(this.friendlyInviteError(join.error));
                            return;
                        }
                    }
                    const state = await window.HomeOS
                        .session
                        .refresh();
                    this.redirect(window.HomeOS
                        .session
                        .routeAfterAuthentication(state));
                    return;
                }
                // Standard email-confirmation flow.
                this.showSignupConfirmation(email);
            }
            catch (error) {
                console.error("[HomeOS] Signup failed.", error);
                this.showError(error.message ||
                    "HomeOS could not create the account.");
            }
            finally {
                this.setBusy("signupSubmit", false, "Create Account");
            }
        },
        showSignupConfirmation(email) {
            const form = document
                .getElementById("signupForm");
            const confirmation = document
                .getElementById("signupConfirmation");
            const emailTarget = document
                .getElementById("confirmationEmail");
            if (form) {
                form.hidden =
                    true;
            }
            if (emailTarget) {
                emailTarget.textContent =
                    email;
            }
            const copy = document
                .getElementById("signupConfirmationCopy");
            if (copy &&
                this.pendingInvite()) {
                const strong = document.createElement("strong");
                strong.textContent =
                    email;
                copy.replaceChildren(document.createTextNode("We sent a confirmation link to "), strong, document.createTextNode(". After confirming, sign in with this same email and HomeOS will connect you to the household that invited you."));
            }
            if (confirmation) {
                confirmation.hidden =
                    false;
            }
        },
        // --- Shared UI Helpers ---
        friendlyAuthError(error) {
            const message = String(error
                ?.message ||
                "")
                .toLowerCase();
            if (message.includes("invalid login credentials")) {
                return "The email or password is incorrect.";
            }
            if (message.includes("email not confirmed")) {
                return "Confirm your email before signing in.";
            }
            if (message.includes("user already registered")) {
                return "An account already exists for that email. Try signing in.";
            }
            if (message.includes("password") &&
                message.includes("characters")) {
                return "That password does not meet the account requirements.";
            }
            return (error
                ?.message ||
                "HomeOS could not complete that request.");
        },
        showError(message) {
            const target = document
                .getElementById("authError");
            if (!target) {
                return;
            }
            target.textContent =
                message;
            target.hidden =
                false;
        },
        clearError() {
            const target = document
                .getElementById("authError");
            if (target) {
                target.textContent =
                    "";
                target.hidden =
                    true;
            }
            document
                .querySelectorAll('[aria-invalid="true"]')
                .forEach(element => {
                element
                    .removeAttribute("aria-invalid");
            });
        },
        markInvalid(id) {
            document
                .getElementById(id)
                ?.setAttribute("aria-invalid", "true");
        },
        setBusy(buttonId, busy, label) {
            const button = document
                .getElementById(buttonId);
            if (!button) {
                return;
            }
            button.disabled =
                busy;
            const text = button
                .querySelector("span");
            if (text) {
                text.textContent =
                    label;
            }
        },
        value(id) {
            return (document
                .getElementById(id)
                ?.value ||
                "");
        },
        redirect(file) {
            window.location
                .replace(window.HomeOS
                .auth
                .pageUrl(file));
        }
    };
    // --- Bootstrap ---
    await AuthPage.init();
});
