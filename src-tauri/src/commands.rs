use std::path::{Path, PathBuf};

use tauri::AppHandle;

use crate::utils::{FsDetail, FsInfo, PathBufMethods, VecStringMethods};

#[tauri::command]
#[specta::specta]
pub fn convert_path_to_pathvec(path: &str) -> Vec<String> {
    Path::new(path).to_path_buf().to_vecstring()
}

#[tauri::command]
#[specta::specta]
pub fn convert_pathvec_to_path(pathvec: Vec<String>) -> String {
    pathvec.to_pathbuf().to_string_lossy().to_string()
}

#[tauri::command]
#[specta::specta]
pub fn get_fs_info(app_handle: AppHandle, path: &str) -> Result<FsInfo, String> {
    let pathbuf = Path::new(path).to_path_buf();

    pathbuf
        .get_fs_info(&app_handle)
        .map_err(|err| err.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn get_fs_detail(path: &str) -> Result<FsDetail, String> {
    let pathbuf = Path::new(path).to_path_buf();

    pathbuf.get_fs_detail().map_err(|err| err.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn get_fs_children_infos(app_handle: AppHandle, path: &str) -> Result<Vec<FsInfo>, String> {
    let pathbuf = Path::new(path).to_path_buf();

    let mut fs_infos = vec![];
    let entries = pathbuf.get_children().map_err(|err| err.to_string())?;

    for entry in entries {
        let entry = match entry {
            Ok(entry) => entry,
            _ => continue,
        };

        if let Ok(fs_info) = entry.path().get_fs_info(&app_handle) {
            fs_infos.push(fs_info);
        }
    }

    Ok(fs_infos)
}

#[tauri::command]
#[specta::specta]
pub fn open_path(app_handle: AppHandle, path: &str) -> Result<(), String> {
    let pathbuf = Path::new(path).to_path_buf();

    if !pathbuf.try_exists().map_err(|_| "Can't access the file!")? {
        return Err("File doesn't exists!".to_string());
    }

    pathbuf
        .open_with(&app_handle)
        .map_err(|err| err.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn get_thumbnail_path(app_handle: AppHandle, path: &str) -> Result<PathBuf, String> {
    let pathbuf = Path::new(path).to_path_buf();

    let thumbnail_pathbuf = pathbuf
        .get_thumbnail_pathbuf(&app_handle)
        .map_err(|err| err.to_string())?;

    Ok(thumbnail_pathbuf)
}
