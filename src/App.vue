<script setup lang="ts">
import { ref, onMounted, onUnmounted, onErrorCaptured } from "vue";
import ConnectionModal from "./components/ConnectionModal.vue";
import SessionView from "./components/Session.vue";
import SessionButton from "./components/SessionButton.vue";
import { useSessionStore } from "./stores/session";

const sessionStore = useSessionStore();
const showConnectionModal = ref(false);
const lastError = ref<any>(null);
const contextRef = ref<HTMLElement | null>(null);
const contextDims = ref({ w: 0, h: 0 });

onErrorCaptured((err, _instance, info) => {
    console.error("Captured Error:", err);
    lastError.value = err?.toString() + " (" + info + ")";
    return false;
});

function updateDims() {
    if (contextRef.value) {
        contextDims.value = {
            w: contextRef.value.offsetWidth,
            h: contextRef.value.offsetHeight
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
    if (e.altKey && e.key >= '1' && e.key <= '9') {
        index = parseInt(e.key) - 1;
    }
    // F-keys (F1-F12)
    else if (e.key.startsWith('F') && e.key.length > 1) {
        const fNum = parseInt(e.key.substring(1));
        if (!isNaN(fNum)) {
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

    <div id="app-left-pane">
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
      <!-- Debug Overlay -->
      <div style="position: absolute; top: 0; right: 0; background: rgba(0,0,0,0.8); border: 1px solid red; color: lime; padding: 10px; z-index: 9999; font-family: monospace; font-size: 12px; pointer-events: none;">
          <div>DEBUG OVERLAY</div>
          <div>CurrentID: {{ sessionStore.currentSessionId || 'NULL' }}</div>
          <div>Session Count: {{ sessionStore.sessions.size }}</div>
          <div>Active Found: {{ !!sessionStore.currentSession }}</div>
          <div>Context Dims: {{ contextDims.w }}x{{ contextDims.h }}</div>
          <div style="color: red; font-weight: bold;">ERROR: {{ lastError || 'None' }}</div>
      </div>

      <div id="current-context" ref="contextRef">
        <div v-if="!sessionStore.currentSession" class="empty-state">
          <p>No active session. Connect to start.</p>
        </div>
        <!-- Yellow Wrapper to check slot -->
        <div v-else style="border: 2px dashed yellow; flex: 1; display: flex; flex-direction: column; overflow: hidden;">
            <!-- WHITE BOX TEST -->
            <div style="background: white; color: black; padding: 20px; font-weight: bold;">
                IF YOU SEE THIS, CONTAINER IS VALID.
            </div>
            
            <SessionView :session="sessionStore.currentSession" />
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
    display: grid;
    height: 100vh;
    /* Actions (Left Strip) | Main Content */
    grid-template-columns: 96px 1fr;
    overflow: hidden;
}

#app-left-pane {
    background: #111;
    border-right: 1px solid #333;
    display: flex;
    flex-direction: column;
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
    overflow: hidden;
    background: #000;
}

#current-context {
    flex: 1;
    display: flex;
    flex-direction: column;
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