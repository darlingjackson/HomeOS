/* ============================================================
   HOMEOS // SHARED SHELL

   Header, navigation, account menu, theme, notifications and footer.
============================================================ */
document.addEventListener("DOMContentLoaded", async () => {
    "use strict";
    window.HomeOS = window.HomeOS || {};
    const HomeShell = {
        THEME_STORAGE_KEY: "homeos_theme_v2",
        state: null,
        noticeTimer: null,
        celebrationTimer: null,
        // --- Navigation ---
        NAV_ITEMS: [
            {
                id: "daily",
                label: "Rhythm",
                description: "Opening, closing, and recurring routines.",
                keywords: "daily rhythm routine morning evening opening closing"
            },
            {
                id: "calendar",
                label: "Calendar",
                description: "See the whole home in time — family, routines, care, and events.",
                keywords: "calendar schedule events family appointments dates week month"
            },
            {
                id: "cleaning",
                label: "Cleaning",
                description: "Cleaning rooms, zones, and home-care sessions.",
                keywords: "cleaning care clean rooms zones tasks"
            },
            {
                id: "laundry",
                label: "Laundry",
                description: "Track loads from wash through put-away.",
                keywords: "laundry wash dry fold put away"
            },
            {
                id: "inventory",
                label: "Inventory",
                description: "Know what you have and what you need.",
                keywords: "inventory pantry fridge freezer household shopping list"
            },
            {
                id: "seasonal",
                label: "Seasons",
                description: "Seasonal resets and stewardship projects.",
                keywords: "seasonal spring summer fall winter reset refresh"
            }
        ],
        // --- Start the shell ---
        async init() {
            if (!window.HomeOS.session?.guard) {
                console.error("[HOME OS] Session guard is unavailable.");
                return;
            }
            const shellMode = document.body.dataset.shellMode || "app";
            const relaxedShell = shellMode === "public" || shellMode === "setup";
            this.state = await window.HomeOS.session.guard(relaxedShell
                ? {
                    allowUnauthenticated: true,
                    allowWithoutHousehold: true,
                    allowIncompleteOnboarding: true
                }
                : {});
            if (!relaxedShell &&
                (!this.state?.authenticated ||
                    !this.state?.household?.id ||
                    this.state.household.onboarding_status !== "complete")) {
                return;
            }
            document.body.dataset.shellSeason = this.getCalendarSeason();
            document.body.dataset.shellAuth = this.state?.authenticated ? "authenticated" : "public";
            this.applyTheme(this.getSavedTheme() || "light", { persist: false });
            this.renderHeader();
            this.renderCommandPalette();
            this.renderMobileBackdrop();
            this.renderCelebrationLayer();
            this.renderFooter();
            this.ensureNoticeRegion();
            if (this.state?.authenticated) {
                this.applySessionIdentity();
            }
            this.bindEvents();
            this.exposeUI();
            document.body.classList.add("homeos-shell-ready");
            window.dispatchEvent(new CustomEvent("homeos:shellready", {
                detail: this.state
            }));
        },
        // --- Routes + household helpers ---
        href(file) {
            return window.HomeOS.auth?.pageUrl
                ? window.HomeOS.auth.pageUrl(file)
                : new URL(file, document.baseURI).href;
        },
        getKidsModeHref() {
            // Kids Mode resolves the right household after the page opens.
            return this.href(window.HomeOS.config?.routes?.kids || "kids.html");
        },
        householdBrand() {
            const raw = String(this.state?.household?.name || "HOME OS").trim();
            return raw || "HOME OS";
        },
        householdShortName() {
            const raw = this.householdBrand();
            const cleaned = raw.replace(/\s+(home|household)$/i, "").trim();
            return cleaned || raw;
        },
        getCalendarSeason(date = new Date()) {
            const month = date.getMonth() + 1;
            if (month >= 3 && month <= 5)
                return "spring";
            if (month >= 6 && month <= 8)
                return "summer";
            if (month >= 9 && month <= 11)
                return "fall";
            return "winter";
        },
        getSeasonHref(season = this.getCalendarSeason()) {
            const configured = window.HomeOS.config?.routes?.[season];
            return this.href(configured || `seasons/${season}.html`);
        },
        getStewardshipMessage(season = this.getCalendarSeason()) {
            return ({
                spring: "Renew with intention. Care with gratitude.",
                summer: "Live lightly. Tend what matters.",
                fall: "Gather with gratitude. Prepare with care.",
                winter: "Rest with purpose. Care for what carries the home."
            })[season] || "Steward well. Live lightly. Love the people here.";
        },
        // --- Icons + branding ---
        icon(name, className = "") {
            const icons = {
                home: `<path d="M4.5 10.4 12 4.3l7.5 6.1v8.1a1.5 1.5 0 0 1-1.5 1.5h-4.1v-5.3h-3.8V20H6a1.5 1.5 0 0 1-1.5-1.5z"/>`,
                rhythm: `<circle cx="12" cy="12" r="7.6"/><path d="M12 7.7v4.7l3.1 2"/><path d="M8 3.8 6.7 2.6M16 3.8l1.3-1.2"/>`,
                calendar: `<rect x="4" y="5.5" width="16" height="14.5" rx="2"/><path d="M7.5 3.5v4M16.5 3.5v4M4 9.5h16"/><path d="M8 13h2M12 13h2M16 13h1M8 16.5h2M12 16.5h2"/>`,
                care: `<path d="m13.8 5 5.2 5.2-8.7 8.7-5.2-5.2z"/><path d="m11.8 7 5.2 5.2M4.2 17.3l2.5 2.5"/><path d="M18.1 3.2v3M19.6 4.7h-3"/>`,
                laundry: `<rect x="5" y="3.5" width="14" height="17" rx="2"/><circle cx="12" cy="13.1" r="4.1"/><path d="M8.1 7h.1M11 7h.1"/>`,
                inventory: `<path d="M5.2 7.4h13.6v12H5.2z"/><path d="M7.4 4.6h9.2v2.8H7.4z"/><path d="M9 11.2h6M9 14.7h6"/>`,
                seasons: `<path d="M19 5.1c-5.1.3-8.8 2.1-11 5.4-1.5 2.2-1.7 4.8-.7 7.5 2.7 1 5.3.8 7.5-.7 3.3-2.2 5.1-5.9 5.4-11z"/><path d="M6.7 18.4c2.4-3.3 5.2-5.9 8.5-8"/>`,
                search: `<circle cx="10.7" cy="10.7" r="6.2"/><path d="m15.4 15.4 4.3 4.3"/>`,
                sun: `<circle cx="12" cy="12" r="3.5"/><path d="M12 2.6v2M12 19.4v2M2.6 12h2M19.4 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4"/>`,
                moon: `<path d="M19.2 15.2A7.7 7.7 0 0 1 8.8 4.8 7.8 7.8 0 1 0 19.2 15.2z"/>`,
                menu: `<path d="M4 7h16M4 12h16M4 17h16"/>`,
                close: `<path d="m6 6 12 12M18 6 6 18"/>`,
                arrow: `<path d="M5 12h14M14 7l5 5-5 5"/>`,
                spark: `<path d="M12 3.5c.5 4.3 2.2 6 6.5 6.5-4.3.5-6 2.2-6.5 6.5-.5-4.3-2.2-6-6.5-6.5 4.3-.5 6-2.2 6.5-6.5z"/>`,
                check: `<path d="m5.2 12.3 4.2 4.2 9.4-9.4"/>`,
                settings: `<circle cx="12" cy="12" r="3"/><path d="M19 13.5v-3l-2-.7a7 7 0 0 0-.8-1.9l.9-1.9L15 3.9l-1.9.9a7 7 0 0 0-1.9-.8l-.7-2h-3l-.7 2a7 7 0 0 0-1.9.8L3 3.9.9 6l.9 1.9A7 7 0 0 0 1 9.8l-2 .7v3l2 .7a7 7 0 0 0 .8 1.9L.9 18 3 20.1l1.9-.9a7 7 0 0 0 1.9.8l.7 2h3l.7-2a7 7 0 0 0 1.9-.8l1.9.9 2.1-2.1-.9-1.9a7 7 0 0 0 .8-1.9z" transform="translate(2.5 -1) scale(.8)"/>`
            };
            return `
                <svg class="homeos-icon ${className}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    ${icons[name] || icons.home}
                </svg>
            `;
        },
        renderBrandMark() {
            return `
                <img
                    src="${this.href("assets/images/branding/homeos-icon.png")}"
                    alt=""
                    aria-hidden="true"
                >
            `;
        },
        // --- Header + footer ---
        navHref(item) {
            if (item.id === "seasonal") {
                return this.getSeasonHref();
            }
            const configured = window.HomeOS.config?.routes?.[item.id];
            return this.href(configured || "index.html");
        },
        getCurrentPage() {
            const file = String(window.location.pathname
                .split("/")
                .pop() ||
                "index.html")
                .toLowerCase();
            const routeMap = {
                "": "daily",
                "index.html": "daily",
                "calendar.html": "calendar",
                "cleaning.html": "cleaning",
                "laundry.html": "laundry",
                "inventory.html": "inventory",
                "spring.html": "seasonal",
                "summer.html": "seasonal",
                "fall.html": "seasonal",
                "winter.html": "seasonal",
                "account.html": "account"
            };
            if (routeMap[file]) {
                return routeMap[file];
            }
            return (document.body.dataset.page ||
                "daily");
        },
        renderNavigation(currentPage, location = "desktop") {
            return this.NAV_ITEMS.map(item => {
                const active = currentPage === item.id;
                const iconName = ({
                    daily: "rhythm",
                    calendar: "calendar",
                    cleaning: "care",
                    laundry: "laundry",
                    inventory: "inventory",
                    seasonal: "seasons"
                })[item.id];
                return `
                    <a
                        href="${this.navHref(item)}"
                        class="app-nav-link app-nav-link-${item.id} ${active ? "active" : ""}"
                        ${active ? 'aria-current="page"' : ""}
                        data-nav-id="${item.id}"
                        data-nav-location="${location}"
                    >
                        <span class="app-nav-icon">${this.icon(iconName)}</span>
                        <span class="app-nav-label">${this.escape(item.label)}</span>
                    </a>
                `;
            }).join("");
        },
        renderHeader() {
            const header = document.getElementById("appHeader");
            if (!header)
                return;
            const page = this.getCurrentPage();
            const household = this.householdShortName();
            const authenticated = Boolean(this.state?.authenticated);
            const managementPage = page === "account";
            const brandSystem = this.state?.household?.id ? "HOME OS" : "HOME INTELLIGENCE";
            header.className = "app-header homeos-shell-v3";
            header.innerHTML = `
                <div class="app-header-inner">
                    <a href="${this.href(window.HomeOS.config?.routes?.home || "index.html")}" class="app-brand" aria-label="HOME OS rhythm">
                        <span class="brand-mark">${this.renderBrandMark()}</span>
                        <span class="brand-copy">
                            <strong class="brand-name" id="shellHouseholdBrand">${this.escape(household)}</strong>
                            <span class="brand-system">${this.escape(brandSystem)}</span>
                        </span>
                    </a>

                    <nav class="app-nav" aria-label="HOME OS navigation">
                        ${this.renderNavigation(page, "desktop")}
                    </nav>

                    <div class="header-actions">
                        <button class="command-button" id="commandButton" type="button" aria-label="Open quick find">
                            ${this.icon("search")}
                            <span>Quick Find</span>
                            <kbd>${this.isMac() ? "⌘" : "Ctrl"} K</kbd>
                        </button>

                        <button class="icon-button" id="themeToggle" type="button" aria-label="Switch appearance" aria-pressed="false" title="Switch appearance">
                            <span id="themeToggleIcon" aria-hidden="true"></span>
                        </button>

                        ${authenticated ? `
                            <div class="account-menu ${managementPage ? "is-active" : ""}" id="accountMenu">
                                <button
                                    class="account-avatar-trigger"
                                    id="accountMenuButton"
                                    type="button"
                                    aria-label="Open account and home settings"
                                    aria-expanded="false"
                                    aria-controls="accountPopover"
                                >
                                    <span class="account-avatar" id="accountAvatar" aria-hidden="true">H</span>
                                </button>

                                <div class="account-popover" id="accountPopover" hidden>
                                    <div class="account-popover-header">
                                        <span class="account-avatar account-avatar-large" id="accountAvatarLarge" aria-hidden="true">H</span>
                                        <div class="account-identity">
                                            <span class="account-greeting">Signed in as</span>
                                            <strong id="accountName">HOME OS User</strong>
                                            <span class="account-email" id="accountEmail"></span>
                                        </div>
                                    </div>

                                    <div class="account-popover-actions" aria-label="HOME OS account shortcuts">
                                        <a class="account-action-card" href="${this.href(window.HomeOS.config?.routes?.account || "account.html")}">
                                            <span class="account-action-icon">${this.icon("settings")}</span>
                                            <span class="account-action-copy">
                                                <strong>Home Settings</strong>
                                                <small>People, setup &amp; account</small>
                                            </span>
                                            <span class="account-action-arrow">${this.icon("arrow")}</span>
                                        </a>

                                        <a class="account-action-card account-action-card-kids" href="${this.getKidsModeHref()}">
                                            <span class="account-action-icon">${this.icon("spark")}</span>
                                            <span class="account-action-copy">
                                                <strong>Kids Mode</strong>
                                                <small>Open the kids mission portal</small>
                                            </span>
                                            <span class="account-action-arrow">${this.icon("arrow")}</span>
                                        </a>
                                    </div>

                                    <div class="account-popover-footer">
                                        <button class="account-signout" id="signOutButton" type="button">Sign Out</button>
                                    </div>
                                </div>
                            </div>
                        ` : `
                            <div class="public-auth-actions" aria-label="Account actions">
                                <a class="public-auth-link ${page === "login" ? "is-active" : ""}" href="${this.href(window.HomeOS.config?.routes?.login || "login.html")}">Sign In</a>
                                <a class="public-auth-link public-auth-link-primary ${page === "signup" ? "is-active" : ""}" href="${this.href(window.HomeOS.config?.routes?.signup || "signup.html")}">Create Account</a>
                            </div>
                        `}

                        <button class="mobile-menu-button" id="mobileMenuButton" type="button" aria-label="Open navigation" aria-expanded="false" aria-controls="mobileNavPanel">
                            <span id="mobileMenuIcon">${this.icon("menu")}</span>
                        </button>
                    </div>
                </div>

                <div class="mobile-nav-panel" id="mobileNavPanel" hidden>
                    <div class="mobile-nav-heading">
                        <span>Navigate HOME OS</span>
                        <small>${this.escape(this.householdBrand())}</small>
                    </div>
                    <nav class="mobile-nav" aria-label="Mobile HOME OS navigation">
                        ${this.renderNavigation(page, "mobile")}
                    </nav>
                    <button class="mobile-command-launch" id="mobileCommandButton" type="button">
                        ${this.icon("search")}
                        <span>Quick Find</span>
                        <kbd>${this.isMac() ? "⌘" : "Ctrl"} K</kbd>
                    </button>
                </div>
            `;
            this.updateThemeButton();
        },
        renderFooter() {
            const footer = document.getElementById("appFooter");
            if (!footer)
                return;
            const season = this.getCalendarSeason();
            const year = new Date().getFullYear();
            footer.className = "app-footer homeos-shell-footer";
            footer.innerHTML = `
                <div class="footer-card">
                    <div class="footer-brand-lockup">
                        <span class="footer-brand-mark">${this.renderBrandMark()}</span>
                        <div>
                            <strong>HOME OS</strong>
                            <span>${this.escape(this.state?.household?.id ? this.householdBrand() : "Home intelligence")}</span>
                        </div>
                    </div>

                    <div class="footer-principle">
                        <span>HOME PRINCIPLE</span>
                        <p>${this.escape(this.getStewardshipMessage(season))}</p>
                    </div>

                    <div class="footer-side">
                        <nav class="footer-nav" aria-label="Footer navigation">
                            <a href="${this.href("index.html")}">Rhythm</a>
                            <a href="${this.href("cleaning.html")}">Cleaning</a>
                            <a href="${this.href("inventory.html")}">Inventory</a>
                            <a href="${this.getSeasonHref(season)}">Seasonal</a>
                        </nav>
                        <small class="footer-copyright">© ${year} HOME OS</small>
                    </div>
                </div>
            `;
        },
        // --- Quick Find ---
        renderCommandPalette() {
            if (document.getElementById("homeosCommandPalette"))
                return;
            const root = document.createElement("div");
            root.className = "command-palette";
            root.id = "homeosCommandPalette";
            root.hidden = true;
            root.setAttribute("role", "dialog");
            root.setAttribute("aria-modal", "true");
            root.setAttribute("aria-labelledby", "homeosCommandTitle");
            root.innerHTML = `
                <div class="command-palette-backdrop" data-command-close></div>
                <div class="command-palette-panel">
                    <div class="command-palette-topline">
                        <div>
                            <span class="ui-kicker">HOME OS</span>
                            <strong id="homeosCommandTitle">Quick Find</strong>
                        </div>
                        <button class="command-close" type="button" data-command-close aria-label="Close quick find">${this.icon("close")}</button>
                    </div>

                    <label class="command-search" for="homeosCommandInput">
                        ${this.icon("search")}
                        <input
                            id="homeosCommandInput"
                            type="search"
                            autocomplete="off"
                            placeholder="Find a system…"
                            aria-label="Find a HOME OS system"
                        >
                        <kbd>Esc</kbd>
                    </label>

                    <div class="command-results" id="homeosCommandResults"></div>

                    <div class="command-palette-footer">
                        <span>Type to filter</span>
                        <span><kbd>↑</kbd><kbd>↓</kbd> move</span>
                        <span><kbd>Enter</kbd> open</span>
                    </div>
                </div>
            `;
            document.body.appendChild(root);
            this.renderCommandResults("");
        },
        renderCommandResults(query = "") {
            const target = document.getElementById("homeosCommandResults");
            if (!target)
                return;
            const normalized = String(query || "").trim().toLowerCase();
            const page = this.getCurrentPage();
            const results = this.NAV_ITEMS.filter(item => {
                if (!normalized)
                    return true;
                return `${item.label} ${item.description} ${item.keywords}`.toLowerCase().includes(normalized);
            });
            if (!results.length) {
                target.innerHTML = `
                    <div class="command-empty">
                        ${this.icon("search")}
                        <strong>No system matched that search.</strong>
                        <span>Try “calendar”, “inventory”, “laundry”, “care”, or “rhythm”.</span>
                    </div>
                `;
                return;
            }
            target.innerHTML = results.map((item, index) => {
                const iconName = ({
                    daily: "rhythm",
                    calendar: "calendar",
                    cleaning: "care",
                    laundry: "laundry",
                    inventory: "inventory",
                    seasonal: "seasons"
                })[item.id];
                return `
                    <a
                        class="command-result ${index === 0 ? "is-selected" : ""} ${page === item.id ? "is-current" : ""}"
                        href="${this.navHref(item)}"
                        data-command-result
                    >
                        <span class="command-result-icon">${this.icon(iconName)}</span>
                        <span class="command-result-copy">
                            <strong>${this.escape(item.label)}</strong>
                            <small>${this.escape(item.description)}</small>
                        </span>
                        ${page === item.id ? '<span class="command-current">Current</span>' : this.icon("arrow")}
                    </a>
                `;
            }).join("");
        },
        // --- Shared overlays ---
        renderMobileBackdrop() {
            if (document.getElementById("mobileNavBackdrop"))
                return;
            const backdrop = document.createElement("button");
            backdrop.type = "button";
            backdrop.className = "mobile-nav-backdrop";
            backdrop.id = "mobileNavBackdrop";
            backdrop.hidden = true;
            backdrop.setAttribute("aria-label", "Close navigation");
            document.body.appendChild(backdrop);
        },
        renderCelebrationLayer() {
            if (document.getElementById("homeosCelebration"))
                return;
            const layer = document.createElement("div");
            layer.className = "homeos-celebration";
            layer.id = "homeosCelebration";
            layer.hidden = true;
            layer.setAttribute("aria-live", "polite");
            const particles = Array.from({ length: 20 }, (_, index) => {
                const tone = (index % 4) + 1;
                const x = 7 + ((index * 17) % 88);
                const delay = (index % 7) * 45;
                const drift = -70 + ((index * 29) % 140);
                return `<i class="celebration-particle tone-${tone}" style="--particle-x:${x}%;--particle-delay:${delay}ms;--particle-drift:${drift}px"></i>`;
            }).join("");
            layer.innerHTML = `
                <div class="celebration-particles" aria-hidden="true">${particles}</div>
                <div class="celebration-card">
                    <span class="celebration-icon">${this.icon("spark")}</span>
                    <span class="celebration-kicker" id="celebrationKicker">MOMENTUM</span>
                    <strong id="celebrationTitle">Beautiful work.</strong>
                    <p id="celebrationMessage">One thoughtful step is complete.</p>
                    <button type="button" id="celebrationDismiss">Continue</button>
                </div>
            `;
            document.body.appendChild(layer);
        },
        ensureNoticeRegion() {
            let region = document.getElementById("homeosNoticeRegion");
            if (region)
                return region;
            region = document.createElement("div");
            region.id = "homeosNoticeRegion";
            region.className = "homeos-notice-region";
            region.setAttribute("aria-live", "polite");
            region.setAttribute("aria-atomic", "true");
            document.body.appendChild(region);
            return region;
        },
        exposeUI() {
            window.HomeOS.ui = {
                notify: (message, options = {}) => this.notify(message, options)
            };
        },
        // --- Account + appearance ---
        applySessionIdentity() {
            const user = this.state?.user || {};
            const displayName = user.displayName || "HOME OS User";
            const initial = displayName.charAt(0).toUpperCase() || "H";
            this.setText("accountName", displayName);
            this.setText("accountEmail", user.email || "");
            this.setText("accountAvatar", initial);
            this.setText("accountAvatarLarge", initial);
            this.setText("shellHouseholdBrand", this.householdShortName());
            document.querySelectorAll("[data-user-name]").forEach(element => {
                const suffix = element.dataset.userNameSuffix || "";
                element.textContent = `${displayName}${suffix}`;
            });
            document.querySelectorAll("[data-household-name]").forEach(element => {
                element.textContent = this.state?.household?.name || "Your Home";
            });
        },
        getSavedTheme() {
            const saved = localStorage.getItem(this.THEME_STORAGE_KEY);
            return saved === "dark" || saved === "light" ? saved : null;
        },
        applyTheme(theme, { persist = true } = {}) {
            const safe = theme === "dark" ? "dark" : "light";
            const dark = safe === "dark";
            document.body.classList.toggle("dark", dark);
            document.documentElement.dataset.theme = safe;
            if (persist) {
                localStorage.setItem(this.THEME_STORAGE_KEY, safe);
            }
            this.updateThemeButton();
        },
        updateThemeButton() {
            const dark = document.body.classList.contains("dark");
            const icon = document.getElementById("themeToggleIcon");
            const button = document.getElementById("themeToggle");
            if (icon)
                icon.innerHTML = this.icon(dark ? "sun" : "moon");
            if (button) {
                button.setAttribute("aria-pressed", String(dark));
                button.setAttribute("aria-label", dark ? "Switch to light appearance" : "Switch to dark appearance");
                button.title = dark ? "Light appearance" : "Dark appearance";
            }
        },
        toggleTheme() {
            this.applyTheme(document.body.classList.contains("dark") ? "light" : "dark");
        },
        // --- Menus + Quick Find controls ---
        toggleAccountMenu(force) {
            const panel = document.getElementById("accountPopover");
            const button = document.getElementById("accountMenuButton");
            if (!panel || !button)
                return;
            const open = typeof force === "boolean" ? force : panel.hidden;
            panel.hidden = !open;
            button.setAttribute("aria-expanded", String(open));
            if (open)
                this.closeMobileMenu();
        },
        closeAccountMenu() {
            this.toggleAccountMenu(false);
        },
        toggleMobileMenu(force) {
            const panel = document.getElementById("mobileNavPanel");
            const button = document.getElementById("mobileMenuButton");
            const backdrop = document.getElementById("mobileNavBackdrop");
            if (!panel || !button || !backdrop)
                return;
            const open = typeof force === "boolean" ? force : panel.hidden;
            panel.hidden = !open;
            backdrop.hidden = !open;
            button.setAttribute("aria-expanded", String(open));
            document.body.classList.toggle("mobile-nav-open", open);
            const icon = document.getElementById("mobileMenuIcon");
            if (icon)
                icon.innerHTML = this.icon(open ? "close" : "menu");
            if (open)
                this.closeAccountMenu();
        },
        closeMobileMenu() {
            this.toggleMobileMenu(false);
        },
        openCommandPalette() {
            const palette = document.getElementById("homeosCommandPalette");
            const input = document.getElementById("homeosCommandInput");
            if (!palette)
                return;
            this.closeAccountMenu();
            this.closeMobileMenu();
            palette.hidden = false;
            document.body.classList.add("command-palette-open");
            if (input)
                input.value = "";
            this.renderCommandResults("");
            requestAnimationFrame(() => input?.focus());
        },
        closeCommandPalette() {
            const palette = document.getElementById("homeosCommandPalette");
            if (!palette || palette.hidden)
                return;
            palette.hidden = true;
            document.body.classList.remove("command-palette-open");
            document.getElementById("commandButton")?.focus();
        },
        moveCommandSelection(direction) {
            const results = [...document.querySelectorAll("[data-command-result]")];
            if (!results.length)
                return;
            let index = results.findIndex(item => item.classList.contains("is-selected"));
            if (index < 0)
                index = 0;
            else
                index = (index + direction + results.length) % results.length;
            results.forEach(item => item.classList.remove("is-selected"));
            results[index].classList.add("is-selected");
            results[index].scrollIntoView({ block: "nearest" });
        },
        openSelectedCommand() {
            const selected = document.querySelector("[data-command-result].is-selected") || document.querySelector("[data-command-result]");
            if (selected?.href)
                window.location.href = selected.href;
        },
        // --- Notifications + celebrations ---
        notify(message, options = {}) {
            const region = this.ensureNoticeRegion();
            const requestedTone = options.tone || options.type || "info";
            const tone = requestedTone === "warning" || requestedTone === "error"
                ? "attention"
                : ["success", "attention", "info"].includes(requestedTone)
                    ? requestedTone
                    : "info";
            const title = options.title || (tone === "success" ? "Updated" : tone === "attention" ? "Needs attention" : "HOME OS");
            region.innerHTML = `
                <div class="homeos-notice homeos-notice-${tone}" role="status">
                    <span class="homeos-notice-icon">${this.icon(tone === "success" ? "check" : tone === "attention" ? "spark" : "home")}</span>
                    <span class="homeos-notice-copy">
                        <strong>${this.escape(title)}</strong>
                        <span>${this.escape(message)}</span>
                    </span>
                    <button type="button" class="homeos-notice-close" aria-label="Dismiss notification">${this.icon("close")}</button>
                </div>
            `;
            requestAnimationFrame(() => region.firstElementChild?.classList.add("is-visible"));
            clearTimeout(this.noticeTimer);
            this.noticeTimer = setTimeout(() => this.dismissNotice(), options.duration || 3600);
        },
        dismissNotice() {
            const region = document.getElementById("homeosNoticeRegion");
            const notice = region?.firstElementChild;
            if (!notice)
                return;
            notice.classList.remove("is-visible");
            setTimeout(() => {
                if (region)
                    region.innerHTML = "";
            }, 220);
        },
        celebrateTask(taskName = "That task", options = {}) {
            return this.celebrate({
                kicker: options.kicker || "TASK COMPLETE",
                title: options.title || "Beautiful work.",
                message: options.message || `${taskName} is complete. One thoughtful step closer to settled.`,
                duration: options.duration
            });
        },
        celebrateArea(areaName = "This area", options = {}) {
            return this.celebrate({
                kicker: options.kicker || "AREA SETTLED · 100%",
                title: options.title || `${areaName} is complete.`,
                message: options.message || "Everything in this area is handled. Enjoy the reset before moving to what matters next.",
                duration: options.duration || 5200
            });
        },
        celebrate(options = {}) {
            const layer = document.getElementById("homeosCelebration");
            if (!layer)
                return;
            this.setText("celebrationKicker", options.kicker || "MOMENTUM");
            this.setText("celebrationTitle", options.title || "Beautiful work.");
            this.setText("celebrationMessage", options.message || "One thoughtful step is complete.");
            layer.hidden = false;
            layer.classList.remove("is-active");
            void layer.offsetWidth;
            layer.classList.add("is-active");
            clearTimeout(this.celebrationTimer);
            this.celebrationTimer = setTimeout(() => this.dismissCelebration(), options.duration || 4300);
        },
        dismissCelebration() {
            const layer = document.getElementById("homeosCelebration");
            if (!layer || layer.hidden)
                return;
            layer.classList.remove("is-active");
            setTimeout(() => {
                if (layer)
                    layer.hidden = true;
            }, 260);
        },
        // --- Sign out + events ---
        async signOut() {
            const button = document.getElementById("signOutButton");
            if (button) {
                button.disabled = true;
                button.textContent = "Signing out…";
            }
            try {
                const { error } = await window.HomeOS.auth.signOut();
                if (error)
                    throw error;
                window.location.replace(this.href(window.HomeOS.config?.routes?.login || "login.html"));
            }
            catch (error) {
                console.error("[HOME OS] Could not sign out.", error);
                if (button) {
                    button.disabled = false;
                    button.textContent = "Sign Out";
                }
                this.notify("We could not sign you out. Please try again.", {
                    tone: "attention",
                    title: "Sign out failed"
                });
            }
        },
        bindEvents() {
            document.addEventListener("click", event => {
                if (event.target.closest("#themeToggle")) {
                    event.preventDefault();
                    this.toggleTheme();
                    return;
                }
                if (event.target.closest("#commandButton, #mobileCommandButton")) {
                    event.preventDefault();
                    this.openCommandPalette();
                    return;
                }
                if (event.target.closest("[data-command-close]")) {
                    event.preventDefault();
                    this.closeCommandPalette();
                    return;
                }
                if (event.target.closest("#accountMenuButton")) {
                    event.preventDefault();
                    this.toggleAccountMenu();
                    return;
                }
                if (event.target.closest("#mobileMenuButton")) {
                    event.preventDefault();
                    this.toggleMobileMenu();
                    return;
                }
                if (event.target.closest("#mobileNavBackdrop")) {
                    event.preventDefault();
                    this.closeMobileMenu();
                    return;
                }
                if (event.target.closest("#signOutButton")) {
                    event.preventDefault();
                    this.signOut();
                    return;
                }
                if (event.target.closest("#celebrationDismiss")) {
                    event.preventDefault();
                    this.dismissCelebration();
                    return;
                }
                if (event.target.closest(".homeos-notice-close")) {
                    event.preventDefault();
                    this.dismissNotice();
                    return;
                }
                if (!event.target.closest("#accountMenu")) {
                    this.closeAccountMenu();
                }
            });
            document.addEventListener("input", event => {
                if (event.target.id === "homeosCommandInput") {
                    this.renderCommandResults(event.target.value);
                }
            });
            document.addEventListener("keydown", event => {
                const shortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
                if (shortcut) {
                    event.preventDefault();
                    this.openCommandPalette();
                    return;
                }
                const palette = document.getElementById("homeosCommandPalette");
                const paletteOpen = palette && !palette.hidden;
                if (paletteOpen && event.key === "ArrowDown") {
                    event.preventDefault();
                    this.moveCommandSelection(1);
                    return;
                }
                if (paletteOpen && event.key === "ArrowUp") {
                    event.preventDefault();
                    this.moveCommandSelection(-1);
                    return;
                }
                if (paletteOpen && event.key === "Enter") {
                    event.preventDefault();
                    this.openSelectedCommand();
                    return;
                }
                if (event.key === "Escape") {
                    this.closeCommandPalette();
                    this.closeAccountMenu();
                    this.closeMobileMenu();
                    this.dismissCelebration();
                }
            });
            window.addEventListener("resize", () => {
                if (window.innerWidth > 980)
                    this.closeMobileMenu();
            });
            // Pages can use these shared events after a task or area is completed.
            window.addEventListener("homeos:task-complete", event => {
                if (event.detail?.celebrate === false)
                    return;
                this.celebrateTask(event.detail?.name || "That task", event.detail || {});
            });
            window.addEventListener("homeos:area-complete", event => {
                if (event.detail?.celebrate === false)
                    return;
                this.celebrateArea(event.detail?.name || "This area", event.detail || {});
            });
            window.addEventListener("homeos:notify", event => {
                if (!event.detail?.message)
                    return;
                this.notify(event.detail.message, event.detail);
            });
        },
        // --- Small helpers ---
        isMac() {
            return /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent || "");
        },
        setText(id, value) {
            const target = document.getElementById(id);
            if (target)
                target.textContent = String(value ?? "");
        },
        escape(value) {
            return String(value ?? "")
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        }
    };
    // --- Start ---
    window.HomeOS.shell = HomeShell;
    await HomeShell.init();
});
