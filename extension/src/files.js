// Khóa media, chống trùng, tên file, mẫu tên, thư mục lưu và thư mục con, liệt kê file đã lưu.

const hashCode = (s) => {
  const l = s.length;
  let h = 0, i = 0;
  while (i < l) h = ((h << 5) - h + s.charCodeAt(i++)) | 0;
  return h >>> 0;
};

// URL stream/ của WebK = stream/ + JSON(DownloadOptions) (tweb helpers/fileName.ts getFileURL)
const getMediaMetadata = (url) => {
  try {
    const last = url.split("?")[0].split("/").pop();
    return JSON.parse(decodeURIComponent(last));
  } catch { return {}; }
};

// ưu tiên id không đổi qua re-render: file id WebK, hash progressive WebA, rồi id tin nhắn trong DOM
const WEBA_HASH_RE = /\/(?:progressive|download)\/((?:document|photo)\d+)/;
const mediaKey = (url, el) => {
  const u = url || "";
  const weba = u.match(WEBA_HASH_RE);
  if (weba) return `file:${weba[1]}`;
  const loc = getMediaMetadata(u)?.location;
  if (loc?.id) return `file:${loc.id}`;
  const midEl = el?.closest?.("[data-mid]");
  if (midEl?.dataset.mid) {
    const peer = midEl.closest("[data-peer-id]")?.dataset.peerId || "";
    return `msg:${peer}:${midEl.dataset.mid}`;
  }
  // WebA: id trong Album.tsx / Message.tsx; id chat nằm ở URL hash
  const albumId = el?.closest?.("[id^='album-media-']")?.id;
  const msgId = el?.closest?.("[data-message-id]")?.dataset.messageId;
  if (albumId || msgId) return `msg:${location.hash.slice(1)}:${albumId || msgId}`;
  return `url:${u}`;
};

let downloadedKeys = new Set(loadStore("downloaded", []));
const markDownloaded = (key) => {
  if (!key || key.startsWith("url:")) return; // blob: URL chết theo trang
  downloadedKeys.delete(key);
  downloadedKeys.add(key);
  if (downloadedKeys.size > DOWNLOADED_CAP) {
    downloadedKeys = new Set([...downloadedKeys].slice(-DOWNLOADED_CAP));
  }
  saveStore("downloaded", [...downloadedKeys]);
};

const EXT_MAP = {
  "video/mp4": ["mp4", "m4v"], "video/webm": ["webm"], "video/quicktime": ["mov"],
  "video/x-matroska": ["mkv"], "audio/ogg": ["ogg", "oga", "opus"], "audio/mpeg": ["mp3"],
  "audio/mp4": ["m4a"], "audio/webm": ["webm"], "audio/aac": ["aac"],
  "audio/wav": ["wav"], "audio/x-wav": ["wav"],
  "image/jpeg": ["jpg", "jpeg"], "image/png": ["png"], "image/webp": ["webp"],
  "image/gif": ["gif"], "image/avif": ["avif"], "image/heic": ["heic"],
  "image/bmp": ["bmp"], "image/svg+xml": ["svg"],
};
// eslint-disable-next-line no-control-regex -- loại ký tự điều khiển khỏi tên file là có chủ đích
const sanitizeName = (s) => (s || "").replace(/[\x00-\x1f\x7f<>:"/\\|?*]/g, "_");
const getDownloadFileName = (url, mime, kind) => {
  const meta = getMediaMetadata(url);
  let name = typeof meta?.fileName === "string" ? meta.fileName : "";
  if (!name) {
    const weba = (url || "").match(WEBA_HASH_RE);
    if (weba) name = weba[1];
  }
  if (!name) {
    try {
      const base = decodeURIComponent(new URL(url, location.href).pathname.split("/").pop());
      if (/\.[a-z0-9]{2,5}$/i.test(base)) name = base;
    } catch { /* URL không hợp lệ: dùng tên dự phòng bên dưới */ }
  }
  name = sanitizeName(name || hashCode(url).toString(36));
  const allowed = EXT_MAP[mime?.toLowerCase()] ||
    (mime ? null : (kind === "video" ? ["mp4"] : kind === "audio" ? ["ogg"] : ["jpg"]));
  const dot = name.lastIndexOf(".");
  if (!allowed) return dot > 0 ? name : name + ".bin";
  if (dot > 0 && allowed.includes(name.slice(dot + 1).toLowerCase())) return name;
  return (dot > 0 ? name.slice(0, dot) : name) + "." + allowed[0];
};

const pad2 = (n) => String(n).padStart(2, "0");
const pad3 = (n) => String(n).padStart(3, "0");
const nowStamp = () => {
  const d = new Date();
  return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}-${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`;
};
// peek: chỉ xem trước (Cài đặt), không tiêu số thứ tự
const applyNaming = (originalName, peek = false) => {
  const dot = originalName.lastIndexOf(".");
  const base = dot > 0 ? originalName.slice(0, dot) : originalName;
  const ext = dot > 0 ? originalName.slice(dot) : "";
  const prefix = settings.prefix ? sanitizeName(settings.prefix) + "_" : "";
  let seqValue = null; // {seq} xuất hiện nhiều lần trong mẫu vẫn chỉ tiêu một số
  const seq = () => {
    if (seqValue != null) return seqValue;
    seqValue = pad3(seqCounter);
    if (!peek) { seqCounter++; saveStore("seq", seqCounter); }
    return seqValue;
  };
  if (settings.naming === "custom") {
    const tokens = {
      name: () => base, date: todaySegment, time: () => nowStamp().slice(9), seq, channel: currentChannelName,
    };
    const out = String(settings.template || "").replace(/\{(\w+)\}/g, (ph, k) => (tokens[k] ? tokens[k]() : ph));
    // sanitizeName bỏ cả "/" nên mẫu không tạo được thư mục con; 150 ký tự để còn chỗ cho đuôi và " (n)"
    return prefix + (sanitizeName(out).trim().slice(0, 150) || base) + ext;
  }
  switch (settings.naming) {
    case "date": return prefix + nowStamp() + ext;
    case "seq": return prefix + seq() + ext;
    case "date_original": return prefix + nowStamp() + "_" + base + ext;
    case "seq_original": return prefix + seq() + "_" + base + ext;
    default: return prefix + base + ext;
  }
};

let destDirHandle = null;
let destDirName = loadStore("destDirName", "");
idbGet("destDirHandle").then((h) => { if (h) destDirHandle = h; });

const ensureDirPermission = async (handle) => {
  if (!handle) return false;
  const opts = { mode: "readwrite" };
  if ((await handle.queryPermission?.(opts)) === "granted") return true;
  try { return (await handle.requestPermission?.(opts)) === "granted"; }
  catch { return false; }
};

const todaySegment = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};
const currentChannelName = () => {
  const el = document.querySelector(".chat .user-title, .chat-info .user-title, .chat-utils ~ * .user-title");
  const direct = el?.querySelector(".peer-title")?.textContent || el?.textContent;
  if (direct && direct.trim()) return sanitizeName(direct).trim().slice(0, 80);
  const title = (document.title || "").replace(/\s*[-·]?\s*Telegram\s*$/i, "").trim();
  return sanitizeName(title).slice(0, 80) || "Unknown";
};
const subfolderSegments = () => {
  switch (settings.subfolder) {
    case "date": return [todaySegment()];
    case "channel": return [currentChannelName()];
    case "date_channel": return [todaySegment(), currentChannelName()];
    case "channel_date": return [currentChannelName(), todaySegment()];
    default: return [];
  }
};
const resolveDestDir = async () => {
  if (!destDirHandle) return null;
  if (!await ensureDirPermission(destDirHandle)) return null;
  let dir = destDirHandle;
  for (const seg of subfolderSegments()) {
    if (!seg) continue;
    try { dir = await dir.getDirectoryHandle(seg, { create: true }); }
    catch (e) { log.error(`subfolder "${seg}": ${e.message}`); return destDirHandle; }
  }
  return dir;
};
// không ghi đè: a.jpg → a (1).jpg → a (2).jpg
const pickFreeFile = async (dir, name) => {
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  for (let i = 0; i < 1000; i++) {
    const candidate = i ? `${base} (${i})${ext}` : name;
    try {
      await dir.getFileHandle(candidate);
    } catch (e) {
      if (e?.name !== "NotFoundError") throw e;
      return { fh: await dir.getFileHandle(candidate, { create: true }), name: candidate };
    }
  }
  throw new Error(`too many files named ${name}`);
};
// chạy lần lượt: 2 task cùng tên chạy song song sẽ cùng thấy "chưa có file" rồi ghi đè lên nhau
let fileNameChain = Promise.resolve();
const uniqueFileHandle = (dir, name) => {
  const run = () => pickFreeFile(dir, name);
  const p = fileNameChain.then(run, run);
  fileNameChain = p.catch(() => {});
  return p;
};

// mọi file trong thư mục lưu, kể cả thư mục con ngày/kênh, mới nhất trước; bỏ file tạm .crswap của file đang ghi
const listSavedFiles = async (root) => {
  const out = [];
  const walk = async (dir, prefix) => {
    for await (const h of dir.values()) {
      if (out.length >= FILE_LIST_SCAN_MAX) return;
      if (h.kind === "directory") { await walk(h, `${prefix}${h.name}/`); continue; }
      if (h.name.endsWith(".crswap")) continue;
      try { out.push({ path: prefix + h.name, file: await h.getFile() }); } catch { /* file vừa bị xoá hoặc đang bị khoá */ }
    }
  };
  await walk(root, "");
  return out.sort((a, b) => b.file.lastModified - a.file.lastModified);
};

// đặt tên theo cài đặt đúng một lần mỗi task (tiền tố, số thứ tự); file người dùng tự chọn giữ nguyên tên
const nameOnce = (task) => {
  if (!task.named && !task.handle) { task.fileName = applyNaming(task.fileName); task.named = true; }
  return task.fileName;
};
