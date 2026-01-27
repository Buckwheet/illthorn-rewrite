use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncReadExt, AsyncWriteExt, WriteHalf};
use tokio::net::TcpStream;
use tokio::sync::Mutex;

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

        // Use std::net::TcpStream for synchronous setup of socket options
        // This allows us to set SO_LINGER which is not directly exposed on Tokio's stream
        let std_stream = std::net::TcpStream::connect(&addr).map_err(|e| e.to_string())?;

        // Set NoDelay to true (disable Nagle's algorithm) for lower latency
        std_stream.set_nodelay(true).map_err(|e| e.to_string())?;

        // Set Linger to ensure data is flushed before closing, preventing "forcibly closed" (RST) errors
        // A timeout of 2 seconds should be sufficient for the OS to flush buffers on close.
        std_stream
            .set_linger(Some(std::time::Duration::from_secs(2)))
            .map_err(|e| e.to_string())?;

        // Set non-blocking mode required for Tokio
        std_stream
            .set_nonblocking(true)
            .map_err(|e| e.to_string())?;

        // Convert to Tokio TcpStream
        let stream = TcpStream::from_std(std_stream).map_err(|e| e.to_string())?;

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
}
