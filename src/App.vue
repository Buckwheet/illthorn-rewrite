<script setup lang="ts">
import { onErrorCaptured, onMounted, onUnmounted, ref } from "vue";
import ConnectionModal from "./components/ConnectionModal.vue";
import SessionView from "./components/Session.vue";
import SessionButton from "./components/SessionButton.vue";
import { useSessionStore } from "./stores/session";

const sessionStore = useSessionStore();
const showConnectionModal = ref(false);
const lastError = ref<any>(null);
const contextRef = ref<HTMLElement | null>(null);
const contextDims = ref({ w: 0, h: 0 });
const showSidebar = ref(true);

onErrorCaptured((err, _instance, info) => {
	console.error("Captured Error:", err);
	lastError.value = err?.toString() + " (" + info + ")";
	return false;
});

function updateDims() {
	if (contextRef.value) {
		contextDims.value = {
			w: contextRef.value.offsetWidth,
			h: contextRef.value.offsetHeight,
		};
	}
}

onMounted(() => {
	sessionStore.scanAndConnect();
	window.addEventListener("keydown", handleGlobalKey);
	setInterval(updateDims, 1000);
});

onUnmounted(() => {
	window.removeEventListener("keydown", handleGlobalKey);
});

function handleGlobalKey(e: KeyboardEvent) {
	// Support Alt+1..9 and F1..F12 for session switching
	let index = -1;

	// Alt + Number
	if (e.altKey && e.key >= "1" && e.key <= "9") {
		index = parseInt(e.key) - 1;
	}
	// F-keys (F1-F12)
	else if (e.key.startsWith("F") && e.key.length > 1) {
		const fNum = parseInt(e.key.substring(1));
		if (!Number.isNaN(fNum)) {
			index = fNum - 1;
		}
	}

	if (index >= 0) {
		const sessions = Array.from(sessionStore.sessions.values());
		if (sessions[index]) {
			console.log("Switching to session via Shortcut:", sessions[index].name);
			sessionStore.currentSessionId = sessions[index].name;
		}
	}
}

function handleConnect(config: { name: string; host: string; port: number }) {
	sessionStore
		.connect(config)
		.then(() => {
			showConnectionModal.value = false;
		})
		.catch((err) => {
			console.error("Connection failed", err);
			// TODO: Show error in modal
		});
}
</script>

<template>
  <div id="app-container">
    <ConnectionModal 
      v-if="showConnectionModal" 
      @connect="handleConnect" 
      @cancel="showConnectionModal = false" 
    />

    <div id="app-left-pane" :class="{ closed: !showSidebar }">
      <div id="actions">
        <h3>Sessions</h3>
         <div class="session-list">
            <SessionButton 
              v-for="([id, session], index) in Array.from(sessionStore.sessions)" 
              :key="id"
              :session="session"
              :index="index" 
            />
         </div>
         <button class="add-session" @click="showConnectionModal = true">+</button>
      </div>
    </div>
    
    <div id="app-right-pane">
      <div id="current-context" ref="contextRef">
        <div v-if="!sessionStore.currentSession" class="empty-state">
          <p>No active session. Connect to start.</p>
          <button @click="showSidebar = !showSidebar" style="position: absolute; top: 10px; left: 10px; z-index: 1000">{{ showSidebar ? '«' : '»' }}</button>
        </div>
        
        <div v-else style="flex: 1; display: flex; flex-direction: column; overflow: hidden; position: relative">
             <button @click="showSidebar = !showSidebar" style="position: absolute; top: 0px; left: 0px; z-index: 1000; background: #333; color: #fff; border: 1px solid #444; width: 20px; height: 100%; cursor: pointer;" title="Toggle Sidebar">{{ showSidebar ? '‹' : '›' }}</button>
            <SessionView v-if="sessionStore.currentSession" :session="sessionStore.currentSession" :style="{ marginLeft: '20px' }" />
        </div>
      </div>
    </div>
  </div>
</template>

<style>
/* Global Styles */
body {
    background-color: #000;
    color: #ccc;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    margin: 0;
    overflow: hidden;
}
</style>

<style scoped>
/* Main App Grid */
#app-container {
    display: flex;
    flex-direction: row; /* Horizontal Flex */
    height: 100vh;
    overflow: hidden;
}

#app-left-pane {
    background: #111;
    border-right: 1px solid #333;
    display: flex;
    flex-direction: column;
    /* Flex Props */
    width: 96px;
    flex-shrink: 0;
    transition: width 0.2s;
    overflow: hidden;
}
#app-left-pane.closed {
    width: 0px;
    border-right: none;
}

#actions {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center; 
}

h3 {
    text-align: center;
    font-size: 0.7em;
    color: #666;
    margin: 10px 0;
    text-transform: uppercase;
}

.session-list {
    width: 100%;
    flex: 1;
    overflow-y: auto;
}

.add-session {
    width: 100%;
    padding: 15px;
    background: #222;
    border: none;
    border-top: 1px solid #333;
    color: #888;
    cursor: pointer;
    font-size: 1.5em;
}
.add-session:hover {
    background: #333;
    color: white;
}

#app-right-pane {
    display: flex;
    flex-direction: column;
    height: 100vh;
    /* Flex Expansion */
    flex-grow: 1;
    min-width: 0;
    overflow: hidden;
    background: #000;
}

#current-context {
    flex: 1;
    display: flex;
    flex-direction: column;
    width: 100%; /* FORCE WIDTH */
    min-width: 0;
}

.empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #666;
}
</style>