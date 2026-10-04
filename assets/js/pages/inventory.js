/* ============================================================
   HOMEOS // INVENTORY

   Builds the Inventory page from its smaller page modules.
============================================================ */

(function ensureInventoryPageHelpers() {
    "use strict";
    if (window.HomeApp) {
        return;
    }
    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
    function formatDate(date = new Date()) {
        return new Intl.DateTimeFormat("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric"
        }).format(date);
    }
    function formatTime(date = new Date()) {
        return new Intl.DateTimeFormat("en-US", {
            hour: "numeric",
            minute: "2-digit"
        }).format(date);
    }
    function toast(message) {
        if (window.HomeOS?.ui?.notify) {
            window.HomeOS.ui.notify(String(message || ""), {
                title: "Inventory",
                tone: "info",
                duration: 3400
            });
            return;
        }
        const element = document.getElementById("appToast");
        if (!element)
            return;
        element.textContent = String(message || "");
        element.classList.add("show");
        window.setTimeout(() => element.classList.remove("show"), 3200);
    }
    window.HomeApp = { escapeHtml, formatDate, formatTime, toast };
})();
// --- Darling Homeos ---
document.addEventListener("DOMContentLoaded", () => {
    "use strict";
    const InventoryApp = {
        // --- Storage Nodes ---
        ZONES: [],
        ZONE_COLORS: [
            "#8e63ff",
            "#22c7e9",
            "#5487ff",
            "#28d4c2",
            "#f15fa9",
            "#f0b23f",
            "#80cbd0",
            "#aaa0e4"
        ],
        // --- Controlled Inventory Vocabulary ---
        UNITS: [
            { value: "each", label: "Each" },
            { value: "bag", label: "Bag" },
            { value: "box", label: "Box" },
            { value: "bottle", label: "Bottle" },
            { value: "can", label: "Can" },
            { value: "jar", label: "Jar" },
            { value: "pack", label: "Pack" },
            { value: "pouch", label: "Pouch" },
            { value: "carton", label: "Carton" },
            { value: "roll", label: "Roll" },
            { value: "case", label: "Case" },
            { value: "count", label: "Count" },
            { value: "lb", label: "Pound (lb)" },
            { value: "oz", label: "Ounce (oz)" },
            { value: "gallon", label: "Gallon" }
        ],
        CATEGORIES_BY_ZONE: {
            pantry: [
                "Baking & Sweeteners",
                "Breakfast",
                "Canned & Jarred Goods",
                "Condiments & Sauces",
                "Grains, Rice & Pasta",
                "Snacks",
                "Spices & Seasonings",
                "Beverages",
                "Kids' Foods",
                "Backstock"
            ],
            refrigerator: [
                "Dairy & Eggs",
                "Produce",
                "Meat & Deli",
                "Drinks",
                "Condiments & Sauces",
                "Prepared Foods",
                "Kids' Foods",
                "Leftovers"
            ],
            "kitchen-freezer": [
                "Meat & Poultry",
                "Seafood",
                "Frozen Vegetables",
                "Frozen Fruit",
                "Frozen Meals",
                "Breakfast",
                "Snacks",
                "Desserts",
                "Bulk Food"
            ],
            "deep-freezer": [
                "Meat & Poultry",
                "Seafood",
                "Frozen Vegetables",
                "Frozen Fruit",
                "Frozen Meals",
                "Breakfast",
                "Snacks",
                "Desserts",
                "Bulk Food"
            ],
            "mini-fridge": [
                "Water",
                "Juice",
                "Soda",
                "Sports Drinks",
                "Kids' Drinks",
                "Coffee & Tea",
                "Hosting Drinks"
            ],
            household: [
                "Paper Goods",
                "Cleaning Supplies",
                "Laundry",
                "Dishwashing",
                "Trash & Storage",
                "Kitchen Disposables",
                "Bathroom Supplies",
                "Personal Care",
                "Home Maintenance"
            ],
            storage: [
                "Backstock",
                "Home Supplies",
                "Kitchen Supplies",
                "Bathroom Supplies",
                "Personal Care",
                "Pet Supplies",
                "Seasonal Supplies",
                "Other"
            ]
        },
        // --- Inventory Cleanup ---
        INVENTORY_CLEANUP_VERSION: 1,
        LEGACY_STARTER_ITEM_IDS: [
            "item-rice",
            "item-pasta",
            "item-cereal",
            "item-canned-tomatoes",
            "item-milk",
            "item-eggs",
            "item-cheese",
            "item-frozen-veg",
            "item-chicken-breast",
            "item-family-chicken",
            "item-ground-beef",
            "item-kids-drinks",
            "item-water",
            "item-sparkling",
            "item-paper-towels",
            "item-toilet-paper",
            "item-dishwasher-pods",
            "item-laundry-detergent",
            "item-trash-bags"
        ],
        selectedZone: "",
        searchTerm: "",
        clockTimer: null,
        databaseReady: false,
        applyingDatabaseState: false,
        databaseSyncTimer: null,
        locationDbIds: new Map(),
        itemDbIds: new Map(),
        // --- Startup ---
        async init() {
            // Wait for HomeStore to finish resolving the authenticated user + household before Inventory touches the database.
            if (window.HomeStore?.ready) {
                await window.HomeStore.ready;
            }
            this.applySeasonalIdentity();
            await this.loadDatabaseLocations();
            this.ensureInventorySetup();
            await this.initializeDatabase();
            this.bindEvents();
            this.bindStateEvents();
            const state = HomeStore.getState();
            this.syncSelectedZone(state);
            this.render(state);
        },
    };
    // --- Inventory Page Modules ---
    const modules = window.HomeOS?.inventoryPageModules || {};
    [
        "database",
        "state",
        "render",
        "shopping",
        "dialogs",
        "events"
    ].forEach(moduleName => {
        if (!modules[moduleName]) {
            throw new Error(`HOME OS Inventory module failed to load: ${moduleName}`);
        }
        Object.assign(InventoryApp, modules[moduleName]);
    });
    window.InventoryApp =
        InventoryApp;
    InventoryApp
        .init()
        .catch(error => {
        console.error("DARLING HomeOS Inventory startup failed.", error);
    });
});
