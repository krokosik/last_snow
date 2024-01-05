// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{fs, path::PathBuf, env};

use tauri_plugin_autostart::MacosLauncher;
use tauri_plugin_log::LogTarget;
// use tauri_plugin_single_instance;
// use tauri_plugin_websocket;

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

fn count_csv_rows(file_path: &PathBuf) -> usize {
    let rdr = csv::Reader::from_path(&file_path);
    if let Ok(mut rdr) = rdr {
        if let Ok(records) = rdr.records().collect::<Result<Vec<_>, _>>() {
            return records.len();
        }
    }
    0
}

fn get_new_filename(base_dir: &PathBuf) -> PathBuf {
    let mut last_csv_idx = 0;
    fs::create_dir_all(base_dir.join("sentences")).unwrap();

    // List all csv files in the directory
    fs::read_dir(base_dir.join("sentences")).unwrap().for_each(|entry| {
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

    base_dir.join("sentences").join(format!("{}.csv", last_csv_idx + 1))
}

fn write_sentence(row: &Row, file_path: &PathBuf, headers: bool) {
    let file = fs::OpenOptions::new()
        .write(true)
        .append(true)
        .create(true)
        .open(file_path)
        .unwrap();
    
    let mut wtr = csv::Writer::from_writer(file);
    
    if headers {
        wtr.serialize(row).unwrap();
    } else {
        wtr.write_record(&[
            &row.language,
            &row.sentence,
            &row.timestamp,
        ]).unwrap();
    }
    wtr.flush().unwrap();
}

#[tauri::command]
fn submit_sentence(
    language: &str,
    text: &str,
) -> Result<(), String> {
    let base_dir = tauri::api::path::public_dir().unwrap();

    let row = Row {
        language: language.to_string(),
        sentence: text.to_string(),
        timestamp: Utc::now().to_rfc3339(),
    };

    let tmp_file_path = base_dir.join("tmp.csv");
    
    let rows = count_csv_rows(&tmp_file_path);
    write_sentence(&row, &tmp_file_path, rows == 0);
    let sentences_per_csv = env::var("SENTENCES_PER_CSV").unwrap_or(format!("{}", SENTENCES_PER_CSV)).parse::<usize>().unwrap();

    log::info!("{}/{} rows in tmp.csv", rows + 1, sentences_per_csv);

    if rows + 1 >= sentences_per_csv {
        let new_file_path = get_new_filename(&base_dir);
        log::info!("Moving tmp.csv to {}", new_file_path.to_str().unwrap());
        fs::rename(&tmp_file_path, &new_file_path).unwrap();
    }

    Ok(())
}

#[tauri::command]
fn get_env_var(key: &str) -> String {
    let res =    env::var(key).unwrap_or("".to_string());
    log::info!("Getting env var {}", res);
    res
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
        // .plugin(tauri_plugin_store::Builder::default().build())
        // .plugin(tauri_plugin_websocket::init())
        .invoke_handler(tauri::generate_handler![submit_sentence, get_env_var])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
