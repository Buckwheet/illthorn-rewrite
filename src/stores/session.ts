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
	// New Fields
	encumbrance: number; // 0-100 probably
	encumbranceText: string;
	mindState: number;
	mindText: string;
	stance: number;
	stanceText: string;
	nextLevel: number;
	nextLevelText: string;
}

export interface Hands {
	left: string;
	right: string;
	spell: string;
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
	speech: string[];
	familiar: string[];
	exits: string[]; // ['n', 's', 'out', ...]

	// Debugging
	debugLog: string[];

	vitals: Vitals;
	hands: Hands;

	// Internal State
	activeHand: "left" | "right" | "spell" | null;
	parser: any; // Relaxed type to avoid struct/class mismatch issues during build
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
	encumbrance: 0,
	encumbranceText: "None",
	mindState: 0,
	mindText: "Clear",
	stance: 0,
	stanceText: "Offensive",
	nextLevel: 0,
	nextLevelText: "",
};

const defaultHands: Hands = {
	left: "Empty",
	right: "Empty",
	spell: "None"
};

export const useSessionStore = defineStore("session", () => {
	// Reactive state for UI
	const sessions = ref<Map<string, Session>>(new Map());
	const currentSessionId = ref<string | null>(null);

	// Non-reactive state for logic (Parsers)
	const parsers = new Map<string, GameParser>();

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
		let parser = parsers.get(sessionName);

		// Ensure parser exists (robustness)
		if (!parser) {
			parser = new GameParser();
			parsers.set(sessionName, parser);
		}

		if (session && parser) {
			// Parse the data using raw parser instance
			const result = parser.parse(data);

			// Append clean text to feed
			if (result.cleanText) {
				if (result.cleanText.trim()) {
					if (session.feed.length > 2000) session.feed.shift();
					session.feed.push(result.cleanText);
				}
			}

			// Handle Tags & Text Segments (Merged Loop for correct order)
			for (const tag of result.tags) {
				// 1. Handle Text Content
				if (tag.name === ":text") {
					const text = tag.text || "";
					if (!text) continue; // Skip empty text

					if (tag.attributes && tag.attributes["stream"]) {
						const stream = tag.attributes["stream"];
						if (stream === "thoughts") session.thoughts.push(text);
						if (stream === "room") session.room.push(text);
						if (stream === "death") session.deaths.push(text);
						if (stream === "speech" || stream === "talk") session.speech.push(text);
						if (stream === "familiar") session.familiar.push(text);
					}

					// B. Active Hand Capture
					if (session.activeHand && text.trim()) {
						session.hands[session.activeHand] = text.trim();
					}
				}
				// 2. Handle Tags
				else {
					// Debug Log (excluding common spam)
					if (tag.name !== "style" && tag.name !== "pushBold" && tag.name !== "popBold") {
						session.debugLog.push(`<${tag.name} ${JSON.stringify(tag.attributes)}>`);
						if (session.debugLog.length > 200) session.debugLog.shift();
					}

					// Compass Handling
					if (tag.name === "compass") {
						session.exits = [];
					}
					if (tag.name === "dir") {
						const dir = tag.attributes["value"];
						if (dir && !session.exits.includes(dir)) {
							session.exits.push(dir);
						}
					}

					if (tag.name === "progressBar") {
						const id = tag.attributes["id"];
						const value = Number(tag.attributes["value"]);
						const text = tag.attributes["text"];

						if (id === "health") session.vitals.health = value;
						if (id === "mana") session.vitals.mana = value;
						if (id === "spirit") session.vitals.spirit = value;
						if (id === "stamina") session.vitals.stamina = value;

						// Parse Max from text if available
						if (text) {
							// Try to find "current/max" pattern
							const match = text.match(/(\d+)\s*\/\s*(\d+)/);
							if (match) {
								const current = Number(match[1]);
								const max = Number(match[2]);

								if (id === "health") { session.vitals.health = current; session.vitals.maxHealth = max; }
								if (id === "mana") { session.vitals.mana = current; session.vitals.maxMana = max; }
								if (id === "spirit") { session.vitals.spirit = current; session.vitals.maxSpirit = max; }
								if (id === "stamina") { session.vitals.stamina = current; session.vitals.maxStamina = max; }
							} else {
								// Default Handling for non-max bars (Mind, Encumbrance, Stance)
								if (id === "encumlevel") { session.vitals.encumbrance = value; session.vitals.encumbranceText = text; }
								if (id === "mindState") { session.vitals.mindState = value; session.vitals.mindText = text; }
								if (id === "stance") { session.vitals.stance = value; session.vitals.stanceText = text; }
								if (id === "nextLevel") { session.vitals.nextLevel = value; session.vitals.nextLevelText = text; }
							}
						}
					}

					// Hands Handling
					if (tag.name === "left") {
						if (tag.isClosing) {
							session.activeHand = null;
						} else {
							session.activeHand = "left";
							if (tag.text) session.hands.left = tag.text;
						}
					}

					if (tag.name === "right") {
						if (tag.isClosing) {
							session.activeHand = null;
						} else {
							session.activeHand = "right";
							if (tag.text) session.hands.right = tag.text;
						}
					}

					if (tag.name === "spell") {
						if (tag.isClosing) {
							session.activeHand = null;
						} else {
							session.activeHand = "spell";
							if (tag.text) session.hands.spell = tag.text;
						}
					}
				}
			}
		}
	});

	async function connect(config: SessionConfig) {
		try {
			console.log("Connecting to session:", config.name);
			await invoke("connect_session", { config });


			// Handshake (Request XML Tags)
			// Use send_raw_command to ensure exact bytes are sent (e.g. <c>\r\n) without local echo or wrapper logic
			console.log("Sending handshake <c>");
			invoke("send_raw_command", { session: config.name, command: "<c>\r\n" });


			// Initialize Parser
			parsers.set(config.name, new GameParser());

			const newSession: Session = {
				name: config.name,
				host: config.host,
				port: config.port,
				feed: [],
				thoughts: [],
				room: [],
				deaths: [],
				speech: [],
				familiar: [],
				debugLog: [],
				exits: [],
				vitals: { ...defaultVitals }, // Clone defaults
				hands: { ...defaultHands }, // Clone defaults
				activeHand: null,
				parser: null, // Placeholder or remove field from interface
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

			// Local Echo
			if (currentSession.value) {
				currentSession.value.feed.push(`<span class="echo">&gt; ${command}</span>`);
			}

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
			parsers.delete(name);
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
