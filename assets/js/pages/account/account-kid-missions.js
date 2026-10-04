/* ============================================================
   HOMEOS // ACCOUNT KID MISSIONS

   Kids mission setup and mission management inside Account.
============================================================ */

(function registerAccountKidMissionsModule() {
    "use strict";
    window.HomeOS = window.HomeOS || {};
    window.HomeOS.accountPageModules =
        window.HomeOS.accountPageModules || {};
    const ROUTINE_ORDER = ["morning", "backpack", "after_school", "general", "weekend", "night"];
    window.HomeOS.accountPageModules.kidMissions = {
        selectedKidMissionPerson() {
            return this.people.find(person => String(person.id) === String(this.kidMissionEditorPersonId || this.selectedPersonId)) || null;
        },
        async openKidMissionEditor() {
            const person = this.people.find(person => String(person.id) === String(this.selectedPersonId));
            if (!person || !this.isChildPerson(person)) {
                this.notify("Choose a saved child first.", { tone: "attention", title: "Review Missions" });
                return;
            }
            if (!this.isAdmin()) {
                this.notify("Owner or Admin access is required to change child missions.", { tone: "attention", title: "Review Missions" });
                return;
            }
            this.kidMissionEditorPersonId = person.id;
            this.kidMissionEditorFilter = "active";
            const backdrop = document.getElementById("kidMissionEditorBackdrop");
            if (backdrop)
                backdrop.hidden = false;
            document.body.classList.add("kid-mission-editor-open");
            this.setText("kidMissionEditorTitle", `${this.personName(person)}'s missions`);
            this.setText("kidMissionEditorSubtitle", "HOME OS recommends missions from the child's birthday and age band. Keep what fits, remove what does not, and personalize only the missions you create.");
            await this.loadKidMissionEditor();
        },
        closeKidMissionEditor() {
            const backdrop = document.getElementById("kidMissionEditorBackdrop");
            if (backdrop)
                backdrop.hidden = true;
            document.body.classList.remove("kid-mission-editor-open");
            this.kidMissionEditorPendingTaskId = null;
            const imageInput = document.getElementById("kidMissionImageInput");
            if (imageInput)
                imageInput.value = "";
        },
        async loadKidMissionEditor() {
            const personId = this.kidMissionEditorPersonId;
            const list = document.getElementById("kidMissionEditorList");
            if (!personId || !list || !this.kidAgeService?.getState)
                return;
            list.innerHTML = '<div class="kid-mission-editor-loading">Loading this child’s missions…</div>';
            try {
                const result = await this.kidAgeService.getState(personId);
                if (result.error)
                    throw result.error;
                this.kidMissionEditorState = result.data || { profile: null, tasks: [] };
                this.kidRoutineStates.set(personId, this.kidMissionEditorState);
                this.renderKidMissionEditor();
            }
            catch (error) {
                console.error("[HOME OS] Kid mission editor could not load.", error);
                list.innerHTML = `
                    <div class="kid-mission-editor-empty">
                        <strong>Mission list could not load.</strong>
                        <p>${this.escape(error?.message || "Try again in a moment.")}</p>
                    </div>
                `;
            }
        },
        setKidMissionEditorFilter(filter) {
            const safe = ["active", "removed", "all"].includes(String(filter))
                ? String(filter)
                : "active";
            this.kidMissionEditorFilter = safe;
            this.renderKidMissionEditor();
        },
        syncKidMissionFilterButtons() {
            const activeFilter = this.kidMissionEditorFilter || "active";
            document.querySelectorAll("[data-kid-mission-filter]").forEach(button => {
                const selected = button.dataset.kidMissionFilter === activeFilter;
                button.classList.toggle("is-active", selected);
                button.setAttribute("aria-pressed", selected ? "true" : "false");
            });
        },
        kidMissionRoutineLabel(routine) {
            return this.kidAgeService?.routineLabel?.(routine) || ({
                morning: "Morning Routine",
                backpack: "Backpack",
                after_school: "After School",
                night: "Night Routine",
                weekend: "Weekend",
                general: "My Jobs"
            })[String(routine || "general")] || "My Jobs";
        },
        renderKidMissionEditor() {
            const root = document.getElementById("kidMissionEditorList");
            if (!root)
                return;
            const bundle = this.kidMissionEditorState || {};
            const tasks = Array.isArray(bundle.tasks) ? bundle.tasks : [];
            const profile = bundle.profile || {};
            const birthDate = this.kidAgeService?.normalizeDateKey?.(profile.birth_date) || "";
            const age = this.kidAgeService?.ageFromBirthDate?.(birthDate);
            const band = this.kidAgeService?.bandForAge?.(age);
            const activeCount = tasks.filter(task => task.active !== false).length;
            const removedCount = tasks.filter(task => task.active === false).length;
            const visualCount = tasks.filter(task => task.is_custom && Boolean(task.image_url)).length;
            const filter = this.kidMissionEditorFilter || "active";
            const visibleTasks = filter === "active"
                ? tasks.filter(task => task.active !== false)
                : filter === "removed"
                    ? tasks.filter(task => task.active === false)
                    : tasks;
            this.setText("kidMissionEditorActiveCount", activeCount);
            this.setText("kidMissionEditorRemovedCount", removedCount);
            this.setText("kidMissionEditorBand", age ? `${this.kidAgeService.bandLabel(band)} · Age ${age}` : "Birthday needed");
            this.setText("kidMissionEditorVisualCount", `${visualCount} ${visualCount === 1 ? "photo" : "photos"}`);
            this.syncKidMissionFilterButtons();
            if (!tasks.length) {
                root.innerHTML = `
                    <div class="kid-mission-editor-empty">
                        <strong>No missions are loaded yet.</strong>
                        <p>Save the child's birthday first so HOME OS can create the recommended mission pack.</p>
                    </div>
                `;
                return;
            }
            if (!visibleTasks.length) {
                const emptyCopy = filter === "removed"
                    ? "Nothing has been removed. All recommended missions are currently active."
                    : "No active missions are in this view yet.";
                root.innerHTML = `
                    <div class="kid-mission-editor-empty">
                        <strong>${filter === "removed" ? "No removed missions." : "No active missions."}</strong>
                        <p>${emptyCopy}</p>
                    </div>
                `;
                return;
            }
            const groups = new Map();
            visibleTasks.forEach(task => {
                const routine = String(task.routine_type || "general");
                if (!groups.has(routine))
                    groups.set(routine, []);
                groups.get(routine).push(task);
            });
            const routineKeys = [...groups.keys()].sort((a, b) => {
                const ai = ROUTINE_ORDER.indexOf(a);
                const bi = ROUTINE_ORDER.indexOf(b);
                return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
            });
            root.innerHTML = routineKeys.map(routine => {
                const routineTasks = groups.get(routine) || [];
                const routineActive = routineTasks.filter(task => task.active !== false).length;
                return `
                    <section class="kid-mission-group">
                        <header class="kid-mission-group-header">
                            <div>
                                <span>ROUTINE</span>
                                <strong>${this.escape(this.kidMissionRoutineLabel(routine))}</strong>
                            </div>
                            <b>${routineActive} / ${routineTasks.length} included</b>
                        </header>
                        <div class="kid-mission-group-list">
                            ${routineTasks.map(task => this.renderKidMissionRow(task)).join("")}
                        </div>
                    </section>
                `;
            }).join("");
        },
        renderKidMissionRow(task) {
            const active = task.active !== false;
            const isCustom = Boolean(task.is_custom);
            const imageUrl = String(task.image_url || "").trim();
            const defaultImage = `assets/images/kids/tasks/${this.escape(task.icon_key || "home-job")}.png`;
            const imageSource = imageUrl || defaultImage;
            const kindLabel = isCustom ? "CUSTOM" : "HOME OS";
            const initials = this.escape(String(task.title || "Mission")
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map(word => word[0] || "")
                .join("")
                .toUpperCase() || "HO");
            return `
                <article class="kid-mission-editor-row ${active ? "is-active" : "is-removed"} ${isCustom ? "is-custom" : "is-homeos"}" data-kid-mission-row="${this.escape(task.id)}">
                    <div class="kid-mission-editor-visual ${imageUrl ? "has-custom-picture" : ""}">
                        <img
                            src="${this.escape(imageSource)}"
                            alt="${this.escape(`${task.title || "Mission"} visual`)}"
                            loading="lazy"
                            onerror="this.hidden=true;this.parentElement.classList.add('visual-fallback')"
                        >
                        <span class="kid-mission-editor-fallback" aria-hidden="true">${initials}</span>
                    </div>

                    <div class="kid-mission-editor-copy">
                        <div class="kid-mission-editor-name-line">
                            <strong>${this.escape(task.title || "Mission")}</strong>
                            <span class="kid-mission-kind ${isCustom ? "custom" : "auto"}">${kindLabel}</span>
                        </div>
                        <p>${active ? `Included in ${this.escape(this.kidMissionRoutineLabel(task.routine_type))}.` : "Hidden from this child's mission page."}</p>
                        ${isCustom ? `
                            <div class="kid-mission-picture-actions">
                                <button class="kid-mission-text-button" type="button" data-kid-mission-picture="${this.escape(task.id)}">
                                    ${imageUrl ? "Change photo" : "+ Add photo"}
                                </button>
                                ${imageUrl ? `
                                    <button class="kid-mission-text-button danger" type="button" data-kid-mission-picture-remove="${this.escape(task.id)}">
                                        Remove photo
                                    </button>
                                ` : ""}
                            </div>
                        ` : `
                            <div class="kid-mission-library-note">
                                <span aria-hidden="true">✦</span>
                                <span>Built-in visual managed by HOME OS</span>
                            </div>
                        `}
                    </div>

                    <button
                        class="kid-mission-include-toggle ${active ? "included" : "removed"}"
                        type="button"
                        data-kid-mission-toggle="${this.escape(task.id)}"
                        data-kid-mission-active="${active ? "true" : "false"}"
                        aria-pressed="${active ? "true" : "false"}"
                        title="${active ? "Hide this mission from the child's page" : "Restore this mission to the child's page"}"
                    >
                        <span>${active ? "Hide" : "Restore"}</span>
                        <i aria-hidden="true"></i>
                    </button>
                </article>
            `;
        },
        kidMissionEditorScrollNode() {
            return document.querySelector(".kid-mission-editor-scroll");
        },
        renderKidMissionEditorPreservingPosition({ focusAddField = false } = {}) {
            const scrollNode = this.kidMissionEditorScrollNode();
            const scrollTop = scrollNode?.scrollTop || 0;
            this.renderKidMissionEditor();
            requestAnimationFrame(() => {
                if (scrollNode)
                    scrollNode.scrollTop = scrollTop;
                if (focusAddField) {
                    const input = document.getElementById("kidCustomMissionTitle");
                    input?.focus?.({ preventScroll: true });
                }
            });
        },
        patchKidMissionEditorTask(taskId, patch = {}) {
            const tasks = Array.isArray(this.kidMissionEditorState?.tasks)
                ? this.kidMissionEditorState.tasks
                : [];
            const index = tasks.findIndex(task => String(task.id) === String(taskId));
            if (index < 0)
                return null;
            tasks[index] = { ...tasks[index], ...patch };
            return tasks[index];
        },
        appendKidMissionEditorTask(task) {
            if (!task?.id)
                return;
            if (!this.kidMissionEditorState)
                this.kidMissionEditorState = { profile: null, tasks: [] };
            if (!Array.isArray(this.kidMissionEditorState.tasks))
                this.kidMissionEditorState.tasks = [];
            const exists = this.kidMissionEditorState.tasks.some(item => String(item.id) === String(task.id));
            if (!exists)
                this.kidMissionEditorState.tasks.push(task);
        },
        async toggleKidMission(taskId, currentlyActive, button = null) {
            if (!this.kidMissionEditorPersonId || !this.kidAgeService?.setMissionActive)
                return;
            const nextActive = !currentlyActive;
            await this.withBusy(button, async () => {
                const result = await this.kidAgeService.setMissionActive(this.kidMissionEditorPersonId, taskId, nextActive);
                if (result.error)
                    throw result.error;
                this.patchKidMissionEditorTask(taskId, { active: nextActive });
                this.renderKidMissionEditorPreservingPosition();
                this.notify(nextActive ? "Mission added back to this child's pack." : "Mission removed from this child's pack.", { tone: "success", title: "Kid Missions" });
            }, nextActive ? "Adding…" : "Removing…").catch(error => {
                this.handleError("HOME OS could not update this mission.", error);
            });
        },
        async addCustomKidMission(event) {
            event?.preventDefault?.();
            const title = this.value("kidCustomMissionTitle").trim();
            const routineType = this.value("kidCustomMissionRoutine") || "general";
            const form = document.getElementById("kidCustomMissionForm");
            const button = form?.querySelector('button[type="submit"]');
            if (!title) {
                this.notify("Enter a mission name first.", { tone: "attention", title: "Custom Mission" });
                return;
            }
            await this.withBusy(button, async () => {
                const result = await this.kidAgeService.createCustomMission({
                    personId: this.kidMissionEditorPersonId,
                    title,
                    routineType
                });
                if (result.error)
                    throw result.error;
                if (result.data)
                    this.appendKidMissionEditorTask(result.data);
                this.setValue("kidCustomMissionTitle", "");
                // Keep the section selection so several missions can be added
                // to the same routine without choosing it again each time.
                this.setValue("kidCustomMissionRoutine", routineType);
                this.renderKidMissionEditorPreservingPosition({ focusAddField: true });
                this.notify(`Added to ${this.kidMissionRoutineLabel(routineType)}.`, { tone: "success", title: "Kid Missions" });
            }, "Adding…").catch(error => this.handleError("HOME OS could not add this mission.", error));
        },
        kidMissionEditorTask(taskId) {
            const tasks = Array.isArray(this.kidMissionEditorState?.tasks) ? this.kidMissionEditorState.tasks : [];
            return tasks.find(task => String(task.id) === String(taskId)) || null;
        },
        chooseKidMissionPicture(taskId) {
            const task = this.kidMissionEditorTask(taskId);
            if (!task?.is_custom) {
                this.notify("Built-in mission pictures are managed by HOME OS. Add a photo to a custom mission instead.", { tone: "info", title: "Mission Visuals" });
                return;
            }
            this.kidMissionEditorPendingTaskId = taskId;
            const input = document.getElementById("kidMissionImageInput");
            if (!input)
                return;
            input.value = "";
            input.click();
        },
        async prepareKidMissionImage(file) {
            if (!file || !String(file.type || "").startsWith("image/")) {
                throw new Error("Choose a JPG, PNG, WEBP or GIF image.");
            }
            if (file.type === "image/gif" || file.size <= 1400000)
                return file;
            const url = URL.createObjectURL(file);
            try {
                const image = new Image();
                await new Promise((resolve, reject) => {
                    image.onload = resolve;
                    image.onerror = () => reject(new Error("HOME OS could not read that image."));
                    image.src = url;
                });
                const maxSide = 1200;
                const scale = Math.min(1, maxSide / Math.max(image.naturalWidth || 1, image.naturalHeight || 1));
                const width = Math.max(1, Math.round(image.naturalWidth * scale));
                const height = Math.max(1, Math.round(image.naturalHeight * scale));
                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(image, 0, 0, width, height);
                const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", .84));
                if (!blob)
                    return file;
                return new File([blob], `${String(file.name || "mission").replace(/\.[^.]+$/, "")}.jpg`, { type: "image/jpeg" });
            }
            finally {
                URL.revokeObjectURL(url);
            }
        },
        async handleKidMissionImageChange(event) {
            const input = event?.target;
            const file = input?.files?.[0] || null;
            const taskId = this.kidMissionEditorPendingTaskId;
            if (!file || !taskId || !this.kidMissionEditorPersonId)
                return;
            const task = this.kidMissionEditorTask(taskId);
            if (!task?.is_custom) {
                this.kidMissionEditorPendingTaskId = null;
                if (input)
                    input.value = "";
                this.notify("Photos can only be added to custom missions.", { tone: "info", title: "Mission Visuals" });
                return;
            }
            try {
                const prepared = await this.prepareKidMissionImage(file);
                if (prepared.size > 6291456) {
                    throw new Error("That picture is still too large. Choose an image under 6 MB.");
                }
                this.notify("Uploading the mission picture…", { tone: "info", title: "Visual Learning" });
                const result = await this.kidAgeService.uploadMissionImage({
                    personId: this.kidMissionEditorPersonId,
                    taskId,
                    file: prepared
                });
                if (result.error)
                    throw result.error;
                this.patchKidMissionEditorTask(taskId, {
                    image_url: result.data?.image_url || null,
                    image_storage_path: result.data?.storage_path || null,
                    image_alt: "Parent-selected mission picture"
                });
                this.renderKidMissionEditorPreservingPosition();
                this.notify("Mission picture saved. The child will see it on their task card.", { tone: "success", title: "Visual Learning" });
            }
            catch (error) {
                const raw = String(error?.message || "");
                const missingSetup = raw.includes("kid_task_visuals") || raw.includes("kid-task-images") || raw.toLowerCase().includes("bucket");
                this.notify(missingSetup
                    ? "Run supabase/19-kid-mission-visuals.sql once, then try the picture again."
                    : (raw || "HOME OS could not save that mission picture."), { tone: "attention", title: "Mission Picture" });
            }
            finally {
                this.kidMissionEditorPendingTaskId = null;
                if (input)
                    input.value = "";
            }
        },
        async removeKidMissionPicture(taskId, button = null) {
            const task = this.kidMissionEditorTask(taskId);
            if (!task?.is_custom) {
                this.notify("Built-in mission pictures are managed by HOME OS.", { tone: "info", title: "Mission Visuals" });
                return;
            }
            await this.withBusy(button, async () => {
                const result = await this.kidAgeService.removeMissionImage(taskId);
                if (result.error)
                    throw result.error;
                this.patchKidMissionEditorTask(taskId, {
                    image_url: null,
                    image_storage_path: null,
                    image_alt: null
                });
                this.renderKidMissionEditorPreservingPosition();
                this.notify("Mission picture removed.", { tone: "success", title: "Visual Learning" });
            }, "Removing…").catch(error => this.handleError("HOME OS could not remove this mission picture.", error));
        }
    };
})();
