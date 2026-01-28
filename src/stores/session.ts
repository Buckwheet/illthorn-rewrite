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

export interface ActiveSpell {
	text: string;
	value: string;
	top?: string;
	left?: string;
	durationSeconds?: number;
	receivedAt?: number;
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
	activeSpells: Record<string, ActiveSpell>; // ID -> Content
	exits: string[]; // ['n', 's', 'out', ...]

	// New Phase 30 Streams
	arrivals: string[]; // logons
	bounty: string[];
	society: string[];
	ambients: string[];
	announcements: string[]; // announcements
	loot: string[];
	invStream: string[]; // inv stream

	// Debugging
	debugLog: string[];

	vitals: Vitals;
	hands: Hands;

	// Internal State
	activeHand: "left" | "right" | "spell" | null;
	parsingActiveSpells: boolean; // State flag for dialog
	// biome-ignore lint/suspicious/noExplicitAny: Relaxed type to avoid struct/class mismatch issues during build
	parser: any;
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
	spell: "None",
};

// Phase 46: Helper to parse "HH:MM:SS" or "MM:SS" into seconds
function parseDuration(timeStr: string): number {
	const parts = timeStr.trim().split(":").map(Number);
	if (parts.some(Number.isNaN)) return 0;

	if (parts.length === 3) {
		// HH:MM:SS
		return parts[0] * 3600 + parts[1] * 60 + parts[2];
	} else if (parts.length === 2) {
		// MM:SS
		return parts[0] * 60 + parts[1];
	}
	return 0;
}

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

					if (tag.attributes?.stream) {
						const stream = tag.attributes.stream;
						if (stream === "thoughts") session.thoughts.push(text);
						if (stream === "room") session.room.push(text);
						if (stream === "death") session.deaths.push(text);
						if (stream === "speech" || stream === "talk")
							session.speech.push(text);
						if (stream === "familiar") session.familiar.push(text);

						// Phase 30 Streams
						if (stream === "logons") session.arrivals.push(text);
						if (stream === "bounty") session.bounty.push(text);
						if (stream === "society") session.society.push(text);
						if (stream === "ambients") session.ambients.push(text);
						if (stream === "announcements") session.announcements.push(text);
						if (stream === "loot") session.loot.push(text);
						if (stream === "inv") session.invStream.push(text);
					}

					// Component Capture (Room Objs, etc.)
					if (tag.attributes?.component) {
						const comp = tag.attributes.component;
						if (comp.startsWith("room")) session.room.push(text);
					}

					// B. Active Hand Capture
					if (session.activeHand && text.trim()) {
						session.hands[session.activeHand] = text.trim();
					}

					if (text.match(/Obvious (paths|exits):/i)) {
						// Only clear if we found a paths line, assuming this is authoritative for the room
						// session.exits = []; // Optional: Decide if we want to wipe previous XML compass data.
						// Usually text comes WITH XML, so maybe we append or merge?
						// Let's merge to be safe, but unique.

						const longDirToShort: Record<string, string> = {
							north: "n",
							northeast: "ne",
							east: "e",
							southeast: "se",
							south: "s",
							southwest: "sw",
							west: "w",
							northwest: "nw",
							out: "out",
							up: "up",
							down: "down",
						};

						// Extract all known direction words
						const foundDirs = text.match(
							/\b(north|northeast|east|southeast|south|southwest|west|northwest|out|up|down)\b/gi,
						);

						if (foundDirs) {
							// Found new exits line, so we should likely clear the old state to be accurate
							session.exits = [];

							// If we found exits in text, ensure we have them in our list
							foundDirs.forEach((dir: string) => {
								const short = longDirToShort[dir.toLowerCase()];
								if (short && !session.exits.includes(short)) {
									session.exits.push(short);
								}
							});
						}
					}
				}
				// 2. Handle Tags
				else {
					if (
						tag.name !== "style" &&
						tag.name !== "pushBold" &&
						tag.name !== "popBold"
					) {
						// Enhanced Debug: Show Dialog/Component tags clearly
						if (
							tag.name === "dialogData" ||
							tag.name === "component" ||
							tag.name === "label" ||
							tag.name === "dir" ||
							tag.name === "compass"
						) {
							session.debugLog.push(
								`[${tag.name}] id=${tag.attributes.id || ""} val=${tag.attributes.value || ""} text=${tag.text || ""}`,
							);
						} else {
							session.debugLog.push(
								`<${tag.name} ${JSON.stringify(tag.attributes)}>`,
							);
						}

						if (session.debugLog.length > 200) session.debugLog.shift();
					}

					// Compass Handling
					if (tag.name === "compass" && !tag.isClosing) {
						session.exits = [];
					}
					if (tag.name === "dir") {
						const dir = tag.attributes.value;
						if (dir && !session.exits.includes(dir)) {
							session.exits.push(dir);
						}
					}

					if (tag.name === "progressBar") {
						const id = tag.attributes.id;
						const value = Number(tag.attributes.value);
						const text = tag.attributes.text;

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

								if (id === "health") {
									session.vitals.health = current;
									session.vitals.maxHealth = max;
								}
								if (id === "mana") {
									session.vitals.mana = current;
									session.vitals.maxMana = max;
								}
								if (id === "spirit") {
									session.vitals.spirit = current;
									session.vitals.maxSpirit = max;
								}
								if (id === "stamina") {
									session.vitals.stamina = current;
									session.vitals.maxStamina = max;
								}
							} else {
								// Default Handling for non-max bars (Mind, Encumbrance, Stance)
								if (id === "encumlevel") {
									session.vitals.encumbrance = value;
									session.vitals.encumbranceText = text;
								}
								if (id === "mindState") {
									session.vitals.mindState = value;
									session.vitals.mindText = text;
								}
								if (id === "stance") {
									session.vitals.stance = value;
									session.vitals.stanceText = text;
								}
								if (id === "nextLevel") {
									session.vitals.nextLevel = value;
									session.vitals.nextLevelText = text;
								}
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

					// Active Spells (Dialog Parsing)
					// Robust State-Based Parsing
					if (tag.name === "dialogData" && tag.attributes.id) {
						const dialogId = tag.attributes.id.toLowerCase();

						if (dialogId === "active spells") {
							if (tag.attributes.clear === "t") {
								session.activeSpells = {}; // Clear ONLY if requested
							}

							if (tag.isClosing) {
								session.parsingActiveSpells = false;
							} else {
								session.parsingActiveSpells = true;
								// Do NOT clear list here implicitly, wait for clear='t'
							}
						}
					}

					// Capture ANY label OR LINK (clickable text) if we are inside the Active Spells dialog
					// PHASE 44: MOVED OUTSIDE of isLabel/isLink check!
					// Warlock3 sends Active Spells as <progressBar> tags containing BOTH name and time.
					if (tag.name === "progressBar" && session.parsingActiveSpells) {
						const id = tag.attributes.id;
						const text = tag.attributes.text; // Spell Name
						const time = tag.attributes.time; // Duration
						const top = tag.attributes.top;
						const left = tag.attributes.left;

						if (id && text) {
							session.activeSpells[id] = {
								text: text,
								value: time || "",
								top,
								left,
								// Phase 46: Store parsed time for client-side countdown
								durationSeconds: time ? parseDuration(time) : 0,
								receivedAt: Date.now(),
							};
						}
					}

					// Warlock3 uses <link> for the spell name and <label> for the time
					const isLabel = tag.name === "label" && tag.attributes.id;
					const isLink = tag.name === "link" && tag.attributes.id;

					if (isLabel || isLink) {
						const id = tag.attributes.id;
						if (id === "lblNone") {
							// Ignore "No active spells/buffs" labels
						} else {
							const value =
								tag.attributes.value ||
								tag.attributes.text ||
								tag.text ||
								"";

							const top = tag.attributes.top;
							const left = tag.attributes.left;

							// PHASE 40: Granular Debugging
							// Log raw tags to Debug Window to help diagnose missing names
							session.debugLog.push(
								`[SPELL DEBUG] Tag=${tag.name} ID=${id} Val=${value}`,
							);

							// REMOVED NESTED PROGRESSBAR BLOCK FROM HERE

							// Keep legacy link/label logic as fallback, but progressBar is primary for Spells
							// If we are in the dialog context, OR the ID starts with "spell" (heuristic for updates)
							if (
								tag.name !== "progressBar" &&
								(session.parsingActiveSpells || id.startsWith("spell"))
							) {
								// PHASE 39: Spell ID Normalization for Merging
								// PHASE 39: Spell ID Normalization for Merging
								// Warlock sends "spellName123" (link) and "spellDuration123" (label).
								// We need to strip "Name" or "Duration" to merge them into "spell123".
								let normalizedId = id;
								normalizedId = normalizedId.replace("Name", "");
								normalizedId = normalizedId.replace("Duration", "");

								// Initialize if missing
								if (!session.activeSpells[normalizedId]) {
									session.activeSpells[normalizedId] = { text: "", value: "" };
								}

								// Update fields based on tag type
								if (tag.name === "link") {
									// START LINK: This is the Name (and clickable command)
									session.activeSpells[normalizedId].text =
										value || tag.attributes.id; // Fallback to ID if no text
									if (top) session.activeSpells[normalizedId].top = top;
									if (left) session.activeSpells[normalizedId].left = left;
								} else if (tag.name === "label") {
									// LABEL: This is typically the Duration
									// Sometimes label also has top/left, but Link is primary for position
									session.activeSpells[normalizedId].value = value;
									if (top && !session.activeSpells[normalizedId].top)
										session.activeSpells[normalizedId].top = top;
									if (left && !session.activeSpells[normalizedId].left)
										session.activeSpells[normalizedId].left = left;
								}
							}
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
			// Phase 42: Restored Silent Handshake (\r\n) to prevent "Forcibly Closed" errors
			console.log(
				"[Connection] Sending silent handshake to keep connection alive.",
			);
			invoke("send_raw_command", { session: config.name, command: "\r\n" });

			// Enhanced Logging
			console.log(
				`[Connection] Successfully invoked connect_session for ${config.name}`,
			);

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
				activeSpells: {},

				// Phase 30
				arrivals: [],
				bounty: [],
				society: [],
				ambients: [],
				announcements: [],
				loot: [],
				invStream: [],

				debugLog: [],
				exits: [],
				vitals: { ...defaultVitals }, // Clone defaults
				hands: { ...defaultHands }, // Clone defaults
				activeHand: null,
				parsingActiveSpells: false,
				parser: null, // Placeholder or remove field from interface
			};

			sessions.value.set(config.name, newSession);
			currentSessionId.value = config.name;
		} catch (error) {
			console.warn("Failed to connect:", error);
			throw error;
		}
	}

	async function sendCommand(command: string) {
		if (!currentSession.value) return;

		try {
			console.log("Sending command:", command);

			// Local Echo
			if (currentSession.value) {
				// Suppress handshake echo (Aggressive Phase 40 Check)
				// Any command containing <c> is suppressed from local echo to prevent artifacts
				if (!command.includes("<c")) {
					currentSession.value.feed.push(
						`<span class="echo">&gt; ${command}</span>`,
					);
				}
			}

			await invoke("send_command", {
				session: currentSession.value.name,
				command,
			});
		} catch (error) {
			console.warn("Failed to send command:", error);
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
			console.warn("Failed to disconnect:", error);
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
			console.warn("Failed to scan sessions:", error);
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
