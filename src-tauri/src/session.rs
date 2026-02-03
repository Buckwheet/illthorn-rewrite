use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncReadExt, AsyncWriteExt, WriteHalf};
use tokio::net::TcpStream;
use tokio::sync::Mutex;

use crate::command_processor::CommandProcessor;
use crate::highlights::Highlight;

#[derive(Clone, serde::Serialize, serde::Deserialize)]
pub struct SessionConfig {
    pub name: String,
    pub host: String,
    pub port: u16,
}

#[derive(Clone)]
pub struct Session {
    #[allow(dead_code)]
    pub config: SessionConfig,
    pub writer: Arc<Mutex<WriteHalf<TcpStream>>>,
    pub processor: Arc<Mutex<CommandProcessor>>,
    pub highlights: Arc<Mutex<Vec<Highlight>>>,
}

impl Session {
    pub async fn connect(config: SessionConfig, app: AppHandle) -> Result<Self, String> {
        let addr = format!("{}:{}", config.host, config.port);
        let stream = TcpStream::connect(&addr).await.map_err(|e| e.to_string())?;
        stream.set_nodelay(true).map_err(|e| e.to_string())?;

        let (mut reader, writer) = tokio::io::split(stream);
        let name = config.name.clone();

        // Spawn a background task to read from the socket
        tauri::async_runtime::spawn(async move {
            let mut buf = [0; 1024];
            loop {
                match reader.read(&mut buf).await {
                    Ok(0) => {
                        println!("Session {} closed", name);
                        break;
                    }
                    Ok(n) => {
                        let data = String::from_utf8_lossy(&buf[..n]);
                        // Emit event to frontend
                        let _ = app.emit(
                            "session-data",
                            serde_json::json!({
                                "session": name,
                                "data": data.to_string()
                            }),
                        );
                    }
                    Err(e) => {
                        eprintln!("Error reading from session {}: {}", name, e);
                        break;
                    }
                }
            }
        });

        Ok(Self {
            config,
            writer: Arc::new(Mutex::new(writer)),
            processor: Arc::new(Mutex::new(CommandProcessor::new())),
            highlights: Arc::new(Mutex::new(Vec::new())),
        })
    }

    pub async fn send(&self, command: String) -> Result<(), String> {
        // (omitted contents untouched, relies on context match)
        // Actually, replace_file_content needs exact match.
        // I will target the *specific blocks* separately to be safe.
        // Block 1: Struct Init
        // Block 2: End of disconnect / New methods

        // Process command (Aliases, Macros)
        let processed_command = {
            let mut proc = self.processor.lock().await;
            proc.process(&command)
        };

        if let Some(final_cmd) = processed_command {
            let mut writer = self.writer.lock().await;
            // Append \r\n to ensure the server/Lich detects the end of the command
            let data = format!("{}\r\n", final_cmd);
            writer
                .write_all(data.as_bytes())
                .await
                .map_err(|e| e.to_string())?;
            writer.flush().await.map_err(|e| e.to_string())?;
        }
        Ok(())
    }

    pub async fn send_bytes(&self, data: Vec<u8>) -> Result<(), String> {
        let mut writer = self.writer.lock().await;
        writer.write_all(&data).await.map_err(|e| e.to_string())?;
        writer.flush().await.map_err(|e| e.to_string())?;
        Ok(())
    }

    pub async fn disconnect(&self) -> Result<(), String> {
        let mut writer = self.writer.lock().await;
        writer.shutdown().await.map_err(|e| e.to_string())?;
        Ok(())
    }

    pub async fn set_highlights(&self, new_highlights: Vec<Highlight>) {
        let mut h = self.highlights.lock().await;
        *h = new_highlights;
    }

    pub async fn get_highlights(&self) -> Vec<Highlight> {
        let h = self.highlights.lock().await;
        h.clone()
    }
}
