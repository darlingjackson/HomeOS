/* ============================================================
   HOMEOS // INVENTORY SERVICE

   In-memory Inventory state used by the current Inventory page.
   Supabase remains the source of truth for persistent inventory data.
============================================================ */

(function createHomeOSInventoryService() {
    "use strict";

    window.HomeOS = window.HomeOS || {};
    window.HomeOS.services = window.HomeOS.services || {};

    let householdId = null;
    let userId = null;

    let memory = createEmptyState();

    function createEmptyState() {
        return {
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
    }

    function clone(value) {
        return JSON.parse(JSON.stringify(value ?? {}));
    }

    function normalizeState(value) {
        const next =
            value && typeof value === "object"
                ? clone(value)
                : createEmptyState();

        next.inventory =
            next.inventory && typeof next.inventory === "object"
                ? next.inventory
                : {};

        next.inventory.zones = Array.isArray(next.inventory.zones)
            ? next.inventory.zones
            : [];

        next.inventory.items = Array.isArray(next.inventory.items)
            ? next.inventory.items
            : [];

        next.inventory.shoppingList = Array.isArray(
            next.inventory.shoppingList
        )
            ? next.inventory.shoppingList
            : [];

        next.inventory.lowItems = Array.isArray(next.inventory.lowItems)
            ? next.inventory.lowItems
            : [];

        next.inventory.autoAddShortages = Boolean(
            next.inventory.autoAddShortages
        );

        next.inventory.selectedZone = String(
            next.inventory.selectedZone || ""
        );

        next.inventory.health = Number.isFinite(
            Number(next.inventory.health)
        )
            ? Number(next.inventory.health)
            : 100;

        next.activity = Array.isArray(next.activity)
            ? next.activity
            : [];

        return next;
    }

    function dispatchState() {
        window.dispatchEvent(
            new CustomEvent("homeos:statechange", {
                detail: clone(memory)
            })
        );
    }

    function getState() {
        return clone(memory);
    }

    // This only updates the current page state. Persistent Inventory data
    // must be written to Supabase by the Inventory database layer.
    function saveState(nextState) {
        memory = normalizeState(nextState);
        dispatchState();
        return getState();
    }

    function update(mutator) {
        const draft = getState();

        if (typeof mutator === "function") {
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
            const session = await window.HomeOS.session?.guard?.();

            if (!session?.authenticated) {
                return false;
            }

            householdId = session.household?.id || null;
            userId = session.user?.id || null;

            return Boolean(householdId);
        } catch (error) {
            console.error(
                "[HomeOS] Inventory could not resolve the current household.",
                error
            );

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

    window.HomeOS.services.inventory = service;

    // Temporary compatibility alias for the existing Inventory page.
    // It is memory-only and does not persist household data in the browser.
    window.HomeStore = service;

    service.ready = initialize();
})();
