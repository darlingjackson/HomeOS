/* ============================================================
   HOMEOS // INVENTORY STATE

   In-memory Inventory state, derived values and shared helpers.
============================================================ */

(function registerInventoryStateModule() {
    "use strict";

    window.HomeOS = window.HomeOS || {};
    window.HomeOS.inventoryPageModules =
        window.HomeOS.inventoryPageModules || {};

    window.HomeOS.inventoryPageModules.state = {
        bindStateEvents() {
            window.addEventListener("homeos:statechange", event => {
                const state = event.detail || HomeStore.getState();

                this.syncSelectedZone(state);
                this.render(state);
            });
        },

        syncSelectedZone(state) {
            const zones = state.inventory?.zones || [];
            const saved = state.inventory?.selectedZone;

            if (zones.some(zone => zone.id === saved)) {
                this.selectedZone = saved;
                return;
            }

            if (!zones.some(zone => zone.id === this.selectedZone)) {
                this.selectedZone = zones[0]?.id || "";
            }
        },

        syncDerivedState(state) {
            const inventory = state.inventory;
            const items = Array.isArray(inventory.items)
                ? inventory.items
                : [];

            inventory.health = this.calculateInventoryHealth(items);

            inventory.lowItems = items
                .filter(
                    item =>
                        Number(item.current) <
                        Number(item.target)
                )
                .map(item => ({
                    id: item.id,
                    name: item.name,
                    current: Math.max(
                        0,
                        Number(item.current) || 0
                    ),
                    target: Math.max(
                        1,
                        Number(item.target) || 1
                    ),
                    zoneId: item.zoneId,
                    unit: item.unit || ""
                }));

            this.syncShoppingEntries(state);
        },

        syncShoppingEntries(state) {
            const inventory = state.inventory;

            if (!Array.isArray(inventory.shoppingList)) {
                inventory.shoppingList = [];
            }

            // Keep non-Inventory entries and valid Inventory links.
            inventory.shoppingList =
                inventory.shoppingList.filter(entry => {
                    if (entry.sourceType !== "inventory") {
                        return true;
                    }

                    return inventory.items.some(
                        item => item.id === entry.inventoryItemId
                    );
                });

            const seenInventoryEntries = new Set();

            inventory.shoppingList =
                inventory.shoppingList.filter(entry => {
                    if (entry.sourceType !== "inventory") {
                        return true;
                    }

                    const itemId = entry.inventoryItemId;

                    if (seenInventoryEntries.has(itemId)) {
                        return false;
                    }

                    seenInventoryEntries.add(itemId);
                    return true;
                });

            // Automatic entries follow the current shortage.
            inventory.shoppingList.forEach(entry => {
                if (
                    entry.sourceType !== "inventory" ||
                    entry.quantityMode === "manual"
                ) {
                    return;
                }

                const item = inventory.items.find(
                    value => value.id === entry.inventoryItemId
                );

                if (!item) {
                    return;
                }

                entry.name = item.name;
                entry.unit = item.unit || "";
                entry.quantity = Math.max(
                    0,
                    Number(item.target) - Number(item.current)
                );
            });

            inventory.shoppingList =
                inventory.shoppingList.filter(entry => {
                    if (
                        entry.sourceType !== "inventory" ||
                        entry.quantityMode === "manual"
                    ) {
                        return true;
                    }

                    return Number(entry.quantity) > 0;
                });

            if (!inventory.autoAddShortages) {
                return;
            }

            inventory.lowItems.forEach(lowItem => {
                const exists = inventory.shoppingList.some(
                    entry =>
                        entry.sourceType === "inventory" &&
                        entry.inventoryItemId === lowItem.id
                );

                if (!exists) {
                    inventory.shoppingList.push(
                        this.createInventoryShoppingEntry(lowItem)
                    );
                }
            });
        }
    };
})();
