/* ============================================================
   HOMEOS // ACCOUNT HOME

   Home Setup settings inside Account.
============================================================ */

(function registerAccountHomeModule() {
    "use strict";
    window.HomeOS = window.HomeOS || {};
    window.HomeOS.accountPageModules =
        window.HomeOS.accountPageModules || {};
    window.HomeOS.accountPageModules.home = {
        // --- Home Setup ---
        async loadHomeData() {
            const householdId = this.householdId();
            const [levels, rooms, zones, inventory, laundry, features, settings] = await Promise.all([
                this.supabase.from("home_levels").select("*").eq("household_id", householdId).order("sort_order"),
                this.supabase.from("rooms").select("*").eq("household_id", householdId).order("sort_order"),
                this.supabase.from("zones").select("*").eq("household_id", householdId).order("sort_order"),
                this.supabase.from("inventory_locations").select("*").eq("household_id", householdId).order("sort_order"),
                this.supabase.from("laundry_areas").select("*").eq("household_id", householdId).order("sort_order"),
                this.supabase.from("household_features").select("*").eq("household_id", householdId).order("name"),
                this.supabase.from("household_settings").select("settings").eq("household_id", householdId).maybeSingle()
            ]);
            const firstError = [levels, rooms, zones, inventory, laundry, features, settings].find(result => result.error)?.error;
            if (firstError)
                throw firstError;
            this.home = {
                levels: levels.data || [],
                rooms: rooms.data || [],
                zones: zones.data || [],
                inventory: inventory.data || [],
                laundry: laundry.data || [],
                features: features.data || [],
                settings: settings.data?.settings && typeof settings.data.settings === "object" ? settings.data.settings : {}
            };
        },
        renderHomeSetup() {
            const activeLevels = this.home.levels.filter(item => item.active !== false);
            const activeRooms = this.home.rooms.filter(item => item.active !== false);
            const activeZones = this.home.zones.filter(item => item.active !== false);
            const activeInventory = this.home.inventory.filter(item => item.active !== false);
            const activeLaundry = this.home.laundry.filter(item => item.active !== false);
            const enabledFeatures = this.home.features.filter(item => item.enabled !== false);
            this.setText("householdLevelCount", activeLevels.length);
            this.setText("householdAreaCount", activeRooms.length);
            this.setText("householdZoneCount", activeZones.length);
            this.setText("adminInventoryCount", activeInventory.length);
            this.setText("adminLaundryCount", activeLaundry.length);
            this.setText("adminFeatureCount", enabledFeatures.length);
            this.setText("homeLayoutCount", `${activeLevels.length}/${activeRooms.length}`);
            this.setText("zoneSetupCount", activeZones.length);
            this.setText("inventorySetupCount", activeInventory.length);
            this.setText("laundrySetupCount", activeLaundry.length);
            this.setText("careSetupCount", enabledFeatures.length);
            this.fillHomeSelects();
            this.renderLevelList();
            this.renderRoomList();
            this.renderZoneList();
            this.renderInventoryList();
            this.renderLaundryList();
            this.renderFeatureList();
            this.renderLaundrySystem();
            this.renderTaskWorkspace();
        },
        fillHomeSelects() {
            const levelOptions = this.home.levels.filter(item => item.active !== false).map(item => `<option value="${this.escape(item.id)}">${this.escape(item.name)}</option>`).join("");
            const zoneOptions = this.home.zones.filter(item => item.active !== false).map(item => `<option value="${this.escape(item.id)}">${this.escape(item.name)}</option>`).join("");
            const roomOptions = this.home.rooms.filter(item => item.active !== false).map(item => `<option value="${this.escape(item.id)}">${this.escape(item.name)}</option>`).join("");
            this.setOptions("roomLevelInput", '<option value="">No level</option>' + levelOptions);
            this.setOptions("roomZoneInput", '<option value="">No cleaning zone</option>' + zoneOptions);
            ["inventoryRoomInput", "laundryRoomInput", "homeCareRoomInput"].forEach(id => this.setOptions(id, '<option value="">No linked area</option>' + roomOptions));
        },
        renderLevelList() {
            this.renderSimpleList("levelList", this.home.levels.filter(item => item.active !== false), item => ({
                title: item.name,
                sub: `${this.home.rooms.filter(room => room.active !== false && room.level_id === item.id).length} areas`,
                edit: `data-edit-level="${this.escape(item.id)}"`,
                archive: `data-archive-level="${this.escape(item.id)}"`
            }));
        },
        renderRoomList() {
            this.renderSimpleList("roomList", this.home.rooms.filter(item => item.active !== false), item => ({
                title: item.name,
                sub: [this.home.levels.find(level => level.id === item.level_id)?.name, this.pretty(item.room_type), this.home.zones.find(zone => zone.id === item.zone_id)?.name].filter(Boolean).join(" · "),
                edit: `data-edit-room="${this.escape(item.id)}"`,
                archive: `data-archive-room="${this.escape(item.id)}"`
            }));
        },
        renderZoneList() {
            this.renderSimpleList("zoneList", this.home.zones.filter(item => item.active !== false), item => ({
                title: item.name,
                sub: `${this.home.rooms.filter(room => room.active !== false && room.zone_id === item.id).length} areas${item.description ? ` · ${item.description}` : ""}`,
                edit: `data-edit-zone="${this.escape(item.id)}"`,
                archive: `data-archive-zone="${this.escape(item.id)}"`
            }));
        },
        renderInventoryList() {
            this.renderSimpleList("inventoryLocationList", this.home.inventory.filter(item => item.active !== false), item => ({
                title: item.name,
                sub: `${this.pretty(item.location_type)}${item.room_id ? ` · ${this.home.rooms.find(room => room.id === item.room_id)?.name || "Linked area"}` : ""}`,
                edit: `data-edit-inventory="${this.escape(item.id)}"`,
                archive: `data-archive-inventory="${this.escape(item.id)}"`
            }));
        },
        renderLaundryList() {
            this.renderSimpleList("laundryAreaList", this.home.laundry.filter(item => item.active !== false), item => ({
                title: item.name,
                sub: `${item.has_washer ? "Washer" : "No washer"} · ${item.has_dryer ? "Dryer" : "No dryer"}${item.room_id ? ` · ${this.home.rooms.find(room => room.id === item.room_id)?.name || "Linked area"}` : ""}`,
                edit: `data-edit-laundry="${this.escape(item.id)}"`,
                archive: `data-archive-laundry="${this.escape(item.id)}"`
            }));
        },
        renderFeatureList() {
            this.renderSimpleList("homeCareFeatureList", this.home.features, item => ({
                title: item.name,
                sub: `${this.pretty(item.feature_type)}${item.room_id ? ` · ${this.home.rooms.find(room => room.id === item.room_id)?.name || "Linked area"}` : ""}`,
                status: item.enabled !== false ? "Enabled" : "Disabled",
                edit: `data-edit-care="${this.escape(item.id)}"`,
                archive: `data-toggle-care="${this.escape(item.id)}"`
            }), "Disable / Enable");
        },
        renderSimpleList(id, rows, mapper, archiveLabel = "Archive") {
            const list = document.getElementById(id);
            if (!list)
                return;
            if (!rows.length) {
                list.innerHTML = '<div class="record-empty">Nothing added yet.</div>';
                return;
            }
            list.innerHTML = rows.map(row => {
                const view = mapper(row);
                return `
                    <div class="record-row">
                        <div class="record-main">
                            <strong>${this.escape(view.title)}</strong>
                            <span>${this.escape(view.sub || "")}</span>
                        </div>
                        <div class="record-meta">
                            ${view.status ? `<span class="record-pill ${view.status === "Enabled" ? "success" : "attention"}">${this.escape(view.status)}</span>` : ""}
                            <button class="record-action" type="button" ${view.edit}>Edit</button>
                            <button class="record-action danger" type="button" ${view.archive}>${archiveLabel}</button>
                        </div>
                    </div>
                `;
            }).join("");
        },
        async saveLevel(event) {
            event.preventDefault();
            if (!this.requireAdmin())
                return;
            const name = this.value("levelNameInput").trim();
            if (!name)
                return;
            const id = this.value("levelIdInput") || null;
            const payload = { name, active: true };
            let result;
            if (id)
                result = await this.supabase.from("home_levels").update(payload).eq("id", id).eq("household_id", this.householdId());
            else
                result = await this.supabase.from("home_levels").insert({ ...payload, household_id: this.householdId(), sort_order: this.nextSort(this.home.levels) });
            if (result.error)
                return this.handleError("The level could not be saved.", result.error);
            this.clearLevelForm();
            await this.refreshHome("Level saved.");
        },
        editLevel(id) {
            const row = this.home.levels.find(item => item.id === id);
            if (!row)
                return;
            this.setValue("levelIdInput", row.id);
            this.setValue("levelNameInput", row.name);
        },
        clearLevelForm() { this.setValue("levelIdInput", ""); this.setValue("levelNameInput", ""); },
        async archiveLevel(id) { await this.archiveRecord("home_levels", id, "active", false, "Level archived."); },
        async saveRoom(event) {
            event.preventDefault();
            if (!this.requireAdmin())
                return;
            const name = this.value("roomNameInput").trim();
            if (!name)
                return;
            const id = this.value("roomIdInput") || null;
            const type = this.value("roomTypeInput") || "other";
            const payload = {
                name,
                room_type: type,
                cleaning_protocol_type: type === "other" ? null : type,
                level_id: this.value("roomLevelInput") || null,
                zone_id: this.value("roomZoneInput") || null,
                active: true
            };
            let result;
            if (id)
                result = await this.supabase.from("rooms").update(payload).eq("id", id).eq("household_id", this.householdId());
            else
                result = await this.supabase.from("rooms").insert({ ...payload, household_id: this.householdId(), sort_order: this.nextSort(this.home.rooms), metadata: {} });
            if (result.error)
                return this.handleError("The area could not be saved.", result.error);
            this.clearRoomForm();
            await this.refreshHome("Area saved.");
        },
        editRoom(id) {
            const row = this.home.rooms.find(item => item.id === id);
            if (!row)
                return;
            this.setValue("roomIdInput", row.id);
            this.setValue("roomNameInput", row.name);
            this.setValue("roomTypeInput", row.room_type || "other");
            this.setValue("roomLevelInput", row.level_id || "");
            this.setValue("roomZoneInput", row.zone_id || "");
        },
        clearRoomForm() { document.getElementById("roomForm")?.reset(); this.setValue("roomIdInput", ""); this.setValue("roomTypeInput", "other"); },
        async archiveRoom(id) { await this.archiveRecord("rooms", id, "active", false, "Area archived."); },
        async saveZone(event) {
            event.preventDefault();
            if (!this.requireAdmin())
                return;
            const name = this.value("zoneNameInput").trim();
            if (!name)
                return;
            const id = this.value("zoneIdInput") || null;
            const payload = { name, description: this.value("zoneDescriptionInput").trim() || null, color: this.value("zoneColorInput") || null, active: true };
            let result;
            if (id)
                result = await this.supabase.from("zones").update(payload).eq("id", id).eq("household_id", this.householdId());
            else
                result = await this.supabase.from("zones").insert({ ...payload, household_id: this.householdId(), sort_order: this.nextSort(this.home.zones) });
            if (result.error)
                return this.handleError("The cleaning zone could not be saved.", result.error);
            this.clearZoneForm();
            await this.refreshHome("Cleaning zone saved.");
        },
        editZone(id) {
            const row = this.home.zones.find(item => item.id === id);
            if (!row)
                return;
            this.setValue("zoneIdInput", row.id);
            this.setValue("zoneNameInput", row.name);
            this.setValue("zoneDescriptionInput", row.description || "");
            this.setValue("zoneColorInput", row.color || "#79cbd0");
        },
        clearZoneForm() { document.getElementById("zoneForm")?.reset(); this.setValue("zoneIdInput", ""); this.setValue("zoneColorInput", "#79cbd0"); },
        async archiveZone(id) {
            if (!this.requireAdmin())
                return;

            const householdId = this.householdId();
            const affectedRoomIds = this.home.rooms
                .filter(room => room.zone_id === id)
                .map(room => room.id);

            const clearRooms = await this.supabase
                .from("rooms")
                .update({ zone_id: null })
                .eq("household_id", householdId)
                .eq("zone_id", id);

            if (clearRooms.error) {
                return this.handleError(
                    "HOME OS could not remove areas from this zone.",
                    clearRooms.error
                );
            }

            const archive = await this.supabase
                .from("zones")
                .update({ active: false })
                .eq("id", id)
                .eq("household_id", householdId);

            if (archive.error) {
                if (affectedRoomIds.length) {
                    const rollback = await this.supabase
                        .from("rooms")
                        .update({ zone_id: id })
                        .eq("household_id", householdId)
                        .in("id", affectedRoomIds);

                    if (rollback.error) {
                        console.error(
                            "[HOME OS] Zone archive rollback failed.",
                            rollback.error
                        );
                    }
                }

                return this.handleError(
                    "The cleaning zone could not be archived.",
                    archive.error
                );
            }

            await this.refreshHome("Cleaning zone archived.");
        },
        async saveInventory(event) {
            event.preventDefault();
            if (!this.requireAdmin())
                return;
            const name = this.value("inventoryLocationNameInput").trim();
            if (!name)
                return;
            const id = this.value("inventoryLocationIdInput") || null;
            const payload = { name, location_type: this.value("inventoryLocationTypeInput") || "storage", room_id: this.value("inventoryRoomInput") || null, active: true };
            let result;
            if (id)
                result = await this.supabase.from("inventory_locations").update(payload).eq("id", id).eq("household_id", this.householdId());
            else
                result = await this.supabase.from("inventory_locations").insert({ ...payload, household_id: this.householdId(), sort_order: this.nextSort(this.home.inventory) });
            if (result.error)
                return this.handleError("The inventory storage area could not be saved.", result.error);
            this.clearInventoryForm();
            await this.refreshHome("Inventory storage saved.");
        },
        editInventory(id) {
            const row = this.home.inventory.find(item => item.id === id);
            if (!row)
                return;
            this.setValue("inventoryLocationIdInput", row.id);
            this.setValue("inventoryLocationNameInput", row.name);
            this.setValue("inventoryLocationTypeInput", row.location_type || "storage");
            this.setValue("inventoryRoomInput", row.room_id || "");
        },
        clearInventoryForm() { document.getElementById("inventoryLocationForm")?.reset(); this.setValue("inventoryLocationIdInput", ""); this.setValue("inventoryLocationTypeInput", "storage"); },
        async archiveInventory(id) { await this.archiveRecord("inventory_locations", id, "active", false, "Inventory storage archived."); },
        renderLaundrySystem() {
            const mode = this.home.settings?.laundry_system?.mode || this.home.settings?.laundrySystem || "color";
            this.setValue("laundrySystemInput", mode);
        },
        async saveLaundrySystem(event) {
            event.preventDefault();
            if (!this.requireAdmin())
                return;

            const householdId = this.householdId();
            const mode = this.value("laundrySystemInput") || "color";
            const latest = await this.supabase
                .from("household_settings")
                .select("settings")
                .eq("household_id", householdId)
                .maybeSingle();

            if (latest.error) {
                return this.handleError(
                    "The laundry system could not be saved.",
                    latest.error
                );
            }

            const currentSettings =
                latest.data?.settings &&
                typeof latest.data.settings === "object"
                    ? latest.data.settings
                    : {};

            const currentLaundry =
                currentSettings.laundry_system &&
                typeof currentSettings.laundry_system === "object"
                    ? currentSettings.laundry_system
                    : {};

            const nextSettings = {
                ...currentSettings,
                laundrySystem: mode,
                laundry_system: {
                    ...currentLaundry,
                    mode,
                    updatedAt: new Date().toISOString()
                }
            };

            const { error } = await this.supabase
                .from("household_settings")
                .upsert(
                    {
                        household_id: householdId,
                        settings: nextSettings
                    },
                    { onConflict: "household_id" }
                );

            if (error) {
                return this.handleError(
                    "The laundry system could not be saved.",
                    error
                );
            }

            this.home.settings = nextSettings;
            this.notify("Laundry system saved.", {
                tone: "success",
                title: "Home Setup"
            });
        },
        async saveLaundryArea(event) {
            event.preventDefault();
            if (!this.requireAdmin())
                return;
            const name = this.value("laundryAreaNameInput").trim();
            if (!name)
                return;
            const id = this.value("laundryAreaIdInput") || null;
            const payload = { name, area_type: "washer_dryer", room_id: this.value("laundryRoomInput") || null, has_washer: this.checked("laundryHasWasherInput"), has_dryer: this.checked("laundryHasDryerInput"), active: true };
            let result;
            if (id)
                result = await this.supabase.from("laundry_areas").update(payload).eq("id", id).eq("household_id", this.householdId());
            else
                result = await this.supabase.from("laundry_areas").insert({ ...payload, household_id: this.householdId(), sort_order: this.nextSort(this.home.laundry) });
            if (result.error)
                return this.handleError("The laundry area could not be saved.", result.error);
            this.clearLaundryForm();
            await this.refreshHome("Laundry area saved.");
        },
        editLaundry(id) {
            const row = this.home.laundry.find(item => item.id === id);
            if (!row)
                return;
            this.setValue("laundryAreaIdInput", row.id);
            this.setValue("laundryAreaNameInput", row.name);
            this.setValue("laundryRoomInput", row.room_id || "");
            this.setChecked("laundryHasWasherInput", row.has_washer !== false);
            this.setChecked("laundryHasDryerInput", row.has_dryer !== false);
        },
        clearLaundryForm() { document.getElementById("laundryAreaForm")?.reset(); this.setValue("laundryAreaIdInput", ""); this.setChecked("laundryHasWasherInput", true); this.setChecked("laundryHasDryerInput", true); },
        async archiveLaundry(id) { await this.archiveRecord("laundry_areas", id, "active", false, "Laundry area archived."); },
        async saveCareFeature(event) {
            event.preventDefault();
            if (!this.requireAdmin())
                return;
            const name = this.value("homeCareFeatureNameInput").trim();
            if (!name)
                return;
            const id = this.value("homeCareFeatureIdInput") || null;
            const payload = {
                name,
                feature_type: this.value("homeCareFeatureTypeInput") || "home_feature",
                room_id: this.value("homeCareRoomInput") || null,
                enabled: this.checked("homeCareEnabledInput")
            };
            let result;
            if (id) {
                result = await this.supabase.from("household_features").update(payload).eq("id", id).eq("household_id", this.householdId());
            }
            else {
                result = await this.supabase.from("household_features").insert({ ...payload, household_id: this.householdId(), feature_key: this.uniqueFeatureKey(name), settings: {} });
            }
            if (result.error)
                return this.handleError("The Home Care feature could not be saved.", result.error);
            this.clearCareForm();
            await this.refreshHome("Home Care feature saved.");
        },
        editCare(id) {
            const row = this.home.features.find(item => item.id === id);
            if (!row)
                return;
            this.setValue("homeCareFeatureIdInput", row.id);
            this.setValue("homeCareFeatureNameInput", row.name);
            this.setValue("homeCareFeatureTypeInput", row.feature_type || "home_feature");
            this.setValue("homeCareRoomInput", row.room_id || "");
            this.setChecked("homeCareEnabledInput", row.enabled !== false);
        },
        clearCareForm() { document.getElementById("homeCareFeatureForm")?.reset(); this.setValue("homeCareFeatureIdInput", ""); this.setValue("homeCareFeatureTypeInput", "appliance"); this.setChecked("homeCareEnabledInput", true); },
        async toggleCare(id) {
            if (!this.requireAdmin())
                return;
            const row = this.home.features.find(item => item.id === id);
            if (!row)
                return;
            const { error } = await this.supabase.from("household_features").update({ enabled: row.enabled === false }).eq("id", id).eq("household_id", this.householdId());
            if (error)
                return this.handleError("The Home Care feature could not be updated.", error);
            await this.refreshHome(row.enabled === false ? "Home Care feature enabled." : "Home Care feature disabled.");
        },
        async archiveRecord(table, id, field, value, message) {
            if (!this.requireAdmin())
                return;
            const { error } = await this.supabase.from(table).update({ [field]: value }).eq("id", id).eq("household_id", this.householdId());
            if (error)
                return this.handleError(message.replace("archived", "could not be archived"), error);
            await this.refreshHome(message);
        },
        async refreshHome(message) {
            await this.loadHomeData();
            this.renderHomeSetup();
            this.renderTaskWorkspace();
            if (message)
                this.notify(message, { tone: "success", title: "Home Setup" });
        },
        uniqueFeatureKey(name) {
            const base = String(name || "feature").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "feature";
            const existing = new Set(this.home.features.map(item => item.feature_key));
            if (!existing.has(base))
                return base;
            let index = 2;
            while (existing.has(`${base}_${index}`))
                index += 1;
            return `${base}_${index}`;
        },
        nextSort(rows) {
            return rows.reduce((max, row) => Math.max(max, Number(row.sort_order || 0)), 0) + 1;
        },
    };
})();
