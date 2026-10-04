/* ============================================================
   HOMEOS // PERSON PICKER

   Shared household person selector used by the task editor.
============================================================ */

(function createHomeOSPersonPicker() {
    "use strict";

    window.HomeOS = window.HomeOS || {};
    window.HomeOS.components = window.HomeOS.components || {};

    // Escape text before placing it inside generated HTML.
    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Use a saved profile color when valid, otherwise use the default accent.
    function safeColor(value) {
        const color = String(value || "").trim();
        return /^#[0-9a-f]{6}$/i.test(color) ? color : "#79cbd0";
    }

    // Return the best available name for a household member.
    function getDisplayName(person) {
        const value = String(person?.display_name || person?.name || "").trim();
        return value || "Household Person";
    }

    // Build the selectable household-member cards.
    function render({
        people = [],
        selectedIds = [],
        inputName = "homeosPerson",
        disabled = false
    } = {}) {
        const selected = new Set(selectedIds);

        const choices = people.map(person => {
            const displayName = getDisplayName(person);
            const initial = displayName.charAt(0).toUpperCase() || "H";
            const checked = selected.has(person.id);
            const relationship =
                person.relationship_label ||
                person.member_type ||
                "Household Member";

            return `
                <label
                    class="task-person-choice ${checked ? "selected" : ""}"
                    style="--person-accent:${safeColor(person.color)};"
                >
                    <input
                        type="checkbox"
                        name="${escapeHtml(inputName)}"
                        value="${escapeHtml(person.id)}"
                        ${checked ? "checked" : ""}
                        ${disabled ? "disabled" : ""}
                    >

                    <span class="task-person-avatar">${escapeHtml(initial)}</span>

                    <span class="task-person-copy">
                        <strong>${escapeHtml(displayName)}</strong>
                        <small>${escapeHtml(relationship)}</small>
                    </span>

                    <span class="task-person-check">✓</span>
                </label>
            `;
        }).join("");

        return `<div class="task-person-grid">${choices}</div>`;
    }

    // Read the selected person IDs from a rendered picker.
    function selectedIds(root, inputName = "homeosPerson") {
        if (!root) return [];

        return [...root.querySelectorAll('input[type="checkbox"]:checked')]
            .filter(input => input.name === inputName)
            .map(input => input.value);
    }

    window.HomeOS.components.personPicker = {
        render,
        selectedIds
    };
})();