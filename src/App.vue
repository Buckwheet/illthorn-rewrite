<script setup lang="ts">
import { useSessionStore } from "./stores/session";
import SessionButton from "./components/SessionButton.vue";
import SessionView from "./components/Session.vue";

const sessionStore = useSessionStore();
</script>

<template>
  <div id="app-container">
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
         <button class="add-session" @click="sessionStore.connect({name: 'test', port: 1234})">+</button>
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

<style scoped>
/* Scoped styles for the app shell */
/* We rely on global SASS for most things, but these define the grid */
</style>