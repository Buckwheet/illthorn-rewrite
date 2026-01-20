<script setup lang="ts">
import { ref } from "vue";
import ConnectionModal from "./components/ConnectionModal.vue";
import SessionView from "./components/Session.vue";
import SessionButton from "./components/SessionButton.vue";
import { useSessionStore } from "./stores/session";
import { onMounted } from "vue";

const sessionStore = useSessionStore();
const showConnectionModal = ref(false);

onMounted(() => {
	sessionStore.scanAndConnect();
});

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
      <div id="current-context">
        <div v-if="!sessionStore.currentSession" class="empty-state">
          <p>No active session. Connect to start.</p>
        </div>
        <SessionView 
          v-else 
          :session="sessionStore.currentSession" 
        />
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