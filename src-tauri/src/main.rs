// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use enigo::{Enigo, Key, KeyboardControllable};
use rosc::{OscPacket, OscType};
use serde_json::json;
use std::net::UdpSocket;
use std::thread;
use std::{env, fs, path::PathBuf};
use tauri::{AppHandle, Manager, Wry};
use tauri_plugin_log::{Target, TargetKind};
use tauri_plugin_store::{with_store, Store, StoreCollection};

use chrono::{Local, Utc};
use csv;

#[derive(Debug, serde::Deserialize, serde::Serialize)]
struct Row {
    language: String,
    sentence: String,
    timestamp: String,
}

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
    fs::read_dir(base_dir.join("sentences"))
        .unwrap()
        .for_each(|entry| {
            let entry = entry.unwrap();
            last_csv_idx = std::cmp::max(
                entry
                    .path()
                    .file_stem()
                    .unwrap()
                    .to_str()
                    .unwrap()
                    .parse::<usize>()
                    .unwrap_or(0),
                last_csv_idx,
            );
        });

    base_dir
        .join("sentences")
        .join(format!("{}.csv", last_csv_idx + 1))
}

fn remove_file_if_exists(file_path: &PathBuf) {
    log::info!("Removing file {}", file_path.display());
    if file_path.exists() {
        fs::remove_file(file_path).unwrap_or_else(|e| {
            log::error!("Error removing file {}: {}", file_path.display(), e);
        });
    } else {
        log::info!("File {} does not exist", file_path.display());
    }
}

fn remove_all_csv(base_dir: &PathBuf) {
    fs::read_dir(base_dir.join("sentences"))
        .unwrap()
        .for_each(|entry| {
            let entry = entry.unwrap();
            remove_file_if_exists(&entry.path());
        });

    remove_file_if_exists(&base_dir.join("tmp.csv"));
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
        wtr.write_record(&[&row.language, &row.sentence, &row.timestamp])
            .unwrap();
    }
    wtr.flush().unwrap();
}

fn get_setting_store_path(app: &AppHandle) -> PathBuf {
    app.path().app_config_dir().unwrap().join(".settings")
}

#[tauri::command]
fn submit_sentence(language: &str, text: &str, app: AppHandle) -> Result<(), String> {
    let base_dir = app.path().public_dir().unwrap();
    let daily_dir = base_dir
        .join("sentences")
        .join(Local::now().format("%d-%m-%Y").to_string());
    let total_dir = base_dir.join("sentences").join("ALL");

    vec![&base_dir, &daily_dir, &total_dir]
        .iter()
        .filter(|dir| fs::metadata(dir).is_err())
        .for_each(|dir| {
            fs::create_dir(dir).unwrap();
        });

    let row = Row {
        language: language.to_string(),
        sentence: text.to_string(),
        timestamp: Utc::now().to_rfc3339(),
    };

    let tmp_file_path = base_dir.join("tmp.csv");
    let daily_file_path = daily_dir.join("data.csv");
    let all_file_path = total_dir.join("data.csv");

    let rows = count_csv_rows(&daily_file_path);
    write_sentence(&row, &daily_file_path, rows == 0);

    let rows = count_csv_rows(&all_file_path);
    write_sentence(&row, &all_file_path, rows == 0);

    let rows = count_csv_rows(&tmp_file_path);
    write_sentence(&row, &tmp_file_path, rows == 0);

    let stores = app.state::<StoreCollection<Wry>>();
    let path = get_setting_store_path(&app);
    let mut sentences_per_csv = 100;

    with_store(app.app_handle().clone(), stores, path, |store| {
        store.load().unwrap_or_else(|e| {
            log::error!("Error loading store: {}", e);
        });

        match store.get("max_sentences_per_csv") {
            Some(val) => sentences_per_csv = val.as_i64().unwrap() as usize,
            None => log::error!("Error getting max_sentences_per_csv"),
        }

        log::info!("{}/{} rows in tmp.csv", rows + 1, sentences_per_csv);

        if rows + 1 >= sentences_per_csv {
            let new_file_path = get_new_filename(&base_dir);
            log::info!("Moving tmp.csv to {}", new_file_path.to_str().unwrap());
            fs::rename(&tmp_file_path, &new_file_path).unwrap();
        }

        match store.get("td_osc_address") {
            Some(val) => {
                let addr = val.as_str().unwrap();
                if let Ok(socket) = UdpSocket::bind("last-snow.local:7001") {
                    log::info!("Listening on {}", socket.local_addr().unwrap());
                    let msg = rosc::encoder::encode(&OscPacket::Message(rosc::OscMessage {
                        addr: "/new_row".to_string(),
                        args: vec![OscType::String(row.sentence)],
                    }))
                    .unwrap();

                    log::info!("Sending packet to {}: {:?}", addr, msg);

                    socket.send_to(&msg, addr).unwrap_or_else(|e| {
                        log::error!("Error sending to socket: {}", e);
                        0
                    });
                } else {
                    log::error!("Error binding to socket");
                }
            }
            None => log::error!("Error getting td_osc_address"),
        }
        Ok(())
    })
    .unwrap();

    Ok(())
}

fn handle_packet(packet: OscPacket, app: &AppHandle, store: &mut Store<Wry>) {
    let base_dir = app.path().public_dir().unwrap();

    match packet {
        OscPacket::Message(msg) => {
            log::info!("Received packet: {:?}", msg);

            match (msg.addr.as_str(), msg.args.as_slice()) {
                ("/td_osc_address", [OscType::String(addr)]) => {
                    store
                        .insert("td_osc_address".to_owned(), json!(addr))
                        .unwrap_or_else(|e| {
                            log::error!("Error inserting td_osc_address: {}", e);
                        });
                }
                ("/max_characters", [OscType::Int(max_characters)]) => {
                    store
                        .insert("max_characters".to_owned(), json!(max_characters))
                        .unwrap_or_else(|e| {
                            log::error!("Error inserting max_characters: {}", e);
                        });
                    app.emit("max_characters", max_characters)
                        .unwrap_or_else(|e| {
                            log::error!("Error emitting max_characters: {}", e);
                        });
                }
                ("/max_sentences_per_csv", [OscType::Int(max_sentences_per_csv)]) => {
                    store
                        .insert(
                            "max_sentences_per_csv".to_owned(),
                            json!(max_sentences_per_csv),
                        )
                        .unwrap_or_else(|e| {
                            log::error!("Error inserting max_sentences_per_csv: {}", e);
                        });
                }
                ("/remove_all_csv", []) => {
                    remove_all_csv(&base_dir);
                }
                ("/remove_output_csv", [OscType::String(filename)]) => {
                    remove_file_if_exists(&base_dir.join("sentences").join(filename));
                }
                ("/remove_tmp_csv", []) => {
                    remove_file_if_exists(&base_dir.join("tmp.csv"));
                }
                _ => log::warn!("Invalid OSC address: {}", msg.addr),
            }

            store.save().unwrap_or_else(|e| {
                log::error!("Error saving store: {}", e);
            });
        }
        OscPacket::Bundle(bundle) => {
            for packet in bundle.content {
                handle_packet(packet, app, store);
            }
        }
    }
}

#[tauri::command]
fn press_enter(with_shift: bool) {
    let mut enigo = Enigo::new();

    if with_shift {
        enigo.key_down(Key::Shift);
    }
    enigo.key_click(Key::Return);
    if with_shift {
        enigo.key_up(Key::Shift);
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::default()
                .targets([
                    Target::new(TargetKind::LogDir {
                        file_name: Some("last-snow.log".to_owned()),
                    }),
                    Target::new(TargetKind::Stdout),
                    Target::new(TargetKind::Webview),
                ])
                .build(),
        )
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let mut store =
                tauri_plugin_store::StoreBuilder::new(get_setting_store_path(app.handle()))
                    .build(app.handle().clone());

            log::info!(
                "Using store at {}",
                get_setting_store_path(app.handle()).display()
            );

            store.load().unwrap_or_else(|e| {
                log::error!("Error loading store: {}", e);
            });

            if !store.has("max_characters") {
                store
                    .insert("max_characters".to_owned(), json!(160))
                    .unwrap_or_else(|e| {
                        log::error!("Error inserting max_characters: {}", e);
                    });
            }

            if !store.has("max_sentences_per_csv") {
                store
                    .insert("max_sentences_per_csv".to_owned(), json!(100))
                    .unwrap_or_else(|e| {
                        log::error!("Error inserting max_sentences_per_csv: {}", e);
                    });
            }

            store.save().unwrap_or_else(|e| {
                log::error!("Error saving store: {}", e);
            });

            let app_handle = app.handle().clone();

            thread::spawn(move || {
                // Bind the UDP socket to listen on port 7000
                let socket = UdpSocket::bind("last-snow.local:7000")
                    .unwrap_or_else(|_| UdpSocket::bind("127.0.0.1:7000").unwrap());
                log::info!("Listening on {}", socket.local_addr().unwrap());

                let mut buf = [0u8; rosc::decoder::MTU];

                loop {
                    match socket.recv_from(&mut buf) {
                        Ok((size, addr)) => {
                            log::info!("Received packet with size {} from: {}", size, addr);
                            let (_, msg) = rosc::decoder::decode_udp(&buf[..size]).unwrap();
                            handle_packet(msg, &app_handle, &mut store);
                        }
                        Err(e) => {
                            log::info!("Error receiving from socket: {}", e);
                            break;
                        }
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![submit_sentence, press_enter])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
