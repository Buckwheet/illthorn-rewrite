<script setup lang="ts">
import {
	computed,
	nextTick,
	onMounted,
	onUnmounted,
	reactive,
	ref,
	watch,
} from "vue";
import { type ActiveSpell, type Session, useSessionStore } from "../stores/session";
import InjuryPanel from "./InjuryPanel.vue";

const props = defineProps<{
	session: Session;
}>();

const store = useSessionStore();
const commandInput = ref("");
const feedContainer = ref<HTMLElement | null>(null);
const thoughtsContainer = ref<HTMLElement | null>(null);
const speechContainer = ref<HTMLElement | null>(null);
const familiarContainer = ref<HTMLElement | null>(null);
const commandHistory = ref<string[]>([]);
const historyIndex = ref(-1);

// Phase 46: Timer Ticker
const now = ref(Date.now());
let timerInterval: ReturnType<typeof setInterval> | null = null;

const visiblePanels = reactive({
	thoughts: true,
	deaths: true,
	speech: true,
	familiar: true,
	room: false,
	arrivals: false,
	bounty: false,
	society: false,
	ambients: false,
	announcements: false,
	loot: false,
	inv: false,
	injuries: true, // v0.0.2
	debug: false, //
});

const autoScrollMode = ref<"smart" | "force">("smart");

const roomContainer = ref<HTMLElement | null>(null);
const arrivalsContainer = ref<HTMLElement | null>(null);
const bountyContainer = ref<HTMLElement | null>(null);
const societyContainer = ref<HTMLElement | null>(null);
const ambientsContainer = ref<HTMLElement | null>(null);
const announcementsContainer = ref<HTMLElement | null>(null);
const lootContainer = ref<HTMLElement | null>(null);
const invContainer = ref<HTMLElement | null>(null);

watch(
	() => props.session.room.length,
	() => scrollStream(roomContainer.value),
);
watch(
	() => props.session.arrivals.length,
	() => scrollStream(arrivalsContainer.value),
);
watch(
	() => props.session.bounty.length,
	() => scrollStream(bountyContainer.value),
);
watch(
	() => props.session.society.length,
	() => scrollStream(societyContainer.value),
);
watch(
	() => props.session.ambients.length,
	() => scrollStream(ambientsContainer.value),
);
watch(
	() => props.session.announcements.length,
	() => scrollStream(announcementsContainer.value),
);
watch(
	() => props.session.loot.length,
	() => scrollStream(lootContainer.value),
);
watch(
	() => props.session.invStream.length,
	() => scrollStream(invContainer.value),
);

onMounted(() => {
	console.log("SessionView MOUNTED for", props.session.name);
	scrollToBottom();

	// Start Ticker
	timerInterval = setInterval(() => {
		now.value = Date.now();
	}, 1000);
});

onUnmounted(() => {
	if (timerInterval) clearInterval(timerInterval);
});

function formatRemaining(spell: ActiveSpell) {
	if (!spell.durationSeconds) return spell.value;

	// Default to value if no receivedAt, but we set it in parser
	const received = spell.receivedAt || Date.now();
	const elapsed = Math.floor((now.value - received) / 1000);
	const remaining = Math.max(0, spell.durationSeconds - elapsed);

	const h = Math.floor(remaining / 3600);
	const m = Math.floor((remaining % 3600) / 60);
	const s = remaining % 60;

	if (h > 0) {
		return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
	} else {
		return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
	}
}

function send() {
	if (!commandInput.value) return;

	// History
	if (
		commandHistory.value.length === 0 ||
		commandHistory.value[commandHistory.value.length - 1] !== commandInput.value
	) {
		commandHistory.value.push(commandInput.value);
	}
	historyIndex.value = -1; // Reset

	store.sendCommand(commandInput.value);
	commandInput.value = "";
}

function sendDir(dir: string) {
	store.sendCommand(dir);
}

function toggleScrollMode() {
	autoScrollMode.value = autoScrollMode.value === "smart" ? "force" : "smart";
}

function cycleHistory(direction: "up" | "down") {
	if (commandHistory.value.length === 0) return;

	if (direction === "up") {
		if (historyIndex.value === -1)
			historyIndex.value = commandHistory.value.length - 1;
		else if (historyIndex.value > 0) historyIndex.value--;
	} else {
		if (historyIndex.value !== -1) {
			if (historyIndex.value < commandHistory.value.length - 1)
				historyIndex.value++;
			else {
				historyIndex.value = -1;
				commandInput.value = "";
				return;
			}
		}
	}

	if (historyIndex.value !== -1) {
		commandInput.value = commandHistory.value[historyIndex.value];
	}
}

function scrollToBottom() {
	const container = feedContainer.value;
	if (!container) return;

	// Check if user is at bottom BEFORE the update (threshold 50px)
	const threshold = 50;
	const distanceToBottom =
		container.scrollHeight - container.scrollTop - container.clientHeight;
	const wasAtBottom = distanceToBottom <= threshold;

	nextTick(() => {
		if (autoScrollMode.value === "force" || wasAtBottom) {
			container.scrollTop = container.scrollHeight;
		}
	});
}

function scrollStream(container: HTMLElement | null) {
	if (!container) return;

	// Check if user is at bottom BEFORE the update
	const threshold = 50;
	const distanceToBottom =
		container.scrollHeight - container.scrollTop - container.clientHeight;
	const wasAtBottom = distanceToBottom <= threshold;

	nextTick(() => {
		if (autoScrollMode.value === "force" || wasAtBottom) {
			container.scrollTop = container.scrollHeight;
		}
	});
}

watch(() => props.session.feed.length, scrollToBottom);
watch(
	() => props.session.thoughts.length,
	() => scrollStream(thoughtsContainer.value),
);
watch(
	() => props.session.speech.length,
	() => scrollStream(speechContainer.value),
);
watch(
	() => props.session.familiar.length,
	() => scrollStream(familiarContainer.value),
);
const collapsedPanels = reactive(new Set<string>());

function toggleCollapse(panelName: string) {
	if (collapsedPanels.has(panelName)) collapsedPanels.delete(panelName);
	else collapsedPanels.add(panelName);
}

const sortedSpellRows = computed(() => {
	const spells = Object.values(props.session.activeSpells);
	if (spells.length === 0) return [];

	// Group by 'top' coordinate (fuzzy match within 5 pixels)
	const rows: Record<string, typeof spells> = {};
	const processed = new Set<string>();

	spells.forEach((s) => {
		if (processed.has(s.value + s.top)) return; // Simple dedup (optional)

		const rawTop = s.top ? parseInt(s.top, 10) : null;
		let topKey = "unknown";

		if (rawTop !== null) {
			// Check existing keys for a fuzzy match
			const existingKey = Object.keys(rows).find((k) => {
				if (k === "unknown") return false;
				return Math.abs(parseInt(k, 10) - rawTop) <= 5;
			});
			topKey = existingKey || rawTop.toString();
		}

		if (!rows[topKey]) rows[topKey] = [];
		rows[topKey].push(s);
	});

	// Sort rows by Top
	const sortedKeys = Object.keys(rows).sort((a, b) => {
		if (a === "unknown") return 1;
		if (b === "unknown") return -1;
		return parseInt(a, 10) - parseInt(b, 10);
	});

	// Valid rows, sorted by Left
	return sortedKeys.map((k) => {
		return rows[k].sort((a, b) => {
			const la = a.left ? parseInt(a.left, 10) : 0;
			const lb = b.left ? parseInt(b.left, 10) : 0;
			return la - lb;
		});
	});
});

async function dumpSpells() {
	console.log("=== ACTIVE SPELLS DUMP ===");
	const content = JSON.stringify(props.session.activeSpells, null, 2);
	console.log(content);

	// Phase 43: Save to File
	try {
		// We use invoke directly here since it's a one-off debug command not in store
		const { invoke } = await import("@tauri-apps/api/core");
		const path = await invoke("save_debug_log", { content });
		props.session.debugLog.push(`Saved log to: ${path}`);
	} catch (e) {
		props.session.debugLog.push(`Failed to save log: ${e}`);
	}
}
</script>

<template>
  <div class="session" :id="session.name">
    <div class="hud">
       <!-- Window Toggles Toolbar -->
       <div class="panel toolbar-panel">
         <div class="panel-header" @click="toggleCollapse('toolbar')">{{ collapsedPanels.has('toolbar') ? '▶' : '▼' }} WINDOWS</div>
         <div class="panel-content toolbar-controls" v-show="!collapsedPanels.has('toolbar')">
            <button @click="visiblePanels.thoughts = !visiblePanels.thoughts" :class="{ active: visiblePanels.thoughts }">💭 Thoughts</button>
            <button @click="visiblePanels.deaths = !visiblePanels.deaths" :class="{ active: visiblePanels.deaths }">💀 Deaths</button>
            <button @click="visiblePanels.speech = !visiblePanels.speech" :class="{ active: visiblePanels.speech }">💬 Speech</button>
            <button @click="visiblePanels.familiar = !visiblePanels.familiar" :class="{ active: visiblePanels.familiar }">🦅 Familiar</button>
            <button @click="visiblePanels.room = !visiblePanels.room" :class="{ active: visiblePanels.room }">🏰 Room</button>
             <button @click="visiblePanels.bounty = !visiblePanels.bounty" :class="{ active: visiblePanels.bounty }">📜 Bounty</button>
             <button @click="visiblePanels.society = !visiblePanels.society" :class="{ active: visiblePanels.society }">🤝 Society</button>
             <button @click="visiblePanels.loot = !visiblePanels.loot" :class="{ active: visiblePanels.loot }">💰 Loot</button>
             <button @click="visiblePanels.arrivals = !visiblePanels.arrivals" :class="{ active: visiblePanels.arrivals }">👋 Arrivals</button>
             <button @click="visiblePanels.ambients = !visiblePanels.ambients" :class="{ active: visiblePanels.ambients }">🍃 Ambients</button>
             <button @click="visiblePanels.announcements = !visiblePanels.announcements" :class="{ active: visiblePanels.announcements }">📢 Announce</button>
             <button @click="visiblePanels.inv = !visiblePanels.inv" :class="{ active: visiblePanels.inv }">🎒 Inv</button>
             <button @click="visiblePanels.injuries = !visiblePanels.injuries" :class="{ active: visiblePanels.injuries }">🤕 Injuries</button>
             <button @click="visiblePanels.debug = !visiblePanels.debug" :class="{ active: visiblePanels.debug }">🐞 Debug</button>
             <!-- Smart Scroll Toggle -->
             <button @click="toggleScrollMode" :class="{ active: autoScrollMode === 'smart' }" style="margin-left:auto; border-color: #666;">
                {{ autoScrollMode === 'smart' ? '⚓ Smart Scroll' : '⬇ Force Scroll' }}
             </button>
          </div>
       </div>

      <div class="panel room-panel">
         <div class="panel-header" @click="toggleCollapse('room')">{{ collapsedPanels.has('room') ? '▶' : '▼' }} ROOM</div>
        <div class="panel-content compass-area" v-show="!collapsedPanels.has('room')">
          <div class="compass-box">
             <!-- Compass with Logic and Clicks -->
             <div class="dir nw" :class="{ active: session.exits.includes('nw') }" @click="sendDir('nw')">nw</div> 
             <div class="dir n" :class="{ active: session.exits.includes('n') }" @click="sendDir('n')">n</div> 
             <div class="dir ne" :class="{ active: session.exits.includes('ne') }" @click="sendDir('ne')">ne</div>
             <div class="dir w" :class="{ active: session.exits.includes('w') }" @click="sendDir('w')">w</div>   
             <div class="dir out" :class="{ active: session.exits.includes('out') }" @click="sendDir('out')">Out</div>   
             <div class="dir e" :class="{ active: session.exits.includes('e') }" @click="sendDir('e')">e</div>
             <div class="dir sw" :class="{ active: session.exits.includes('sw') }" @click="sendDir('sw')">sw</div> 
             <div class="dir s" :class="{ active: session.exits.includes('s') }" @click="sendDir('s')">s</div> 
             <div class="dir se" :class="{ active: session.exits.includes('se') }" @click="sendDir('se')">se</div>
          </div>
        </div>
      </div>
      
      <div class="panel vitals-panel" v-if="session.vitals">
         <div class="panel-header" @click="toggleCollapse('vitals')">{{ collapsedPanels.has('vitals') ? '▶' : '▼' }} VITALS</div>
        <div class="panel-content vitals-list" v-show="!collapsedPanels.has('vitals')">
           <div class="vital-row"><span class="label">health</span> <span class="value red">{{ session.vitals.health }}/{{ session.vitals.maxHealth }}</span></div>
           <div class="vital-row"><span class="label">mana</span> <span class="value blue">{{ session.vitals.mana }}/{{ session.vitals.maxMana }}</span></div>
           <div class="vital-row"><span class="label">spirit</span> <span class="value white">{{ session.vitals.spirit }}/{{ session.vitals.maxSpirit }}</span></div>
           <div class="vital-row"><span class="label">stamina</span> <span class="value yellow">{{ session.vitals.stamina }}/{{ session.vitals.maxStamina }}</span></div>
           <!-- Extended Vitals -->
           <div class="vital-row"><span class="label">encumbrance</span> <span class="value white">{{ session.vitals.encumbranceText }}</span></div>
           <div class="vital-row"><span class="label">stance</span> <span class="value stance">{{ session.vitals.stanceText }}</span></div>
           <div class="vital-row"><span class="label">mind</span> <span class="value mind">{{ session.vitals.mindText }}</span></div>
           <div class="vital-row" v-if="session.vitals.nextLevelText"><span class="label">next level</span> <span class="value yellow">{{ session.vitals.nextLevelText }}</span></div>
        </div>
      </div>
      
      <!-- Injury Panel (v0.0.2) -->
      <div class="panel injury-wrapper" v-if="visiblePanels.injuries">
         <div class="panel-header" @click="toggleCollapse('injuries')">{{ collapsedPanels.has('injuries') ? '▶' : '▼' }} INJURIES</div>
         <div class="panel-content" v-show="!collapsedPanels.has('injuries')" style="display:flex; justify-content:center;">
             <InjuryPanel />
         </div>
      </div>
      
      <!-- New Panels (Placeholders until parsing added) -->
      <div class="panel spells-panel">
         <div class="panel-header" @click="toggleCollapse('spells')">{{ collapsedPanels.has('spells') ? '▶' : '▼' }} ACTIVE SPELLS</div>
         <div class="panel-content spells-list" v-show="!collapsedPanels.has('spells')">
						<div v-if="Object.keys(session.activeSpells).length === 0" class="empty">None</div>
						<div v-else class="spell-list">
							<div v-for="(row, i) in sortedSpellRows" :key="i" class="spell-row">
								<span v-for="(spell, j) in row" :key="j" class="spell-cell" :class="{ 'align-right': j === row.length - 1 }">
                                    <span class="spell-name" v-if="spell.text">{{ spell.text }}</span>
                                    <span class="spell-dots" v-if="spell.text"> .................... </span>
                                    <span class="spell-name" v-if="spell.text">{{ spell.text }}</span>
                                    <span class="spell-dots" v-if="spell.text"> .................... </span>
                                    <span class="spell-time">{{ formatRemaining(spell) }}</span>
                                </span>
							</div>
						</div>
         </div>
      </div>
      <div class="panel buffs-panel">
         <div class="panel-header" @click="toggleCollapse('buffs')">{{ collapsedPanels.has('buffs') ? '▶' : '▼' }} BUFFS</div>
         <div class="panel-content" v-show="!collapsedPanels.has('buffs')"><div class="empty-msg">None</div></div>
      </div>
      <div class="panel debuffs-panel">
         <div class="panel-header" @click="toggleCollapse('debuffs')">{{ collapsedPanels.has('debuffs') ? '▶' : '▼' }} DEBUFFS</div>
         <div class="panel-content" v-show="!collapsedPanels.has('debuffs')"><div class="empty-msg">None</div></div>
      </div>
      <div class="panel debug-panel" v-show="visiblePanels.debug">
         <div class="panel-header">DEBUG LOG <button @click="dumpSpells" style="float:right; font-size: 0.8em;">Dump Spells</button></div>
         <div class="panel-content debug-list">
            <div v-for="(log, i) in session.debugLog" :key="i" class="debug-line">{{ log }}</div>
         </div>
      </div>
    </div>

    <div class="main">
      <div class="hands-bar">
        <div class="hand-slot left"><span class="icon">✋</span> <span v-html="session.hands.left"></span></div>
        <div class="hand-slot right"><span class="icon">✋</span> <span v-html="session.hands.right"></span></div>
        <div class="hand-slot spell"><span class="icon">✨</span> <span v-html="session.hands.spell"></span></div>
      </div>

      <!-- Streams Row (Thoughts/Deaths/Speech/Familiar) -->
      <div class="streams-container" v-show="visiblePanels.thoughts || visiblePanels.deaths || visiblePanels.speech || visiblePanels.familiar || visiblePanels.room || visiblePanels.bounty || visiblePanels.society || visiblePanels.loot || visiblePanels.arrivals || visiblePanels.ambients || visiblePanels.announcements || visiblePanels.inv">
          <div class="stream-column thoughts" v-show="visiblePanels.thoughts">
              <div class="stream-header">THOUGHTS</div>
              <div class="stream-content" ref="thoughtsContainer">
                  <div v-for="(line, i) in session.thoughts" :key="i" class="stream-line" v-html="line"></div>
              </div>
          </div>
          <div class="stream-column room" v-show="visiblePanels.room">
              <div class="stream-header">ROOM</div>
              <div class="stream-content" ref="roomContainer">
                  <div v-for="(line, i) in session.room" :key="i" class="stream-line" v-html="line"></div>
              </div>
          </div>
          <div class="stream-column speech" v-show="visiblePanels.speech">
              <div class="stream-header">SPEECH</div>
              <div class="stream-content" ref="speechContainer">
                  <div v-for="(line, i) in session.speech" :key="i" class="stream-line" v-html="line"></div>
              </div>
          </div>
           <div class="stream-column familiar" v-show="visiblePanels.familiar">
              <div class="stream-header">FAMILIAR</div>
              <div class="stream-content" ref="familiarContainer">
                  <div v-for="(line, i) in session.familiar" :key="i" class="stream-line" v-html="line"></div>
              </div>
          </div>
          <div class="stream-column deaths" v-show="visiblePanels.deaths">
              <div class="stream-header">DEATHS</div>
              <div class="stream-content">
                  <div v-for="(line, i) in session.deaths" :key="i" class="stream-line" v-html="line"></div>
              </div>
          </div>
          <div class="stream-column bounty" v-show="visiblePanels.bounty">
              <div class="stream-header">BOUNTY</div>
              <div class="stream-content" ref="bountyContainer">
                  <div v-for="(line, i) in session.bounty" :key="i" class="stream-line" v-html="line"></div>
              </div>
          </div>
          <div class="stream-column society" v-show="visiblePanels.society">
              <div class="stream-header">SOCIETY</div>
              <div class="stream-content" ref="societyContainer">
                  <div v-for="(line, i) in session.society" :key="i" class="stream-line" v-html="line"></div>
              </div>
          </div>
          <div class="stream-column loot" v-show="visiblePanels.loot">
              <div class="stream-header">LOOT</div>
              <div class="stream-content" ref="lootContainer">
                  <div v-for="(line, i) in session.loot" :key="i" class="stream-line" v-html="line"></div>
              </div>
          </div>
           <div class="stream-column arrivals" v-show="visiblePanels.arrivals">
              <div class="stream-header">ARRIVALS</div>
              <div class="stream-content" ref="arrivalsContainer">
                  <div v-for="(line, i) in session.arrivals" :key="i" class="stream-line" v-html="line"></div>
              </div>
          </div>
           <div class="stream-column ambients" v-show="visiblePanels.ambients">
              <div class="stream-header">AMBIENTS</div>
              <div class="stream-content" ref="ambientsContainer">
                  <div v-for="(line, i) in session.ambients" :key="i" class="stream-line" v-html="line"></div>
              </div>
          </div>
           <div class="stream-column announcements" v-show="visiblePanels.announcements">
              <div class="stream-header">ANNOUNCE</div>
              <div class="stream-content" ref="announcementsContainer">
                  <div v-for="(line, i) in session.announcements" :key="i" class="stream-line" v-html="line"></div>
              </div>
          </div>
           <div class="stream-column inv" v-show="visiblePanels.inv">
              <div class="stream-header">INVENTORY</div>
              <div class="stream-content" ref="invContainer">
                  <div v-for="(line, i) in session.invStream" :key="i" class="stream-line" v-html="line"></div>
              </div>
          </div>
      </div>

      <div class="feed" ref="feedContainer">
        <div v-for="(line, index) in session.feed" :key="index" class="feed-line" v-html="line"></div>
      </div>

      <div class="cli-wrapper">
         <div class="prompt">&gt;</div>
         <input 
            type="text" 
            class="cli" 
            v-model="commandInput"
            @keyup.enter="send"
            @keydown.up.prevent="cycleHistory('up')"
            @keydown.down.prevent="cycleHistory('down')"
            autofocus
         />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Toolbar Panel */
.toolbar-panel {
    border-bottom: 1px solid #333;
    background: #1e1e1e;
    flex: 0 0 auto;
}

.toolbar-controls {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    padding: 5px;
}

.toolbar-controls button {
    background: #333;
    border: 1px solid #444;
    color: #888;
    font-size: 0.75em;
    padding: 3px 6px;
    cursor: pointer;
    flex: 1 1 40%; /* 2 per row approx */
    text-align: left;
    transition: all 0.2s;
}

.toolbar-controls button:hover {
    background: #444;
    color: #ccc;
}

.toolbar-controls button.active {
    background: #007acc;
    color: white;
    border-color: #0098ff;
}

/* Original Illthorn Layout Replication */
.session {
  display: grid;
  height: 100vh;
  /* Left HUD (14em) | Main (1fr) | Right (0) */
  /* Left HUD (Resizable) | Main (1fr) | Right (0) */
  grid-template-columns: auto 1fr 0; /* Changed from fixed var to auto to respect resize */
  overflow: hidden;
  background: #111;
}

.hud {
  grid-column: 1; /* Force Column 1 */
  display: flex;
  flex-direction: column;
  border-right: 1px solid #333;
  background: #1e1e1e;
  overflow-y: auto;
  min-width: 250px; /* Ensure visual width */
  width: 320px; /* Phase 43: Default starting width */
  resize: horizontal; /* Phase 37: Resizable HUD */
  overflow-x: hidden; /* Hide scrollbar caused by generic resize handle if any */
}

/* Phase 43: Enable inner scrolling for panels to prevent HUD explosion */
.panel-content {
    max-height: 40vh; /* Cap height to prevent pushing other panels off */
    overflow-y: auto; /* Enable scrollbar */
}

.main {
  grid-column: 2; /* Force Column 2 */
  display: grid;
  /* Hands (3em) | Streams (13em or 0) | Feed (1fr) | CLI (4em) */
  grid-template-rows: 3em auto 1fr 4em; /* Auto for streams based on content or fixed? */
  max-height: 100vh;
  background: #000;
  min-width: 0;
}

/* Hands Bar */
.hands-bar {
  display: flex;
  background: #111;
  border-bottom: 1px solid #333;
  padding: 5px;
  font-size: 0.9em;
  align-items: center;
}

/* Streams (Thoughts/Deaths) - Now Top Row in Main */
.streams-container {
    display: flex;
    overflow: hidden;
    height: 150px; /* Fixed height for streams row */
    border-bottom: 1px solid #333;
    background: #111;
}

.stream-column {
    flex: 1;
    display: flex;
    flex-direction: column;
    border-right: 1px solid #333;
    min-width: 0; /* Allow flex shrink */
}
.stream-column:last-child { border-right: none; }

.stream-header {
    background: #252526;
    padding: 2px 5px;
    font-size: 0.7em;
    font-weight: bold;
    color: #888;
    text-align: center;
}
.stream-content {
    flex: 1;
    overflow-y: auto;
    padding: 5px;
    white-space: pre-line; /* Fix compressed layout */
    word-wrap: break-word; /* Ensure wrapping */
}

.feed {
  overflow-y: auto;
  padding: 10px;
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 14px;
  white-space: pre-wrap;
  color: #ccc;
  /* Removed Debug Red Background */
}

.cli-wrapper {
  display: flex;
  padding: 8px;
  background: #222;
  border-top: 1px solid #333;
  align-items: center;
}

.cli {
  flex: 1;
  background: #333;
  border: 1px solid #444;
  color: white;
  padding: 4px 8px;
  font-family: monospace;
}
.cli:focus {
    border-color: #00bc8c;
    outline: none;
}

/* Presets */
:deep(.preset-speech) { color: #81a2be; font-weight: bold; }
:deep(.preset-whisper) { color: #b294bb; font-style: italic; }
:deep(.preset-thought) { color: #f0c674; font-style: italic; }
:deep(.preset-death) { color: #cc6666; font-weight: bold; }
:deep(.preset-bold) { font-weight: bold; color: white; }
:deep(.preset-roomName) { color: #8abeb7; font-weight: bold; font-size: 1.1em; }

.debug-panel {
    flex: 1; /* Take remaining height */
    overflow: hidden;
    display: flex;
    flex-direction: column;
    border-top: 1px solid #333;
    margin-top: 10px;
}
.debug-list {
    flex: 1;
    overflow-y: auto;
    font-size: 0.7em;
    color: #666;
    font-family: monospace;
    white-space: pre-wrap;
}
.debug-line {
    border-bottom: 1px solid #222;
}


/* Spells List */
.spells-list {
    flex: 1;
    overflow-y: auto;
    font-size: 0.85em;
    color: #aaddff;
    padding: 5px;
}
.spell-item {
    padding: 2px 5px;
    border-bottom: 1px solid #333;
}
.spell-row {
    display: flex;
    justify-content: space-between;
    padding: 1px 5px;
    border-bottom: 1px solid #222;
}

.spell-cell.align-right {
    text-align: right;
    margin-left: auto; /* Push to right */
    color: #fff;
    font-family: monospace;
}
.empty-msg {
    color: #666;
    font-style: italic;
    padding: 5px;
    text-align: center;
}

/* Compass Active State */
.compass-box .dir {
    cursor: pointer;
}
.compass-box .dir:hover {
    color: white;
    background: #333;
}
.compass-box .dir.active {
    color: #fff;
    font-weight: bold;
    text-shadow: 0 0 5px #00bc8c; /* Highlight */
}</style>
