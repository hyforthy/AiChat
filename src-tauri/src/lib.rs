use std::collections::HashMap;
use futures_util::StreamExt;
use tauri::Emitter;

/// Proxy an HTTP POST through Rust (bypasses WebView CORS restrictions).
/// Emits Tauri events keyed by event_id:
///   sp_start_{id}  — JSON string { "status": u16, "headers": Record<string,string> }
///   sp_chunk_{id}  — UTF-8 body chunk
///   sp_done_{id}   — empty, stream finished cleanly
///   sp_err_{id}    — error string, stream aborted
#[tauri::command]
async fn stream_post(
    app: tauri::AppHandle,
    event_id: String,
    url: String,
    headers: HashMap<String, String>,
    body: String,
) -> Result<(), String> {
    let client = reqwest::Client::new();
    let mut builder = client.post(&url).body(body);
    for (k, v) in &headers {
        builder = builder.header(k, v);
    }

    let resp = builder.send().await.map_err(|e| e.to_string())?;
    let status = resp.status().as_u16();

    let mut resp_headers: HashMap<String, String> = HashMap::new();
    for (name, value) in resp.headers() {
        if let Ok(v) = value.to_str() {
            resp_headers.insert(name.to_string(), v.to_string());
        }
    }

    let start_payload =
        serde_json::json!({ "status": status, "headers": resp_headers }).to_string();
    let _ = app.emit(&format!("sp_start_{}", event_id), start_payload);

    let mut stream = resp.bytes_stream();
    while let Some(item) = stream.next().await {
        match item {
            Ok(bytes) => {
                if let Ok(text) = std::str::from_utf8(&bytes) {
                    let _ = app.emit(&format!("sp_chunk_{}", event_id), text.to_owned());
                }
            }
            Err(e) => {
                let _ = app.emit(&format!("sp_err_{}", event_id), e.to_string());
                return Ok(());
            }
        }
    }

    let _ = app.emit(&format!("sp_done_{}", event_id), ());
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![stream_post])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
