<script setup lang="ts">
import { ref } from "vue";
import ConnectionModal from "./components/ConnectionModal.vue";
import SessionView from "./components/Session.vue";
import SessionButton from "./components/SessionButton.vue";
import { useSessionStore } from "./stores/session";

const sessionStore = useSessionStore();
const showConnectionModal = ref(false);

import { onMounted } from "vue";

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
/* Scoped styles for the app shell */
/* We rely on global SASS for most things, but these define the grid */
</style>