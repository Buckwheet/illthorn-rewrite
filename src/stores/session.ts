import { defineStore } from "pinia";
import { ref, computed } from "vue";
// import { invoke } from "@tauri-apps/api/core";

// Types (Stubbed for now, need to be properly defined)
export interface SessionConfig {
    name: string;
    port: number;
}

export interface Session {
    name: string;
    port: number;
    feed: string[]; // Simplification for now
}

export const useSessionStore = defineStore("session", () => {
    const sessions = ref<Map<string, Session>>(new Map());
    const currentSessionId = ref<string | null>(null);

    const currentSession = computed(() => {
        if (currentSessionId.value && sessions.value.has(currentSessionId.value)) {
            return sessions.value.get(currentSessionId.value);
        }
        return null;
    });

    async function connect(config: SessionConfig) {
        try {
            // TODO: Replace with actual Tauri command
            // const result = await invoke("connect_session", { config });
            console.log("Connecting to session:", config.name);

            // Mock success
            const newSession: Session = {
                name: config.name,
                port: config.port,
                feed: [],
            };

            sessions.value.set(config.name, newSession);
            currentSessionId.value = config.name;

            // TODO: Setup event listener for incoming messages
        } catch (error) {
            console.error("Failed to connect:", error);
        }
    }

    async function sendCommand(command: string) {
        if (!currentSession.value) return;

        try {
            console.log("Sending command:", command);
            // await invoke("send_command", { session: currentSession.value.name, command });
        } catch (error) {
            console.error("Failed to send command:", error);
        }
    }

    return {
        sessions,
        currentSessionId,
        currentSession,
        connect,
        sendCommand,
    };
});
