<script setup lang="ts">
import { invoke } from "@tauri-apps/api/core";
import { ref } from "vue";

const emit = defineEmits<{
	(e: "connect", config: { name: string; host: string; port: number }): void;
	(e: "cancel"): void;
}>();

const name = ref("Details"); // Default name
const host = ref("gs4.simutronics.net"); // Default host
const port = ref(1024); // Default port

const showDebug = ref(false);
const debugInfo = ref("Loading...");

async function loadDebug() {
	try {
		debugInfo.value = await invoke("debug_diagnostics");
	} catch (e) {
		debugInfo.value = "Failed to load diagnostics: " + e;
	}
}

function submit() {
	if (!name.value || !host.value || !port.value) return;

	emit("connect", {
		name: name.value,
		host: host.value,
		port: Number(port.value),
	});
}
</script>

<template>
  <div class="modal-overlay" @click.self="$emit('cancel')">
    <div class="modal-content">
      <h2>New Connection</h2>
      
      <div class="form-group">
        <label>Session Name</label>
        <input v-model="name" placeholder="E.g. Character Name" autofocus />
      </div>

      <div class="form-group">
        <label>Host</label>
        <input v-model="host" placeholder="hostname.com" />
      </div>

      <div class="form-group">
        <label>Port</label>
        <input v-model="port" type="number" placeholder="1234" />
      </div>

      <div class="actions">
        <button class="btn secondary" @click="$emit('cancel')">Cancel</button>
        <button class="btn primary" @click="submit">Connect</button>
      </div>

      <div class="debug-section" style="margin-top: 20px; border-top: 1px solid #333; padding-top: 10px;">
        <button class="btn secondary small" @click="{ showDebug = !showDebug; if(showDebug) loadDebug(); }">
          {{ showDebug ? 'Hide Debug' : 'Show Debug Info' }}
        </button>
        <pre v-if="showDebug" style="background:#000; padding:5px; font-size:10px; color:#0f0; overflow:auto; max-height:100px; margin-top:5px;">{{ debugInfo }}</pre>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: #1a1a1a;
  border: 1px solid #333;
  padding: 20px;
  border-radius: 8px;
  width: 400px;
  color: #eee;
  box-shadow: 0 4px 6px rgba(0,0,0,0.3);
}

h2 {
    margin-top: 0;
    margin-bottom: 20px;
    color: #fff;
}

.form-group {
    margin-bottom: 15px;
}

label {
    display: block;
    margin-bottom: 5px;
    font-size: 0.9em;
    color: #bbb;
}

input {
    width: 100%;
    padding: 8px;
    background: #000;
    border: 1px solid #444;
    color: white;
    border-radius: 4px;
}

input:focus {
    border-color: #00bc8c;
    outline: none;
}

.actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 25px;
}

.btn {
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
}

.btn.primary {
    background: #00bc8c;
    color: white;
}

.btn.primary:hover {
     background: #00a37b;
}

.btn.secondary {
    background: #333;
    color: #ccc;
}
.btn.secondary:hover {
    background: #444;
}

.btn.small {
    padding: 4px 8px;
    font-size: 0.8em;
}
</style>
