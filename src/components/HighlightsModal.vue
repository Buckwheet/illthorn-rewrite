<script setup lang="ts">
import { open } from "@tauri-apps/plugin-dialog";
import { ref } from "vue";
import { useHighlightsStore } from "../stores/highlights";

const props = defineProps<{
	sessionName: string;
}>();

const emit = defineEmits<(e: "close") => void>();

const store = useHighlightsStore();

const newPattern = ref("");
const newColor = ref("#FFFF00");
const newIsRegex = ref(false);
const newSoundFile = ref<string | undefined>(undefined);
const isGlobal = ref(true);

async function browseSound() {
	const file = await open({
		multiple: false,
		filters: [{ name: "Audio", extensions: ["mp3", "wav", "ogg"] }],
	});
	if (file) {
		newSoundFile.value = file as string;
	}
}

const presetColors = [
	"#FF0000",
	"#00FF00",
	"#0000FF",
	"#FFFF00",
	"#FF00FF",
	"#00FFFF",
	"#FFFFFF",
	"#808080",
];

function selectPreset(c: string) {
	newColor.value = c;
}

function add() {
	if (!newPattern.value) return;

	store.list.push({
		id: crypto.randomUUID(),
		pattern: newPattern.value,
		color: newColor.value,
		is_regex: newIsRegex.value,
		sound_file: newSoundFile.value,
		scope: isGlobal.value ? "global" : props.sessionName,
	});

	// Reset form
	newPattern.value = "";
	newSoundFile.value = undefined;
	// isGlobal.value = true; // reset to global preference?
	// Keep color/regex as is for convenience? Or reset?
}

function remove(id: string) {
	const idx = store.list.findIndex((h) => h.id === id);
	if (idx !== -1) store.list.splice(idx, 1);
}

async function saveAndClose() {
	await store.save();
	await store.syncToSession(props.sessionName);
	emit("close");
}
</script>

<template>
    <div class="modal-overlay" @click.self="$emit('close')">
        <div class="modal-content">
            <h2>Highlights</h2>

            <div class="list-container">
                <div v-if="store.list.length === 0" class="empty">No highlights defined.</div>
                <div v-else class="highlight-row" v-for="h in store.list" :key="h.id">
                    <span class="preview" :style="{ color: h.color }">{{ h.pattern }}</span>
                    <span class="meta">
                        {{ (!h.scope || h.scope === 'global') ? '🌍' : '👤' }}
                        {{ h.is_regex ? '(Regex)' : '' }}
                    </span>
                    <button class="btn small danger" @click="remove(h.id)">X</button>
                </div>
            </div>

            <div class="add-form">
                <h3>Add New</h3>
                <div class="form-row">
                    <input v-model="newPattern" placeholder="Pattern" class="input-pattern" />
                    <div class="color-picker-group">
                        <input v-model="newColor" type="color" class="input-color" title="Custom Color" />
                        <div class="palette">
                            <div v-for="c in presetColors" :key="c" class="swatch" :style="{ background: c }"
                                @click="selectPreset(c)" :title="c"></div>
                        </div>
                    </div>
                    <label class="checkbox-label">
                        <input type="checkbox" v-model="isGlobal" /> Global
                    </label>
                    <label class="checkbox-label">
                        <input type="checkbox" v-model="newIsRegex" /> Regex
                    </label>
                    <div class="sound-group">
                        <button class="btn secondary small" @click="browseSound" :title="newSoundFile || 'No Sound'">
                            {{ newSoundFile ? '♫ File Set' : '♫ Sound' }}
                        </button>
                        <button v-if="newSoundFile" class="btn danger small"
                            @click="newSoundFile = undefined">X</button>
                    </div>
                    <button class="btn primary small" @click="add">Add</button>
                </div>
            </div>

            <div class="actions">
                <button class="btn secondary" @click="$emit('close')">Cancel</button>
                <button class="btn primary" @click="saveAndClose">Save & Close</button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 2000;
    /* Higher than connection modal? */
}

.modal-content {
    background: #1a1a1a;
    border: 1px solid #333;
    padding: 20px;
    border-radius: 8px;
    width: 500px;
    max-width: 90vw;
    color: #eee;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
    display: flex;
    flex-direction: column;
    max-height: 80vh;
}

h2 {
    margin-top: 0;
    color: #fff;
    border-bottom: 1px solid #333;
    padding-bottom: 10px;
}

h3 {
    margin: 10px 0 5px 0;
    font-size: 0.9em;
    color: #bbb;
}

.list-container {
    flex: 1;
    overflow-y: auto;
    border: 1px solid #333;
    background: #111;
    margin-bottom: 15px;
    padding: 5px;
    min-height: 150px;
    max-height: 400px;
}

.empty {
    color: #555;
    text-align: center;
    padding: 20px;
}

.highlight-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px;
    border-bottom: 1px solid #222;
}

.highlight-row:last-child {
    border-bottom: none;
}

.preview {
    flex: 1;
    font-weight: bold;
}

.meta {
    font-size: 0.8em;
    color: #666;
    margin-right: 10px;
}

.add-form {
    background: #222;
    padding: 10px;
    border-radius: 4px;
}

.form-row {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-bottom: 8px;
}

.form-row:last-child {
    margin-bottom: 0;
}

.input-pattern {
    flex: 1;
    padding: 5px;
    background: #000;
    border: 1px solid #444;
    color: white;
}

.options-row {
    justify-content: flex-start;
}

.spacer {
    flex: 1;
}

.color-picker-group {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #111;
    padding: 4px;
    border-radius: 4px;
    border: 1px solid #444;
}

.palette {
    display: flex;
    gap: 4px;
}

.swatch {
    width: 16px;
    height: 16px;
    border-radius: 2px;
    cursor: pointer;
    border: 1px solid #555;
}

.swatch:hover {
    border-color: #fff;
    transform: scale(1.1);
}

.input-color {
    width: 30px;
    height: 24px;
    border: none;
    padding: 0;
    background: none;
    cursor: pointer;
}


.checkbox-label {
    font-size: 0.8em;
    display: flex;
    align-items: center;
    gap: 4px;
    color: #ccc;
}

.actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 20px;
}

.btn {
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
}

.btn.primary {
    background: #00bc8c;
    color: white;
}

.btn.primary:hover {
    background: #00a37b;
}

.btn.secondary {
    background: #333;
    color: #ccc;
}

.btn.secondary:hover {
    background: #444;
}

.btn.danger {
    background: #e74c3c;
    color: white;
}

.btn.danger:hover {
    background: #c0392b;
}

.btn.small {
    padding: 4px 8px;
    font-size: 0.8em;
}

.sound-group {
    display: flex;
    gap: 4px;
    align-items: center;
}
</style>
