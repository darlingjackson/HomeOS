/* ============================================================
   HOMEOS // INVENTORY SHOPPING

   Shopping list and restock behavior.
============================================================ */

(function registerInventoryShoppingModule() {
    "use strict";
    window.HomeOS = window.HomeOS || {};
    window.HomeOS.inventoryPageModules =
        window.HomeOS.inventoryPageModules || {};
    window.HomeOS.inventoryPageModules.shopping = {
        // --- Current Quantity + / ---
        async adjustItem(itemId, amount) {
            try {
                await this.commitDatabaseChange(state => {
                    const item = state.inventory.items.find(
                        value => value.id === itemId
                    );

                    if (!item) {
                        return false;
                    }

                    item.current = Math.max(
                        0,
                        Number(item.current || 0) + Number(amount || 0)
                    );

                    item.updatedAt = new Date().toISOString();
                    return true;
                });
            } catch (error) {
                this.handlePersistenceError(
                    "update the inventory quantity",
                    error
                );
            }
        },
        // --- Shortages ---
        renderShortages(state) {
            const container = document.getElementById("shortageList");
            const toggle = document.getElementById("autoRestockToggle");
            if (toggle) {
                toggle.checked =
                    Boolean(state.inventory
                        .autoAddShortages);
            }
            if (!container) {
                return;
            }
            const lowItems = state.inventory
                .lowItems
                .slice()
                .sort((first, second) => (second.target -
                second.current) -
                (first.target -
                    first.current));
            this.setText("shortageCountPill", `${lowItems.length} SHORTAGE${lowItems.length === 1 ? "" : "S"}`);
            const addAllButton = document.getElementById("addAllShortagesButton");
            if (addAllButton) {
                addAllButton.disabled =
                    lowItems.length ===
                        0;
            }
            if (!lowItems.length) {
                const hasTrackedItems = Array.isArray(state.inventory.items) &&
                    state.inventory.items.length >
                        0;
                container.innerHTML = `

                    <div class="inventory-restock-empty">

                        <div class="inventory-restock-empty-icon">

                            ${hasTrackedItems
                    ? "✓"
                    : "+"}

                        </div>


                        <div>

                            <span class="ui-kicker">

                                ${hasTrackedItems
                    ? "RESTOCK STATUS // HEALTHY"
                    : "RESTOCK STATUS // WAITING FOR INVENTORY"}

                            </span>


                            <h3>

                                ${hasTrackedItems
                    ? "Nothing needs restocking."
                    : "Inventory tracking has not started yet."}

                            </h3>


                            <p>

                                ${hasTrackedItems
                    ? "Every tracked item is currently at or above its Keep Stocked At value. HomeOS will create a shortage here as soon as Current stock drops below Target."
                    : "Shopping-list items can still exist, but HomeOS cannot calculate Inventory shortages until you track real household stock with Current and Keep Stocked At values."}

                            </p>


                            ${hasTrackedItems
                    ? ""
                    : `

                                        <button
                                            class="button button-secondary inventory-restock-start"
                                            type="button"
                                            data-open-inventory-item
                                        >
                                            Start Tracking Inventory
                                        </button>

                                    `}

                        </div>

                    </div>

                `;
                return;
            }
            container.innerHTML =
                lowItems
                    .map(item => {
                    const zone = state.inventory
                        .zones
                        .find(value => value.id ===
                        item.zoneId);
                    const needed = Math.max(0, item.target -
                        item.current);
                    const onList = state.inventory
                        .shoppingList
                        .some(entry => entry.sourceType ===
                        "inventory" &&
                        entry.inventoryItemId ===
                            item.id);
                    return `

                                <div class="shortage-row">

                                    <div class="shortage-main">

                                        <span
                                            class="shortage-zone-dot"

                                            style="
                                                --shortage-color:
                                                    ${zone?.color || "#f15fa9"};
                                            "
                                        ></span>


                                        <div>

                                            <strong>
                                                ${HomeApp.escapeHtml(item.name)}
                                            </strong>

                                            <span>

                                                ${HomeApp.escapeHtml(zone?.name || "Home Inventory")}
                                                · Have ${item.current}
                                                / Target ${item.target}

                                            </span>

                                        </div>

                                    </div>


                                    <div class="shortage-action">

                                        <strong class="shortage-need">
                                            +${needed}
                                        </strong>


                                        <button
                                            class="
                                                shortage-add-button
                                                ${onList ? "added" : ""}
                                            "

                                            type="button"

                                            data-add-shortage="${HomeApp.escapeHtml(item.id)}"
                                        >

                                            ${onList
                        ? "On List ✓"
                        : `Add +${needed}`}

                                        </button>

                                    </div>

                                </div>

                            `;
                })
                    .join("");
        },
        async addShortage(itemId) {
            let itemName = "";
            let existed = false;

            try {
                const result = await this.commitDatabaseChange(state => {
                    const item = state.inventory.items.find(
                        value => value.id === itemId
                    );

                    if (!item) {
                        return false;
                    }

                    const needed = Math.max(
                        0,
                        Number(item.target) - Number(item.current)
                    );

                    if (!needed) {
                        return false;
                    }

                    itemName = item.name;

                    const existing = state.inventory.shoppingList.find(
                        entry =>
                            entry.sourceType === "inventory" &&
                            entry.inventoryItemId === item.id
                    );

                    if (existing) {
                        existed = true;
                        existing.name = item.name;
                        existing.quantity = needed;
                        existing.quantityMode = "needed";
                        existing.unit = item.unit || "";
                        existing.checked = false;
                        return true;
                    }

                    state.inventory.shoppingList.push(
                        this.createInventoryShoppingEntry(item)
                    );

                    return true;
                });

                if (!result.changed || !itemName) {
                    return;
                }

                HomeApp.toast(
                    existed
                        ? `${itemName} reset to the current shortage.`
                        : `${itemName} added to the shopping list.`
                );
            } catch (error) {
                this.handlePersistenceError(
                    "add the shortage to the shopping list",
                    error
                );
            }
        },

        async addAllShortages() {
            let added = 0;
            let refreshed = 0;

            try {
                const result = await this.commitDatabaseChange(state => {
                    state.inventory.lowItems.forEach(lowItem => {
                        const needed = Math.max(
                            1,
                            lowItem.target - lowItem.current
                        );

                        const existing =
                            state.inventory.shoppingList.find(
                                entry =>
                                    entry.sourceType === "inventory" &&
                                    entry.inventoryItemId === lowItem.id
                            );

                        if (existing) {
                            existing.quantity = needed;
                            existing.quantityMode = "needed";
                            existing.checked = false;
                            refreshed += 1;
                            return;
                        }

                        state.inventory.shoppingList.push(
                            this.createInventoryShoppingEntry(lowItem)
                        );

                        added += 1;
                    });

                    return added > 0 || refreshed > 0;
                });

                if (!result.changed) {
                    HomeApp.toast("Nothing currently needs restocking.");
                    return;
                }

                if (added) {
                    HomeApp.toast(
                        `${added} shortage${added === 1 ? "" : "s"} added to the shopping list.`
                    );
                    return;
                }

                HomeApp.toast("Your shortage quantities are up to date.");
            } catch (error) {
                this.handlePersistenceError(
                    "update the shortage list",
                    error
                );
            }
        },
        createInventoryShoppingEntry(item) {
            const needed = Math.max(1, Number(item.target) -
                Number(item.current));
            return {
                id: this.makeId("shopping"),
                sourceType: "inventory",
                origin: "inventory",
                inventoryItemId: item.id,
                name: item.name,
                quantity: needed,
                quantityMode: "needed",
                unit: item.unit ||
                    "",
                checked: false,
                addedAt: new Date()
                    .toISOString()
            };
        },
        // --- Custom Shopping ---
        renderCustomShoppingLocationOptions() {
            const select = document.getElementById("customShoppingLocation");
            if (!select) {
                return;
            }
            const currentValue = select.value ||
                this.selectedZone ||
                "";
            const zones = Array.isArray(this.ZONES)
                ? this.ZONES
                : [];
            const zoneOptions = zones
                .map(zone => `
                        <option
                            value="${HomeApp.escapeHtml(zone.id)}"
                            ${String(zone.id) === String(currentValue) ? "selected" : ""}
                        >
                            ${HomeApp.escapeHtml(zone.name)}
                        </option>
                    `)
                .join("");
            select.innerHTML = `
                ${zoneOptions}
                <option
                    value="__other__"
                    ${currentValue === "__other__" ? "selected" : ""}
                >
                    Other...
                </option>
            `;
            select.disabled = false;
            if (currentValue &&
                (currentValue === "__other__" ||
                    zones.some(zone => String(zone.id) ===
                        String(currentValue)))) {
                select.value = currentValue;
            }
            else if (zones.length) {
                select.value = zones[0].id;
            }
            else {
                select.value = "__other__";
            }
            this.syncCustomShoppingOtherField();
        },
        syncCustomShoppingOtherField() {
            const select = document.getElementById("customShoppingLocation");
            const otherInput = document.getElementById("customShoppingOtherLocation");
            if (!select || !otherInput) {
                return;
            }
            const isOther = select.value ===
                "__other__";
            otherInput.hidden =
                !isOther;
            otherInput.disabled =
                !isOther;
        },
        async addCustomShoppingItem() {
            const nameInput = document.getElementById("customShoppingName");
            const quantityInput = document.getElementById("customShoppingQty");
            const locationSelect = document.getElementById("customShoppingLocation");
            const otherLocationInput = document.getElementById(
                "customShoppingOtherLocation"
            );

            if (!nameInput || !quantityInput || !locationSelect) {
                return;
            }

            const name = nameInput.value.trim();
            const quantity = Math.max(
                1,
                Number(quantityInput.value) || 1
            );

            const selectedLocationValue = String(
                locationSelect.value || ""
            );

            const isOtherLocation =
                selectedLocationValue === "__other__";

            const destinationZoneId = isOtherLocation
                ? ""
                : selectedLocationValue;

            const destinationZone = isOtherLocation
                ? null
                : this.ZONES.find(
                    zone =>
                        String(zone.id) ===
                        destinationZoneId
                );

            const destinationLabel = isOtherLocation
                ? String(otherLocationInput?.value || "").trim() || "Other"
                : "";

            const destinationName =
                destinationZone?.name || destinationLabel;

            if (!name) {
                HomeApp.toast("Type an item before adding it.");
                nameInput.focus();
                return;
            }

            if (!isOtherLocation && !destinationZone) {
                HomeApp.toast(
                    "Choose where this item should be stored."
                );
                locationSelect.focus();
                return;
            }

            try {
                let merged = false;

                await this.commitDatabaseChange(state => {
                    const normalizedName = name.toLowerCase();
                    const normalizedDestinationLabel =
                        destinationLabel.toLowerCase();

                    const existing =
                        state.inventory.shoppingList.find(
                            entry =>
                                entry.sourceType === "custom" &&
                                String(entry.name || "")
                                    .trim()
                                    .toLowerCase() === normalizedName &&
                                String(entry.destinationZoneId || "") ===
                                    destinationZoneId &&
                                String(entry.destinationLabel || "")
                                    .trim()
                                    .toLowerCase() ===
                                    normalizedDestinationLabel
                        );

                    if (existing) {
                        existing.quantity =
                            Math.max(
                                1,
                                Number(existing.quantity) || 1
                            ) + quantity;

                        existing.quantityMode = "manual";
                        existing.checked = false;
                        merged = true;
                        return true;
                    }

                    state.inventory.shoppingList.push({
                        id: this.makeId("shopping-custom"),
                        sourceType: "custom",
                        origin: "inventory-custom",
                        inventoryItemId: null,
                        destinationZoneId,
                        destinationLabel,
                        name,
                        quantity,
                        quantityMode: "manual",
                        unit: "",
                        checked: false,
                        addedAt: new Date().toISOString()
                    });

                    return true;
                });

                nameInput.value = "";
                quantityInput.value = 1;

                if (isOtherLocation && otherLocationInput) {
                    otherLocationInput.value = "";
                }

                HomeApp.toast(
                    merged
                        ? `${name} was already on the list for ${destinationName}, so HomeOS increased the quantity.`
                        : `${name} added to the shopping list for ${destinationName}.`
                );
            } catch (error) {
                this.handlePersistenceError(
                    "add the shopping item",
                    error
                );
            }
        },
        // --- Shopping List ---
        renderShoppingList(state) {
            this.renderCustomShoppingLocationOptions();
            const container = document.getElementById("shoppingList");
            if (!container) {
                return;
            }
            const list = state.inventory
                .shoppingList;
            this.setText("shoppingCountPill", `${list.length} ITEM${list.length === 1 ? "" : "S"}`);
            const checkedCount = list
                .filter(item => item.checked)
                .length;
            const purchaseButton = document.getElementById("markPurchasedButton");
            if (purchaseButton) {
                purchaseButton.disabled =
                    checkedCount ===
                        0;
                purchaseButton.textContent =
                    checkedCount
                        ? `Mark Purchased (${checkedCount})`
                        : "Mark Purchased";
            }
            if (!list.length) {
                container.innerHTML = `

                    <div class="empty-state">

                        <div class="empty-state-icon">
                            ♡
                        </div>

                        <div>

                            <h3>
                                Your shopping list is clear.
                            </h3>

                            <p>
                                Add shortages from the left or type
                                anything else you need above.
                            </p>

                        </div>

                    </div>

                `;
                return;
            }
            container.innerHTML =
                list
                    .map(entry => {
                    const source = this.getShoppingSourceLabel(entry, state);
                    const safeId = HomeApp.escapeHtml(entry.id);
                    return `

                                <div
                                    class="
                                        shopping-row
                                        ${entry.checked ? "checked" : ""}
                                    "
                                >

                                    <input
                                        class="shopping-check"

                                        type="checkbox"

                                        data-shopping-check="${safeId}"

                                        ${entry.checked ? "checked" : ""}

                                        aria-label="Mark ${HomeApp.escapeHtml(entry.name)} as purchased"
                                    >


                                    <div class="shopping-item-main">

                                        <strong>
                                            ${HomeApp.escapeHtml(entry.name)}
                                        </strong>

                                        <span>

                                            ${HomeApp.escapeHtml(source)}

                                            ${entry.unit
                        ? ` · ${HomeApp.escapeHtml(entry.unit)}`
                        : ""}

                                        </span>

                                    </div>


                                    <div class="shopping-quantity-control">

                                        <button
                                            type="button"

                                            data-shopping-adjust="${safeId}"

                                            data-shopping-value="-1"

                                            aria-label="Decrease shopping quantity"
                                        >
                                            −
                                        </button>


                                        <strong>

                                            ${Math.max(1, Number(entry.quantity) ||
                        1)}

                                        </strong>


                                        <button
                                            type="button"

                                            data-shopping-adjust="${safeId}"

                                            data-shopping-value="1"

                                            aria-label="Increase shopping quantity"
                                        >
                                            +
                                        </button>

                                    </div>


                                    <button
                                        class="shopping-remove"

                                        type="button"

                                        data-remove-shopping="${safeId}"

                                        aria-label="Remove ${HomeApp.escapeHtml(entry.name)}"
                                    >
                                        ×
                                    </button>

                                </div>

                            `;
                })
                    .join("");
        },
        // --- Shopping Source ---
        getShoppingSourceLabel(entry, state) {
            if (entry.origin ===
                "seasonal") {
                if (entry.sourceLabel) {
                    return entry.sourceLabel;
                }
                const seasonNames = {
                    spring: "Spring Renewal",
                    summer: "Summer Reset",
                    fall: "Fall Refresh",
                    winter: "Winter Reset"
                };
                return (seasonNames[entry.season] ||
                    "Seasonal Home Care");
            }
            if (entry.sourceType ===
                "custom") {
                const destination = state.inventory
                    .zones
                    .find(zone => String(zone.id) ===
                    String(entry.destinationZoneId || ""));
                const destinationLabel = String(entry.destinationLabel ||
                    "").trim();
                if (destination) {
                    return `Store in ${destination.name}`;
                }
                if (destinationLabel) {
                    return `Store in ${destinationLabel}`;
                }
                return "Put-away location not set";
            }
            const item = state.inventory
                .items
                .find(value => value.id ===
                entry.inventoryItemId);
            const zone = state.inventory
                .zones
                .find(value => value.id ===
                item?.zoneId);
            return (zone?.name ||
                "Home Inventory");
        },
        async adjustShoppingQuantity(entryId, amount) {
            try {
                await this.commitDatabaseChange(state => {
                    const entry = state.inventory.shoppingList.find(
                        item => item.id === entryId
                    );

                    if (!entry) {
                        return false;
                    }

                    entry.quantity = Math.max(
                        1,
                        Number(entry.quantity || 1) + Number(amount || 0)
                    );

                    entry.quantityMode = "manual";
                    return true;
                });
            } catch (error) {
                this.handlePersistenceError(
                    "update the shopping quantity",
                    error
                );
            }
        },

        async toggleShoppingCheck(entryId) {
            try {
                await this.commitDatabaseChange(state => {
                    const entry = state.inventory.shoppingList.find(
                        item => item.id === entryId
                    );

                    if (!entry) {
                        return false;
                    }

                    entry.checked = !entry.checked;
                    return true;
                });
            } catch (error) {
                this.handlePersistenceError(
                    "update the shopping item",
                    error
                );
            }
        },

        async markPurchased() {
            let purchasedCount = 0;

            try {
                const result = await this.commitDatabaseChange(state => {
                    const purchased =
                        state.inventory.shoppingList.filter(
                            entry => entry.checked
                        );

                    purchasedCount = purchased.length;

                    if (!purchasedCount) {
                        return false;
                    }

                    purchased.forEach(entry => {
                        if (entry.sourceType !== "inventory") {
                            return;
                        }

                        const item = state.inventory.items.find(
                            value =>
                                value.id === entry.inventoryItemId
                        );

                        if (!item) {
                            return;
                        }

                        item.current =
                            Math.max(
                                0,
                                Number(item.current) || 0
                            ) +
                            Math.max(
                                1,
                                Number(entry.quantity) || 1
                            );

                        item.updatedAt =
                            new Date().toISOString();
                    });

                    const purchasedIds = new Set(
                        purchased.map(entry => entry.id)
                    );

                    state.inventory.shoppingList =
                        state.inventory.shoppingList.filter(
                            entry => !purchasedIds.has(entry.id)
                        );

                    return true;
                });

                if (result.changed && purchasedCount) {
                    HomeApp.toast(
                        `${purchasedCount} item${purchasedCount === 1 ? "" : "s"} purchased. Inventory updated.`
                    );
                }
            } catch (error) {
                this.handlePersistenceError(
                    "mark the shopping items purchased",
                    error
                );
            }
        },

        async removeShoppingItem(entryId) {
            try {
                const result = await this.commitDatabaseChange(state => {
                    const before =
                        state.inventory.shoppingList.length;

                    state.inventory.shoppingList =
                        state.inventory.shoppingList.filter(
                            item => item.id !== entryId
                        );

                    return (
                        state.inventory.shoppingList.length !== before
                    );
                });

                if (result.changed) {
                    HomeApp.toast(
                        "Item removed from shopping list."
                    );
                }
            } catch (error) {
                this.handlePersistenceError(
                    "remove the shopping item",
                    error
                );
            }
        },

        async setAutoRestock(enabled) {
            const nextValue = Boolean(enabled);

            try {
                await this.saveAutoRestockPreference(nextValue);

                await this.commitDatabaseChange(state => {
                    state.inventory.autoAddShortages = nextValue;
                    return true;
                });

                HomeApp.toast(
                    nextValue
                        ? "HomeOS will automatically add shortages."
                        : "Automatic shortage adding is off."
                );
            } catch (error) {
                this.handlePersistenceError(
                    "update automatic shortage adding",
                    error
                );
            }
        },
    };
})();
