/* ============================================================
   HOMEOS // INVENTORY EVENTS

   Click, change and form events for Inventory.
============================================================ */

(function registerInventoryEventsModule() {
    "use strict";
    window.HomeOS = window.HomeOS || {};
    window.HomeOS.inventoryPageModules =
        window.HomeOS.inventoryPageModules || {};
    window.HomeOS.inventoryPageModules.events = {
        // --- Events ---
        bindEvents() {
            document.addEventListener("click", async event => {
                // --- Select Node ---
                const zone = event.target.closest("[data-inventory-zone]");
                if (zone) {
                    const zoneId = zone.dataset
                        .inventoryZone;
                    this.selectedZone =
                        zoneId;
                    this.searchTerm =
                        "";
                    const search = document.getElementById("inventorySearch");
                    if (search) {
                        search.value =
                            "";
                    }
                    HomeStore.update(state => {
                        state.inventory
                            .selectedZone =
                            zoneId;
                    });
                    requestAnimationFrame(() => {
                        document
                            .getElementById("inventoryWorkspace")
                            ?.scrollIntoView({
                            behavior: "smooth",
                            block: "start"
                        });
                    });
                    return;
                }
                // --- Add Inventory Item ---
                if (event.target.closest("#heroAddItemButton") ||
                    event.target.closest("#addInventoryItemButton") ||
                    event.target.closest("[data-open-inventory-item]")) {
                    this.openItemDialog();
                    return;
                }
                // --- Shopping Shortcuts ---
                if (event.target.closest("#heroShoppingButton") ||
                    event.target.closest("[data-scroll-inventory-shopping]")) {
                    this.scrollToShopping();
                    return;
                }
                // --- Inventory Guide ---
                const guide = event.target.closest("#inventoryGuideAction");
                if (guide) {
                    const action = guide.dataset
                        .inventoryGuideAction;
                    if (action ===
                        "purchase") {
                        await this.markPurchased();
                    }
                    else if (action ===
                        "shortages" ||
                        action ===
                            "shopping") {
                        this.scrollToShopping();
                    }
                    else {
                        this.openItemDialog();
                    }
                    return;
                }
                // --- Current Quantity ---
                const adjustment = event.target.closest("[data-adjust-item]");
                if (adjustment) {
                    await this.adjustItem(
                        adjustment.dataset.adjustItem,
                        Number(adjustment.dataset.adjustValue)
                    );
                    return;
                }
                // --- Add Shortage ---
                const shortage = event.target.closest("[data-add-shortage]");
                if (shortage) {
                    await this.addShortage(shortage.dataset.addShortage);
                    return;
                }
                // --- Edit Item ---
                const edit = event.target.closest("[data-edit-item]");
                if (edit) {
                    this.openItemDialog(edit.dataset
                        .editItem);
                    return;
                }
                // --- Delete Item ---
                const deleteItem = event.target.closest("[data-delete-item]");
                if (deleteItem) {
                    await this.deleteItem(deleteItem.dataset.deleteItem);
                    return;
                }
                // --- Add All Shortages ---
                if (event.target.closest("#addAllShortagesButton")) {
                    await this.addAllShortages();
                    return;
                }
                // --- Add Custom Shopping ---
                if (event.target.closest("#addCustomShoppingButton")) {
                    await this.addCustomShoppingItem();
                    return;
                }
                // --- Shopping Qty ---
                const shoppingAdjust = event.target.closest("[data-shopping-adjust]");
                if (shoppingAdjust) {
                    await this.adjustShoppingQuantity(
                        shoppingAdjust.dataset.shoppingAdjust,
                        Number(shoppingAdjust.dataset.shoppingValue)
                    );
                    return;
                }
                // --- Remove Shopping ---
                const remove = event.target.closest("[data-remove-shopping]");
                if (remove) {
                    await this.removeShoppingItem(remove.dataset.removeShopping);
                    return;
                }
                // --- Purchase ---
                if (event.target.closest("#markPurchasedButton")) {
                    await this.markPurchased();
                    return;
                }
                // --- Copy List ---
                if (event.target.closest("#copyShoppingListButton")) {
                    this.copyShoppingList();
                    return;
                }
                // --- Close Dialog ---
                const close = event.target.closest("[data-close-dialog]");
                if (close) {
                    document
                        .getElementById(close.dataset
                        .closeDialog)
                        ?.close();
                }
            });
            // --- Search ---
            document
                .getElementById("inventorySearch")
                ?.addEventListener("input", event => {
                this.searchTerm =
                    event.target
                        .value
                        .trim();
                this.renderItems(HomeStore.getState());
            });
            // --- Auto Restock ---
            document
                .getElementById("autoRestockToggle")
                ?.addEventListener("change", async event => {
                await this.setAutoRestock(event.target.checked);
            });
            // --- Inventory Item Form Controls ---
            document
                .getElementById("inventoryZoneInput")
                ?.addEventListener("change", event => {
                this.renderCategoryOptions(event.target.value, "");
            });
            document
                .getElementById("inventoryUnitInput")
                ?.addEventListener("change", () => {
                this.syncCustomInventoryFields();
            });
            document
                .getElementById("inventoryCategoryInput")
                ?.addEventListener("change", () => {
                this.syncCustomInventoryFields();
            });
            // --- Shopping Checks ---
            document.addEventListener("change", async event => {
                const checkbox = event.target.closest("[data-shopping-check]");

                if (checkbox) {
                    await this.toggleShoppingCheck(
                        checkbox.dataset.shoppingCheck
                    );
                }
            });
            // --- Add + Keep Dialog Open ---
            document
                .getElementById("inventoryAddAnotherButton")
                ?.addEventListener("click", async () => {
                await this.addItemAndContinue();
            });
            // --- Save Inventory Item ---
            document
                .getElementById("inventoryItemForm")
                ?.addEventListener("submit", async event => {
                event.preventDefault();

                if (await this.saveItem()) {
                    document
                        .getElementById("inventoryItemDialog")
                        ?.close();
                }
            });
            // --- Custom shopping location ---
            document
                .getElementById("customShoppingLocation")
                ?.addEventListener("change", () => {
                this.syncCustomShoppingOtherField();
            });
            document
                .getElementById("customShoppingOtherLocation")
                ?.addEventListener("keydown", async event => {
                if (event.key ===
                    "Enter") {
                    event.preventDefault();
                    await this.addCustomShoppingItem();
                }
            });
            // --- Add custom shopping with Enter ---
            document
                .getElementById("customShoppingName")
                ?.addEventListener("keydown", async event => {
                if (event.key ===
                    "Enter") {
                    event.preventDefault();
                    await this.addCustomShoppingItem();
                }
            });
        },
        scrollToShopping() {
            document
                .getElementById("shoppingSection")
                ?.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        },
        makeId(prefix) {
            if (typeof crypto !==
                "undefined" &&
                typeof crypto.randomUUID ===
                    "function") {
                return (`${prefix}-${crypto.randomUUID()}`);
            }
            return (`${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`);
        },
        setText(id, value) {
            const element = document.getElementById(id);
            if (element) {
                element.textContent =
                    value;
            }
        }
    };
})();
