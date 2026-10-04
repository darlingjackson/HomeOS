/* ============================================================
   HOMEOS // INVENTORY DATABASE

   Inventory reads, writes and Supabase sync.
============================================================ */

(function registerInventoryDatabaseModule() {
    "use strict";
    window.HomeOS = window.HomeOS || {};
    window.HomeOS.inventoryPageModules =
        window.HomeOS.inventoryPageModules || {};
    window.HomeOS.inventoryPageModules.database = {
        // --- Supabase Inventory Database ---
        getSupabase() {
            return window.HomeOS?.supabase || null;
        },
        getHouseholdId() {
            return window.HomeStore
                ?.getCloudContext?.()
                ?.householdId || null;
        },
        getLocationVisualKey(zone) {
            const source = [
                zone?.locationType,
                zone?.location_type,
                zone?.id,
                zone?.name
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .replace(/[_-]+/g, " ");
            if (source.includes("household") ||
                source.includes("supply")) {
                return "household";
            }
            if (source.includes("mini") &&
                source.includes("fridge")) {
                return "mini-fridge";
            }
            if (source.includes("deep") &&
                source.includes("freezer")) {
                return "deep-freezer";
            }
            if (source.includes("freezer")) {
                return "kitchen-freezer";
            }
            if (source.includes("refrigerator") ||
                source.includes("fridge")) {
                return "refrigerator";
            }
            if (source.includes("pantry")) {
                return "pantry";
            }
            return "storage";
        },
        getLocationDescription(zone) {
            const key = this.getLocationVisualKey(zone);
            const descriptions = {
                pantry: "Dry goods, snacks, food backstock and pantry staples.",
                refrigerator: "Fresh food, dairy, produce and everyday refrigerated items.",
                "kitchen-freezer": "Frozen foods and quick-access freezer storage.",
                "deep-freezer": "Bulk frozen foods and longer-term freezer storage.",
                "mini-fridge": "Drinks, special beverages and smaller refrigerated stock.",
                household: "Cleaning products, paper goods and other household essentials.",
                storage: "Household stock tracked in this storage location."
            };
            return descriptions[key] || descriptions.storage;
        },
        makeLocationCode(index) {
            return `ST-${String(index + 1).padStart(2, "0")}`;
        },
        buildZoneFromLocationRow(row, index) {
            const name = String(row?.name ||
                `Storage Area ${index + 1}`).trim();
            const id = String(row?.homeos_key ||
                row?.id ||
                `storage-${index + 1}`);
            const locationType = String(row?.location_type ||
                "storage");
            const zone = {
                id,
                databaseId: row?.id || null,
                locationType,
                code: String(row?.code ||
                    this.makeLocationCode(index)),
                name,
                icon: String(row?.icon ||
                    name
                        .split(/\s+/)
                        .filter(Boolean)
                        .slice(0, 2)
                        .map(part => part[0])
                        .join("")
                        .toUpperCase() ||
                    "ST"),
                color: String(row?.color ||
                    this.ZONE_COLORS[index % this.ZONE_COLORS.length]),
                description: String(row?.description ||
                    "").trim(),
                sortOrder: Number(row?.sort_order) ||
                    index
            };
            if (!zone.description) {
                zone.description =
                    this.getLocationDescription(zone);
            }
            return zone;
        },
        useCachedLocations() {
            const cachedZones = window.HomeStore
                ?.getState?.()
                ?.inventory
                ?.zones;
            if (!Array.isArray(cachedZones) ||
                !cachedZones.length) {
                this.ZONES = [];
                return false;
            }
            this.ZONES =
                cachedZones
                    .filter(zone => zone &&
                    typeof zone === "object")
                    .map((zone, index) => ({
                    ...zone,
                    id: String(zone.id ||
                        `storage-${index + 1}`),
                    code: String(zone.code ||
                        this.makeLocationCode(index)),
                    name: String(zone.name ||
                        `Storage Area ${index + 1}`),
                    locationType: String(zone.locationType ||
                        zone.location_type ||
                        "storage"),
                    color: String(zone.color ||
                        this.ZONE_COLORS[index % this.ZONE_COLORS.length]),
                    description: String(zone.description ||
                        this.getLocationDescription(zone))
                }));
            return true;
        },
        async loadDatabaseLocations() {
            const supabase = this.getSupabase();
            const householdId = this.getHouseholdId();
            if (!supabase ||
                !householdId) {
                return this.useCachedLocations();
            }
            const { data, error } = await supabase
                .from("inventory_locations")
                .select("id, homeos_key, name, location_type, sort_order, active")
                .eq("household_id", householdId)
                .eq("active", true)
                .order("sort_order", {
                ascending: true
            });
            if (error) {
                console.error("HOME OS Inventory could not load this household's storage locations.", error);
                return this.useCachedLocations();
            }
            const rows = Array.isArray(data)
                ? data
                : [];
            this.locationDbIds =
                new Map();
            this.ZONES =
                rows.map((row, index) => {
                    const zone = this.buildZoneFromLocationRow(row, index);
                    if (row?.id) {
                        this.locationDbIds.set(zone.id, row.id);
                    }
                    return zone;
                });
            return true;
        },
        async readDatabaseInventory() {
            const supabase = this.getSupabase();
            const householdId = this.getHouseholdId();
            if (!supabase ||
                !householdId) {
                return {
                    items: [],
                    shoppingList: []
                };
            }
            const [itemResult, shoppingResult] = await Promise.all([
                supabase
                    .from("inventory_items")
                    .select("id, homeos_key, location_id, name, category, quantity, unit, minimum_quantity, target_quantity, expires_on, notes, active, created_at, updated_at")
                    .eq("household_id", householdId)
                    .eq("active", true)
                    .order("name", {
                    ascending: true
                }),
                supabase
                    .from("shopping_list")
                    .select("id, homeos_key, inventory_item_id, destination_location_id, destination_label, name, category, quantity, unit, status, notes, source_type, origin, source_label, quantity_mode, created_at, updated_at")
                    .eq("household_id", householdId)
                    .in("status", [
                    "needed",
                    "in_cart"
                ])
                    .order("created_at", {
                    ascending: true
                })
            ]);
            if (itemResult.error) {
                throw itemResult.error;
            }
            if (shoppingResult.error) {
                throw shoppingResult.error;
            }
            const locationKeyById = new Map([
                ...this.locationDbIds.entries()
            ].map(([key, id]) => [id, key]));
            this.itemDbIds =
                new Map();
            const items = (itemResult.data || []).map(row => {
                const key = row.homeos_key ||
                    row.id;
                this.itemDbIds.set(key, row.id);
                return {
                    id: key,
                    zoneId: locationKeyById.get(row.location_id) ||
                        this.ZONES[0]?.id ||
                        "",
                    name: row.name,
                    category: row.category ||
                        "",
                    current: Math.max(0, Number(row.quantity) ||
                        0),
                    target: Math.max(1, Number(row.target_quantity ??
                        row.minimum_quantity) ||
                        1),
                    unit: row.unit ||
                        "",
                    createdAt: row.created_at ||
                        new Date()
                            .toISOString(),
                    updatedAt: row.updated_at ||
                        row.created_at ||
                        new Date()
                            .toISOString()
                };
            });
            const keyByDatabaseItemId = new Map([
                ...this.itemDbIds.entries()
            ].map(([key, id]) => [id, key]));
            const shoppingList = (shoppingResult.data || []).map(row => ({
                id: row.homeos_key ||
                    row.id,
                sourceType: row.source_type ||
                    (row.inventory_item_id
                        ? "inventory"
                        : "custom"),
                origin: row.origin ||
                    (row.inventory_item_id
                        ? "inventory"
                        : "manual"),
                sourceLabel: row.source_label ||
                    (row.inventory_item_id
                        ? "Home Inventory"
                        : "Manual"),
                inventoryItemId: row.inventory_item_id
                    ? keyByDatabaseItemId.get(row.inventory_item_id) ||
                        null
                    : null,
                destinationZoneId: row.destination_location_id
                    ? locationKeyById.get(row.destination_location_id) ||
                        null
                    : null,
                destinationLabel: row.destination_label ||
                    "",
                name: row.name,
                category: row.category ||
                    "",
                quantity: Math.max(1, Number(row.quantity) ||
                    1),
                quantityMode: row.quantity_mode ||
                    "manual",
                unit: row.unit ||
                    "",
                checked: row.status ===
                    "in_cart",
                addedAt: row.created_at ||
                    new Date()
                        .toISOString()
            }));
            return {
                items,
                shoppingList
            };
        },
        async initializeDatabase() {
            const supabase = this.getSupabase();
            const householdId = this.getHouseholdId();
            if (!supabase ||
                !householdId) {
                console.warn("DARLING HomeOS Inventory is using HomeStore only because Supabase household context is unavailable.");
                return false;
            }
            try {
                const locationsReady = await this.loadDatabaseLocations();
                if (!locationsReady) {
                    return false;
                }
                const localState = HomeStore.getState();
                const localItems = Array.isArray(localState.inventory?.items)
                    ? localState.inventory.items
                    : [];
                const localShopping = Array.isArray(localState.inventory?.shoppingList)
                    ? localState.inventory.shoppingList
                    : [];
                const remote = await this.readDatabaseInventory();
                // --- First Database Run ---
                if (!remote.items.length &&
                    !remote.shoppingList.length &&
                    (localItems.length ||
                        localShopping.length)) {
                    this.databaseReady =
                        true;
                    await this.syncDatabaseSnapshot(localState);
                    return true;
                }
                // --- Database Hydration ---
                if (remote.items.length ||
                    remote.shoppingList.length) {
                    this.applyingDatabaseState =
                        true;
                    const state = HomeStore.getState();
                    state.inventory.items =
                        remote.items;
                    state.inventory.shoppingList =
                        remote.shoppingList;
                    this.syncDerivedState(state);
                    HomeStore.saveState(state);
                    this.applyingDatabaseState =
                        false;
                }
                this.databaseReady =
                    true;
                console.log("DARLING HomeOS Inventory database ready.");
                return true;
            }
            catch (error) {
                this.databaseReady =
                    false;
                console.error("DARLING HomeOS Inventory database initialization failed.", error);
                return false;
            }
        },
        queueDatabaseSync(state) {
            if (!this.databaseReady ||
                this.applyingDatabaseState) {
                return;
            }
            if (this.databaseSyncTimer) {
                clearTimeout(this.databaseSyncTimer);
            }
            const snapshot = JSON.parse(JSON.stringify(state));
            this.databaseSyncTimer =
                setTimeout(() => {
                    this.databaseSyncTimer =
                        null;
                    this.syncDatabaseSnapshot(snapshot).catch(error => {
                        console.error("DARLING HomeOS Inventory database sync failed.", error);
                    });
                }, 250);
        },
        async syncDatabaseSnapshot(state) {
            const supabase = this.getSupabase();
            const householdId = this.getHouseholdId();
            if (!supabase ||
                !householdId) {
                return false;
            }
            if (this.locationDbIds.size !==
                this.ZONES.length) {
                await this.loadDatabaseLocations();
            }
            const inventory = state.inventory ||
                {};
            const items = Array.isArray(inventory.items)
                ? inventory.items
                : [];
            const itemPayload = items
                .map(item => {
                const locationId = this.locationDbIds.get(item.zoneId);
                if (!locationId) {
                    return null;
                }
                return {
                    household_id: householdId,
                    homeos_key: String(item.id),
                    location_id: locationId,
                    name: String(item.name ||
                        "Inventory Item").trim(),
                    category: String(item.category ||
                        "").trim(),
                    quantity: Math.max(0, Number(item.current) ||
                        0),
                    unit: String(item.unit ||
                        "").trim(),
                    minimum_quantity: Math.max(0, Number(item.target) ||
                        0),
                    target_quantity: Math.max(1, Number(item.target) ||
                        1),
                    active: true
                };
            })
                .filter(Boolean);
            if (itemPayload.length) {
                const { error } = await supabase
                    .from("inventory_items")
                    .upsert(itemPayload, {
                    onConflict: "household_id,homeos_key"
                });
                if (error) {
                    throw error;
                }
            }
            // --- Archive Items Removed From Homeos ---
            const { data: remoteItems, error: remoteItemError } = await supabase
                .from("inventory_items")
                .select("id, homeos_key")
                .eq("household_id", householdId)
                .eq("active", true);
            if (remoteItemError) {
                throw remoteItemError;
            }
            const localItemKeys = new Set(items.map(item => String(item.id)));
            const removedItemIds = (remoteItems || [])
                .filter(row => row.homeos_key &&
                !localItemKeys.has(row.homeos_key))
                .map(row => row.id);
            if (removedItemIds.length) {
                const { error } = await supabase
                    .from("inventory_items")
                    .update({
                    active: false
                })
                    .in("id", removedItemIds);
                if (error) {
                    throw error;
                }
            }
            // Refresh the item UUID map before shopping links.
            const { data: freshItems, error: freshItemError } = await supabase
                .from("inventory_items")
                .select("id, homeos_key")
                .eq("household_id", householdId)
                .eq("active", true);
            if (freshItemError) {
                throw freshItemError;
            }
            this.itemDbIds =
                new Map((freshItems || []).map(row => [
                    row.homeos_key ||
                        row.id,
                    row.id
                ]));
            // --- Shopping List ---
            const shoppingList = Array.isArray(inventory.shoppingList)
                ? inventory.shoppingList
                : [];
            const shoppingPayload = shoppingList.map(entry => ({
                household_id: householdId,
                homeos_key: String(entry.id),
                inventory_item_id: entry.inventoryItemId
                    ? this.itemDbIds.get(entry.inventoryItemId) ||
                        null
                    : null,
                destination_location_id: entry.destinationZoneId
                    ? this.locationDbIds.get(entry.destinationZoneId) ||
                        null
                    : null,
                destination_label: String(entry.destinationLabel ||
                    "").trim() ||
                    null,
                name: String(entry.name ||
                    "Shopping Item").trim(),
                category: String(entry.category ||
                    "").trim(),
                quantity: Math.max(1, Number(entry.quantity) ||
                    1),
                unit: String(entry.unit ||
                    "").trim(),
                status: entry.checked
                    ? "in_cart"
                    : "needed",
                source_type: entry.sourceType ||
                    (entry.inventoryItemId
                        ? "inventory"
                        : "custom"),
                origin: entry.origin ||
                    "inventory",
                source_label: entry.sourceLabel ||
                    "HomeOS",
                quantity_mode: entry.quantityMode ||
                    "manual"
            }));
            if (shoppingPayload.length) {
                const { error } = await supabase
                    .from("shopping_list")
                    .upsert(shoppingPayload, {
                    onConflict: "household_id,homeos_key"
                });
                if (error) {
                    throw error;
                }
            }
            // Remove open DB rows that no longer exist in HomeOS.
            const { data: openRemoteShopping, error: openShoppingError } = await supabase
                .from("shopping_list")
                .select("id, homeos_key")
                .eq("household_id", householdId)
                .in("status", [
                "needed",
                "in_cart"
            ]);
            if (openShoppingError) {
                throw openShoppingError;
            }
            const localShoppingKeys = new Set(shoppingList.map(entry => String(entry.id)));
            const removedShoppingIds = (openRemoteShopping || [])
                .filter(row => row.homeos_key &&
                !localShoppingKeys.has(row.homeos_key))
                .map(row => row.id);
            if (removedShoppingIds.length) {
                const { error } = await supabase
                    .from("shopping_list")
                    .delete()
                    .in("id", removedShoppingIds);
                if (error) {
                    throw error;
                }
            }
            return true;
        },
    };
})();
