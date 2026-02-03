import { invoke } from "@tauri-apps/api/core";
import { LazyStore } from "@tauri-apps/plugin-store";
import { defineStore } from "pinia";
import { reactive } from "vue";

// Mirror the Rust struct
export interface Highlight {
	id: string;
	pattern: string;
	color: string;
	is_regex: boolean;
	sound_file?: string;
}

const STORE_PATH = "highlights.json";
// LazyStore defaults to auto-saving on change? No, we must save manually typically.
// But we want to load on startup.

export const useHighlightsStore = defineStore("highlights", () => {
	const list = reactive<Highlight[]>([]);
	const store = new LazyStore(STORE_PATH);

	async function load() {
		try {
			const val = await store.get<Highlight[]>("list");
			if (val) {
				list.splice(0, list.length, ...val);
			}
			console.log("Highlights loaded:", list.length);
		} catch (e) {
			console.warn(
				"No highlights file found or error loading, starting fresh.",
				e,
			);
		}
	}

	async function save() {
		await store.set("list", list);
		await store.save(); // Persist to disk
	}

	// Push to backend session
	async function syncToSession(sessionId: string) {
		try {
			await invoke("update_highlights", {
				session: sessionId,
				highlights: list,
			});
			console.log(`Synced ${list.length} highlights to session ${sessionId}`);
		} catch (e) {
			console.error("Failed to sync highlights:", e);
		}
	}

	return {
		list,
		load,
		save,
		syncToSession,
	};
});
