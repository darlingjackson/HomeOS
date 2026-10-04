/* ============================================================
   HOMEOS // INVENTORY SERVICE

   Inventory data access and storage.
============================================================ */

(function () {
    "use strict";
    window.HomeOS = window.HomeOS || {};
    const BASE_CACHE_KEY = "homeos_inventory_compat_v1";
    let householdId = null;
    let userId = null;
    let memory = {
        inventory: {
            zones: [],
            items: [],
            shoppingList: [],
            lowItems: [],
            autoAddShortages: false,
            selectedZone: "",
            health: 100
        },
        activity: []
    };
    function clone(value) {
        return JSON.parse(JSON.stringify(value ?? {}));
    }
    function cacheKey() {
        return householdId
            ? `${BASE_CACHE_KEY}:${householdId}`
            : `${BASE_CACHE_KEY}:pending`;
    }
    function normalizeState(value) {
        const next = value &&
            typeof value === "object"
            ? clone(value)
            : {};
        next.inventory =
            next.inventory &&
                typeof next.inventory === "object"
                ? next.inventory
                : {};
        next.inventory.zones =
            Array.isArray(next.inventory.zones)
                ? next.inventory.zones
                : [];
        next.inventory.items =
            Array.isArray(next.inventory.items)
                ? next.inventory.items
                : [];
        next.inventory.shoppingList =
            Array.isArray(next.inventory.shoppingList)
                ? next.inventory.shoppingList
                : [];
        next.inventory.lowItems =
            Array.isArray(next.inventory.lowItems)
                ? next.inventory.lowItems
                : [];
        next.inventory.autoAddShortages =
            Boolean(next.inventory.autoAddShortages);
        next.inventory.selectedZone =
            String(next.inventory.selectedZone ||
                "");
        next.inventory.health =
            Number.isFinite(Number(next.inventory.health))
                ? Number(next.inventory.health)
                : 100;
        next.activity =
            Array.isArray(next.activity)
                ? next.activity
                : [];
        return next;
    }
    function readCache() {
        try {
            const raw = localStorage.getItem(cacheKey());
            if (!raw) {
                return null;
            }
            return normalizeState(JSON.parse(raw));
        }
        catch (error) {
            console.warn("HOME OS Inventory could not read its local cache.", error);
            return null;
        }
    }
    function writeCache() {
        try {
            localStorage.setItem(cacheKey(), JSON.stringify(memory));
        }
        catch (error) {
            console.warn("HOME OS Inventory could not update its local cache.", error);
        }
    }
    function dispatchState() {
        window.dispatchEvent(new CustomEvent("homeos:statechange", {
            detail: clone(memory)
        }));
    }
    function getState() {
        return clone(memory);
    }
    function saveState(nextState) {
        memory =
            normalizeState(nextState);
        writeCache();
        dispatchState();
        return getState();
    }
    function update(mutator) {
        const draft = getState();
        if (typeof mutator ===
            "function") {
            mutator(draft);
        }
        return saveState(draft);
    }
    function getCloudContext() {
        return {
            userId,
            householdId,
            ready: Boolean(householdId)
        };
    }
    async function initialize() {
        try {
            const session = await window.HomeOS
                ?.session
                ?.guard?.();
            if (!session ||
                !session.authenticated) {
                return false;
            }
            householdId =
                session.household?.id ||
                    null;
            userId =
                session.user?.id ||
                    session.authUser?.id ||
                    null;
            const cached = readCache();
            if (cached) {
                memory = cached;
            }
            return true;
        }
        catch (error) {
            console.error("HOME OS Inventory could not resolve the current household.", error);
            return false;
        }
    }
    const service = {
        getState,
        saveState,
        update,
        getCloudContext,
        ready: null
    };
    window.HomeOS.services = window.HomeOS.services || {};
    window.HomeOS.services.inventory = service;
    // Temporary alias for the existing Inventory page controller. It points only to this Inventory service and does not restore the retired whole-app store.
    window.HomeStore = service;
    service.ready = initialize();
})();
