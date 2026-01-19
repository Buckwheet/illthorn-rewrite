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
           <div class="vital-row"><span class="label">health</span> <span class="value red">{{ session.vitals.health }}/{{ session.vitals.health }}</span></div>
           <div class="vital-row"><span class="label">mana</span> <span class="value blue">{{ session.vitals.mana }}/{{ session.vitals.mana }}</span></div>
           <div class="vital-row"><span class="label">spirit</span> <span class="value white">{{ session.vitals.spirit }}/{{ session.vitals.spirit }}</span></div>
           <div class="vital-row"><span class="label">stamina</span> <span class="value yellow">{{ session.vitals.stamina }}/{{ session.vitals.stamina }}</span></div>
        </div>
      </div>
    </div>

    <div class="main">
      <div class="hands-bar">
        <div class="hand-slot left"><span class="icon">✋</span> Empty</div>
        <div class="hand-slot right"><span class="icon">✋</span> Empty</div>
        <div class="hand-slot spell"><span class="icon">✨</span> None</div>
      </div>

      <div class="feed" ref="feedContainer">
        <div v-for="(line, index) in session.feed" :key="index" class="feed-line">
            {{ line }}
        </div>
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

    <div class="hud right-hud">
        <div class="panel thoughts-panel">
            <div class="panel-header">▼ THOUGHTS</div>
            <div class="panel-content stream-content">
                <div v-for="(line, i) in session.thoughts" :key="i" class="stream-line">{{ line }}</div>
            </div>
        </div>
        <div class="panel deaths-panel">
            <div class="panel-header">▼ DEATHS</div>
            <div class="panel-content stream-content">
                 <div v-for="(line, i) in session.deaths" :key="i" class="stream-line">{{ line }}</div>
            </div>
        </div>
    </div>
  </div>
</template>

<style scoped>
.session {
  display: flex;
  flex: 1;
  height: 100%;
  overflow: hidden;
  background: #111;
}

.hud {
  width: 250px;
  background: #1e1e1e;
  border-right: 1px solid #333;
  display: flex;
  flex-direction: column;
}

.panel-header {
    background: #252526;
    padding: 5px 10px;
    font-size: 0.8em;
    font-weight: bold;
    color: #ccc;
    cursor: pointer;
    border-bottom: 1px solid #333;
}

.panel-content {
    padding: 10px;
}

/* Compass Grid */
.compass-box {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 2px;
    width: 100px;
    margin: 0 auto;
}
.dir {
    background: #333;
    color: #666;
    text-align: center;
    padding: 5px 0;
    font-size: 0.8em;
    cursor: default;
    user-select: none;
}
.dir.out { background: #00bc8c; color: white; } /* Mock active state */

/* Vitals */
.vital-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 4px;
    font-size: 0.9em;
}
.vital-row .label { color: #aaa; text-align: right; width: 50%; padding-right: 10px; }
.vital-row .value { font-weight: bold; width: 50%; }
.value.red { color: #ff6b6b; }
.value.blue { color: #4dabf7; }
.value.white { color: #fff; }
.value.yellow { color: #fcc419; }

.value.yellow { color: #fcc419; }

.right-hud {
  width: 250px; /* Same width as left hud */
  border-left: 1px solid #333;
  border-right: none;
}

.stream-content {
    height: 150px;
    overflow-y: auto;
    font-size: 0.9em;
    color: #aaa;
}
.stream-line {
    border-bottom: 1px solid #222;
    padding: 2px 0;
}

.main {
  flex: 1; /* Grow to fill space */
  display: flex;
  flex-direction: column;
  background: #000;
  min-width: 0; /* Important for flex children to shrink */
}

.hands-bar {
    display: flex;
    background: #111;
    border-bottom: 1px solid #333;
    padding: 5px;
    font-size: 0.9em;
}

.hand-slot {
    flex: 1;
    text-align: center;
    color: #ccc;
    border-right: 1px solid #333;
}
.hand-slot:last-child { border-right: none; }

.feed {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 14px;
  white-space: pre-wrap;
  color: #ccc; /* Ensure visible text */
}

.cli-wrapper {
  display: flex;
  padding: 8px;
  background: #222;
  border-top: 1px solid #333;
}

.prompt {
    color: #888;
    margin-right: 8px;
    font-family: monospace;
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
</style>
