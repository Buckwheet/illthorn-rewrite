<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from "vue";
import { type Session, useSessionStore } from "../stores/session";

const props = defineProps<{
	session: Session;
}>();

const store = useSessionStore();
const commandInput = ref("");
const feedContainer = ref<HTMLElement | null>(null);

function send() {
	if (!commandInput.value) return;
	store.sendCommand(commandInput.value);
	commandInput.value = "";
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
            autofocus
         />
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

.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #000;
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
</style>
