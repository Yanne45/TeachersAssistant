use std::io::{Read, Write};
use std::net::TcpListener;
use std::sync::Mutex;

// ── OAuth loopback server ────────────────────────────────────────────────────

struct OAuthListener(Mutex<Option<TcpListener>>);

/// Bind a random loopback port, store the listener, return the port number.
#[tauri::command]
fn oauth_init(state: tauri::State<'_, OAuthListener>) -> Result<u16, String> {
  let listener = TcpListener::bind("127.0.0.1:0").map_err(|e| e.to_string())?;
  let port = listener.local_addr().map_err(|e| e.to_string())?.port();
  *state.0.lock().map_err(|e| e.to_string())? = Some(listener);
  Ok(port)
}

/// Block until Google redirects to the loopback callback, then extract & return the auth code.
/// Must be called AFTER `oauth_init` and AFTER the browser has been opened.
#[tauri::command]
async fn oauth_wait(state: tauri::State<'_, OAuthListener>) -> Result<String, String> {
  // Take the listener out of the Mutex before entering spawn_blocking so we don't
  // hold a non-Send MutexGuard across an await point.
  let listener = {
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;
    guard.take().ok_or_else(|| "Aucun listener OAuth initialisé — appelez oauth_init d'abord".to_string())?
  };

  tauri::async_runtime::spawn_blocking(move || -> Result<String, String> {
    // Accept the single redirect request from the browser
    let (mut stream, _) = listener.accept().map_err(|e| e.to_string())?;

    let mut buf = [0u8; 8192];
    let n = stream.read(&mut buf).map_err(|e| e.to_string())?;
    let request = String::from_utf8_lossy(&buf[..n]);

    // Send a clean success page to the browser tab
    let body = "\
<!DOCTYPE html><html><head><meta charset=\"utf-8\">\
<style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;\
justify-content:center;height:100vh;margin:0;background:#f0f9ff}\
.card{background:white;border-radius:12px;padding:40px;text-align:center;\
box-shadow:0 4px 20px rgba(0,0,0,.1);max-width:420px}\
h2{color:#3db4c6;margin:0 0 12px}p{color:#666;margin:0;font-size:14px}</style></head>\
<body><div class=\"card\"><h2>&#x2705; Authentification r&#xe9;ussie&nbsp;!</h2>\
<p>Vous pouvez fermer cet onglet et retourner dans Teacher Assistant.</p>\
</div></body></html>";
    let response = format!(
      "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\n\
       Content-Length: {}\r\nConnection: close\r\n\r\n{}",
      body.len(),
      body
    );
    let _ = stream.write_all(response.as_bytes());
    drop(stream);

    // Parse the request line: "GET /callback?code=XXX&scope=... HTTP/1.1"
    let first_line = request.lines().next().unwrap_or("");
    let path = first_line.split_whitespace().nth(1).unwrap_or("");
    let query = path.split('?').nth(1).unwrap_or("");

    // Check for an OAuth error first
    let error_param = query.split('&').find_map(|param| {
      let mut kv = param.splitn(2, '=');
      if kv.next() == Some("error") {
        kv.next().map(String::from)
      } else {
        None
      }
    });
    if let Some(err) = error_param {
      return Err(format!("Autorisation refus&#xe9;e par Google : {}", err));
    }

    // Extract the auth code
    let code = query
      .split('&')
      .find_map(|param| {
        let mut kv = param.splitn(2, '=');
        if kv.next() == Some("code") {
          kv.next().map(String::from)
        } else {
          None
        }
      })
      .ok_or_else(|| "Code OAuth introuvable dans la r&#xe9;ponse du navigateur".to_string())?;

    Ok(code)
  })
  .await
  .map_err(|e| e.to_string())?
}

// ── Tauri app entry point ────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .manage(OAuthListener(Mutex::new(None)))
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_sql::Builder::default().build())
    .invoke_handler(tauri::generate_handler![oauth_init, oauth_wait])
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
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
