/* ============================================================
   HOMEOS // INVENTORY RENDER

   Main Inventory page rendering.
============================================================ */

(function registerInventoryRenderModule() {
    "use strict";
    window.HomeOS = window.HomeOS || {};
    window.HomeOS.inventoryPageModules =
        window.HomeOS.inventoryPageModules || {};
    window.HomeOS.inventoryPageModules.render = {
        // --- Master Render ---
        render(providedState = null) {
            const state = providedState ||
                HomeStore.getState();
            this.renderGuide(state);
            this.renderZones(state);
            this.renderSelectedZone(state);
            this.renderItems(state);
            this.renderShortages(state);
            this.renderShoppingList(state);
            this.renderDialogZones(state);
        },
        // --- Clock ---
        startClock() {
            this.renderDate();
            if (this.clockTimer) {
                clearInterval(this.clockTimer);
            }
            this.clockTimer =
                setInterval(() => {
                    this.renderDate();
                }, 1000);
        },
        renderDate() {
            const now = new Date();
            const dateLabel = now.toLocaleDateString("en-US", {
                month: "short",
                day: "2-digit",
                year: "numeric"
            })
                .toUpperCase();
            const dayLabel = now.toLocaleDateString("en-US", {
                weekday: "long"
            })
                .toUpperCase();
            const timeLabel = now.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                second: "2-digit",
                hour12: true
            });
            this.setText("inventoryDateTime", `${HomeApp.formatDate(now)} · ${HomeApp.formatTime(now)}`);
            // Main Inventory dashboard
            this.setText("inventoryDateLarge", dateLabel);
            this.setText("inventoryDayLabel", dayLabel);
            this.setText("inventoryTimeLarge", timeLabel);
            // Selected-location dashboard
            this.setText("inventoryLocationDateLarge", dateLabel);
            this.setText("inventoryLocationDayLabel", dayLabel);
            this.setText("inventoryLocationTimeLarge", timeLabel);
        },
        // --- Dedicated Inventory Guide ---
        applySeasonalIdentity() {
            document.body.removeAttribute("data-inventory-season");
            this.setText("inventorySeasonLabel", "INVENTORY MODE");
            this.setText("inventorySeasonEyebrow", "HOME OS // INVENTORY");
            this.setText("inventorySeasonName", "Household Inventory");
            const mascot = document.getElementById("inventorySeasonMascot");
            if (mascot) {
                mascot.src =
                    "assets/images/branding/inventory-mascot.png";
                mascot.alt =
                    "HOME OS inventory guide";
            }
        },
        // --- Inventory Core ---
        renderHero(state) {
            const inventory = state.inventory;
            const hasTrackedItems = Array.isArray(inventory.items) &&
                inventory.items.length >
                    0;
            const health = this.calculateInventoryHealth(inventory.items);
            const low = inventory.lowItems
                .length;
            const shopping = inventory.shoppingList
                .length;
            this.setText("inventoryHealthValue", hasTrackedItems
                ? `${health}%`
                : "—");
            this.setText("inventoryHealthStatus", !hasTrackedItems
                ? "START TRACKING"
                : health >=
                    90
                    ? "WELL STOCKED"
                    : health >=
                        75
                        ? "MOSTLY STOCKED"
                        : health >=
                            55
                            ? "RESTOCKING"
                            : "NEEDS ATTENTION");
            this.setText("heroLowCount", low);
            this.setText("heroShoppingCount", shopping);
            this.setText("heroAutoStatus", inventory.autoAddShortages
                ? "On"
                : "Off");
            const ring = document.getElementById("inventoryHealthRing");
            if (ring) {
                ring.style.setProperty("--inventory-health", `${hasTrackedItems
                    ? Math.round(health *
                        3.6)
                    : 0}deg`);
            }
        },
        // --- Inventory Guide ---
        renderGuide(state) {
            const inventory = state.inventory;
            const button = document.getElementById("inventoryGuideAction");
            if (!Array.isArray(inventory.items) ||
                !inventory.items.length) {
                this.setText("inventoryGuideStatus", "READY TO TRACK");
                this.setText("inventoryGuideMessage", "Inventory is ready. Add the first real item from your home and HomeOS will begin building stock health and shortage intelligence.");
                this.configureGuideButton(button, "add-item", "ADD FIRST ITEM →");
                return;
            }
            const checkedCount = inventory.shoppingList
                .filter(item => item.checked)
                .length;
            const lowItems = [
                ...inventory.lowItems
            ]
                .sort((first, second) => {
                const firstRatio = Number(first.target)
                    ? Number(first.current) /
                        Number(first.target)
                    : 1;
                const secondRatio = Number(second.target)
                    ? Number(second.current) /
                        Number(second.target)
                    : 1;
                return (firstRatio -
                    secondRatio);
            });
            // FIRST PRIORITY: checked shopping items are ready to finish.
            if (checkedCount) {
                this.setText("inventoryGuideStatus", "PURCHASE READY");
                this.setText("inventoryGuideMessage", `${checkedCount} shopping item${checkedCount === 1 ? " is" : "s are"} checked. Mark them purchased and HomeOS will update linked stock automatically.`);
                this.configureGuideButton(button, "purchase", `MARK PURCHASED (${checkedCount}) →`);
                return;
            }
            // SECOND PRIORITY: strongest stock shortage.
            if (lowItems.length) {
                const priority = lowItems[0];
                const zone = inventory.zones
                    .find(item => item.id ===
                    priority.zoneId);
                const needed = Math.max(0, Number(priority.target) -
                    Number(priority.current));
                this.setText("inventoryGuideStatus", "RESTOCK SIGNAL");
                this.setText("inventoryGuideMessage", `${priority.name} is one of the strongest shortages${zone ? ` in ${zone.name}` : ""}. HomeOS shows ${needed} ${priority.unit || "needed"} to reach your preferred stock.`);
                this.configureGuideButton(button, "shortages", "OPEN RESTOCK CENTER →");
                return;
            }
            // THIRD PRIORITY: list already has shopping on it.
            if (inventory.shoppingList
                .length) {
                this.setText("inventoryGuideStatus", "SHOPPING ACTIVE");
                this.setText("inventoryGuideMessage", `${inventory.shoppingList.length} item${inventory.shoppingList.length === 1 ? " is" : "s are"} waiting on the shared HomeOS Shopping List.`);
                this.configureGuideButton(button, "shopping", "OPEN SHOPPING LIST →");
                return;
            }
            // EVERYTHING IS HEALTHY.
            this.setText("inventoryGuideStatus", "STOCK STABLE");
            this.setText("inventoryGuideMessage", "Your tracked inventory is at target. HomeOS will keep watching Current versus Keep Stocked At.");
            this.configureGuideButton(button, "add-item", "ADD INVENTORY ITEM →");
        },
        configureGuideButton(button, action, label) {
            if (!button) {
                return;
            }
            button.dataset
                .inventoryGuideAction =
                action;
            button.textContent =
                label;
        },
        // --- Metrics ---
        renderMetrics(state) {
            const inventory = state.inventory;
            const items = inventory.items;
            const low = inventory.lowItems;
            const shopping = inventory.shoppingList;
            this.setText("trackedItemsMetric", items.length);
            this.setText("trackedItemsDetail", items.length
                ? `${items.length} household item${items.length === 1 ? "" : "s"} currently tracked.`
                : "Add your first real household item to begin tracking.");
            this.setText("lowStockMetric", low.length);
            this.setText("lowStockDetail", low.length
                ? `${low.length} item${low.length === 1 ? " is" : "s are"} below preferred stock.`
                : items.length
                    ? "Everything is currently at target."
                    : "No stock levels are being tracked yet.");
            this.setText("shoppingMetric", shopping.length);
            this.setText("shoppingMetricDetail", shopping.length
                ? `${shopping.length} item${shopping.length === 1 ? "" : "s"} currently on the shopping list.`
                : "Your shopping list is clear.");
            this.setText("storageZonesMetric", String(inventory.zones
                .length)
                .padStart(2, "0"));
        },
        // --- Storage Location Cards ---
        getZoneCardIcon(zone) {
            const common = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
            const iconKey = this.getLocationVisualKey(typeof zone === "string"
                ? { id: zone }
                : zone);
            const icons = {
                pantry: `
                    <svg ${common}>
                        <path d="M4 5.5h16" />
                        <path d="M4 12h16" />
                        <path d="M4 18.5h16" />
                        <path d="M6.5 5.5V3.8h3v1.7" />
                        <path d="M14.5 5.5V3.8h3v1.7" />
                        <path d="M6 12V9h4v3" />
                        <path d="M14 12V8.7h4V12" />
                        <path d="M6.5 18.5V15h3v3.5" />
                        <path d="M14 18.5V15h4v3.5" />
                    </svg>
                `,
                refrigerator: `
                    <svg ${common}>
                        <rect x="6" y="2.8" width="12" height="18.4" rx="2.2" />
                        <path d="M6 10h12" />
                        <path d="M9 6.2v1.7" />
                        <path d="M9 13v3" />
                    </svg>
                `,
                "kitchen-freezer": `
                    <svg ${common}>
                        <rect x="5" y="3.5" width="14" height="17" rx="2.3" />
                        <path d="M5 9h14" />
                        <path d="M12 11.8v5.2" />
                        <path d="M9.7 13.1l4.6 2.6" />
                        <path d="M14.3 13.1l-4.6 2.6" />
                    </svg>
                `,
                "deep-freezer": `
                    <svg ${common}>
                        <path d="M4 8h16l-1 11H5L4 8Z" />
                        <path d="M3.5 8 5 4.8h14L20.5 8" />
                        <path d="M9.4 12.3h5.2" />
                        <path d="M12 10.8v3" />
                        <path d="M10.7 11.5l2.6 1.5" />
                        <path d="M13.3 11.5 10.7 13" />
                    </svg>
                `,
                "mini-fridge": `
                    <svg ${common}>
                        <rect x="6.2" y="3" width="11.6" height="18" rx="2.2" />
                        <path d="M6.2 9.2h11.6" />
                        <path d="M9 5.9v1.2" />
                        <path d="M10 12.1h4" />
                        <path d="M10.8 12.1v5.1" />
                        <path d="M13.2 12.1v5.1" />
                    </svg>
                `,
                household: `
                    <svg ${common}>
                        <path d="M4 9.5h16l-1.3 9.7H5.3L4 9.5Z" />
                        <path d="M8 9.5 10 5h4l2 4.5" />
                        <path d="M8.3 13.2v2.4" />
                        <path d="M12 13.2v2.4" />
                        <path d="M15.7 13.2v2.4" />
                    </svg>
                `,
                storage: `
                    <svg ${common}>
                        <path d="M4.5 6.5h15v13h-15z" />
                        <path d="M3.5 6.5 6 3.8h12l2.5 2.7" />
                        <path d="M9 10.5h6" />
                        <path d="M9 14h6" />
                    </svg>
                `
            };
            return (icons[iconKey] ||
                icons.storage);
        },
        renderZones(state) {
            const container = document.getElementById("inventoryZoneGrid");
            if (!container) {
                return;
            }
            container.innerHTML =
                state.inventory
                    .zones
                    .map(zone => {
                    const items = state.inventory
                        .items
                        .filter(item => item.zoneId ===
                        zone.id);
                    const lowCount = items
                        .filter(item => Number(item.current) <
                        Number(item.target))
                        .length;
                    const health = this.calculateZoneHealth(items);
                    const statusLabel = !items.length
                        ? "READY TO TRACK"
                        : lowCount
                            ? `${lowCount} LOW`
                            : "STOCKED";
                    const statusClass = !items.length
                        ? "empty"
                        : lowCount
                            ? "attention"
                            : "stable";
                    return `

                                <button
                                    class="
                                        inventory-zone-card
                                        inventory-zone-card-${statusClass}
                                        ${zone.id === this.selectedZone ? "selected" : ""}
                                    "

                                    type="button"

                                    data-inventory-zone="${HomeApp.escapeHtml(zone.id)}"

                                    style="
                                        --zone-color:
                                            ${zone.color};
                                    "
                                >

                                    <span
                                        class="inventory-zone-card-glow"
                                        aria-hidden="true"
                                    ></span>


                                    <div class="inventory-zone-top">

                                        <div class="inventory-zone-mark">

                                            <span class="inventory-zone-icon">
                                                ${this.getZoneCardIcon(zone)}
                                            </span>

                                            <span class="inventory-zone-code">
                                                ${HomeApp.escapeHtml(zone.code)}
                                            </span>

                                        </div>


                                        <span
                                            class="
                                                inventory-zone-status
                                                inventory-zone-status-${statusClass}
                                            "
                                        >
                                            ${statusLabel}
                                        </span>

                                    </div>


                                    <div class="inventory-zone-copy">

                                        <h3>
                                            ${HomeApp.escapeHtml(zone.name)}
                                        </h3>

                                        <p>
                                            ${HomeApp.escapeHtml(zone.description)}
                                        </p>

                                    </div>


                                    <div class="inventory-zone-stats">

                                        <div>
                                            <span>TRACKED</span>
                                            <strong>
                                                ${items.length}
                                            </strong>
                                        </div>

                                        <div>
                                            <span>STOCK HEALTH</span>
                                            <strong>
                                                ${items.length ? `${health}%` : "—"}
                                            </strong>
                                        </div>

                                    </div>


                                    <div class="inventory-zone-track">

                                        <span
                                            style="
                                                width:
                                                    ${items.length ? health : 0}%;
                                            "
                                        ></span>

                                    </div>


                                    <div class="inventory-zone-open">

                                        <span>
                                            Open
                                        </span>

                                        <strong aria-hidden="true">
                                            →
                                        </strong>

                                    </div>

                                </button>

                            `;
                })
                    .join("");
        },
        // --- Selected Storage Node ---
        renderSelectedZone(state) {
            const zone = state.inventory
                .zones
                .find(item => item.id ===
                this.selectedZone);
            if (!zone) {
                return;
            }
            const items = state.inventory
                .items
                .filter(item => item.zoneId ===
                zone.id);
            const health = this.calculateZoneHealth(items);
            const low = items
                .filter(item => Number(item.current) <
                Number(item.target))
                .length;
            this.setText("selectedInventoryZoneCode", zone.code);
            this.setText("selectedInventoryZoneName", zone.name);
            this.setText("selectedInventoryZoneDescription", zone.description);
            this.setText("inventoryAreaGuideLabel", `KEEP ${String(zone.name || "THIS AREA").toUpperCase()} CURRENT`);
            this.setText("inventorySearchTitle", `Search ${zone.name}`);
            this.setText("selectedInventoryAreaTitle", zone.name);
            this.setText("selectedInventoryAreaCopy", `${zone.name} shortages roll into your whole-home inventory and shopping list automatically.`);
            const searchInput = document.getElementById("inventorySearch");
            if (searchInput) {
                searchInput.placeholder =
                    `Search ${zone.name}...`;
            }
            this.setText("selectedInventoryZoneHealth", items.length
                ? `${health}%`
                : "—");
            this.setText("selectedInventoryZoneState", !items.length
                ? "EMPTY"
                : health >=
                    90
                    ? "STABLE"
                    : health >=
                        70
                        ? "WATCH"
                        : "RESTOCK");
            this.setText("selectedInventoryZoneCount", `${items.length} ITEM${items.length === 1 ? "" : "S"}`);
            this.setText("selectedInventoryZoneLow", `${low} LOW`);
            const accent = document.getElementById("selectedInventoryZoneAccent");
            if (accent) {
                accent.style.background =
                    zone.color;
                accent.style.boxShadow =
                    `0 0 16px ${zone.color}`;
            }
        },
        // --- Inventory Items ---
        renderItems(state) {
            const container = document.getElementById("inventoryItemList");
            if (!container) {
                return;
            }
            let items = state.inventory
                .items
                .filter(item => item.zoneId ===
                this.selectedZone);
            if (this.searchTerm) {
                const term = this.searchTerm
                    .toLowerCase();
                items =
                    items
                        .filter(item => String(item.name ||
                        "")
                        .toLowerCase()
                        .includes(term) ||
                        String(item.category ||
                            "")
                            .toLowerCase()
                            .includes(term));
            }
            if (!items.length) {
                const zone = state.inventory
                    .zones
                    .find(item => item.id ===
                    this.selectedZone);
                const zoneName = zone?.name ||
                    "this storage zone";
                container.innerHTML = `

                    <div class="inventory-empty">

                        <div class="inventory-empty-visual">

                            <span class="inventory-empty-orbit"></span>

                            <strong>
                                ${this.searchTerm
                    ? "0"
                    : "+"}
                            </strong>

                        </div>


                        <div class="inventory-empty-copy">

                            <span class="ui-kicker">

                                ${this.searchTerm
                    ? "SEARCH RESULT // CLEAR"
                    : "STOCK NODE // READY TO TRACK"}

                            </span>


                            <h3>

                                ${this.searchTerm
                    ? `No matches in ${HomeApp.escapeHtml(zoneName)}.`
                    : `Nothing is tracked in ${HomeApp.escapeHtml(zoneName)} yet.`}

                            </h3>


                            <p>

                                ${this.searchTerm
                    ? "Try another item name or category. Your saved Inventory has not been changed."
                    : "Add a real item from your home, then enter its Current and Keep Stocked At values. HomeOS will calculate stock health and shortages from those numbers."}

                            </p>


                            ${this.searchTerm
                    ? ""
                    : `

                                        <button
                                            class="button button-primary inventory-empty-action"
                                            type="button"
                                            data-open-inventory-item
                                        >
                                            Track First Item →
                                        </button>

                                    `}

                        </div>

                    </div>

                `;
                return;
            }
            container.innerHTML =
                items
                    .slice()
                    .sort((first, second) => String(first.name ||
                    "")
                    .localeCompare(String(second.name ||
                    "")))
                    .map(item => {
                    const current = Math.max(0, Number(item.current) ||
                        0);
                    const target = Math.max(1, Number(item.target) ||
                        1);
                    const needed = Math.max(0, target -
                        current);
                    const stock = this.getStockState(item);
                    const onList = state.inventory
                        .shoppingList
                        .some(entry => entry.sourceType ===
                        "inventory" &&
                        entry.inventoryItemId ===
                            item.id);
                    const safeId = HomeApp.escapeHtml(item.id);
                    return `

                                <article
                                    class="
                                        inventory-item-row
                                        ${stock.className}
                                    "
                                >

                                    <div class="inventory-item-main">

                                        <span
                                            class="
                                                inventory-item-signal
                                                ${stock.className}
                                            "
                                        ></span>


                                        <div>

                                            <strong>
                                                ${HomeApp.escapeHtml(item.name)}
                                            </strong>

                                            <span>

                                                ${HomeApp.escapeHtml(item.category || "Uncategorized")}

                                                ${item.unit
                        ? ` · ${HomeApp.escapeHtml(item.unit)}`
                        : ""}

                                            </span>

                                        </div>

                                    </div>


                                    <span
                                        class="
                                            inventory-value
                                            inventory-current
                                        "
                                    >
                                        ${current}
                                    </span>


                                    <span class="inventory-value">
                                        ${target}
                                    </span>


                                    <span
                                        class="
                                            inventory-value
                                            inventory-need
                                            ${needed === 0 ? "none" : ""}
                                        "
                                    >

                                        ${needed
                        ? `+${needed}`
                        : "—"}

                                    </span>


                                    <span
                                        class="
                                            stock-state
                                            ${stock.className}
                                        "
                                    >
                                        ${stock.label}
                                    </span>


                                    <div class="inventory-controls">

                                        <button
                                            class="quantity-button"
                                            type="button"
                                            data-adjust-item="${safeId}"
                                            data-adjust-value="-1"
                                            aria-label="Decrease ${HomeApp.escapeHtml(item.name)}"
                                        >
                                            −
                                        </button>


                                        <button
                                            class="quantity-button"
                                            type="button"
                                            data-adjust-item="${safeId}"
                                            data-adjust-value="1"
                                            aria-label="Increase ${HomeApp.escapeHtml(item.name)}"
                                        >
                                            +
                                        </button>


                                        ${needed
                        ? `

                                                    <button
                                                        class="
                                                            inventory-row-action
                                                            add-need
                                                            ${onList ? "in-list" : ""}
                                                        "

                                                        type="button"

                                                        data-add-shortage="${safeId}"
                                                    >

                                                        ${onList
                            ? "In List ✓"
                            : `Add +${needed}`}

                                                    </button>

                                                `
                        : ""}


                                        <button
                                            class="inventory-row-action"
                                            type="button"
                                            data-edit-item="${safeId}"
                                        >
                                            Edit
                                        </button>


                                        <button
                                            class="inventory-row-action danger"
                                            type="button"
                                            data-delete-item="${safeId}"
                                            aria-label="Delete ${HomeApp.escapeHtml(item.name)}"
                                        >
                                            Delete
                                        </button>

                                    </div>

                                </article>

                            `;
                })
                    .join("");
        },
        getStockState(item) {
            const current = Math.max(0, Number(item.current) ||
                0);
            const target = Math.max(1, Number(item.target) ||
                1);
            if (current ===
                0) {
                return {
                    label: "OUT",
                    className: "out"
                };
            }
            if (current <
                target) {
                return {
                    label: "LOW",
                    className: "low"
                };
            }
            return {
                label: "STOCKED",
                className: "stocked"
            };
        },
    };
})();
