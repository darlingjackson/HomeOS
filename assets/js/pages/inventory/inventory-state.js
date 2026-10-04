/* ============================================================
   HOMEOS // INVENTORY STATE

   Inventory state, lookups and shared helpers.
============================================================ */

(function registerInventoryStateModule() {
    "use strict";
    window.HomeOS = window.HomeOS || {};
    window.HomeOS.inventoryPageModules =
        window.HomeOS.inventoryPageModules || {};
    window.HomeOS.inventoryPageModules.state = {
        // --- Safe Inventory Setup ---
        ensureInventorySetup() {
            const state = HomeStore.getState();
            if (!state.inventory ||
                typeof state.inventory !==
                    "object") {
                state.inventory =
                    {};
            }
            const inventory = state.inventory;
            const savedZones = Array.isArray(inventory.zones)
                ? inventory.zones
                : [];
            inventory.zones =
                this.ZONES.map(official => {
                    const saved = savedZones.find(zone => zone.id ===
                        official.id) ||
                        {};
                    return {
                        ...saved,
                        ...official
                    };
                });
            if (!Array.isArray(inventory.items)) {
                inventory.items =
                    [];
            }
            if (!Array.isArray(inventory.shoppingList)) {
                inventory.shoppingList =
                    [];
            }
            if (typeof inventory
                .autoAddShortages !==
                "boolean") {
                inventory.autoAddShortages =
                    false;
            }
            if (!Array.isArray(state.activity)) {
                state.activity =
                    [];
            }
            // --- Legacy Demo Cleanup ---
            const cleanupVersion = Number(inventory.cleanupVersion) ||
                0;
            if (cleanupVersion <
                this.INVENTORY_CLEANUP_VERSION) {
                const legacyIds = new Set(this.LEGACY_STARTER_ITEM_IDS);
                inventory.items =
                    inventory.items
                        .filter(item => !legacyIds.has(item?.id));
                inventory.shoppingList =
                    inventory.shoppingList
                        .filter(entry => !(entry?.sourceType ===
                        "inventory" &&
                        legacyIds.has(entry?.inventoryItemId)));
                inventory.cleanupVersion =
                    this.INVENTORY_CLEANUP_VERSION;
            }
            // --- Normalize Real Inventory ---
            inventory.items =
                inventory.items
                    .filter(item => item &&
                    typeof item ===
                        "object")
                    .map(item => {
                    const validZone = inventory.zones.some(zone => zone.id ===
                        item.zoneId);
                    return {
                        ...item,
                        id: item.id ||
                            this.makeId("inventory"),
                        zoneId: validZone
                            ? item.zoneId
                            : "pantry",
                        name: String(item.name ||
                            "Inventory Item")
                            .trim(),
                        category: String(item.category ||
                            "")
                            .trim(),
                        current: Math.max(0, Number(item.current) ||
                            0),
                        target: Math.max(1, Number(item.target) ||
                            1),
                        unit: String(item.unit ||
                            "")
                            .trim()
                    };
                });
            const seenInventoryLinks = new Set();
            inventory.shoppingList =
                inventory.shoppingList
                    .filter(entry => {
                    if (!entry ||
                        typeof entry !==
                            "object") {
                        return false;
                    }
                    if (entry.sourceType !==
                        "inventory") {
                        return true;
                    }
                    const itemId = entry.inventoryItemId;
                    if (!itemId ||
                        seenInventoryLinks.has(itemId)) {
                        return false;
                    }
                    seenInventoryLinks.add(itemId);
                    return true;
                });
            const selectedExists = inventory.zones.some(zone => zone.id ===
                inventory.selectedZone);
            if (!selectedExists) {
                inventory.selectedZone =
                    inventory.zones[0]?.id ||
                        "";
            }
            this.selectedZone =
                inventory.selectedZone;
            inventory.setupComplete =
                true;
            this.syncDerivedState(state);
            HomeStore.saveState(state);
        },
        // --- Live Homestore ---
        bindStateEvents() {
            window.addEventListener("homeos:statechange", event => {
                const state = event.detail ||
                    HomeStore.getState();
                this.syncSelectedZone(state);
                this.render(state);
                this.queueDatabaseSync(state);
            });
        },
        syncSelectedZone(state) {
            const zones = state.inventory?.zones ||
                [];
            const saved = state.inventory
                ?.selectedZone;
            if (zones.some(zone => zone.id ===
                saved)) {
                this.selectedZone =
                    saved;
                return;
            }
            if (!zones.some(zone => zone.id ===
                this.selectedZone)) {
                this.selectedZone =
                    zones[0]?.id ||
                        "";
            }
        },
        // --- Derived Stock State ---
        syncDerivedState(state) {
            const inventory = state.inventory;
            const items = Array.isArray(inventory.items)
                ? inventory.items
                : [];
            inventory.health =
                this.calculateInventoryHealth(items);
            inventory.lowItems =
                items
                    .filter(item => Number(item.current) <
                    Number(item.target))
                    .map(item => ({
                    id: item.id,
                    name: item.name,
                    current: Math.max(0, Number(item.current) ||
                        0),
                    target: Math.max(1, Number(item.target) ||
                        1),
                    zoneId: item.zoneId,
                    unit: item.unit ||
                        ""
                }));
            this.syncShoppingEntries(state);
        },
        // --- Shopping List Synchronization ---
        syncShoppingEntries(state) {
            const inventory = state.inventory;
            if (!Array.isArray(inventory.shoppingList)) {
                inventory.shoppingList =
                    [];
            }
            // Remove only broken Inventory links. Seasonal + custom entries stay.
            inventory.shoppingList =
                inventory.shoppingList
                    .filter(entry => {
                    if (entry.sourceType !==
                        "inventory") {
                        return true;
                    }
                    return inventory.items
                        .some(item => item.id ===
                        entry.inventoryItemId);
                });
            const seenInventoryEntries = new Set();
            inventory.shoppingList =
                inventory.shoppingList
                    .filter(entry => {
                    if (entry.sourceType !==
                        "inventory") {
                        return true;
                    }
                    const itemId = entry.inventoryItemId;
                    if (seenInventoryEntries.has(itemId)) {
                        return false;
                    }
                    seenInventoryEntries.add(itemId);
                    return true;
                });
            // Automatic Inventory entries follow live shortage math.
            inventory.shoppingList
                .forEach(entry => {
                if (entry.sourceType !==
                    "inventory" ||
                    entry.quantityMode ===
                        "manual") {
                    return;
                }
                const item = inventory.items
                    .find(value => value.id ===
                    entry.inventoryItemId);
                if (!item) {
                    return;
                }
                const needed = Math.max(0, Number(item.target) -
                    Number(item.current));
                entry.name =
                    item.name;
                entry.unit =
                    item.unit ||
                        "";
                entry.quantity =
                    needed;
            });
            // If an automatic shortage is satisfied, remove that automatic list entry.
            inventory.shoppingList =
                inventory.shoppingList
                    .filter(entry => {
                    if (entry.sourceType !==
                        "inventory" ||
                        entry.quantityMode ===
                            "manual") {
                        return true;
                    }
                    return (Number(entry.quantity) >
                        0);
                });
            // Auto Restock creates missing shortage entries.
            if (inventory.autoAddShortages) {
                inventory.lowItems
                    .forEach(lowItem => {
                    const exists = inventory.shoppingList
                        .some(entry => entry.sourceType ===
                        "inventory" &&
                        entry.inventoryItemId ===
                            lowItem.id);
                    if (!exists) {
                        inventory.shoppingList
                            .push(this.createInventoryShoppingEntry(lowItem));
                    }
                });
            }
        },
    };
})();
