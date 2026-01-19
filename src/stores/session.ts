import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { defineStore } from "pinia";
import { computed, ref } from "vue";

import { GameParser } from "../utils/game-parser";

// Types
export interface Vitals {
	health: number;
	maxHealth: number;
	mana: number;
	maxMana: number;
	spirit: number;
	maxSpirit: number;
	stamina: number;
	maxStamina: number;
}

export interface SessionConfig {
	name: string;
	host: string;
	port: number;
}

export interface Session {
	name: string;
	host: string;
	port: number;
	feed: string[];
	// Streams
	thoughts: string[];
	room: string[];
	deaths: string[];

	vitals: Vitals;
}

const defaultVitals: Vitals = {
	health: 0,
	maxHealth: 0,
	mana: 0,
	maxMana: 0,
	spirit: 0,
	maxSpirit: 0,
	stamina: 0,
	maxStamina: 0,
};

export const useSessionStore = defineStore("session", () => {
	const sessions = ref<Map<string, Session>>(new Map());
	const currentSessionId = ref<string | null>(null);

	const currentSession = computed(() => {
		if (currentSessionId.value && sessions.value.has(currentSessionId.value)) {
			return sessions.value.get(currentSessionId.value);
		}
		return null;
	});

	// Global listener for session data
	listen<{ session: string; data: string }>("session-data", (event) => {
		const { session: sessionName, data } = event.payload;
		const session = sessions.value.get(sessionName);
		if (session) {
			// Parse the data
			const result = GameParser.parse(data);

			// Append clean text to feed
			if (result.cleanText) {
				// Only push to main feed if it's NOT a dedicated stream?
				// The parser now filters cleanText to only include 'main'.
				// But we need to handle the segments.
				if (result.cleanText.trim()) session.feed.push(result.cleanText);
			}

			// Handle Segments (Streams)
			for (const tag of result.tags) {
				if (tag.name === ":text" && tag.attributes) {
					const stream = tag.attributes["stream"];
					const text = tag.text || "";
					if (!text.trim()) continue;

					if (stream === "thoughts") session.thoughts.push(text);
					if (stream === "room") session.room.push(text);
					if (stream === "death") session.deaths.push(text);
				}

				// Handle Tags...
				// <progressBar id='health' value='103'/>
				for (const tag of result.tags) {
					if (tag.name === "progressBar") {
						const id = tag.attributes["id"];
						const value = Number(tag.attributes["value"]);
						// We need a way to know MAX, usually it comes differently or we just infer/store it.
						// For now, let's just update the current value.
						// Legacy Illthorn likely updates these based on mapping.

						if (id === "health") session.vitals.health = value;
						if (id === "mana") session.vitals.mana = value;
						if (id === "spirit") session.vitals.spirit = value;
						if (id === "stamina") session.vitals.stamina = value;
					}
				}
			}
		}
	});

	async function connect(config: SessionConfig) {
		try {
			console.log("Connecting to session:", config.name);
			await invoke("connect_session", { config });

			const newSession: Session = {
				name: config.name,
				host: config.host,
				port: config.port,
				feed: [],
				thoughts: [],
				room: [],
				deaths: [],
				vitals: { ...defaultVitals }, // Clone defaults
			};

			sessions.value.set(config.name, newSession);
			currentSessionId.value = config.name;
		} catch (error) {
			console.error("Failed to connect:", error);
			throw error;
		}
	}

	async function sendCommand(command: string) {
		if (!currentSession.value) return;

		try {
			console.log("Sending command:", command);
			await invoke("send_command", {
				session: currentSession.value.name,
				command,
			});
		} catch (error) {
			console.error("Failed to send command:", error);
		}
	}

	async function disconnect(name: string) {
		try {
			await invoke("disconnect_session", { name });
			sessions.value.delete(name);
			if (currentSessionId.value === name) {
				currentSessionId.value = null;
			}
		} catch (error) {
			console.error("Failed to disconnect:", error);
		}
	}

	async function scanAndConnect() {
		try {
			console.log("Scanning for sessions...");
			const configs = await invoke<SessionConfig[]>("list_sessions");
			console.log("Found sessions:", configs);

			for (const config of configs) {
				if (!sessions.value.has(config.name)) {
					await connect(config);
				}
			}
		} catch (error) {
			console.error("Failed to scan sessions:", error);
		}
	}

	return {
		sessions,
		currentSessionId,
		currentSession,
		connect,
		sendCommand,
		disconnect,
		scanAndConnect,
	};
});
