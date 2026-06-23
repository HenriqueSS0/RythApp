use std::fs;
use std::path::PathBuf;

#[tauri::command]
fn get_rhythia_path() -> Result<String, String> {
    if let Ok(appdata) = std::env::var("APPDATA") {
        let rhythia = format!("{}\\Rhythia\\maps", appdata);
        if std::path::Path::new(&rhythia).exists() {
            return Ok(rhythia);
        }
        let ssp = format!("{}\\SoundSpacePlus\\maps", appdata);
        if std::path::Path::new(&ssp).exists() {
            return Ok(ssp);
        }
        return Ok(rhythia);
    }
    Err("APPDATA not found".into())
}

#[tauri::command]
fn inject_map(path: String, filename: String, data: Vec<u8>) -> Result<String, String> {
    let dir = PathBuf::from(&path);
    if !dir.exists() {
        fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    }
    let file_path = dir.join(&filename);
    fs::write(&file_path, data).map_err(|e| e.to_string())?;
    
    #[cfg(windows)]
    trigger_drop_payload(&file_path.to_string_lossy().to_string());

    Ok(file_path.to_string_lossy().to_string())
}

#[cfg(windows)]
fn trigger_drop_payload(file_path: &str) {
    use windows::Win32::Foundation::{HWND, LPARAM, WPARAM};
    use windows::Win32::System::Memory::{GlobalAlloc, GlobalLock, GlobalUnlock, GHND};
    use windows::Win32::UI::Shell::DROPFILES;
    use windows::Win32::UI::WindowsAndMessaging::{FindWindowW, PostMessageW, WM_DROPFILES};
    use std::ptr::copy_nonoverlapping;

    unsafe {
        let window_name: Vec<u16> = "Rhythia".encode_utf16().chain(std::iter::once(0)).collect();
        let mut hwnd = FindWindowW(None, windows::core::PCWSTR(window_name.as_ptr()));
        
        if hwnd.0 == 0 {
            let ssp_name: Vec<u16> = "Sound Space Plus".encode_utf16().chain(std::iter::once(0)).collect();
            hwnd = FindWindowW(None, windows::core::PCWSTR(ssp_name.as_ptr()));
        }

        if hwnd.0 != 0 {
            let mut path_u16: Vec<u16> = file_path.encode_utf16().chain(std::iter::once(0)).collect();
            path_u16.push(0);
            
            let path_size = path_u16.len() * 2;
            let dropfiles_size = std::mem::size_of::<DROPFILES>();
            let total_size = dropfiles_size + path_size;

            if let Ok(hmem) = GlobalAlloc(GHND, total_size) {
                if !hmem.is_invalid() {
                    let ptr = GlobalLock(hmem) as *mut u8;
                    if !ptr.is_null() {
                        let dropfiles = ptr as *mut DROPFILES;
                        (*dropfiles).pFiles = dropfiles_size as u32;
                        (*dropfiles).pt.x = 0;
                        (*dropfiles).pt.y = 0;
                        (*dropfiles).fNC = windows::Win32::Foundation::BOOL(0);
                        (*dropfiles).fWide = windows::Win32::Foundation::BOOL(1);

                        let path_ptr = ptr.add(dropfiles_size) as *mut u16;
                        copy_nonoverlapping(path_u16.as_ptr(), path_ptr, path_u16.len());

                        let _ = GlobalUnlock(hmem);
                        
                        let _ = PostMessageW(hwnd, WM_DROPFILES, WPARAM(hmem.0 as usize), LPARAM(0));
                    }
                }
            }
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![get_rhythia_path, inject_map])
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
