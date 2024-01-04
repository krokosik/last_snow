// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::error::Error;

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

const SENTENCES_PER_CSV: usize = 2;

#[tauri::command]
fn submit_sentence(
    language: &str,
    sentence: &str,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    let base_dir = app_handle
        .path_resolver()
        .app_data_dir()
        .unwrap()
        .join("sentences");
    std::fs::create_dir_all(&base_dir).unwrap();

    let mut last_csv_idx = 0;
    // List all csv files in the directory
    std::fs::read_dir(&base_dir).unwrap().for_each(|entry| {
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

    let row = Row {
        language: language.to_string(),
        sentence: sentence.to_string(),
        timestamp: Utc::now().to_rfc3339(),
    };

    let file_path = base_dir.join(format!("{}.csv", last_csv_idx));

    let mut rdr_res = csv::Reader::from_path(&file_path);

    if rdr_res.is_err() {
        let mut wtr = csv::Writer::from_path(&file_path).unwrap();
        wtr.serialize(row).unwrap();
        wtr.flush().unwrap();
        return Ok(());
    }
    let mut rdr = rdr_res.unwrap();
    let mut wtr = csv::Writer::from_path(&file_path).unwrap();

    wtr.write_record(rdr.headers().unwrap()).unwrap();

    let mut row_count = 0;
    for result in rdr.deserialize() {
        let row: Row = result.unwrap();
        row_count += 1;
        wtr.serialize(row).unwrap();
    }

    if row_count < SENTENCES_PER_CSV {
        wtr.serialize(row).unwrap();
    } else {
        let file_path = base_dir.join(format!("{}.csv", last_csv_idx + 1));
        let mut wtr = csv::Writer::from_path(file_path).unwrap();
        wtr.write_record(rdr.headers().unwrap()).unwrap();
        wtr.serialize(row).unwrap();
    }

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
