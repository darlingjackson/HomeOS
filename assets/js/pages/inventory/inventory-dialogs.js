/* ============================================================
   HOMEOS // INVENTORY DIALOGS

   Inventory dialogs and form behavior.
============================================================ */

(function registerInventoryDialogsModule() {
    "use strict";
    window.HomeOS = window.HomeOS || {};
    window.HomeOS.inventoryPageModules =
        window.HomeOS.inventoryPageModules || {};
    window.HomeOS.inventoryPageModules.dialogs = {
        // --- Dialog Unit + Category Controls ---
        renderUnitOptions(selectedValue = "each") {
            const select = document.getElementById("inventoryUnitInput");
            const customInput = document.getElementById("inventoryUnitCustomInput");
            if (!select || !customInput) {
                return;
            }
            const normalized = String(selectedValue || "")
                .trim();
            const standardValues = new Set(this.UNITS.map(unit => unit.value));
            select.innerHTML =
                [
                    ...this.UNITS.map(unit => `
                            <option value="${HomeApp.escapeHtml(unit.value)}">
                                ${HomeApp.escapeHtml(unit.label)}
                            </option>
                        `),
                    `<option value="__custom__">Other / Custom</option>`
                ].join("");
            if (!normalized) {
                select.value = "each";
                customInput.value = "";
                customInput.hidden = true;
                return;
            }
            if (standardValues.has(normalized)) {
                select.value = normalized;
                customInput.value = "";
                customInput.hidden = true;
                return;
            }
            select.value = "__custom__";
            customInput.value = normalized;
            customInput.hidden = false;
        },
        renderCategoryOptions(zoneId, selectedValue = "") {
            const select = document.getElementById("inventoryCategoryInput");
            const customInput = document.getElementById("inventoryCategoryCustomInput");
            if (!select || !customInput) {
                return;
            }
            const zone = this.ZONES.find(item => item.id === zoneId) ||
                {
                    id: zoneId,
                    locationType: "storage"
                };
            const categoryKey = this.getLocationVisualKey(zone);
            const categories = this.CATEGORIES_BY_ZONE[categoryKey] ||
                this.CATEGORIES_BY_ZONE.storage ||
                [];
            const selected = String(selectedValue || "")
                .trim();
            select.innerHTML =
                [
                    `<option value="">No category</option>`,
                    ...categories.map(category => `
                            <option value="${HomeApp.escapeHtml(category)}">
                                ${HomeApp.escapeHtml(category)}
                            </option>
                        `),
                    `<option value="__custom__">Other / Custom</option>`
                ].join("");
            if (!selected) {
                select.value = "";
                customInput.value = "";
                customInput.hidden = true;
                return;
            }
            if (categories.includes(selected)) {
                select.value = selected;
                customInput.value = "";
                customInput.hidden = true;
                return;
            }
            select.value = "__custom__";
            customInput.value = selected;
            customInput.hidden = false;
        },
        syncCustomInventoryFields() {
            const unitSelect = document.getElementById("inventoryUnitInput");
            const unitCustom = document.getElementById("inventoryUnitCustomInput");
            const categorySelect = document.getElementById("inventoryCategoryInput");
            const categoryCustom = document.getElementById("inventoryCategoryCustomInput");
            if (unitCustom && unitSelect) {
                unitCustom.hidden =
                    unitSelect.value !== "__custom__";
                if (!unitCustom.hidden) {
                    requestAnimationFrame(() => unitCustom.focus());
                }
            }
            if (categoryCustom && categorySelect) {
                categoryCustom.hidden =
                    categorySelect.value !== "__custom__";
                if (!categoryCustom.hidden) {
                    requestAnimationFrame(() => categoryCustom.focus());
                }
            }
        },
        getDialogUnitValue() {
            const select = document.getElementById("inventoryUnitInput");
            const custom = document.getElementById("inventoryUnitCustomInput");
            if (!select) {
                return "each";
            }
            if (select.value === "__custom__") {
                return String(custom?.value || "")
                    .trim();
            }
            return select.value || "each";
        },
        getDialogCategoryValue() {
            const select = document.getElementById("inventoryCategoryInput");
            const custom = document.getElementById("inventoryCategoryCustomInput");
            if (!select) {
                return "";
            }
            if (select.value === "__custom__") {
                return String(custom?.value || "")
                    .trim();
            }
            return select.value || "";
        },
        // --- Add / Edit Inventory Item ---
        openItemDialog(itemId = null) {
            const state = HomeStore.getState();
            const dialog = document.getElementById("inventoryItemDialog");
            if (!dialog) {
                return;
            }
            this.renderDialogZones(state);
            const idInput = document.getElementById("inventoryItemId");
            const nameInput = document.getElementById("inventoryNameInput");
            const zoneInput = document.getElementById("inventoryZoneInput");
            const currentInput = document.getElementById("inventoryCurrentInput");
            const targetInput = document.getElementById("inventoryTargetInput");
            const unitInput = document.getElementById("inventoryUnitInput");
            const categoryInput = document.getElementById("inventoryCategoryInput");
            const unitCustomInput = document.getElementById("inventoryUnitCustomInput");
            const categoryCustomInput = document.getElementById("inventoryCategoryCustomInput");
            if (!idInput ||
                !nameInput ||
                !zoneInput ||
                !currentInput ||
                !targetInput ||
                !unitInput ||
                !categoryInput ||
                !unitCustomInput ||
                !categoryCustomInput) {
                return;
            }
            idInput.value =
                "";
            nameInput.value =
                "";
            zoneInput.value =
                this.selectedZone;
            currentInput.value =
                0;
            targetInput.value =
                1;
            this.renderUnitOptions("each");
            this.renderCategoryOptions(this.selectedZone, "");
            this.setText("inventoryDialogTitle", "Add inventory item");
            this.setText("inventoryDialogFeedback", "");
            const addAnotherButton = document.getElementById("inventoryAddAnotherButton");
            if (addAnotherButton) {
                addAnotherButton.hidden =
                    false;
            }
            if (itemId) {
                const item = state.inventory
                    .items
                    .find(value => value.id ===
                    itemId);
                if (item) {
                    idInput.value =
                        item.id;
                    nameInput.value =
                        item.name;
                    zoneInput.value =
                        item.zoneId;
                    currentInput.value =
                        item.current;
                    targetInput.value =
                        item.target;
                    this.renderUnitOptions(item.unit ||
                        "each");
                    this.renderCategoryOptions(item.zoneId, item.category ||
                        "");
                    this.setText("inventoryDialogTitle", "Edit inventory item");
                    if (addAnotherButton) {
                        addAnotherButton.hidden =
                            true;
                    }
                }
            }
            dialog.showModal();
            requestAnimationFrame(() => {
                nameInput.focus();
            });
        },
        async saveItem() {
            if (this.itemSaveInFlight) {
                return false;
            }

            const idInput = document.getElementById("inventoryItemId");
            const nameInput = document.getElementById("inventoryNameInput");
            const zoneInput = document.getElementById("inventoryZoneInput");
            const currentInput = document.getElementById("inventoryCurrentInput");
            const targetInput = document.getElementById("inventoryTargetInput");
            const unitInput = document.getElementById("inventoryUnitInput");
            const categoryInput = document.getElementById("inventoryCategoryInput");

            if (
                !idInput ||
                !nameInput ||
                !zoneInput ||
                !currentInput ||
                !targetInput ||
                !unitInput ||
                !categoryInput
            ) {
                return false;
            }

            const id = idInput.value;
            const name = nameInput.value.trim();
            const zoneId = zoneInput.value;
            const current = Math.max(0, Number(currentInput.value) || 0);
            const target = Math.max(1, Number(targetInput.value) || 1);
            const unit = this.getDialogUnitValue();
            const category = this.getDialogCategoryValue();

            if (!name) {
                HomeApp.toast("Give the inventory item a name first.");
                nameInput.focus();
                return false;
            }

            if (!this.ZONES.some(zone => zone.id === zoneId)) {
                HomeApp.toast("Choose a valid storage zone.");
                return false;
            }

            this.itemSaveInFlight = true;

            try {
                let duplicateFound = false;
                let missingItem = false;
                const itemId = id || this.makeId("inventory");
                const now = new Date().toISOString();

                const result = await this.commitDatabaseChange(state => {
                    const duplicate = state.inventory.items.find(
                        item =>
                            item.id !== id &&
                            item.zoneId === zoneId &&
                            String(item.name || "")
                                .trim()
                                .toLowerCase() === name.toLowerCase()
                    );

                    if (duplicate) {
                        duplicateFound = true;
                        return false;
                    }

                    if (id) {
                        const item = state.inventory.items.find(
                            value => value.id === id
                        );

                        if (!item) {
                            missingItem = true;
                            return false;
                        }

                        Object.assign(item, {
                            name,
                            zoneId,
                            current,
                            target,
                            unit,
                            category,
                            updatedAt: now
                        });
                    } else {
                        state.inventory.items.push({
                            id: itemId,
                            zoneId,
                            name,
                            category,
                            current,
                            target,
                            unit,
                            expiresOn: null,
                            notes: "",
                            createdAt: now,
                            updatedAt: now
                        });
                    }

                    state.inventory.selectedZone = zoneId;
                    return true;
                });

                if (!result.changed) {
                    if (duplicateFound) {
                        HomeApp.toast(
                            `${name} is already tracked in this storage zone.`
                        );
                        nameInput.focus();
                    } else if (missingItem) {
                        HomeApp.toast(
                            "That inventory item no longer exists. Refresh and try again."
                        );
                    }

                    return false;
                }

                this.selectedZone = zoneId;
                this.searchTerm = "";

                const search = document.getElementById("inventorySearch");
                if (search) {
                    search.value = "";
                }

                this.setText("inventoryDialogFeedback", "");

                HomeApp.toast(
                    id
                        ? `${name} updated.`
                        : `${name} added to Home Inventory.`
                );

                return true;
            } catch (error) {
                console.error(
                    "[HomeOS] Inventory item save failed.",
                    error
                );

                this.setText(
                    "inventoryDialogFeedback",
                    "HomeOS couldn't save this item. Please try again."
                );

                HomeApp.toast(
                    "Couldn't save this inventory item. Nothing was saved."
                );

                return false;
            } finally {
                this.itemSaveInFlight = false;
            }
        },
        prepareNextInventoryItem(savedName = "") {
            const idInput = document.getElementById("inventoryItemId");
            const nameInput = document.getElementById("inventoryNameInput");
            const currentInput = document.getElementById("inventoryCurrentInput");
            const targetInput = document.getElementById("inventoryTargetInput");
            if (idInput) {
                idInput.value =
                    "";
            }
            if (nameInput) {
                nameInput.value =
                    "";
            }
            if (currentInput) {
                currentInput.value =
                    0;
            }
            if (targetInput) {
                targetInput.value =
                    1;
            }
            this.setText("inventoryDialogTitle", "Add inventory item");
            this.setText("inventoryDialogFeedback", savedName
                ? `${savedName} added. Ready for the next item.`
                : "Ready for the next item.");
            requestAnimationFrame(() => {
                nameInput?.focus();
            });
        },
        async addItemAndContinue() {
            const nameInput = document.getElementById("inventoryNameInput");
            const savedName = String(nameInput?.value || "").trim();

            if (!await this.saveItem()) {
                return;
            }

            this.prepareNextInventoryItem(savedName);
        },
        async deleteItem(itemId) {
            const current = HomeStore.getState();
            const item = current.inventory.items.find(
                value => value.id === itemId
            );

            if (!item) {
                return;
            }

            if (!window.confirm(`Delete ${item.name} from Home Inventory?`)) {
                return;
            }

            try {
                let removed = false;

                const result = await this.commitDatabaseChange(state => {
                    const exists = state.inventory.items.some(
                        value => value.id === itemId
                    );

                    if (!exists) {
                        return false;
                    }

                    state.inventory.items =
                        state.inventory.items.filter(
                            value => value.id !== itemId
                        );

                    removed = true;
                    return true;
                });

                if (result.changed && removed) {
                    HomeApp.toast(
                        `${item.name} removed from Home Inventory.`
                    );
                }
            } catch (error) {
                this.handlePersistenceError(
                    `remove ${item.name} from Inventory`,
                    error
                );
            }
        },
        // --- Health Math ---
        calculateZoneHealth(items) {
            if (!Array.isArray(items) ||
                !items.length) {
                return 100;
            }
            return this.calculateInventoryHealth(items);
        },
        calculateInventoryHealth(items) {
            const tracked = (Array.isArray(items)
                ? items
                : [])
                .filter(item => Number(item.target) >
                0);
            if (!tracked.length) {
                return 100;
            }
            const total = tracked
                .reduce((sum, item) => {
                const target = Math.max(1, Number(item.target) ||
                    1);
                const current = Math.max(0, Number(item.current) ||
                    0);
                return (sum +
                    Math.min(current /
                        target, 1));
            }, 0);
            return Math.round((total /
                tracked.length) *
                100);
        },
        // --- Dialog Storage Nodes ---
        renderDialogZones(state) {
            const select = document.getElementById("inventoryZoneInput");
            if (!select) {
                return;
            }
            const previousValue = select.value;
            select.innerHTML =
                state.inventory
                    .zones
                    .map(zone => `

                            <option
                                value="${HomeApp.escapeHtml(zone.id)}"
                            >
                                ${HomeApp.escapeHtml(zone.name)}
                            </option>

                        `)
                    .join("");
            if (previousValue &&
                state.inventory
                    .zones
                    .some(zone => zone.id ===
                    previousValue)) {
                select.value =
                    previousValue;
            }
            else if (state.inventory
                .zones
                .some(zone => zone.id ===
                this.selectedZone)) {
                select.value =
                    this.selectedZone;
            }
        },
        // --- Copy Shopping List ---
        async copyShoppingList() {
            const state = HomeStore.getState();
            const list = state.inventory
                .shoppingList;
            if (!list.length) {
                HomeApp.toast("There is nothing on the shopping list yet.");
                return;
            }
            const grouped = {};
            list.forEach(entry => {
                const group = this.getShoppingSourceLabel(entry, state);
                if (!grouped[group]) {
                    grouped[group] =
                        [];
                }
                grouped[group]
                    .push(entry);
            });
            const lines = [
                "DARLING HomeOS Shopping List",
                ""
            ];
            Object.entries(grouped)
                .forEach(([group, items]) => {
                lines.push(group.toUpperCase());
                items.forEach(item => {
                    lines.push(`- ${item.name} × ${Math.max(1, Number(item.quantity) || 1)}${item.unit ? ` ${item.unit}` : ""}`);
                });
                lines.push("");
            });
            const copied = await this.copyText(lines.join("\n"));
            HomeApp.toast(copied
                ? "Shopping list copied."
                : "Your browser did not allow automatic copying.");
        },
        async copyText(text) {
            try {
                if (navigator.clipboard
                    ?.writeText) {
                    await navigator.clipboard
                        .writeText(text);
                    return true;
                }
            }
            catch (error) {
                console.warn("DARLING HomeOS clipboard API unavailable:", error);
            }
            try {
                const textarea = document.createElement("textarea");
                textarea.value =
                    text;
                textarea.setAttribute("readonly", "");
                textarea.style.position =
                    "fixed";
                textarea.style.opacity =
                    "0";
                document.body
                    .appendChild(textarea);
                textarea.select();
                const copied = document.execCommand("copy");
                textarea.remove();
                return copied;
            }
            catch (error) {
                console.warn("[HOME OS] Clipboard copy fallback failed.", error);
                return false;
            }
        },
    };
})();
