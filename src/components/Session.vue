<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from "vue";
import { type Session, useSessionStore } from "../stores/session";

const props = defineProps<{
	session: Session;
}>();

const store = useSessionStore();
const commandInput = ref("");
const feedContainer = ref<HTMLElement | null>(null);
const commandHistory = ref<string[]>([]);
const historyIndex = ref(-1);

function send() {
	if (!commandInput.value) return;
    
    // History
    if (commandHistory.value.length === 0 || commandHistory.value[commandHistory.value.length - 1] !== commandInput.value) {
        commandHistory.value.push(commandInput.value);
    }
    historyIndex.value = -1; // Reset
    
	store.sendCommand(commandInput.value);
	commandInput.value = "";
}

function cycleHistory(direction: 'up' | 'down') {
    if (commandHistory.value.length === 0) return;
    
    if (direction === 'up') {
        if (historyIndex.value === -1) historyIndex.value = commandHistory.value.length - 1;
        else if (historyIndex.value > 0) historyIndex.value--;
    } else {
        if (historyIndex.value !== -1) {
            if (historyIndex.value < commandHistory.value.length - 1) historyIndex.value++;
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
	nextTick(() => {
		if (feedContainer.value) {
			feedContainer.value.scrollTop = feedContainer.value.scrollHeight;
		}
	});
}

watch(() => props.session.feed.length, scrollToBottom);
onMounted(scrollToBottom);
</script>

<template>
  <div class="session" :id="session.name">
    <div class="hud">
      <div class="panel room-panel">
        <div class="panel-header">▼ ROOM</div>
        <div class="panel-content compass-area">
          <div class="compass-box">
             <!-- Simplified Compass Mockup -->
             <div class="dir nw">nw</div> <div class="dir n">n</div> <div class="dir ne">ne</div>
             <div class="dir w">w</div>   <div class="dir out">Out</div>   <div class="dir e">e</div>
             <div class="dir sw">sw</div> <div class="dir s">s</div> <div class="dir se">se</div>
          </div>
        </div>
      </div>
      
      <div class="panel vitals-panel">
        <div class="panel-header">▼ VITALS</div>
        <div class="panel-content vitals-list">
           <div class="vital-row"><span class="label">health</span> <span class="value red">{{ session.vitals.health }}/{{ session.vitals.maxHealth }}</span></div>
           <div class="vital-row"><span class="label">mana</span> <span class="value blue">{{ session.vitals.mana }}/{{ session.vitals.maxMana }}</span></div>
           <div class="vital-row"><span class="label">spirit</span> <span class="value white">{{ session.vitals.spirit }}/{{ session.vitals.maxSpirit }}</span></div>
           <div class="vital-row"><span class="label">stamina</span> <span class="value yellow">{{ session.vitals.stamina }}/{{ session.vitals.maxStamina }}</span></div>
        </div>
      </div>
      <div class="panel debug-panel">
         <div class="panel-header">DEBUG LOG</div>
         <div class="panel-content debug-list">
            <div v-for="(log, i) in session.debugLog" :key="i" class="debug-line">{{ log }}</div>
         </div>
      </div>
    </div>

    <div class="main">
      <div class="hands-bar">
        <div class="hand-slot left"><span class="icon">✋</span> Empty</div>
        <div class="hand-slot right"><span class="icon">✋</span> Empty</div>
        <div class="hand-slot spell"><span class="icon">✨</span> None</div>
      </div>

      <!-- Streams Row (Thoughts/Deaths) Matches Original Layout -->
      <div class="streams-container">
          <div class="stream-column thoughts">
              <div class="stream-header">THOUGHTS</div>
              <div class="stream-content">
                  <div v-for="(line, i) in session.thoughts" :key="i" class="stream-line" v-html="line"></div>
              </div>
          </div>
          <div class="stream-column deaths">
              <div class="stream-header">DEATHS</div>
              <div class="stream-content">
                  <div v-for="(line, i) in session.deaths" :key="i" class="stream-line" v-html="line"></div>
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
/* Original Illthorn Layout Replication */
.session {
  display: grid;
  height: 100vh;
  /* Left HUD (14em) | Main (1fr) | Right (0) */
  grid-template-columns: var(--hud-width, 250px) 1fr 0;
  overflow: hidden;
  background: #111;
}

.hud {
  display: flex;
  flex-direction: column;
  border-right: 1px solid #333;
  background: #1e1e1e;
  overflow-y: auto;
}

.main {
  display: grid;
  /* Hands (3em) | Streams (13em or 0) | Feed (1fr) | CLI (4em) */
  grid-template-rows: 3em 150px 1fr 4em;
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
    border-bottom: 1px solid #333;
    background: #111;
}

.stream-column {
    flex: 1;
    display: flex;
    flex-direction: column;
    border-right: 1px solid #333;
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
    font-size: 0.85em;
    color: #aaa;
    padding: 5px;
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
</style>
