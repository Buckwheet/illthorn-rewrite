<script setup lang="ts">
// biome-ignore lint/correctness/noUnusedImports: Used in template
import { computed } from "vue";
import { type Session, useSessionStore } from "../stores/session";

const props = defineProps<{
	session: Session;
	index: number;
}>();

const store = useSessionStore();

const isActive = computed(() => store.currentSessionId === props.session.name);

function activate() {
    console.log("SessionButton Clicked: Activating", props.session.name);
	store.currentSessionId = props.session.name;
}
</script>

<template>
  <button 
    class="session-button action" 
    :class="{ on: isActive }"
    @click="activate"
    :title="session.name"
  >
    <span class="session-name">{{ session.name[0] }}</span>
    <span class="alt-numeric">{{ index + 1 }}</span>
  </button>
</template>

<style scoped>
/* Copied/Adapted from original styles if possible, otherwise generic for now */
.session-button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 10px;
  background: transparent;
  color: #888;
  border: none;
  cursor: pointer;
  width: 100%;
}

.session-button:hover {
  background: #333;
}

.session-button.on {
  color: #fff;
  background: #444;
  border-left: 3px solid #00bc8c; /* Example accent */
}

.session-name {
  font-weight: bold;
  text-transform: uppercase;
}

.alt-numeric {
  font-size: 0.8em;
  opacity: 0.6;
}
</style>
