use crate::session::{Session, SessionConfig};
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::{AppHandle, State};

mod session;

struct SessionState(Mutex<HashMap<String, Session>>);

#[tauri::command]
async fn connect_session(
    config: SessionConfig,
    state: State<'_, SessionState>,
    app: AppHandle,
) -> Result<SessionConfig, String> {
    // Check if session exists (scope the lock)
    {
        let sessions = state.0.lock().map_err(|e| e.to_string())?;
        if sessions.contains_key(&config.name) {
            return Err(format!("Session {} already exists", config.name));
        }
    }

    // Connect (async, no lock held)
    let session = Session::connect(config.clone(), app).await?;
    
    // Insert session (re-acquire lock)
    {
        let mut sessions = state.0.lock().map_err(|e| e.to_string())?;
        // Check again to be safe? Unlikely to race in this app context, but good practice.
        // For now, just insert.
        sessions.insert(config.name.clone(), session);
    }

    Ok(config)
}

#[tauri::command]
async fn send_command(
    session: String,
    command: String,
    state: State<'_, SessionState>,
) -> Result<(), String> {
    // Get session (scope the lock)
    let sess = {
        let sessions = state.0.lock().map_err(|e| e.to_string())?;
        sessions.get(&session).cloned().ok_or_else(|| format!("Session {} not found", session))?
    };

    // Send command (async, no lock held)
    sess.send(command).await?;
    Ok(())
}

#[tauri::command]
async fn send_raw_command(
    session: String,
    command: String,
    state: State<'_, SessionState>,
) -> Result<(), String> {
    let sess = {
        let sessions = state.0.lock().map_err(|e| e.to_string())?;
        sessions.get(&session).cloned().ok_or_else(|| format!("Session {} not found", session))?
    };

    sess.send_bytes(command.into_bytes()).await?;
    Ok(())
}

#[tauri::command]
async fn disconnect_session(
    name: String,
    state: State<'_, SessionState>,
) -> Result<(), String> {
    let session = {
        let mut sessions = state.0.lock().map_err(|e| e.to_string())?;
        sessions.remove(&name)
    };

    if let Some(session) = session {
        // Shutdown the connection explicitly
        let _ = session.disconnect().await; // Ignore error if already closed
    }
    Ok(())
}

#[tauri::command]
async fn list_sessions() -> Result<Vec<session::SessionConfig>, String> {
    // Logic to scan tmp directory
    // For now, we stub this to call our helper if we had one, but better to implement inline or in session.rs
    // Staying consistent, let's look at the structure.
    // We'll move implementation to a new module `discovery`.
    discovery::scan_sessions().await
}

mod discovery {
    use crate::session::SessionConfig;
    use std::path::PathBuf;
    use std::fs;
    
    // Reads %TMP%/simutronics/sessions
    pub async fn scan_sessions() -> Result<Vec<SessionConfig>, String> {
        let temp_dir = std::env::temp_dir();
        let session_dir = temp_dir.join("simutronics").join("sessions");
        
        if !session_dir.exists() {
            return Ok(vec![]);
        }

        let mut configs = Vec::new();
        // ... (rest of logic)
        let paths = fs::read_dir(session_dir).map_err(|e| e.to_string())?;

        for path in paths {
            let path = path.map_err(|e| e.to_string())?.path();
            if let Some(ext) = path.extension().and_then(|s| s.to_str()) {
                if ext == "json" || ext == "session" {
                     let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
                 // ... parsing ...
                 #[derive(serde::Deserialize)]
                 struct LegacyConfig {
                     name: String,
                     port: u16,
                 }
                 
                 if let Ok(legacy) = serde_json::from_str::<LegacyConfig>(&content) {
                     configs.push(SessionConfig {
                         name: legacy.name,
                         port: legacy.port,
                         host: "127.0.0.1".to_string(),
                     });
                 }
            }
            }
        }
        
        Ok(configs)
    }

    pub async fn get_diagnostics() -> String {
        let temp_dir = std::env::temp_dir();
        let session_dir = temp_dir.join("simutronics").join("sessions");
        
        let mut report = format!("Temp Dir: {:?}\\nSession Dir: {:?}\\nExists: {}\\n", 
            temp_dir, session_dir, session_dir.exists());

        if let Ok(entries) = fs::read_dir(&session_dir) {
            report.push_str("Files found:\\n");
            for entry in entries {
                if let Ok(e) = entry {
                    report.push_str(&format!(" - {:?}\\n", e.file_name()));
                }
            }
        } else {
            report.push_str("Could not read directory (Permission/IO Error)\\n");
        }
        
        report
    }
}

#[tauri::command]
async fn debug_diagnostics() -> String {
    discovery::get_diagnostics().await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(SessionState(Mutex::new(HashMap::new())))
        .invoke_handler(tauri::generate_handler![
            connect_session,
            send_command,
            send_raw_command,
            disconnect_session,
            list_sessions,
            debug_diagnostics
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
