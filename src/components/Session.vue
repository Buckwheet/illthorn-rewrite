<script setup lang="ts">
import { type Session } from "../stores/session";
// import Feed from "./Feed.vue";
// import CLI from "./CLI.vue";
// import Vitals from "./Vitals.vue";
// ... other components

defineProps<{
  session: Session;
}>();
</script>

<template>
  <div class="session" :id="session.name">
    <div class="hud">
      <div class="panel">
        <div class="panel-header">Room</div>
        <div class="panel-content">
          <!-- <Room :session="session" /> -->
          <!-- <Compass :session="session" /> -->
          <p>Room Placeholder</p>
        </div>
      </div>
      
      <div class="panel">
        <div class="panel-header">Vitals</div>
        <div class="panel-content">
           <!-- <Vitals :session="session" /> -->
           <p>Vitals Placeholder</p>
        </div>
      </div>
      
      <!-- Other panels (Active Spells, Buffs, etc) -->
    </div>

    <div class="main">
      <div class="hands">
        <div class="hand left">Left Hand</div>
        <div class="hand right">Right Hand</div>
        <div class="hand spell">Spell</div>
      </div>

      <div class="streams">
        <!-- <Streams :session="session" /> -->
        <div class="stream-entry">Thought Stream Placeholder</div>
      </div>

      <div class="feed">
        <!-- <Feed :session="session" /> -->
        <div class="feed-entry">Game Feed Placeholder</div>
      </div>

      <div class="cli-wrapper">
         <div class="prompt">&gt;</div>
         <input type="text" class="cli" placeholder="Command..." />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* These will be eventually handled by the global SASS imports, 
   but specific component styles can go here */
.session {
  display: flex;
  flex: 1;
  height: 100%;
  overflow: hidden;
}

.hud {
  width: 300px; /* Adjust based on original styles */
  background: #111;
  border-right: 1px solid #333;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #000;
}

.hands {
  display: flex;
  padding: 5px;
  background: #222;
}

.hand {
  flex: 1;
  text-align: center;
  border: 1px solid #444;
  margin: 0 2px;
}

.streams {
  height: 150px;
  border-bottom: 1px solid #333;
  overflow-y: auto;
  padding: 5px;
}

.feed {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  font-family: monospace;
}

.cli-wrapper {
  display: flex;
  padding: 5px;
  background: #222;
}

.cli {
  flex: 1;
  background: transparent;
  border: none;
  color: white;
  margin-left: 5px;
}
</style>
