#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde_json::Value;
use std::io::Write;
use std::process::{Command, Stdio};

#[tauri::command]
fn sidecar_request(payload: Value) -> Result<Value, String> {
    let cwd = std::env::current_dir().map_err(|e| e.to_string())?;
    let sidecar_path = if cwd.ends_with("src-tauri") {
        std::path::Path::new("..").join("backend").join("sidecar.py")
    } else {
        std::path::Path::new("backend").join("sidecar.py")
    };

    let mut child = Command::new("python")
        .arg(sidecar_path)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .spawn()
        .map_err(|e| e.to_string())?;

    if let Some(stdin) = child.stdin.as_mut() {
        let payload_str = payload.to_string();
        stdin
            .write_all(payload_str.as_bytes())
            .map_err(|e| e.to_string())?;
    }

    let output = child.wait_with_output().map_err(|e| e.to_string())?;
    if !output.status.success() {
        return Err(format!("sidecar failed: {}", output.status));
    }

    let response: Value =
        serde_json::from_slice(&output.stdout).map_err(|e| e.to_string())?;
    Ok(response)
}

fn ensure_worldie_extension(path: String) -> String {
    if path.to_lowercase().ends_with(".worldie") {
        path
    } else {
        format!("{path}.worldie")
    }
}

fn run_dialog_script(script: &str) -> Option<String> {
    let output = Command::new("powershell")
        .args(["-NoProfile", "-Command", script])
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }
    let value = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if value.is_empty() {
        None
    } else {
        Some(value)
    }
}

#[tauri::command]
fn pick_open_project_file() -> Option<String> {
    run_dialog_script(
        r#"
Add-Type -AssemblyName System.Windows.Forms
$dialog = New-Object System.Windows.Forms.OpenFileDialog
$dialog.Filter = 'Worldie Project (*.worldie)|*.worldie'
$dialog.Multiselect = $false
if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
  Write-Output $dialog.FileName
}
"#,
    )
}

#[tauri::command]
fn pick_new_project_file(suggested_name: Option<String>) -> Option<String> {
    let file_name = suggested_name
        .unwrap_or_else(|| "New World.worldie".to_string())
        .replace('\'', "''");
    let script = format!(
        r#"
Add-Type -AssemblyName System.Windows.Forms
$dialog = New-Object System.Windows.Forms.SaveFileDialog
$dialog.Filter = 'Worldie Project (*.worldie)|*.worldie'
$dialog.FileName = '{file_name}'
if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {{
  Write-Output $dialog.FileName
}}
"#
    );
    run_dialog_script(&script).map(ensure_worldie_extension)
}

#[tauri::command]
fn pick_save_project_as_file(suggested_name: Option<String>) -> Option<String> {
    let file_name = suggested_name
        .unwrap_or_else(|| "Worldie Project.worldie".to_string())
        .replace('\'', "''");
    let script = format!(
        r#"
Add-Type -AssemblyName System.Windows.Forms
$dialog = New-Object System.Windows.Forms.SaveFileDialog
$dialog.Filter = 'Worldie Project (*.worldie)|*.worldie'
$dialog.FileName = '{file_name}'
if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {{
  Write-Output $dialog.FileName
}}
"#
    );
    run_dialog_script(&script).map(ensure_worldie_extension)
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            sidecar_request,
            pick_open_project_file,
            pick_new_project_file,
            pick_save_project_as_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
