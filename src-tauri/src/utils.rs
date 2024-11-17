use anyhow::Context;
use blake3::Hasher;
use serde::{Deserialize, Serialize, Serializer};
use specta::Type;
use std::ffi::OsStr;
use std::fs::{self, File, Metadata, ReadDir};
use std::io::{BufReader, Read};
use std::os::unix::ffi::OsStrExt;
use std::path::PathBuf;
use std::time::SystemTime;
use tauri::{AppHandle, Manager, Wry};
use tauri_plugin_shell::open::Program;
use tauri_plugin_shell::ShellExt;
use tauri_plugin_store::{Store, StoreExt};

trait AppHandleMethods {
    fn get_default_store(&self) -> Store<Wry>;
}

impl AppHandleMethods for AppHandle {
    fn get_default_store(&self) -> Store<Wry> {
        self.store("almanac.store.json")
    }
}

#[derive(Debug, Clone, Deserialize, Type)]
pub struct FsId(String);

impl Serialize for FsId {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(&self.0)
    }
}

impl FsId {
    fn get_total_views_store_key(&self) -> String {
        format!("fs/{}/total-views", self.0)
    }

    fn get_total_views(&self, app_handle: &AppHandle) -> Option<i64> {
        app_handle
            .get_default_store()
            .get(&self.get_total_views_store_key())
            .and_then(|value| value.as_i64())
    }

    fn increase_total_views(&self, app_handle: &AppHandle) -> anyhow::Result<()> {
        let store = app_handle.get_default_store();
        let store_key = self.get_total_views_store_key();
        let increased_store_value = store.get(&store_key).and_then(|v| v.as_i64()).unwrap_or(0) + 1;

        store.set(store_key, increased_store_value);
        store.save().context("Can't update the store!")
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct FileInfo {
    pub id: FsId,
    pub name: String,
    #[serde(rename = "path")]
    pub pathbuf: PathBuf,
    pub size: Option<i64>,
    pub modified_time: Option<SystemTime>,
    pub total_views: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct FileDetail {
    pub mime: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct FolderInfo {
    pub id: FsId,
    pub name: String,
    #[serde(rename = "path")]
    pub pathbuf: PathBuf,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct FolderDetail {
    pub total_items: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase", tag = "type")]
pub enum FsInfo {
    File(FileInfo),
    Folder(FolderInfo),
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase", tag = "type")]
pub enum FsDetail {
    File(FileDetail),
    Folder(FolderDetail),
}

pub trait MetadataMethods {
    fn get_modified_time(&self) -> Option<SystemTime>;
    fn get_size(&self) -> Option<i64>;
}

impl MetadataMethods for Option<Metadata> {
    fn get_modified_time(&self) -> Option<SystemTime> {
        self.as_ref().map(|meta| meta.modified().ok()).flatten()
    }

    fn get_size(&self) -> Option<i64> {
        self.as_ref()
            .map(|meta| meta.len().try_into().ok())
            .flatten()
    }
}

pub trait VecStringMethods {
    fn to_pathbuf(&self) -> PathBuf;
}

impl VecStringMethods for Vec<String> {
    fn to_pathbuf(&self) -> PathBuf {
        let mut pathbuf = PathBuf::new();
        for component in self {
            pathbuf.push(component);
        }
        pathbuf
    }
}

pub trait PathBufMethods {
    fn to_vecstring(&self) -> Vec<String>;
    fn check_is_exists(&self) -> anyhow::Result<bool>;
    fn get_name(&self) -> Option<String>;
    fn get_fs_info(&self, app_handle: &AppHandle) -> anyhow::Result<FsInfo>;
    fn get_fs_detail(&self) -> anyhow::Result<FsDetail>;
    fn get_mime(&self) -> Option<String>;
    fn get_id(&self) -> FsId;
    fn get_children(&self) -> anyhow::Result<ReadDir>;
    fn open_with(&self, app_handle: &AppHandle) -> anyhow::Result<()>;
    fn is_thumbnail_supported_image(&self) -> bool;
    fn is_thumbnail_supported_video(&self) -> bool;
    fn get_thumbnail_pathbuf(&self, app_handle: &AppHandle) -> anyhow::Result<PathBuf>;
}

impl PathBufMethods for PathBuf {
    fn to_vecstring(&self) -> Vec<String> {
        self.components()
            .map(|comp| comp.as_os_str().to_string_lossy().into_owned())
            .collect()
    }

    fn get_name(&self) -> Option<String> {
        self.file_name()
            .map(|name| name.to_string_lossy().to_string())
    }

    fn check_is_exists(&self) -> anyhow::Result<bool> {
        self.try_exists().context("Can't check the path!")
    }

    fn get_fs_info(&self, app_handle: &AppHandle) -> anyhow::Result<FsInfo> {
        if !self.check_is_exists()? {
            return Err(anyhow::anyhow!("The path doesn't exist!"));
        }

        let fs_info = if self.is_file() {
            let file_info = {
                let name = self.get_name().context("Can't get the file name!")?;
                let metadata = self.metadata().ok();
                let size: Option<i64> = metadata.get_size();
                let modified_time = metadata.get_modified_time();
                let id = self.get_id();
                let total_views = id.get_total_views(app_handle);

                FileInfo {
                    id,
                    name,
                    pathbuf: self.to_owned(),
                    size,
                    modified_time,
                    total_views,
                }
            };

            FsInfo::File(file_info)
        } else {
            let folder_info = {
                let id = self.get_id();
                let name = self
                    .get_name()
                    .unwrap_or(self.to_string_lossy().to_string());

                FolderInfo {
                    id,
                    name,
                    pathbuf: self.to_owned(),
                }
            };

            FsInfo::Folder(folder_info)
        };

        Ok(fs_info)
    }

    fn get_fs_detail(&self) -> anyhow::Result<FsDetail> {
        if !self.check_is_exists()? {
            return Err(anyhow::Error::msg("The path doesn't exists!"));
        }

        let fs_detail = if self.is_file() {
            let file_detail = {
                let mime = Self::get_mime(&self);

                FileDetail { mime }
            };

            FsDetail::File(file_detail)
        } else {
            let folder_detail = {
                let total_items = {
                    let entries = self.get_children()?;
                    let mut total_items: i64 = 0;

                    for _ in entries {
                        total_items += 1;
                    }

                    Some(total_items)
                };

                FolderDetail { total_items }
            };

            FsDetail::Folder(folder_detail)
        };

        Ok(fs_detail)
    }

    fn get_mime(&self) -> Option<String> {
        let is_check_from_path = match self.extension().and_then(OsStr::to_str) {
            Some("deb") => false,
            Some("exe") => false,
            Some("rpm") => false,
            _ => true,
        };
        if is_check_from_path {
            let mime = mime_guess::from_path(&self).first()?;
            return Some(mime.to_string());
        }

        let mut file = File::open(self).ok()?;
        let mut buffer = [0u8; 512];

        file.read_exact(&mut buffer).ok()?;

        let file_type_from_buffer = infer::get(&buffer)?;

        Some(file_type_from_buffer.mime_type().to_string())
    }

    fn get_id(&self) -> FsId {
        let mut hasher = blake3::Hasher::new();

        match (self.is_file(), File::open(&self)) {
            (true, Ok(file)) => {
                let metadata = self.metadata().ok();
                let mime = self.get_mime();
                let size = metadata.get_size();
                let modified_unixtime = metadata
                    .get_modified_time()
                    .map(|modified_time| modified_time.duration_since(std::time::UNIX_EPOCH).ok())
                    .flatten();

                match (size, &mime, modified_unixtime) {
                    (Some(size), Some(mime), Some(modified_unixtime)) => {
                        hasher.update(&size.to_be_bytes());
                        hasher.update(mime.as_bytes());
                        hasher.update(&modified_unixtime.as_secs().to_be_bytes());
                        hasher.update(&modified_unixtime.subsec_nanos().to_be_bytes());
                    }
                    _ => {
                        let mut reader = BufReader::new(file);
                        let mut hasher = Hasher::new();
                        let mut buffer = [0; 8192];

                        loop {
                            if let Some(bytes_read) = reader.read(&mut buffer).ok() {
                                if bytes_read == 0 {
                                    break;
                                }

                                hasher.update(&buffer[..bytes_read]);
                            }
                        }
                    }
                }
            }
            _ => {
                hasher.update(self.as_os_str().as_bytes());
            }
        };

        FsId(hasher.finalize().to_string())
    }

    fn get_children(&self) -> anyhow::Result<ReadDir> {
        fs::read_dir(self).context("Can't read the folder!")
    }

    fn open_with(&self, app_handle: &AppHandle) -> anyhow::Result<()> {
        let shell = app_handle.shell();

        shell
            .open(self.to_string_lossy().to_string(), Some(Program::Open))
            .expect("Can't open the file/folder!");

        self.get_id().increase_total_views(app_handle)?;

        Ok(())
    }

    fn is_thumbnail_supported_image(&self) -> bool {
        if let Some(mime) = self.get_mime() {
            mime == "image/jpeg" || mime == "image/png" || mime == "image/webp"
        } else {
            false
        }
    }

    fn is_thumbnail_supported_video(&self) -> bool {
        if let Some(mime) = self.get_mime() {
            mime == "video/mp4" || mime == "video/webm" || mime == "video/x-matroska"
        } else {
            false
        }
    }

    fn get_thumbnail_pathbuf(&self, app_handle: &AppHandle) -> anyhow::Result<PathBuf> {
        self.check_is_exists()?;

        if !self.is_file() {
            return Err(anyhow::anyhow!("The path must be a file!"));
        }

        let id = self.get_id();
        let thumbnail_path = {
            let mut path = app_handle.path().app_cache_dir()?;
            path.push(format!("{}.webp", id.0));
            path
        };

        if thumbnail_path.try_exists().unwrap_or(false) {
            return Ok(thumbnail_path);
        }

        let input_pathstr = self.to_str().context("Can't parse the file path!")?;
        let thumbnail_pathstr = thumbnail_path
            .to_str()
            .context("Can't parse the file path!")?;
        let ffmpeg_command_args = {
            if self.is_thumbnail_supported_image() {
                Some(vec![
                    "-i",
                    input_pathstr,
                    "-vf",
                    "scale='min(930,iw*480/ih)': 'min(480,ih*930/iw)'",
                    thumbnail_pathstr,
                ])
            } else if self.is_thumbnail_supported_video() {
                Some(vec![
                    "-i",
                    input_pathstr,
                    "-vf",
                    "thumbnail,scale='if(gt(a,930/480),930,-1)':'if(gt(a,930/480),-1,480)'",
                    "-frames:v",
                    "1",
                    "-q:v",
                    "2",
                    thumbnail_pathstr,
                ])
            } else {
                None
            }
        };

        let ffmpeg_command_args = ffmpeg_command_args.context("Unsupported file type!")?;
        let ffmpeg_command = app_handle
            .shell()
            .sidecar("ffmpeg")
            .context("Can't init the ffmpeg sidecar!")?
            .args(&ffmpeg_command_args);

        ffmpeg_command
            .spawn()
            .with_context(|| "Can't spawn the ffmpeg command!")?;

        Ok(thumbnail_path)
    }
}
