/* ============================================================
   HOMEOS // INVENTORY DATABASE

   Supabase reads and writes for Inventory and the shared shopping list.
============================================================ */

(function registerInventoryDatabaseModule() {
    "use strict";

    window.HomeOS = window.HomeOS || {};
    window.HomeOS.inventoryPageModules =
        window.HomeOS.inventoryPageModules || {};

    window.HomeOS.inventoryPageModules.database = {
        getSupabase() {
            return window.HomeOS?.supabase || null;
        },

        getHouseholdId() {
            return window.HomeStore
                ?.getCloudContext?.()
                ?.householdId || null;
        },

        requireDatabaseContext() {
            const supabase = this.getSupabase();
            const householdId = this.getHouseholdId();

            if (!supabase || !householdId) {
                throw new Error(
                    "HomeOS Inventory cannot save without a Supabase household."
                );
            }

            return { supabase, householdId };
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

            if (source.includes("household") || source.includes("supply")) {
                return "household";
            }

            if (source.includes("mini") && source.includes("fridge")) {
                return "mini-fridge";
            }

            if (source.includes("deep") && source.includes("freezer")) {
                return "deep-freezer";
            }

            if (source.includes("freezer")) {
                return "kitchen-freezer";
            }

            if (source.includes("refrigerator") || source.includes("fridge")) {
                return "refrigerator";
            }

            if (source.includes("pantry")) {
                return "pantry";
            }

            return "storage";
        },

        getLocationDescription(zone) {
            const descriptions = {
                pantry: "Dry goods, snacks, food backstock and pantry staples.",
                refrigerator: "Fresh food, dairy, produce and everyday refrigerated items.",
                "kitchen-freezer": "Frozen foods and quick-access freezer storage.",
                "deep-freezer": "Bulk frozen foods and longer-term freezer storage.",
                "mini-fridge": "Drinks, special beverages and smaller refrigerated stock.",
                household: "Cleaning products, paper goods and other household essentials.",
                storage: "Household stock tracked in this storage location."
            };

            return descriptions[this.getLocationVisualKey(zone)] ||
                descriptions.storage;
        },

        makeLocationCode(index) {
            return `ST-${String(index + 1).padStart(2, "0")}`;
        },

        buildZoneFromLocationRow(row, index) {
            const name = String(
                row?.name || `Storage Area ${index + 1}`
            ).trim();

            const zone = {
                id: String(
                    row?.homeos_key ||
                    row?.id ||
                    `storage-${index + 1}`
                ),
                databaseId: row?.id || null,
                locationType: String(row?.location_type || "storage"),
                code: String(row?.code || this.makeLocationCode(index)),
                name,
                icon: String(
                    row?.icon ||
                    name
                        .split(/\s+/)
                        .filter(Boolean)
                        .slice(0, 2)
                        .map(part => part[0])
                        .join("")
                        .toUpperCase() ||
                    "ST"
                ),
                color: String(
                    row?.color ||
                    this.ZONE_COLORS[index % this.ZONE_COLORS.length]
                ),
                description: String(row?.description || "").trim(),
                sortOrder: Number(row?.sort_order) || index
            };

            if (!zone.description) {
                zone.description = this.getLocationDescription(zone);
            }

            return zone;
        },

        async loadDatabaseLocations() {
            const { supabase, householdId } =
                this.requireDatabaseContext();

            const { data, error } = await supabase
                .from("inventory_locations")
                .select(
                    "id, homeos_key, name, location_type, sort_order, active"
                )
                .eq("household_id", householdId)
                .eq("active", true)
                .order("sort_order", { ascending: true });

            if (error) {
                throw error;
            }

            const rows = Array.isArray(data) ? data : [];

            this.locationDbIds = new Map();
            this.ZONES = rows.map((row, index) => {
                const zone = this.buildZoneFromLocationRow(row, index);

                if (row?.id) {
                    this.locationDbIds.set(zone.id, row.id);
                }

                return zone;
            });

            return true;
        },

        async loadInventoryPreferences() {
            const { supabase, householdId } =
                this.requireDatabaseContext();

            const { data, error } = await supabase
                .from("household_settings")
                .select("settings")
                .eq("household_id", householdId)
                .maybeSingle();

            if (error) {
                throw error;
            }

            return {
                autoAddShortages: Boolean(
                    data?.settings?.inventory?.autoAddShortages
                )
            };
        },

        async saveAutoRestockPreference(enabled) {
            const { supabase, householdId } =
                this.requireDatabaseContext();

            const current = await supabase
                .from("household_settings")
                .select("settings")
                .eq("household_id", householdId)
                .single();

            if (current.error) {
                throw current.error;
            }

            const settings = current.data?.settings || {};

            const { error } = await supabase
                .from("household_settings")
                .update({
                    settings: {
                        ...settings,
                        inventory: {
                            ...(settings.inventory || {}),
                            autoAddShortages: Boolean(enabled)
                        }
                    }
                })
                .eq("household_id", householdId);

            if (error) {
                throw error;
            }

            return true;
        },

        async readDatabaseInventory() {
            const { supabase, householdId } =
                this.requireDatabaseContext();

            const [itemResult, shoppingResult] = await Promise.all([
                supabase
                    .from("inventory_items")
                    .select(
                        "id, homeos_key, location_id, name, category, quantity, unit, minimum_quantity, target_quantity, expires_on, notes, active, created_at, updated_at"
                    )
                    .eq("household_id", householdId)
                    .eq("active", true)
                    .order("name", { ascending: true }),

                supabase
                    .from("shopping_list")
                    .select(
                        "id, homeos_key, inventory_item_id, destination_location_id, destination_label, name, category, quantity, unit, status, notes, source_type, origin, source_label, quantity_mode, created_at, updated_at"
                    )
                    .eq("household_id", householdId)
                    .in("status", ["needed", "in_cart"])
                    .order("created_at", { ascending: true })
            ]);

            if (itemResult.error) {
                throw itemResult.error;
            }

            if (shoppingResult.error) {
                throw shoppingResult.error;
            }

            const locationKeyById = new Map(
                [...this.locationDbIds.entries()].map(
                    ([key, id]) => [id, key]
                )
            );

            this.itemDbIds = new Map();

            const items = (itemResult.data || []).map(row => {
                const key = row.homeos_key || row.id;
                this.itemDbIds.set(key, row.id);

                return {
                    id: key,
                    databaseId: row.id,
                    zoneId:
                        locationKeyById.get(row.location_id) ||
                        this.ZONES[0]?.id ||
                        "",
                    name: row.name,
                    category: row.category || "",
                    current: Math.max(0, Number(row.quantity) || 0),
                    target: Math.max(
                        1,
                        Number(
                            row.target_quantity ??
                            row.minimum_quantity
                        ) || 1
                    ),
                    unit: row.unit || "",
                    expiresOn: row.expires_on || null,
                    notes: row.notes || "",
                    createdAt:
                        row.created_at ||
                        new Date().toISOString(),
                    updatedAt:
                        row.updated_at ||
                        row.created_at ||
                        new Date().toISOString()
                };
            });

            const keyByDatabaseItemId = new Map(
                [...this.itemDbIds.entries()].map(
                    ([key, id]) => [id, key]
                )
            );

            const shoppingList = (shoppingResult.data || []).map(row => {
                const sourceType =
                    row.source_type ||
                    (row.inventory_item_id ? "inventory" : "custom");

                const seasonalParts = sourceType.startsWith("seasonal:")
                    ? sourceType.split(":")
                    : [];

                return {
                    id: row.homeos_key || row.id,
                    databaseId: row.id,
                    sourceType,
                    origin:
                        row.origin ||
                        (seasonalParts.length ? "seasonal" :
                            row.inventory_item_id ? "inventory" : "manual"),
                    sourceLabel:
                        row.source_label ||
                        (row.inventory_item_id ? "Home Inventory" : "Manual"),
                    season: seasonalParts[1] || null,
                    inventoryItemId: row.inventory_item_id
                        ? keyByDatabaseItemId.get(row.inventory_item_id) || null
                        : null,
                    destinationZoneId: row.destination_location_id
                        ? locationKeyById.get(row.destination_location_id) || null
                        : null,
                    destinationLabel: row.destination_label || "",
                    name: row.name,
                    category: row.category || "",
                    quantity: Math.max(1, Number(row.quantity) || 1),
                    quantityMode: row.quantity_mode || "manual",
                    unit: row.unit || "",
                    notes: row.notes || "",
                    checked: row.status === "in_cart",
                    addedAt:
                        row.created_at ||
                        new Date().toISOString()
                };
            });

            return {
                items,
                shoppingList
            };
        },

        applyDatabaseState(state) {
            this.applyingDatabaseState = true;

            try {
                HomeStore.saveState(state);
            } finally {
                this.applyingDatabaseState = false;
            }
        },

        async initializeDatabase() {
            try {
                await this.loadDatabaseLocations();

                const [remote, preferences] = await Promise.all([
                    this.readDatabaseInventory(),
                    this.loadInventoryPreferences()
                ]);

                const state = HomeStore.getState();

                state.inventory =
                    state.inventory &&
                    typeof state.inventory === "object"
                        ? state.inventory
                        : {};

                state.inventory.zones = this.ZONES.map(zone => ({ ...zone }));
                state.inventory.items = remote.items;
                state.inventory.shoppingList = remote.shoppingList;
                state.inventory.autoAddShortages =
                    preferences.autoAddShortages;

                if (!Array.isArray(state.activity)) {
                    state.activity = [];
                }

                if (
                    !this.ZONES.some(
                        zone => zone.id === state.inventory.selectedZone
                    )
                ) {
                    state.inventory.selectedZone =
                        this.ZONES[0]?.id || "";
                }

                this.syncDerivedState(state);
                this.applyDatabaseState(state);

                this.databaseReady = true;
                return true;
            } catch (error) {
                this.databaseReady = false;
                console.error(
                    "[HomeOS] Inventory database initialization failed.",
                    error
                );
                return false;
            }
        },

        async commitDatabaseChange(mutator) {
            if (!this.databaseReady) {
                throw new Error(
                    "HomeOS Inventory is not connected to the database."
                );
            }

            const run = async () => {
                const remote = await this.readDatabaseInventory();
                const state = HomeStore.getState();

                state.inventory.items = remote.items;
                state.inventory.shoppingList = remote.shoppingList;
                this.syncDerivedState(state);

                const baseline = {
                    inventoryRecords: new Map(
                        remote.items.map(item => [
                            String(item.id),
                            item.databaseId || null
                        ])
                    ),
                    shoppingRecords: new Map(
                        remote.shoppingList.map(item => [
                            String(item.id),
                            item.databaseId || null
                        ])
                    )
                };

                const result = await mutator(state);

                if (result === false) {
                    this.applyDatabaseState(state);
                    return {
                        changed: false,
                        result,
                        state
                    };
                }

                this.syncDerivedState(state);
                await this.syncDatabaseSnapshot(state, baseline);
                this.applyDatabaseState(state);

                return {
                    changed: true,
                    result,
                    state
                };
            };

            const chain =
                this.databaseWriteChain || Promise.resolve();

            const operation = chain.then(run, run);

            this.databaseWriteChain = operation.catch(() => undefined);

            return operation;
        },

        handlePersistenceError(action, error) {
            console.error(
                `[HomeOS] Inventory ${action} failed.`,
                error
            );

            this.render?.(HomeStore.getState());

            HomeApp.toast(
                `Couldn't ${action}. Nothing was saved. Please try again.`
            );
        },

        async syncDatabaseSnapshot(state, baseline = null) {
            const { supabase, householdId } =
                this.requireDatabaseContext();

            if (this.locationDbIds.size !== this.ZONES.length) {
                await this.loadDatabaseLocations();
            }

            const inventory = state.inventory || {};
            const items = Array.isArray(inventory.items)
                ? inventory.items
                : [];

            const itemPayload = items
                .map(item => {
                    const locationId =
                        this.locationDbIds.get(item.zoneId);

                    if (!locationId) {
                        return null;
                    }

                    return {
                        household_id: householdId,
                        homeos_key: String(item.id),
                        location_id: locationId,
                        name: String(
                            item.name || "Inventory Item"
                        ).trim(),
                        category: String(item.category || "").trim(),
                        quantity: Math.max(
                            0,
                            Number(item.current) || 0
                        ),
                        unit: String(item.unit || "").trim(),
                        minimum_quantity: Math.max(
                            0,
                            Number(item.target) || 0
                        ),
                        target_quantity: Math.max(
                            1,
                            Number(item.target) || 1
                        ),
                        expires_on: item.expiresOn || null,
                        notes: String(item.notes || "").trim() || null,
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

            const localItemKeys = new Set(
                items.map(item => String(item.id))
            );

            const removedItemRecords = baseline
                ? [...baseline.inventoryRecords.entries()].filter(
                    ([key]) => !localItemKeys.has(key)
                )
                : [];

            const removedItemIds = removedItemRecords
                .map(([, databaseId]) => databaseId)
                .filter(Boolean);

            const removedItemKeys = removedItemRecords
                .filter(([, databaseId]) => !databaseId)
                .map(([key]) => key);

            if (removedItemIds.length) {
                const { error } = await supabase
                    .from("inventory_items")
                    .update({ active: false })
                    .eq("household_id", householdId)
                    .in("id", removedItemIds);

                if (error) {
                    throw error;
                }
            }

            if (removedItemKeys.length) {
                const { error } = await supabase
                    .from("inventory_items")
                    .update({ active: false })
                    .eq("household_id", householdId)
                    .in("homeos_key", removedItemKeys);

                if (error) {
                    throw error;
                }
            }

            const { data: freshItems, error: freshItemError } =
                await supabase
                    .from("inventory_items")
                    .select("id, homeos_key")
                    .eq("household_id", householdId)
                    .eq("active", true);

            if (freshItemError) {
                throw freshItemError;
            }

            this.itemDbIds = new Map(
                (freshItems || []).map(row => [
                    row.homeos_key || row.id,
                    row.id
                ])
            );

            const shoppingList =
                Array.isArray(inventory.shoppingList)
                    ? inventory.shoppingList
                    : [];

            const shoppingPayload = shoppingList.map(entry => ({
                household_id: householdId,
                homeos_key: String(entry.id),
                inventory_item_id: entry.inventoryItemId
                    ? this.itemDbIds.get(entry.inventoryItemId) || null
                    : null,
                destination_location_id: entry.destinationZoneId
                    ? this.locationDbIds.get(entry.destinationZoneId) || null
                    : null,
                destination_label:
                    String(entry.destinationLabel || "").trim() || null,
                name: String(
                    entry.name || "Shopping Item"
                ).trim(),
                category: String(entry.category || "").trim(),
                quantity: Math.max(
                    1,
                    Number(entry.quantity) || 1
                ),
                unit: String(entry.unit || "").trim(),
                status: entry.checked ? "in_cart" : "needed",
                notes: String(entry.notes || "").trim() || null,
                source_type:
                    entry.sourceType ||
                    (entry.inventoryItemId ? "inventory" : "custom"),
                origin: entry.origin || "inventory",
                source_label: entry.sourceLabel || "HomeOS",
                quantity_mode: entry.quantityMode || "manual"
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

            const localShoppingKeys = new Set(
                shoppingList.map(entry => String(entry.id))
            );

            const removedShoppingRecords = baseline
                ? [...baseline.shoppingRecords.entries()].filter(
                    ([key]) => !localShoppingKeys.has(key)
                )
                : [];

            const removedShoppingIds = removedShoppingRecords
                .map(([, databaseId]) => databaseId)
                .filter(Boolean);

            const removedShoppingKeys = removedShoppingRecords
                .filter(([, databaseId]) => !databaseId)
                .map(([key]) => key);

            if (removedShoppingIds.length) {
                const { error } = await supabase
                    .from("shopping_list")
                    .delete()
                    .eq("household_id", householdId)
                    .in("id", removedShoppingIds);

                if (error) {
                    throw error;
                }
            }

            if (removedShoppingKeys.length) {
                const { error } = await supabase
                    .from("shopping_list")
                    .delete()
                    .eq("household_id", householdId)
                    .in("homeos_key", removedShoppingKeys);

                if (error) {
                    throw error;
                }
            }

            return true;
        }
    };
})();
