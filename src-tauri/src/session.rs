use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncReadExt, AsyncWriteExt, WriteHalf};
use tokio::net::TcpStream;
use tokio::sync::Mutex;
use std::sync::Arc;

#[derive(Clone, serde::Serialize, serde::Deserialize)]
pub struct SessionConfig {
    pub name: String,
    pub host: String,
    pub port: u16,
}

#[derive(Clone)]
pub struct Session {
    pub config: SessionConfig,
    pub writer: Arc<Mutex<WriteHalf<TcpStream>>>,
}

impl Session {
    pub async fn connect(config: SessionConfig, app: AppHandle) -> Result<Self, String> {
        let addr = format!("{}:{}", config.host, config.port);
        let stream = TcpStream::connect(&addr).await.map_err(|e| e.to_string())?;

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
                        // We use a specific event name format: "session_name/data" or similar
                        // Identifying the session in the payload is cleaner.
                        let _ = app.emit("session-data", serde_json::json!({
                            "session": name,
                            "data": data.to_string()
                        }));
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
        })
    }

    pub async fn send(&self, command: String) -> Result<(), String> {
        let mut writer = self.writer.lock().await;
        // Append \r\n to ensure the server/Lich detects the end of the command
        let data = format!("{}\r\n", command);
        writer
            .write_all(data.as_bytes())
            .await
            .map_err(|e| e.to_string())?;
        writer.flush().await.map_err(|e| e.to_string())?;
        Ok(())
    }

    pub async fn disconnect(&self) -> Result<(), String> {
        let mut writer = self.writer.lock().await;
        writer.shutdown().await.map_err(|e| e.to_string())?;
        Ok(())
    }
}
