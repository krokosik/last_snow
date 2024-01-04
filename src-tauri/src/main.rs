// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;

use tauri_plugin_autostart::MacosLauncher;
use tauri_plugin_log::LogTarget;
use tauri_plugin_single_instance;
use tauri_plugin_websocket;

use chrono::Utc;
use csv;
use tauri::Manager;

#[derive(Clone, serde::Serialize)]
struct Payload {
    args: Vec<String>,
    cwd: String,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
struct Row {
    language: String,
    sentence: String,
    timestamp: String,
}

const SENTENCES_PER_CSV: usize = 100;

#[tauri::command]
fn submit_sentence(
    language: &str,
    text: &str,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    let base_dir = app_handle
        .path_resolver()
        .app_data_dir()
        .unwrap()
        .join("sentences");
    fs::create_dir_all(&base_dir).unwrap();

    let mut last_csv_idx = 0;

    // List all csv files in the directory
    fs::read_dir(&base_dir).unwrap().for_each(|entry| {
        let entry = entry.unwrap();
        last_csv_idx = std::cmp::max(
            entry
                .path()
                .file_stem()
                .unwrap()
                .to_str()
                .unwrap()
                .parse::<usize>()
                .unwrap(),
            last_csv_idx,
        );
    });

    let file_path = base_dir.join(format!("{}.csv", last_csv_idx));

    // Check if the file has enough records
    let rdr = csv::Reader::from_path(&file_path);
    if let Ok(mut rdr) = rdr {
        if let Ok(records) = rdr.records().collect::<Result<Vec<_>, _>>() {
            if records.len() < SENTENCES_PER_CSV {
                let file = fs::OpenOptions::new()
                    .write(true)
                    .append(true)
                    .open(&file_path)
                    .unwrap();
                
                let mut wtr = csv::Writer::from_writer(file);
                
                wtr.write_record(&[language, text, &Utc::now().to_rfc3339()]).unwrap();
                wtr.flush().unwrap();
                return Ok(());
            } else {
                last_csv_idx += 1;
            }
        }
    }
    
    let file_path = base_dir.join(format!("{}.csv", last_csv_idx));
    let mut wtr = csv::Writer::from_path(&file_path).unwrap();
    wtr.serialize(Row {
        language: language.to_string(),
        sentence: text.to_string(),
        timestamp: Utc::now().to_rfc3339(),
    }).unwrap();
    wtr.flush().unwrap();

    Ok(())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec![]),
        ))
        .plugin(tauri_plugin_single_instance::init(|app, argv, cwd| {
            println!("{}, {argv:?}, {cwd}", app.package_info().name);

            app.emit_all("single-instance", Payload { args: argv, cwd })
                .unwrap();
        }))
        .plugin(
            tauri_plugin_log::Builder::default()
                .targets([LogTarget::LogDir, LogTarget::Stdout, LogTarget::Webview])
                .build(),
        )
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_websocket::init())
        .invoke_handler(tauri::generate_handler![submit_sentence])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
