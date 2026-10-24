// ==UserScript==
// @name         Telegram Media Downloader
// @name:en      Telegram Media Downloader
// @name:vi      Trình tải media Telegram
// @version      1.0
// @namespace    sakerly
// @description  Tải ảnh, GIF, video, voice từ Telegram Web, kể cả kênh cấm lưu — hỗ trợ chọn hàng loạt + auto-queue video khi mở viewer.
// @description:en  Download images, GIFs, videos and voice from Telegram Web (incl. restricted channels). Multi-select batch + auto-queue video on viewer open.
// @author       SakerLy
// @match        https://web.telegram.org/*
// @match        https://webk.telegram.org/*
// @match        https://webz.telegram.org/*
// @icon         https://web.telegram.org/k/assets/img/android-chrome-144x144.png
// @run-at       document-end
// @grant        none
// @homepageURL  https://github.com/SakerLy/telegram-media-downloader
// @supportURL   https://github.com/SakerLy/telegram-media-downloader/issues
// @updateURL    https://raw.githubusercontent.com/SakerLy/telegram-media-downloader/main/Telegram-DL.user.js
// @downloadURL  https://raw.githubusercontent.com/SakerLy/telegram-media-downloader/main/Telegram-DL.user.js
// ==/UserScript==

(function () {
  "use strict";

  // ===== i18n (VI default, EN fallback) =====================================
  const LANGS = {
    vi: {
      downloads: "Tải xuống", downloadsCount: "Tải xuống ({count})",
      mediaDownloads: "Tải media", download: "Tải xuống", loadingMedia: "Media đang tải",
      hide: "Ẩn", show: "Hiện", dismiss: "Bỏ khỏi danh sách",
      progress: "Tiến trình tải", cancel: "Hủy", retry: "Thử lại",
      preparing: "Đang chuẩn bị", queued: "Đang chờ", downloading: "Đang tải",
      saving: "Đang lưu", completed: "Hoàn tất", handedOff: "Đã gửi cho trình duyệt",
      failed: "Thất bại", cancelled: "Đã hủy",
      rate: "{speed}/s", video: "video", audio: "âm thanh", image: "ảnh",
      unknownType: "định dạng không xác định",
      errorHttp: "Yêu cầu tải thất bại (HTTP {status})",
      errorMime: "Cần {kind}, nhận được {mime}",
      errorRangeMissing: "Thiếu hoặc sai Content-Range",
      errorRangeInconsistent: "Dữ liệu không khớp; đã dừng để tránh file hỏng",
      errorRangeUnsupported: "Server không hỗ trợ tải từng phần",
      errorLength: "Content-Length không hợp lệ", errorEmpty: "Phản hồi rỗng",
      errorTooLarge: "Dữ liệu vượt kích thước dự kiến",
      errorIncomplete: "Dữ liệu không đầy đủ",
      errorTimeout: "Không nhận được dữ liệu trong 30 giây",
      errorUnexpected: "Tải thất bại: {message}",
      selectTitle: "Chọn hàng loạt",
      selectMode: "Chế độ chọn", selectAll: "Chọn tất cả hiển thị",
      clearSelection: "Bỏ chọn", downloadSelected: "Tải mục đã chọn ({count})",
      batchQueued: "Đã thêm {count} mục vào hàng chờ",
      autoQueue: "Auto-queue video", autoQueueOn: "Auto-queue video ✓",
      autoQueueHint: "Mở video trong viewer sẽ tự thêm vào hàng chờ.",
      hintPhoto: "Ảnh: bật <b>Chế độ chọn</b> → click bubble",
      hintVideo: "Video: bật <b>Auto-queue</b> → mở viewer → mũi tên",
      hintKeys: "Ctrl+Shift+M · A · D",
      lang: "Ngôn ngữ",
      topbarQueue: "Thêm vào hàng chờ",
      settings: "Cài đặt", settingsTitle: "Cài đặt tải xuống",
      naming: "Định dạng tên file",
      namingOriginal: "Tên gốc", namingDate: "Ngày giờ",
      namingSeq: "Số thứ tự", namingDateOriginal: "Ngày giờ + Tên gốc",
      namingSeqOriginal: "Số thứ tự + Tên gốc",
      prefix: "Tiền tố (tuỳ chọn)",
      prefixPlaceholder: "VD: channelname",
      folder: "Thư mục lưu",
      pickFolder: "Chọn thư mục", clearFolder: "Bỏ chọn",
      folderNone: "Chưa chọn (dùng thư mục Downloads mặc định)",
      folderUnsupported: "Trình duyệt không hỗ trợ chọn thư mục",
      resetSeq: "Đặt lại số thứ tự",
      seqNow: "Số kế tiếp: {n}",
      close: "Đóng",
      clearHistory: "Xoá lịch sử",
      subfolder: "Thư mục con tự động",
      subfolderNone: "Không (lưu trực tiếp)",
      subfolderDate: "Theo ngày (2026-10-24)",
      subfolderChannel: "Theo kênh/chat",
      subfolderDateChannel: "Ngày / Kênh",
      subfolderChannelDate: "Kênh / Ngày",
    },
    en: {
      downloads: "Downloads", downloadsCount: "Downloads ({count})",
      mediaDownloads: "Media downloads", download: "Download", loadingMedia: "Loading media",
      hide: "Hide", show: "Show", dismiss: "Dismiss",
      progress: "Download progress", cancel: "Cancel", retry: "Retry",
      preparing: "Preparing", queued: "Queued", downloading: "Downloading",
      saving: "Saving", completed: "Completed", handedOff: "Handed to browser",
      failed: "Failed", cancelled: "Cancelled",
      rate: "{speed}/s", video: "video", audio: "audio", image: "image",
      unknownType: "unknown type",
      errorHttp: "Request failed (HTTP {status})",
      errorMime: "Expected {kind}, got {mime}",
      errorRangeMissing: "Missing or invalid Content-Range",
      errorRangeInconsistent: "Mismatched data; aborted to avoid corruption",
      errorRangeUnsupported: "Server does not support ranged requests",
      errorLength: "Invalid Content-Length", errorEmpty: "Empty response",
      errorTooLarge: "Data exceeds expected size",
      errorIncomplete: "Incomplete data",
      errorTimeout: "No data received within 30 seconds",
      errorUnexpected: "Download failed: {message}",
      selectTitle: "Batch select",
      selectMode: "Select mode", selectAll: "Select all visible",
      clearSelection: "Clear", downloadSelected: "Download selected ({count})",
      batchQueued: "Queued {count} items",
      autoQueue: "Auto-queue video", autoQueueOn: "Auto-queue video ✓",
      autoQueueHint: "Opening a video in viewer will auto-queue it.",
      hintPhoto: "Photos: enable <b>Select mode</b> → click bubble",
      hintVideo: "Videos: enable <b>Auto-queue</b> → open viewer → arrow",
      hintKeys: "Ctrl+Shift+M · A · D",
      lang: "Language",
      topbarQueue: "Add to queue",
      settings: "Settings", settingsTitle: "Download settings",
      naming: "File naming",
      namingOriginal: "Original name", namingDate: "Date-time",
      namingSeq: "Sequence number", namingDateOriginal: "Date + Original",
      namingSeqOriginal: "Sequence + Original",
      prefix: "Prefix (optional)",
      prefixPlaceholder: "e.g. channelname",
      folder: "Destination folder",
      pickFolder: "Pick folder", clearFolder: "Clear",
      folderNone: "Not set (browser Downloads folder)",
      folderUnsupported: "Browser does not support folder picker",
      resetSeq: "Reset sequence",
      seqNow: "Next number: {n}",
      close: "Close",
      clearHistory: "Clear history",
      subfolder: "Auto subfolder",
      subfolderNone: "None (save flat)",
      subfolderDate: "By date (2026-10-24)",
      subfolderChannel: "By channel/chat",
      subfolderDateChannel: "Date / Channel",
      subfolderChannelDate: "Channel / Date",
    },
  };

  const STORAGE_PREFIX = "sakerly:";
  const loadStore = (k, fb) => { try { const v = localStorage.getItem(STORAGE_PREFIX + k); return v == null ? fb : JSON.parse(v); } catch { return fb; } };
  const saveStore = (k, v) => { try { localStorage.setItem(STORAGE_PREFIX + k, JSON.stringify(v)); } catch {} };

  const defaultLang = () => (navigator.language || "en").toLowerCase().startsWith("vi") ? "vi" : "en";
  let currentLang = loadStore("lang", defaultLang());
  if (!LANGS[currentLang]) currentLang = "en";
  const t = (key, params = {}) =>
    (LANGS[currentLang][key] ?? LANGS.en[key] ?? key).replace(
      /\{(\w+)\}/g, (ph, name) => Object.hasOwn(params, name) ? String(params[name]) : ph
    );

  const intFmt = () => new Intl.NumberFormat(currentLang, { maximumFractionDigits: 0 });
  const decFmt = () => new Intl.NumberFormat(currentLang, { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  const downloadError = (key, params = {}, name = "Error") =>
    Object.assign(new Error(t(key, params)), { name, translationKey: key, params });
  const formatError = (err) => {
    if (!err) return "";
    if (!err.translationKey) return t("errorUnexpected", { message: err.message || String(err) });
    const p = { ...err.params };
    if (err.translationKey === "errorMime") { p.kind = t(p.kind); p.mime ||= t("unknownType"); }
    return t(err.translationKey, p);
  };

  const log = {
    info: (m, f = null) => console.log(`[sakerly]${f ? ` ${f}:` : ""} ${m}`),
    error: (m, f = null) => console.error(`[sakerly]${f ? ` ${f}:` : ""} ${m}`),
  };

  // ===== native download button discovery (WebK) ============================
  const WEBK_DL_SELECTOR = [
    "button.quality-download-options-button-menu",
    "button.tgico-download",
    'button[aria-label="Download"]',
    'button[title="Download"]',
  ].join(",");
  const getWebKDlButtons = (c) =>
    Array.from(c.querySelectorAll(WEBK_DL_SELECTOR)).filter(
      (b) => !b.matches(".sakerly-dl, ._sakerly_pinned_dl")
    );
  const isUsableBtn = (b) => {
    if (b.disabled || b.getAttribute("aria-disabled") === "true" ||
        b.hidden || b.classList.contains("hide") || b.closest("[inert]")) return false;
    const s = getComputedStyle(b);
    return s.visibility !== "hidden" && s.visibility !== "collapse" && b.getClientRects().length > 0;
  };

  let webKGlyph = "";
  const dlIconSvg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M5 16v4h14v-4"/></svg>';
  const createWebKDlIcon = (btnIcon = false) =>
    `<span class="tgico sakerly-dl-icon${btnIcon ? " button-icon" : ""}" aria-hidden="true">${webKGlyph || dlIconSvg}</span>`;
  const refreshWebKGlyph = () => {
    for (const b of getWebKDlButtons(document)) {
      const g = b.querySelector(":scope > .tgico")?.textContent.trim();
      if (!g || !/^[\uE000-\uF8FF]$/.test(g)) continue;
      if (g !== webKGlyph) {
        webKGlyph = g;
        document.querySelectorAll(".sakerly-dl-icon").forEach((i) => (i.textContent = g));
      }
      return;
    }
  };

  // ===== range-fetch download engine ========================================
  const CONTENT_RANGE_RE = /^bytes (\d+)-(\d+)\/(\d+)$/;
  const REFRESH_DELAY = 2000;
  const CHUNK_SIZE = 4 * 1024 * 1024;

  const fetchMediaPart = async (url, offset, total, kind, opts = {}) => {
    const controller = new AbortController();
    const abort = () => controller.abort(opts.signal?.reason);
    let timer, reader;
    const resetTimeout = () => {
      clearTimeout(timer);
      timer = setTimeout(() => controller.abort(downloadError("errorTimeout", {}, "TimeoutError")), 30000);
    };
    const checkAbort = () => { if (controller.signal.aborted) throw controller.signal.reason; };
    if (opts.signal?.aborted) abort();
    opts.signal?.addEventListener("abort", abort, { once: true });
    resetTimeout();
    try {
      checkAbort();
      const res = await fetch(url, {
        headers: { Range: `bytes=${offset}-${offset + CHUNK_SIZE - 1}` },
        signal: controller.signal,
      });
      if (res.status !== 200 && res.status !== 206) throw downloadError("errorHttp", { status: res.status });
      const mime = res.headers.get("Content-Type")?.split(";")[0].trim().toLowerCase();
      if (!mime?.startsWith(`${kind}/`)) throw downloadError("errorMime", { kind, mime });

      let expected, totalSize;
      if (res.status === 206) {
        const m = res.headers.get("Content-Range")?.match(CONTENT_RANGE_RE);
        if (!m) throw downloadError("errorRangeMissing");
        const [start, end, size] = m.slice(1).map(Number);
        if (![start, end, size].every(Number.isSafeInteger) || start !== offset ||
            end < start || size <= end || (total !== null && total !== size))
          throw downloadError("errorRangeInconsistent");
        expected = end - start + 1;
        totalSize = size;
      } else {
        if (offset !== 0) throw downloadError("errorRangeUnsupported");
        const len = res.headers.get("Content-Length");
        if (len !== null && !res.headers.has("Content-Encoding")) {
          if (!/^\d+$/.test(len) || !Number.isSafeInteger(Number(len))) throw downloadError("errorLength");
          expected = Number(len); totalSize = expected;
        }
      }
      if (!res.body) throw downloadError("errorEmpty");
      reader = res.body.getReader();
      controller.signal.addEventListener("abort", () => reader.cancel().catch(() => {}), { once: true });

      const chunks = [];
      let received = 0;
      opts.onProgress?.(offset, totalSize ?? null);
      while (true) {
        checkAbort();
        const { value, done } = await reader.read();
        checkAbort();
        if (done) break;
        received += value.byteLength;
        if (expected !== undefined && received > expected) throw downloadError("errorTooLarge");
        clearTimeout(timer);
        if (opts.write) await opts.write(value);
        else chunks.push(value);
        checkAbort();
        resetTimeout();
        opts.onProgress?.(offset + received, totalSize ?? null);
      }
      if (!received || (expected !== undefined && received !== expected))
        throw downloadError("errorIncomplete");
      return {
        blob: opts.write ? null : new Blob(chunks, { type: mime }),
        mime, totalSize: totalSize ?? received, nextOffset: offset + received,
      };
    } catch (e) {
      controller.abort(e);
      throw controller.signal.reason || e;
    } finally {
      clearTimeout(timer);
      opts.signal?.removeEventListener("abort", abort);
      if (reader) { await reader.cancel().catch(() => {}); reader.releaseLock(); }
    }
  };

  const hashCode = (s) => {
    let h = 0, l = s.length, i = 0;
    while (i < l) h = ((h << 5) - h + s.charCodeAt(i++)) | 0;
    return h >>> 0;
  };
  const getMediaMetadata = (url) => {
    try { return JSON.parse(decodeURIComponent(url.split("/").pop())); } catch { return {}; }
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
  const getDownloadFileName = (url, mime, kind) => {
    const meta = getMediaMetadata(url);
    let name = typeof meta?.fileName === "string" ? meta.fileName : "";
    if (!name) {
      try {
        const base = decodeURIComponent(new URL(url, location.href).pathname.split("/").pop());
        if (/\.[a-z0-9]{2,5}$/i.test(base)) name = base;
      } catch {}
    }
    name = (name || hashCode(url).toString(36)).replace(/[\x00-\x1f\x7f<>:"/\\|?*]/g, "_");
    const allowed = EXT_MAP[mime?.toLowerCase()] ||
      (mime ? null : (kind === "video" ? ["mp4"] : kind === "audio" ? ["ogg"] : ["jpg"]));
    const dot = name.lastIndexOf(".");
    if (!allowed) return dot > 0 ? name : name + ".bin";
    if (dot > 0 && allowed.includes(name.slice(dot + 1).toLowerCase())) return name;
    return (dot > 0 ? name.slice(0, dot) : name) + "." + allowed[0];
  };
  // chrome rate-limits anchor-click downloads at ~10 concurrent; serialize + 400ms gap so a 59-file batch
  // doesn't trip "This site is trying to download multiple files" throttle and drop items silently.
  let saveChain = Promise.resolve();
  const saveMediaBlob = (blob, fileName) => {
    const run = () => new Promise((res) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = fileName;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => { URL.revokeObjectURL(url); res(); }, 400);
    });
    saveChain = saveChain.then(run, run);
    return saveChain;
  };

  // ===== settings: file naming + destination folder =========================
  const DEFAULT_SETTINGS = { naming: "original", prefix: "", subfolder: "none" };
  let settings = Object.assign({}, DEFAULT_SETTINGS, loadStore("settings", {}));
  let seqCounter = loadStore("seq", 1);

  const openIDB = () => new Promise((res, rej) => {
    const r = indexedDB.open("sakerly", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("kv");
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  const idbGet = async (k) => {
    try { const db = await openIDB();
      return await new Promise((res) => {
        const tx = db.transaction("kv").objectStore("kv").get(k);
        tx.onsuccess = () => res(tx.result); tx.onerror = () => res(null);
      });
    } catch { return null; }
  };
  const idbSet = async (k, v) => {
    try { const db = await openIDB();
      await new Promise((res) => {
        const tx = db.transaction("kv", "readwrite").objectStore("kv").put(v, k);
        tx.onsuccess = () => res(); tx.onerror = () => res();
      });
    } catch {}
  };
  const idbDel = async (k) => {
    try { const db = await openIDB();
      await new Promise((res) => {
        const tx = db.transaction("kv", "readwrite").objectStore("kv").delete(k);
        tx.onsuccess = () => res(); tx.onerror = () => res();
      });
    } catch {}
  };

  let destDirHandle = null;
  let destDirName = loadStore("destDirName", "");
  // handle restored lazily; needs user gesture to re-request permission on first write.
  idbGet("destDirHandle").then((h) => { if (h) destDirHandle = h; });

  const ensureDirPermission = async (handle) => {
    if (!handle) return false;
    const opts = { mode: "readwrite" };
    if ((await handle.queryPermission?.(opts)) === "granted") return true;
    try { return (await handle.requestPermission?.(opts)) === "granted"; }
    catch { return false; }
  };

  const pad2 = (n) => String(n).padStart(2, "0");
  const pad3 = (n) => String(n).padStart(3, "0");
  const nowStamp = () => {
    const d = new Date();
    return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}-${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`;
  };
  // peer/channel title from the open chat header. tweb puts it in `.chat .user-title` (with .peer-title inside);
  // falls back to document.title stripped of the "Telegram" suffix if the DOM selector misses.
  const sanitizeSegment = (s) => (s || "").replace(/[\x00-\x1f\x7f<>:"/\\|?*]/g, "_").trim().slice(0, 80);
  const todaySegment = () => {
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  };
  const currentChannelName = () => {
    const el = document.querySelector(".chat .user-title, .chat-info .user-title, .chat-utils ~ * .user-title");
    const direct = el?.querySelector(".peer-title")?.textContent || el?.textContent;
    if (direct && direct.trim()) return sanitizeSegment(direct);
    const t = (document.title || "").replace(/\s*[-·]?\s*Telegram\s*$/i, "").trim();
    return sanitizeSegment(t) || "Unknown";
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
  // walk/create the chain of subfolders under the user-picked root; each segment opens with { create: true }
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

  const applyNaming = (originalName) => {
    const dot = originalName.lastIndexOf(".");
    const base = dot > 0 ? originalName.slice(0, dot) : originalName;
    const ext = dot > 0 ? originalName.slice(dot) : "";
    const prefix = settings.prefix ? settings.prefix.replace(/[\x00-\x1f\x7f<>:"/\\|?*]/g, "_") + "_" : "";
    let out;
    switch (settings.naming) {
      case "date": out = prefix + nowStamp() + ext; break;
      case "seq": out = prefix + pad3(seqCounter++) + ext; saveStore("seq", seqCounter); break;
      case "date_original": out = prefix + nowStamp() + "_" + base + ext; break;
      case "seq_original": out = prefix + pad3(seqCounter++) + "_" + base + ext; saveStore("seq", seqCounter); break;
      default: out = prefix + base + ext;
    }
    return out;
  };

  // ===== task queue + concurrency ===========================================
  const downloadTasks = new Map();
  const activeDownloads = new Map();
  const downloadQueue = [];
  const MAX_CONCURRENT = 2;
  let runningCount = 0;

  const formatBytes = (bytes) => {
    const u = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.min(Math.floor(Math.log(Math.max(bytes, 1)) / Math.log(1024)), u.length - 1);
    return `${(i ? decFmt() : intFmt()).format(bytes / 1024 ** i)} ${u[i]}`;
  };

  const updatePanel = () => {
    const panel = document.getElementById("sakerly-panel");
    if (!panel) return;
    const hasTasks = !!panel.querySelector(".sakerly-task");
    panel.classList.toggle("empty", !hasTasks);
    panel.querySelector(".sakerly-panel-title").textContent = activeDownloads.size
      ? t("downloadsCount", { count: intFmt().format(activeDownloads.size) })
      : t("downloads");
  };
  const dismissTask = (task) => {
    document.getElementById("sakerly-task-" + task.id)?.remove();
    if (task.finished) downloadTasks.delete(task.id);
    updatePanel();
  };
  const showTask = (task) => {
    const panel = document.getElementById("sakerly-panel");
    const list = panel.querySelector(".sakerly-task-list");
    panel.classList.remove("collapsed");
    const toggle = panel.querySelector(".sakerly-panel-toggle");
    toggle.textContent = "–"; toggle.title = t("hide");
    let card = document.getElementById("sakerly-task-" + task.id);
    if (!card) {
      card = document.createElement("div");
      card.id = "sakerly-task-" + task.id;
      card.className = "sakerly-task";
      card.innerHTML = `
        <div class="sakerly-task-head">
          <p class="filename" dir="auto"></p>
          <button type="button" data-act="dismiss" title="×">&times;</button>
        </div>
        <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100">
          <div class="progress-fill"></div>
          <p class="progress-label"></p>
        </div>
        <p class="sakerly-task-details"></p>
        <p class="sakerly-task-error"></p>
        <div class="sakerly-task-actions">
          <button type="button" data-act="cancel"></button>
          <button type="button" data-act="retry" hidden></button>
        </div>`;
      card.querySelector('[data-act="dismiss"]').onclick = () => dismissTask(task);
      card.querySelector('[data-act="cancel"]').onclick = () => {
        if (task.finished || task.state === "saving") return;
        task.controller.abort(new DOMException("Download cancelled", "AbortError"));
        if (!task.running) finishTask(task, "cancelled");
      };
      card.querySelector('[data-act="retry"]').onclick = () => {
        dismissTask(task);
        downloadMedia(task.url, task.kind);
      };
      list.prepend(card);
    }
    renderTask(task);
    return card;
  };
  const renderTask = (task) => {
    const card = document.getElementById("sakerly-task-" + task.id);
    if (!card) return;
    card.dataset.state = task.state;
    const label = t(task.state);
    const title = card.querySelector(".filename");
    title.textContent = task.fileName; title.title = task.fileName;
    const progress = card.querySelector(".progress");
    progress.setAttribute("aria-label", t("progress"));
    const pct = task.total ? Math.min(100, Math.floor(task.received * 100 / task.total)) : null;
    progress.classList.toggle("indeterminate", task.state === "downloading" && pct === null);
    if (pct === null) progress.removeAttribute("aria-valuenow");
    else progress.setAttribute("aria-valuenow", pct);
    progress.querySelector(".progress-fill").style.width = (pct ?? 0) + "%";
    progress.querySelector(".progress-label").textContent =
      task.state === "downloading" && pct !== null ? `${intFmt().format(pct)}%` : label;
    const speed = task.received / Math.max((performance.now() - task.startedAt) / 1000, 0.1);
    card.querySelector(".sakerly-task-details").textContent =
      formatBytes(task.received) + (task.total !== null ? ` / ${formatBytes(task.total)}` : "") +
      (task.state === "downloading" && task.received ? ` · ${t("rate", { speed: formatBytes(speed) })}` : "");
    const err = card.querySelector(".sakerly-task-error");
    err.textContent = formatError(task.error); err.hidden = !task.error;
    const cancel = card.querySelector('[data-act="cancel"]');
    cancel.textContent = t("cancel"); cancel.hidden = task.finished;
    cancel.disabled = task.state === "saving";
    const retry = card.querySelector('[data-act="retry"]');
    retry.textContent = t("retry");
    retry.hidden = !["failed", "cancelled"].includes(task.state);
    task.renderedAt = performance.now();
    task.renderedBytes = task.received;
    updatePanel();
  };
  const finishTask = (task, state, error) => {
    if (task.finished) return;
    task.finished = true;
    clearTimeout(task.progressTimer);
    task.state = state; task.error = error;
    if (activeDownloads.get(task.key) === task) activeDownloads.delete(task.key);
    if (error) log.error(error.message || error, task.fileName);
    renderTask(task);
    updatePanel();
    task.resolve({ state, fileName: task.fileName, received: task.received });
  };
  const runTask = async (task) => {
    const parts = [];
    let writable;
    const checkCancelled = () => {
      if (task.controller.signal.aborted) throw task.controller.signal.reason;
    };
    try {
      checkCancelled();
      task.state = "preparing"; renderTask(task);
      if (task.handle) writable = await task.handle.createWritable();
      checkCancelled();
      task.state = "downloading";
      task.startedAt = performance.now();
      renderTask(task);
      let offset = 0, total = null, mime;
      do {
        const part = await fetchMediaPart(task.url, offset, total, task.kind, {
          signal: task.controller.signal,
          write: writable ? (c) => writable.write(c) : undefined,
          onProgress: (received, size) => {
            task.received = received; task.total = size;
            if ((!task.renderedBytes && received) ||
                performance.now() - task.renderedAt >= 100 || received === size) {
              renderTask(task);
            } else if (!task.progressTimer) {
              task.progressTimer = setTimeout(() => {
                task.progressTimer = null; renderTask(task);
              }, 100);
            }
          },
        });
        checkCancelled();
        if (!writable) parts.push(part.blob);
        offset = part.nextOffset; total = part.totalSize; mime = part.mime;
        task.fileName = getDownloadFileName(task.url, mime, task.kind);
        task.received = offset; task.total = total; renderTask(task);
      } while (offset < total);
      checkCancelled();
      task.state = "saving"; renderTask(task);
      // original name (from TG metadata/url) decided above; apply user naming format for the final file
      task.fileName = applyNaming(task.fileName);
      renderTask(task);
      if (writable) await writable.close();
      else {
        const targetDir = await resolveDestDir();
        if (targetDir) {
          const fh = await targetDir.getFileHandle(task.fileName, { create: true });
          const w = await fh.createWritable();
          await w.write(new Blob(parts, { type: mime }));
          await w.close();
        } else await saveMediaBlob(new Blob(parts, { type: mime }), task.fileName);
      }
      finishTask(task, writable ? "completed" : "handedOff");
    } catch (error) {
      if (writable) { try { await writable.abort(); } catch {} }
      if (task.controller.signal.aborted || error?.name === "AbortError") finishTask(task, "cancelled");
      else finishTask(task, "failed", error);
    } finally {
      parts.length = 0;
      task.handle = null;
    }
  };
  const pumpQueue = () => {
    while (runningCount < MAX_CONCURRENT && downloadQueue.length) {
      const task = downloadQueue.shift();
      if (task.finished) continue;
      runningCount++;
      task.running = true;
      runTask(task).finally(() => {
        task.running = false;
        runningCount--;
        pumpQueue();
      });
    }
  };
  const downloadMedia = (url, kind, opts = {}) => {
    if (typeof url !== "string" || !url) return Promise.resolve();
    const key = `${kind}:${url}`;
    const existing = activeDownloads.get(key);
    if (existing) {
      if (!opts.silent) {
        const card = showTask(existing);
        card.scrollIntoView({ block: "nearest" });
      }
      return existing.promise;
    }
    if (downloadTasks.size >= 20) {
      for (const prev of downloadTasks.values()) {
        if (downloadTasks.size < 20) break;
        if (prev.finished) dismissTask(prev);
      }
    }
    const task = {
      id: Math.random().toString(36).slice(2) + Date.now().toString(36),
      key, url, kind,
      fileName: getDownloadFileName(url, getMediaMetadata(url)?.mimeType, kind),
      state: "preparing", received: 0, total: null,
      controller: new AbortController(),
      startedAt: performance.now(), renderedAt: 0, finished: false,
    };
    task.promise = new Promise((r) => (task.resolve = r));
    downloadTasks.set(task.id, task);
    activeDownloads.set(key, task);
    showTask(task);
    const enqueue = (handle) => {
      if (task.finished) return;
      task.handle = handle;
      task.state = "queued";
      renderTask(task);
      downloadQueue.push(task);
      pumpQueue();
    };
    try {
      const pw = typeof unsafeWindow === "undefined" ? window : unsafeWindow;
      // skip the save-file dialog when a destination folder is already set — write straight into it
      if (!opts.batch && !destDirHandle && kind !== "image" &&
          typeof pw.showSaveFilePicker === "function" && pw.self === pw.top) {
        Promise.resolve(pw.showSaveFilePicker({ suggestedName: task.fileName }))
          .then(enqueue, (e) => {
            if (e.name === "AbortError") finishTask(task, "cancelled");
            else finishTask(task, "failed", e);
          });
      } else enqueue(null);
    } catch (e) { finishTask(task, "failed", e); }
    return task.promise;
  };

  // ===== media source accessors =============================================
  const getMediaSource = (m) =>
    m?.getAttribute?.("src") ? m.src : m?.currentSrc || m?.querySelector?.("source")?.src;

  const getPinnedMedia = () => {
    const pinned = document.querySelector(".pinned-audio");
    const mid = pinned?.getAttribute("data-mid");
    if (!mid) return null;
    const peer = pinned.getAttribute("data-peer-id");
    const cands = Array.from(document.querySelectorAll("audio-element")).filter(
      (el) => el.closest(".bubble") && el.getAttribute("data-mid") === mid &&
        (!peer || el.closest("[data-peer-id]")?.getAttribute("data-peer-id") === peer)
    );
    const el = cands.length === 1 ? cands[0] : cands.find((c) => c.audio && !c.audio.paused);
    const url = getMediaSource(el?.audio);
    return url ? { url, kind: el.audio.tagName === "AUDIO" ? "audio" : "video" } : null;
  };

  // when the viewer DOM contains ANY video context (video element, player chrome, or video progress bar)
  // we must not fall back to the poster <img.thumbnail>: that's the preview, not the real video src.
  // return null until the <video>'s src attaches on real playback — the observer will re-poll.
  const VIDEO_CONTEXT_SELECTOR = "video, .ckin__player, .media-viewer-video-progress, [class*='video-time']";
  const resolveViewerWebKMedia = () => {
    const viewer = document.querySelector(".media-viewer-whole");
    if (!viewer) return null;
    const media = viewer.querySelector(".media-viewer-movers .media-viewer-aspecter");
    if (!media) return null;
    const videoEl = media.querySelector("video");
    const videoUrl = getMediaSource(videoEl);
    if (videoUrl) return { url: videoUrl, kind: "video" };
    if (videoEl || media.querySelector(VIDEO_CONTEXT_SELECTOR)) return null;
    const imgUrl = getMediaSource(media.querySelector("img.thumbnail"));
    if (imgUrl) return { url: imgUrl, kind: "image" };
    return null;
  };

  const downloadCurrentWebKMedia = () => {
    const viewer = document.querySelector(".media-viewer-whole");
    if (!viewer) return;
    const buttons = viewer.querySelector(".media-viewer-topbar .media-viewer-buttons");
    const native = buttons && getWebKDlButtons(buttons).find(
      (b) => isUsableBtn(b) && !b.matches(
        '.quality-download-options-button-menu, .btn-menu-toggle, [aria-haspopup="menu"], [aria-haspopup="true"]'
      )
    );
    if (native) { native.click(); return; }
    const r = resolveViewerWebKMedia();
    if (r) downloadMedia(r.url, r.kind);
  };

  const queuedViewerUrls = new Set();

  // next-slide button in WebK viewer — grouped album carousel + regular media switcher.
  // click goes through TG's own listener (trusted click on real element), so synthetic key dispatch is not needed.
  const WEBK_NEXT_SELECTORS = [
    ".media-viewer-switcher.media-viewer-switcher-next",
    ".media-viewer-switcher-next",
  ].join(",");
  let autoAdvanceRunning = false;
  const autoAdvanceViewer = () => {
    if (autoAdvanceRunning) return;
    const viewer = document.querySelector(".media-viewer-whole");
    if (!viewer) return;
    const next = viewer.querySelector(WEBK_NEXT_SELECTORS);
    if (!next || next.classList.contains("hide") || next.disabled || !isUsableBtn(next)) return;
    autoAdvanceRunning = true;
    try { next.click(); } catch {}
    setTimeout(() => { autoAdvanceRunning = false; }, 350);
  };

  const queueCurrentWebKMedia = () => {
    const r = resolveViewerWebKMedia();
    if (!r) return;
    if (queuedViewerUrls.has(r.url)) return;
    queuedViewerUrls.add(r.url);
    downloadMedia(r.url, r.kind, { batch: true, silent: true });
    log.info(`queued: ${r.kind}`);
  };

  // ===== WebA (web.telegram.org/a/) =========================================
  const getWebADlButtons = (c) =>
    Array.from(c.querySelectorAll("button")).filter(
      (b) => !b.classList.contains("sakerly-dl") &&
        (b.querySelector(".icon-download") || b.title === "Download" ||
          b.getAttribute("aria-label") === "Download") && isUsableBtn(b)
    );
  const downloadCurrentWebAMedia = () => {
    const media = document.querySelector("#MediaViewer .MediaViewerSlide--active");
    const vUrl = getMediaSource(media?.querySelector(".VideoPlayer video"));
    const iUrl = getMediaSource(media?.querySelector(".MediaViewerContent > div > img"));
    if (vUrl) downloadMedia(vUrl, "video");
    else if (iUrl) downloadMedia(iUrl, "image");
  };

  // ===== bubble resolution for batch select =================================
  const BUBBLE_SELECTORS = [".bubble", ".Message", "[data-mid]"].join(",");
  const ALBUM_ITEM_SELECTOR = [
    ".grouped-item", ".album-item", "[class*='Album'] [class*='media']",
    ".media-container", ".Message__media-item",
  ].join(",");
  const VIDEO_HINT_SELECTOR = [
    "[class*='play']", "[class*='Play']",
    "[class*='duration']", "[class*='Duration']",
  ].join(",");

  const findBubble = (node) => {
    let n = node;
    while (n && n !== document.body) {
      if (n.matches && n.matches(BUBBLE_SELECTORS)) return n;
      n = n.parentElement;
    }
    return null;
  };
  // tweb (web.telegram.org/k/): photo/video posts wrap in `.bubble .attachment`; album pieces are `.album-item` under it.
  // Everything OUTSIDE .attachment — reply quotes (.reply/.reply-content), link previews (.webpage/.webpage-preview),
  // avatars (.bubbles-group-avatar/.user-avatar/.bubble-name-forwarded-avatar), stickers (.bubble.sticker),
  // video-round (.bubble.round), emoji-big, service bubbles — never selects.
  // webz fallback: `.Message__media-item`.
  const ATTACHMENT_CONTAINER = ".bubble .attachment, .Message__media-item";
  const EXCLUDED_SCOPES = ".reply, .reply-content, .reply-summary, .reply-wrapper, .reply-media, .webpage, .webpage-preview, .webpage-with-thumb, .webpage-thumb, .bubbles-group-avatar, .bubbles-group-avatar-container, .user-avatar, .bubble-name-forwarded-avatar, avatar-element, .avatar, .service-msg, .bubble-service-media, .sticker-wrapper, [class*='Sticker'], .custom-emoji, [class*='CustomEmoji'], .emoji, .reactions, .reactions-like-block, .reaction, [class*='Reaction'], .peer-title, .bubble-name-chip-container, [class*='Avatar']";
  const EXCLUDED_BUBBLE_CLASSES = ".bubble.service, .bubble.has-fake-service, .bubble.sticker, .bubble.round, .bubble.emoji-big, .bubble.is-invoice";
  const isRealAttachment = (el) => {
    if (!el) return false;
    if (el.closest(EXCLUDED_SCOPES)) return false;
    return !!el.closest(ATTACHMENT_CONTAINER);
  };
  const bubbleHasMedia = (b) => {
    if (b.matches(EXCLUDED_BUBBLE_CLASSES)) return false;
    const atts = b.querySelectorAll(ATTACHMENT_CONTAINER);
    for (const a of atts) if (!a.closest(EXCLUDED_SCOPES)) return true;
    return false;
  };
  const allBubbles = () =>
    Array.from(document.querySelectorAll(BUBBLE_SELECTORS)).filter(bubbleHasMedia);

  const looksLikeUnopenedVideo = (scope) =>
    !scope.querySelector("video") && !!scope.querySelector(VIDEO_HINT_SELECTOR);

  const resolveMediaElement = (el) => {
    if (!isRealAttachment(el)) return null;
    if (el.tagName === "VIDEO") { const u = getMediaSource(el); return u ? { url: u, kind: "video", el } : null; }
    if (el.tagName === "AUDIO") { const u = getMediaSource(el); return u ? { url: u, kind: "audio", el } : null; }
    if (el.tagName === "IMG" && el.naturalWidth > 160) {
      const u = getMediaSource(el);
      return u ? { url: u, kind: "image", el } : null;
    }
    return null;
  };

  const resolveBubbleMediaAll = (bubble) => {
    const results = [], seen = new Set();
    let skippedVideos = 0;
    const push = (item) => { if (!item || seen.has(item.url)) return; seen.add(item.url); results.push(item); };
    const attachments = Array.from(bubble.querySelectorAll(ATTACHMENT_CONTAINER))
      .filter((s) => !s.closest(EXCLUDED_SCOPES));
    if (!attachments.length) return { results, skippedVideos };
    // tweb album wraps each piece in `.album-item` (its media child is `.album-item-media`);
    // single photo/video posts have no album-item, so the whole .attachment is the scope.
    const scopes = [];
    for (const att of attachments) {
      const subs = att.querySelectorAll(".album-item");
      if (subs.length) subs.forEach((s) => scopes.push(s));
      else scopes.push(att);
    }
    for (const scope of scopes) {
      const video = scope.querySelector("video");
      if (video) { push(resolveMediaElement(video)); continue; }
      const audio = scope.querySelector("audio");
      if (audio) { push(resolveMediaElement(audio)); continue; }
      if (looksLikeUnopenedVideo(scope)) { skippedVideos++; continue; }
      const img = Array.from(scope.querySelectorAll("img.media-photo, img.thumbnail, img"))
        .filter((i) => i.naturalWidth > 200 && !i.closest(EXCLUDED_SCOPES))
        .sort((a, b) => b.naturalWidth * b.naturalHeight - a.naturalWidth * a.naturalHeight)[0];
      if (img) push(resolveMediaElement(img));
    }
    return { results, skippedVideos };
  };

  // ===== multi-select state =================================================
  const selectedBubbles = new Set();
  const selectedItems = new Map();
  let selectMode = false;
  let autoQueueMode = loadStore("autoQueue", false);
  let lastClickedBubble = null;
  const seenAutoQueueUrls = new Set();

  const describeItem = (item) => {
    const label = item.kind === "video" ? "Video" : item.kind === "audio"
      ? (currentLang === "vi" ? "Âm thanh" : "Audio")
      : (currentLang === "vi" ? "Ảnh" : "Image");
    let name = "";
    try { name = decodeURIComponent(new URL(item.url, location.href).pathname.split("/").pop() || ""); } catch {}
    return name ? `${label} — ${name}` : label;
  };

  const totalSelectedItems = () => {
    let n = 0;
    for (const items of selectedItems.values()) n += items.length;
    return n;
  };

  // paint a per-photo tick overlay anchored to the photo's own container (album-item-media or the img itself).
  // overlay element lives in the item's own node so a 4-photo album shows 4 ticks, not 1 on the bubble.
  const paintTick = (item) => {
    const anchor = item.el?.closest(".album-item-media, .album-item, .attachment, .Message__media-item") || item.el?.parentElement;
    if (!anchor) return;
    if (getComputedStyle(anchor).position === "static") anchor.style.position = "relative";
    anchor.classList.add("sakerly-sel-item");
    if (!anchor.querySelector(":scope > .sakerly-tick")) {
      const tick = document.createElement("div");
      tick.className = "sakerly-tick";
      anchor.appendChild(tick);
    }
    item._tickAnchor = anchor;
  };
  const removeTick = (item) => {
    const anchor = item._tickAnchor;
    if (!anchor) return;
    anchor.classList.remove("sakerly-sel-item");
    anchor.querySelector(":scope > .sakerly-tick")?.remove();
    item._tickAnchor = null;
  };

  const markSelected = (bubble, on) => {
    if (!on) {
      bubble.classList.remove("sakerly-sel");
      const prev = selectedItems.get(bubble);
      if (prev) prev.forEach(removeTick);
      selectedBubbles.delete(bubble);
      selectedItems.delete(bubble);
      updateSelectBar();
      return;
    }
    const { results, skippedVideos } = resolveBubbleMediaAll(bubble);
    const imagesOnly = results.filter((r) => r.kind === "image");
    if (!imagesOnly.length) {
      if (skippedVideos || results.length) log.info("skipped video — use Auto-queue in viewer");
      return;
    }
    bubble.classList.add("sakerly-sel");
    selectedBubbles.add(bubble);
    selectedItems.set(bubble, imagesOnly);
    imagesOnly.forEach(paintTick);
    updateSelectBar();
  };
  const clearSelection = () => {
    for (const b of selectedBubbles) {
      b.classList.remove("sakerly-sel");
      selectedItems.get(b)?.forEach(removeTick);
    }
    selectedBubbles.clear();
    selectedItems.clear();
    updateSelectBar();
  };
  const rangeSelect = (from, to) => {
    const list = allBubbles();
    const i1 = list.indexOf(from), i2 = list.indexOf(to);
    if (i1 < 0 || i2 < 0) return;
    const [a, b] = i1 < i2 ? [i1, i2] : [i2, i1];
    for (let i = a; i <= b; i++) markSelected(list[i], true);
  };

  // ===== draggable panels ===================================================
  const makeDraggable = (panel, handle, storageKey) => {
    const apply = () => {
      try {
        const pos = loadStore(storageKey, null);
        if (!pos || typeof pos.left !== "number" || typeof pos.top !== "number") return;
        const maxL = window.innerWidth - panel.offsetWidth - 4;
        const maxT = window.innerHeight - panel.offsetHeight - 4;
        panel.style.left = Math.max(4, Math.min(pos.left, maxL)) + "px";
        panel.style.top = Math.max(4, Math.min(pos.top, maxT)) + "px";
        panel.style.right = "auto";
        panel.style.bottom = "auto";
      } catch {}
    };
    requestAnimationFrame(apply);
    let dragging = false, sx = 0, sy = 0, sl = 0, st = 0;
    handle.style.cursor = "move";
    handle.style.touchAction = "none";
    handle.addEventListener("pointerdown", (e) => {
      if (e.target.closest("button, select, input, a")) return;
      dragging = true;
      handle.setPointerCapture(e.pointerId);
      const r = panel.getBoundingClientRect();
      sl = r.left; st = r.top; sx = e.clientX; sy = e.clientY;
      panel.style.left = sl + "px"; panel.style.top = st + "px";
      panel.style.right = "auto"; panel.style.bottom = "auto";
    });
    handle.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const l = sl + (e.clientX - sx), tp = st + (e.clientY - sy);
      const maxL = window.innerWidth - panel.offsetWidth - 4;
      const maxT = window.innerHeight - panel.offsetHeight - 4;
      panel.style.left = Math.max(4, Math.min(l, maxL)) + "px";
      panel.style.top = Math.max(4, Math.min(tp, maxT)) + "px";
    });
    const end = (e) => {
      if (!dragging) return;
      dragging = false;
      try { handle.releasePointerCapture(e.pointerId); } catch {}
      saveStore(storageKey, { left: parseFloat(panel.style.left), top: parseFloat(panel.style.top) });
    };
    handle.addEventListener("pointerup", end);
    handle.addEventListener("pointercancel", end);
  };

  // ===== UI build ===========================================================
  const style = document.createElement("style");
  style.textContent = `
    :root {
      --sk-bg: #ffffff; --sk-bg-head: #f6f9fc; --sk-fg: #0b1620;
      --sk-muted: #475668; --sk-line: #d9e2ec;
      --sk-track: #e3eaf2; --sk-track-hover: #d1dde8;
      --sk-accent: #0b84ff; --sk-accent-fg: #ffffff; --sk-accent-soft: #e4f0ff;
      --sk-ok: #10b981; --sk-err: #ef4444; --sk-radius: 14px;
      --sk-shadow: 0 12px 40px rgba(10,20,40,.22), 0 2px 6px rgba(10,20,40,.08);
    }
    html.night, html.theme-dark {
      --sk-bg: #1f2a37; --sk-bg-head: #273341; --sk-fg: #ffffff;
      --sk-muted: #c5d1dd; --sk-line: #3a4a5c;
      --sk-track: #334257; --sk-track-hover: #425269;
      --sk-accent: #4aa5ff; --sk-accent-fg: #06111c; --sk-accent-soft: #1b3652;
      --sk-shadow: 0 12px 40px rgba(0,0,0,.6), 0 2px 6px rgba(0,0,0,.4);
    }
    /* soft outline on the whole bubble just as a container hint */
    .sakerly-sel {
      outline: 2px dashed var(--sk-ok) !important; outline-offset: 2px;
      border-radius: 8px;
    }
    /* per-media tick: dropped on each selected photo element (album item or single photo) */
    .sakerly-sel-item {
      position: relative; z-index: 2147483000;
      outline: 4px solid var(--sk-ok) !important; outline-offset: -4px;
      box-shadow: 0 0 0 4px rgba(34,197,94,.3), 0 0 20px 2px rgba(34,197,94,.55) !important;
      border-radius: 6px;
    }
    .sakerly-tick {
      position: absolute; top: 6px; left: 6px; z-index: 2147483001;
      width: 28px; height: 28px; border-radius: 50%;
      background: var(--sk-ok); color: #04150a;
      font: 900 16px/28px system-ui; text-align: center;
      box-shadow: 0 2px 10px rgba(0,0,0,.5),
                  inset 0 1px 0 rgba(255,255,255,.4);
      pointer-events: none; user-select: none;
    }
    .sakerly-tick::before { content: "✓"; }

    #sakerly-panel, #sakerly-select-bar {
      box-sizing: border-box; position: fixed; z-index: 2147483646;
      background: var(--sk-bg); color: var(--sk-fg);
      border: 1px solid var(--sk-line); border-radius: var(--sk-radius);
      box-shadow: var(--sk-shadow); font: 13px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
      display: flex; flex-direction: column; overflow: hidden;
    }
    #sakerly-panel * , #sakerly-select-bar * { box-sizing: border-box; }
    #sakerly-panel [hidden], #sakerly-select-bar [hidden] { display: none !important; }

    #sakerly-panel {
      right: max(16px, env(safe-area-inset-right));
      bottom: max(16px, env(safe-area-inset-bottom));
      width: min(360px, calc(100vw - 32px)); max-height: calc(100vh - 32px);
    }
    #sakerly-panel.empty { display: none; }
    #sakerly-panel.collapsed .sakerly-task-list,
    #sakerly-panel.collapsed .sakerly-panel-foot { display: none; }

    #sakerly-select-bar {
      right: max(16px, env(safe-area-inset-right));
      top: max(16px, env(safe-area-inset-top));
      width: min(320px, calc(100vw - 32px)); max-height: 70vh;
    }
    #sakerly-select-bar.collapsed { width: auto; }
    #sakerly-select-bar.collapsed .sakerly-select-body { display: none; }

    .sakerly-head {
      display: flex; align-items: center; gap: 10px;
      padding: 12px 14px; flex-shrink: 0;
      background: var(--sk-bg-head);
      border-bottom: 1px solid var(--sk-line);
    }
    .sakerly-head .sakerly-title {
      flex: 1; min-width: 0; font-weight: 700; font-size: 13.5px;
      color: var(--sk-fg);
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      display: flex; align-items: center; gap: 8px;
    }
    .sakerly-title .sakerly-logo {
      width: 24px; height: 24px; flex-shrink: 0;
      display: inline-flex; align-items: center; justify-content: center;
      background: linear-gradient(135deg, #37aee2, #1e96c8);
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(55,174,226,.4);
    }
    .sakerly-title .sakerly-logo svg { width: 14px; height: 14px; display: block; }
    .sakerly-head .sakerly-count {
      background: var(--sk-accent-soft); color: var(--sk-accent);
      border-radius: 10px; padding: 3px 10px;
      font-weight: 700; font-size: 11.5px;
      font-variant-numeric: tabular-nums;
    }
    .sakerly-icon-btn {
      appearance: none; background: var(--sk-track); color: var(--sk-fg);
      border: 0; width: 30px; height: 30px; padding: 0;
      border-radius: 50%; font: 700 17px/1 system-ui; cursor: pointer;
      display: inline-flex; align-items: center; justify-content: center;
      transition: background .15s, color .15s;
    }
    .sakerly-icon-btn:hover { background: var(--sk-accent); color: var(--sk-accent-fg); }

    #sakerly-panel .sakerly-task-list {
      min-height: 0; overflow-y: auto; max-height: 50vh;
      overscroll-behavior: contain;
    }
    #sakerly-panel .sakerly-task {
      padding: 12px 14px; border-top: 1px solid var(--sk-line);
    }
    #sakerly-panel .sakerly-task:first-child { border-top: 0; }
    #sakerly-panel .sakerly-task-head {
      display: flex; align-items: center; gap: 8px; margin-bottom: 8px;
    }
    #sakerly-panel .filename {
      flex: 1; min-width: 0; margin: 0; font-weight: 600; font-size: 13px;
      color: var(--sk-fg);
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    #sakerly-panel .progress {
      position: relative; height: 26px; background: var(--sk-track);
      border-radius: 8px; overflow: hidden; margin-bottom: 6px;
    }
    #sakerly-panel .progress-fill {
      position: absolute; inset: 0 auto 0 0; height: 100%;
      background: var(--sk-accent); opacity: .9;
      transition: width .2s;
    }
    #sakerly-panel .progress-label {
      position: relative; text-align: center; margin: 0;
      line-height: 26px; font-size: 12px; font-weight: 700;
      color: var(--sk-fg); font-variant-numeric: tabular-nums;
      text-shadow: 0 1px 2px rgba(255,255,255,.4);
    }
    html.night #sakerly-panel .progress-label,
    html.theme-dark #sakerly-panel .progress-label {
      text-shadow: 0 1px 2px rgba(0,0,0,.6);
    }
    #sakerly-panel [data-state="failed"] .progress-fill { background: var(--sk-err); opacity: .95; }
    #sakerly-panel [data-state="completed"] .progress-fill,
    #sakerly-panel [data-state="handedOff"] .progress-fill {
      background: var(--sk-ok); opacity: .95;
    }
    #sakerly-panel .indeterminate .progress-fill {
      width: 35% !important; animation: sk-progress 1.4s infinite ease-in-out;
    }
    @keyframes sk-progress { from { left: -35%; } to { left: 100%; } }
    @media (prefers-reduced-motion: reduce) {
      #sakerly-panel .indeterminate .progress-fill { animation: none; left: 32%; }
    }
    #sakerly-panel .sakerly-task-details {
      margin: 0; color: var(--sk-muted); font-size: 12px; font-weight: 500;
      font-variant-numeric: tabular-nums;
    }
    #sakerly-panel .sakerly-task-error {
      margin: 6px 0 0; color: var(--sk-err); font-size: 12px; font-weight: 600;
    }
    #sakerly-panel .sakerly-task-actions {
      display: flex; justify-content: flex-end; gap: 6px; margin-top: 8px;
    }
    #sakerly-panel .sakerly-task button {
      appearance: none; background: var(--sk-track); color: var(--sk-accent);
      border: 0; font: inherit; font-size: 12px; font-weight: 600;
      border-radius: 7px; padding: 6px 12px; cursor: pointer;
      transition: background .15s;
    }
    #sakerly-panel .sakerly-task button:hover { background: var(--sk-track-hover); }
    #sakerly-panel .sakerly-task [data-act="dismiss"] {
      background: transparent; color: var(--sk-muted);
      font-size: 20px; padding: 0 8px; line-height: 1;
    }
    #sakerly-panel .sakerly-task [data-act="dismiss"]:hover {
      background: transparent; color: var(--sk-err);
    }
    #sakerly-panel .sakerly-panel-foot {
      padding: 10px 14px; border-top: 1px solid var(--sk-line);
      display: flex; align-items: center; gap: 8px;
      font-size: 11.5px; color: var(--sk-muted); font-weight: 600;
      background: var(--sk-bg-head);
    }
    #sakerly-panel .sakerly-panel-foot select {
      appearance: none; background: var(--sk-track); color: var(--sk-fg);
      border: 0; border-radius: 6px; padding: 4px 24px 4px 8px;
      font: inherit; cursor: pointer;
      background-image: linear-gradient(45deg, transparent 50%, var(--sk-muted) 50%),
                        linear-gradient(135deg, var(--sk-muted) 50%, transparent 50%);
      background-position: calc(100% - 12px) center, calc(100% - 7px) center;
      background-size: 5px 5px, 5px 5px; background-repeat: no-repeat;
    }

    #sakerly-select-bar .sakerly-select-body {
      display: flex; flex-direction: column; min-height: 0;
    }
    #sakerly-select-bar .sakerly-hint {
      padding: 10px 14px; font-size: 11.5px; color: var(--sk-muted);
      line-height: 1.5; font-weight: 500;
      border-bottom: 1px solid var(--sk-line);
      background: var(--sk-bg-head);
      display: flex; flex-direction: column; gap: 4px;
    }
    #sakerly-select-bar .sakerly-hint b { color: var(--sk-fg); font-weight: 700; }
    #sakerly-select-bar .sakerly-hint-row { display: block; }
    #sakerly-select-bar .sakerly-hint-keys {
      margin-top: 4px; padding-top: 6px;
      border-top: 1px dashed var(--sk-line);
      font-size: 11px; opacity: .85;
      font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
    }
    #sakerly-select-bar .sakerly-select-list {
      overflow-y: auto; min-height: 0; max-height: 32vh;
      background: var(--sk-bg);
    }
    #sakerly-select-bar .sakerly-select-row {
      display: flex; align-items: center; gap: 6px;
      padding: 8px 14px; border-bottom: 1px solid var(--sk-line);
      font-size: 12px; color: var(--sk-fg); font-weight: 500;
    }
    #sakerly-select-bar .sakerly-select-row span {
      flex: 1; min-width: 0;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    #sakerly-select-bar .sakerly-select-row button {
      background: transparent; border: 0; color: var(--sk-muted);
      cursor: pointer; font: 700 16px system-ui; padding: 0 6px;
      transition: color .15s;
    }
    #sakerly-select-bar .sakerly-select-row button:hover { color: var(--sk-err); }

    #sakerly-select-bar .sakerly-actions {
      display: flex; gap: 6px; padding: 10px 14px;
      border-top: 1px solid var(--sk-line);
    }
    #sakerly-select-bar .sakerly-actions:first-of-type { border-top: 0; }
    #sakerly-select-bar .sakerly-actions button {
      flex: 1; appearance: none; background: var(--sk-track);
      color: var(--sk-fg); border: 0; border-radius: 8px;
      padding: 9px 10px; font: 600 12px system-ui;
      cursor: pointer; transition: background .15s, color .15s;
    }
    #sakerly-select-bar .sakerly-actions button:hover:not(:disabled) {
      background: var(--sk-track-hover);
    }
    #sakerly-select-bar .sakerly-actions button.on {
      background: var(--sk-accent); color: var(--sk-accent-fg);
      box-shadow: 0 2px 8px rgba(11,132,255,.25);
    }
    #sakerly-select-bar .sakerly-actions button.danger.on {
      background: linear-gradient(135deg, #16c074, #0ea968);
      color: #ffffff !important;
      font-weight: 800; letter-spacing: .3px;
      box-shadow: 0 3px 10px rgba(16,185,129,.45),
                  inset 0 1px 0 rgba(255,255,255,.25);
      text-shadow: 0 1px 2px rgba(0,0,0,.35);
      border: 1px solid rgba(255,255,255,.15);
    }
    #sakerly-select-bar .sakerly-dl-primary {
      margin: 10px 14px 14px; padding: 11px;
      background: var(--sk-accent); color: var(--sk-accent-fg);
      border: 0; border-radius: 10px; font: 700 13px system-ui;
      cursor: pointer; transition: filter .15s, transform .05s;
      box-shadow: 0 3px 10px rgba(11,132,255,.3);
    }
    #sakerly-select-bar .sakerly-dl-primary:hover:not(:disabled) { filter: brightness(1.08); }
    #sakerly-select-bar .sakerly-dl-primary:active:not(:disabled) { transform: translateY(1px); }
    #sakerly-select-bar .sakerly-dl-primary:disabled {
      background: var(--sk-track); color: var(--sk-muted);
      box-shadow: none; cursor: default;
    }

    .sakerly-dl, ._sakerly_pinned_dl, .sakerly-queue {
      appearance: none; cursor: pointer;
    }
    #sakerly-settings-modal[hidden] { display: none !important; }
    #sakerly-settings-modal {
      position: fixed; inset: 0; z-index: 2147483647;
      display: flex; align-items: center; justify-content: center;
      font: 13px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
    }
    #sakerly-settings-modal .sakerly-modal-backdrop {
      position: absolute; inset: 0; background: rgba(0,0,0,.55);
    }
    #sakerly-settings-modal .sakerly-modal-card {
      position: relative; z-index: 1;
      width: min(420px, calc(100vw - 32px));
      max-height: calc(100vh - 32px); overflow: auto;
      background: var(--sk-bg); color: var(--sk-fg);
      border: 1px solid var(--sk-line); border-radius: var(--sk-radius);
      box-shadow: var(--sk-shadow);
      display: flex; flex-direction: column;
    }
    #sakerly-settings-modal .sakerly-settings-body {
      padding: 14px; display: flex; flex-direction: column; gap: 14px;
    }
    #sakerly-settings-modal .sakerly-field {
      display: flex; flex-direction: column; gap: 6px;
    }
    #sakerly-settings-modal .sakerly-field-label {
      font-size: 11.5px; font-weight: 700; color: var(--sk-muted);
      text-transform: uppercase; letter-spacing: .4px;
    }
    #sakerly-settings-modal select,
    #sakerly-settings-modal input[type="text"] {
      appearance: none; background: var(--sk-track); color: var(--sk-fg);
      border: 1px solid var(--sk-line); border-radius: 8px;
      padding: 9px 12px; font: inherit; font-weight: 500;
      transition: border-color .15s;
    }
    #sakerly-settings-modal select:focus,
    #sakerly-settings-modal input[type="text"]:focus {
      outline: none; border-color: var(--sk-accent);
      background: var(--sk-bg);
    }
    #sakerly-settings-modal button {
      appearance: none; background: var(--sk-track); color: var(--sk-fg);
      border: 0; border-radius: 8px; padding: 8px 12px;
      font: 600 12px system-ui; cursor: pointer;
      transition: background .15s, color .15s;
    }
    #sakerly-settings-modal button:hover:not(:disabled) {
      background: var(--sk-accent); color: var(--sk-accent-fg);
    }
    #sakerly-settings-modal button:disabled { opacity: .5; cursor: default; }
    #sakerly-settings-modal .sakerly-folder-row {
      display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
    }
    #sakerly-settings-modal .sakerly-folder-name {
      flex: 1; min-width: 0; padding: 8px 12px;
      background: var(--sk-track); border-radius: 8px;
      font-weight: 600; font-size: 12px;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    #sakerly-settings-modal .sakerly-folder-name.muted {
      color: var(--sk-muted); font-weight: 500; font-style: italic;
    }
    #sakerly-settings-modal .sakerly-seq-row {
      flex-direction: row; align-items: center; gap: 10px;
    }
    #sakerly-settings-modal .sakerly-seq-info {
      flex: 1; text-transform: none; letter-spacing: normal;
      font-weight: 600; color: var(--sk-fg); font-size: 12px;
    }

    .sakerly-queue-icon {
      display: inline-flex; align-items: center; justify-content: center;
      width: 1.4em; height: 1.4em; color: #22d175;
    }
    .sakerly-queue-icon svg { width: 100%; height: 100%; display: block; }
    button.sakerly-queue { position: relative; }
    button.sakerly-queue:hover .sakerly-queue-icon { color: #52e095; }
    button.sakerly-queue.queued .sakerly-queue-icon { color: #4aa5ff; }
  `;
  document.head.appendChild(style);

  // telegram paper-plane mark (used in both panel headers)
  const TG_LOGO_SVG =
    '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<path fill="#fff" d="M20.6 4.1 2.9 10.9c-1 .4-1 1.3 0 1.6l4.4 1.4 1.7 5.1c.2.6.5.9.9.9.3 0 .6-.1.9-.4l2.5-2.4 4.5 3.3c.8.5 1.5.2 1.7-.8l3-14c.3-1.2-.5-1.9-1.9-1.5zm-3.3 3.8-7.9 7.1-.3 3.1-1.4-4.2 9.1-6.5c.4-.3.8.2.5.5z"/>' +
    '</svg>';

  // download panel
  const panel = document.createElement("section");
  panel.id = "sakerly-panel";
  panel.classList.add("empty");
  panel.innerHTML = `
    <div class="sakerly-head">
      <div class="sakerly-title">
        <span class="sakerly-logo">${TG_LOGO_SVG}</span>
        <span class="sakerly-panel-title"></span>
      </div>
      <button type="button" class="sakerly-icon-btn sakerly-panel-clear" title=""><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M6 6l1 14a2 2 0 002 2h6a2 2 0 002-2l1-14M10 11v6M14 11v6"/></svg></button>
      <button type="button" class="sakerly-icon-btn sakerly-panel-settings" title=""><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg></button>
      <button type="button" class="sakerly-icon-btn sakerly-panel-toggle" title="">–</button>
    </div>
    <div class="sakerly-task-list"></div>
    <div class="sakerly-panel-foot">
      <span>SakerLy</span>
      <span style="flex:1"></span>
      <label>${t("lang")}</label>
      <select class="sakerly-lang-select">
        <option value="vi">VI</option>
        <option value="en">EN</option>
      </select>
    </div>
  `;
  document.body.appendChild(panel);
  const panelToggle = panel.querySelector(".sakerly-panel-toggle");
  panelToggle.onclick = () => {
    const col = !panel.classList.contains("collapsed");
    panel.classList.toggle("collapsed", col);
    panelToggle.textContent = col ? "+" : "–";
    panelToggle.title = col ? t("show") : t("hide");
  };
  const langSelect = panel.querySelector(".sakerly-lang-select");
  langSelect.value = currentLang;
  langSelect.onchange = () => {
    currentLang = langSelect.value;
    saveStore("lang", currentLang);
    refreshAllLabels();
  };
  makeDraggable(panel, panel.querySelector(".sakerly-head"), "panelPos");

  // ===== settings modal ======================================================
  const supportsDirPicker = typeof window.showDirectoryPicker === "function";
  const settingsModal = document.createElement("div");
  settingsModal.id = "sakerly-settings-modal";
  settingsModal.hidden = true;
  settingsModal.innerHTML = `
    <div class="sakerly-modal-backdrop"></div>
    <div class="sakerly-modal-card">
      <div class="sakerly-head">
        <div class="sakerly-title">
          <span class="sakerly-logo">${TG_LOGO_SVG}</span>
          <span class="sakerly-settings-title"></span>
        </div>
        <button type="button" class="sakerly-icon-btn sakerly-settings-close" title="">×</button>
      </div>
      <div class="sakerly-settings-body">
        <label class="sakerly-field">
          <span class="sakerly-field-label" data-key="naming"></span>
          <select class="sakerly-settings-naming">
            <option value="original" data-key="namingOriginal"></option>
            <option value="date" data-key="namingDate"></option>
            <option value="seq" data-key="namingSeq"></option>
            <option value="date_original" data-key="namingDateOriginal"></option>
            <option value="seq_original" data-key="namingSeqOriginal"></option>
          </select>
        </label>
        <label class="sakerly-field">
          <span class="sakerly-field-label" data-key="prefix"></span>
          <input type="text" class="sakerly-settings-prefix" maxlength="40" />
        </label>
        <div class="sakerly-field sakerly-seq-row">
          <span class="sakerly-field-label sakerly-seq-info"></span>
          <button type="button" class="sakerly-settings-resetseq"></button>
        </div>
        <label class="sakerly-field">
          <span class="sakerly-field-label" data-key="folder"></span>
          <div class="sakerly-folder-row">
            <span class="sakerly-folder-name"></span>
            <button type="button" class="sakerly-settings-pickdir"></button>
            <button type="button" class="sakerly-settings-cleardir"></button>
          </div>
        </label>
        <label class="sakerly-field">
          <span class="sakerly-field-label" data-key="subfolder"></span>
          <select class="sakerly-settings-subfolder">
            <option value="none" data-key="subfolderNone"></option>
            <option value="date" data-key="subfolderDate"></option>
            <option value="channel" data-key="subfolderChannel"></option>
            <option value="date_channel" data-key="subfolderDateChannel"></option>
            <option value="channel_date" data-key="subfolderChannelDate"></option>
          </select>
        </label>
      </div>
    </div>
  `;
  document.body.appendChild(settingsModal);

  const settingsCogBtn = panel.querySelector(".sakerly-panel-settings");
  const settingsCloseBtn = settingsModal.querySelector(".sakerly-settings-close");
  const settingsNaming = settingsModal.querySelector(".sakerly-settings-naming");
  const settingsPrefix = settingsModal.querySelector(".sakerly-settings-prefix");
  const settingsPickDir = settingsModal.querySelector(".sakerly-settings-pickdir");
  const settingsClearDir = settingsModal.querySelector(".sakerly-settings-cleardir");
  const settingsFolderName = settingsModal.querySelector(".sakerly-folder-name");
  const settingsResetSeq = settingsModal.querySelector(".sakerly-settings-resetseq");
  const settingsSeqInfo = settingsModal.querySelector(".sakerly-seq-info");
  const settingsSubfolder = settingsModal.querySelector(".sakerly-settings-subfolder");

  const refreshSettingsUI = () => {
    settingsModal.querySelector(".sakerly-settings-title").textContent = t("settingsTitle");
    settingsCloseBtn.title = t("close");
    settingsModal.querySelectorAll("[data-key]").forEach((el) => { el.textContent = t(el.dataset.key); });
    settingsNaming.value = settings.naming;
    settingsSubfolder.value = settings.subfolder || "none";
    settingsSubfolder.disabled = !destDirName;
    settingsPrefix.value = settings.prefix || "";
    settingsPrefix.placeholder = t("prefixPlaceholder");
    settingsFolderName.textContent = destDirName || t("folderNone");
    settingsFolderName.classList.toggle("muted", !destDirName);
    settingsPickDir.textContent = t("pickFolder");
    settingsPickDir.disabled = !supportsDirPicker;
    settingsPickDir.title = supportsDirPicker ? "" : t("folderUnsupported");
    settingsClearDir.textContent = t("clearFolder");
    settingsClearDir.hidden = !destDirName;
    settingsResetSeq.textContent = t("resetSeq");
    settingsSeqInfo.textContent = t("seqNow", { n: seqCounter });
    settingsCogBtn.title = t("settings");
  };

  const clearHistoryBtn = panel.querySelector(".sakerly-panel-clear");
  const clearHistory = () => {
    for (const task of [...downloadTasks.values()]) {
      if (task.finished) dismissTask(task);
    }
  };
  clearHistoryBtn.onclick = clearHistory;
  settingsCogBtn.onclick = () => { settingsModal.hidden = false; refreshSettingsUI(); };
  settingsCloseBtn.onclick = () => { settingsModal.hidden = true; };
  settingsModal.querySelector(".sakerly-modal-backdrop").onclick = () => { settingsModal.hidden = true; };
  settingsNaming.onchange = () => { settings.naming = settingsNaming.value; saveStore("settings", settings); refreshSettingsUI(); };
  settingsSubfolder.onchange = () => { settings.subfolder = settingsSubfolder.value; saveStore("settings", settings); refreshSettingsUI(); };
  settingsPrefix.oninput = () => { settings.prefix = settingsPrefix.value; saveStore("settings", settings); };
  settingsResetSeq.onclick = () => { seqCounter = 1; saveStore("seq", 1); refreshSettingsUI(); };
  settingsPickDir.onclick = async () => {
    if (!supportsDirPicker) return;
    try {
      const h = await window.showDirectoryPicker({ mode: "readwrite" });
      destDirHandle = h; destDirName = h.name;
      await idbSet("destDirHandle", h);
      saveStore("destDirName", destDirName);
      refreshSettingsUI();
    } catch (e) { if (e?.name !== "AbortError") log.error("pickFolder: " + e.message); }
  };
  settingsClearDir.onclick = async () => {
    destDirHandle = null; destDirName = "";
    await idbDel("destDirHandle");
    saveStore("destDirName", "");
    refreshSettingsUI();
  };

  // select bar
  const selectBar = document.createElement("section");
  selectBar.id = "sakerly-select-bar";
  selectBar.innerHTML = `
    <div class="sakerly-head">
      <div class="sakerly-title">
        <span class="sakerly-logo">${TG_LOGO_SVG}</span>
        <span class="sakerly-select-title"></span>
      </div>
      <span class="sakerly-count" id="sk-sel-count">0</span>
      <button type="button" class="sakerly-icon-btn sakerly-select-settings" title=""><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg></button>
      <button type="button" class="sakerly-icon-btn sakerly-select-toggle" title="">–</button>
    </div>
    <div class="sakerly-select-body">
      <div class="sakerly-hint" id="sk-hint"></div>
      <div class="sakerly-select-list" id="sk-sel-list" hidden></div>
      <div class="sakerly-actions">
        <button type="button" id="sk-mode-btn"></button>
        <button type="button" id="sk-auto-btn" class="danger"></button>
      </div>
      <div class="sakerly-actions">
        <button type="button" id="sk-all-btn"></button>
        <button type="button" id="sk-clear-btn"></button>
      </div>
      <button type="button" id="sk-dl-btn" class="sakerly-dl-primary"></button>
    </div>
  `;
  document.body.appendChild(selectBar);
  const selSettingsBtn = selectBar.querySelector(".sakerly-select-settings");
  selSettingsBtn.onclick = () => { settingsModal.hidden = false; refreshSettingsUI(); };
  const selToggle = selectBar.querySelector(".sakerly-select-toggle");
  selToggle.onclick = () => {
    const col = !selectBar.classList.contains("collapsed");
    selectBar.classList.toggle("collapsed", col);
    selToggle.textContent = col ? "+" : "–";
    selToggle.title = col ? t("show") : t("hide");
  };
  makeDraggable(selectBar, selectBar.querySelector(".sakerly-head"), "selectBarPos");

  const selModeBtn = selectBar.querySelector("#sk-mode-btn");
  const selAutoBtn = selectBar.querySelector("#sk-auto-btn");
  const selAllBtn = selectBar.querySelector("#sk-all-btn");
  const selClearBtn = selectBar.querySelector("#sk-clear-btn");
  const selDlBtn = selectBar.querySelector("#sk-dl-btn");
  const selCount = selectBar.querySelector("#sk-sel-count");
  const selList = selectBar.querySelector("#sk-sel-list");
  const selHint = selectBar.querySelector("#sk-hint");
  const selTitle = selectBar.querySelector(".sakerly-select-title");

  const updateSelectBar = () => {
    const count = totalSelectedItems();
    selCount.textContent = String(count);
    selTitle.textContent = t("selectTitle");
    selHint.innerHTML =
      `<div class="sakerly-hint-row">${t("hintPhoto")}</div>` +
      `<div class="sakerly-hint-row">${t("hintVideo")}</div>` +
      `<div class="sakerly-hint-row sakerly-hint-keys">${t("hintKeys")}</div>`;
    selModeBtn.textContent = t("selectMode") + (selectMode ? " ✓" : "");
    selModeBtn.classList.toggle("on", selectMode);
    selAutoBtn.textContent = autoQueueMode ? t("autoQueueOn") : t("autoQueue");
    selAutoBtn.classList.toggle("on", autoQueueMode);
    selAllBtn.textContent = t("selectAll");
    selClearBtn.textContent = t("clearSelection");
    selDlBtn.textContent = t("downloadSelected", { count });
    selDlBtn.disabled = count === 0;
    selList.innerHTML = "";
    for (const [bubble, items] of selectedItems) {
      for (const item of items) {
        const row = document.createElement("div");
        row.className = "sakerly-select-row";
        const span = document.createElement("span");
        span.textContent = describeItem(item);
        span.title = item.url;
        const rm = document.createElement("button");
        rm.type = "button"; rm.textContent = "×";
        rm.onclick = () => {
          removeTick(item);
          const rem = selectedItems.get(bubble).filter((x) => x !== item);
          if (rem.length) selectedItems.set(bubble, rem);
          else { bubble.classList.remove("sakerly-sel"); selectedBubbles.delete(bubble); selectedItems.delete(bubble); }
          updateSelectBar();
        };
        row.append(span, rm);
        selList.appendChild(row);
      }
    }
    selList.hidden = selectedItems.size === 0;
  };

  selModeBtn.onclick = () => { selectMode = !selectMode; updateSelectBar(); };
  selAutoBtn.onclick = () => {
    autoQueueMode = !autoQueueMode;
    saveStore("autoQueue", autoQueueMode);
    if (autoQueueMode) { seenAutoQueueUrls.clear(); log.info("auto-queue on"); }
    updateSelectBar();
  };
  selClearBtn.onclick = clearSelection;
  selAllBtn.onclick = () => {
    // reset previous ticks so items scrolled off-screen in a prior load don't get carried over
    clearSelection();
    const vh = window.innerHeight;
    for (const b of allBubbles()) {
      // require the bubble to be meaningfully on-screen (at least 40 px visible), not just overlapping by a pixel
      const r = b.getBoundingClientRect();
      const visible = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
      if (visible >= 40) markSelected(b, true);
    }
  };
  selDlBtn.onclick = () => {
    const items = [...selectedItems.values()].flat();
    if (!items.length) return;
    for (const it of items) downloadMedia(it.url, it.kind, { batch: true, silent: true });
    log.info(t("batchQueued", { count: items.length }));
    clearSelection();
  };

  // click handler for select mode
  document.addEventListener("click", (e) => {
    if (!selectMode) return;
    const b = findBubble(e.target);
    if (!b || !bubbleHasMedia(b)) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    if (e.shiftKey && lastClickedBubble) rangeSelect(lastClickedBubble, b);
    else markSelected(b, !selectedBubbles.has(b));
    lastClickedBubble = b;
  }, true);

  // shortcuts
  window.addEventListener("keydown", (e) => {
    if (!e.ctrlKey || !e.shiftKey) return;
    const k = e.key.toLowerCase();
    if (k === "m") { e.preventDefault(); selectMode = !selectMode; updateSelectBar(); }
    else if (k === "a") { e.preventDefault(); selAutoBtn.click(); }
    else if (k === "d") { e.preventDefault(); selDlBtn.onclick(); }
  });

  const refreshAllLabels = () => {
    panelToggle.title = panel.classList.contains("collapsed") ? t("show") : t("hide");
    selToggle.title = selectBar.classList.contains("collapsed") ? t("show") : t("hide");
    updatePanel();
    for (const task of downloadTasks.values()) renderTask(task);
    updateSelectBar();
    document.querySelectorAll("button.sakerly-dl, button._sakerly_pinned_dl").forEach((b) => {
      const label = t(b.matches("._sakerly_pinned_dl:disabled") ? "loadingMedia" : "download");
      b.title = label; b.setAttribute("aria-label", label);
    });
    document.querySelectorAll("button.sakerly-queue").forEach((b) => {
      b.title = t("topbarQueue"); b.setAttribute("aria-label", t("topbarQueue"));
    });
    if (clearHistoryBtn) clearHistoryBtn.title = t("clearHistory");
    if (settingsCogBtn) settingsCogBtn.title = t("settings");
    if (selSettingsBtn) selSettingsBtn.title = t("settings");
    if (!settingsModal.hidden) refreshSettingsUI();
  };

  // ===== WebK refresh =======================================================
  // tray-plus icon matches the stroke weight of TG's own topbar glyphs (share/download/retry/zoom/close)
  const QUEUE_ICON_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" ' +
    'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M5 15v4h14v-4"/><path d="M12 4v10"/><path d="M8 10l4 4 4-4"/><circle cx="18" cy="6" r="3" fill="currentColor" stroke="none"/>' +
    '<path d="M18 4.5v3M16.5 6h3" stroke="#0a1420" stroke-width="1.6"/></svg>';
  const makeQueueButton = (extraClass) => {
    const btn = document.createElement("button");
    btn.className = `btn-icon sakerly-queue${extraClass ? " " + extraClass : ""}`;
    btn.type = "button";
    btn.title = t("topbarQueue");
    btn.setAttribute("aria-label", t("topbarQueue"));
    btn.innerHTML = `<span class="sakerly-queue-icon" aria-hidden="true">${QUEUE_ICON_SVG}</span>`;
    btn.onclick = (e) => {
      e.stopPropagation();
      queueCurrentWebKMedia();
      btn.classList.add("queued");
      setTimeout(() => btn.classList.remove("queued"), 1200);
    };
    return btn;
  };

  const refreshWebK = () => {
    refreshWebKGlyph();

    // auto-queue video when viewer resolves to a new URL, then auto-advance to next in album
    if (autoQueueMode) {
      const r = resolveViewerWebKMedia();
      if (r && !seenAutoQueueUrls.has(r.url)) {
        seenAutoQueueUrls.add(r.url);
        queuedViewerUrls.add(r.url);
        downloadMedia(r.url, r.kind, { batch: true, silent: true });
        log.info(`auto-queue: ${r.kind}`);
        setTimeout(autoAdvanceViewer, 400);
      }
    }

    // pinned audio
    const pinned = document.querySelector(".pinned-audio");
    const pinnedUtils = pinned?.querySelector(".pinned-container-wrapper-utils");
    if (pinnedUtils) {
      let b = pinnedUtils.querySelector("._sakerly_pinned_dl");
      if (!b) {
        b = document.createElement("button");
        b.className = "btn-icon tgico-download _sakerly_pinned_dl";
        b.innerHTML = createWebKDlIcon(true);
        b.type = "button";
        b.onclick = (ev) => {
          ev.stopPropagation();
          const m = getPinnedMedia();
          if (!m) return;
          downloadMedia(m.url, m.kind);
        };
        pinnedUtils.appendChild(b);
      }
      const dis = !getPinnedMedia();
      if (b.disabled !== dis) b.disabled = dis;
      const label = t(dis ? "loadingMedia" : "download");
      b.title = label; b.setAttribute("aria-label", label);
    }

    // stories
    const stories = document.getElementById("stories-viewer");
    if (stories) {
      const makeBtn = () => {
        const b = document.createElement("button");
        b.className = "btn-icon rp sakerly-dl";
        b.innerHTML = `${createWebKDlIcon()}<div class="c-ripple"></div>`;
        b.type = "button";
        b.title = t("download");
        b.setAttribute("aria-label", t("download"));
        b.onclick = () => {
          const v = stories.querySelector("video.media-video");
          const vSrc = getMediaSource(v);
          if (vSrc) return downloadMedia(vSrc, "video");
          const iSrc = stories.querySelector("img.media-photo")?.src;
          if (iSrc) downloadMedia(iSrc, "image");
        };
        return b;
      };
      const h = stories.querySelector("[class*='_ViewerStoryHeaderRight']");
      if (h && !h.querySelector(".sakerly-dl")) h.prepend(makeBtn());
      const f = stories.querySelector("[class*='_ViewerStoryFooterRight']");
      if (f && !f.querySelector(".sakerly-dl")) f.prepend(makeBtn());
    }

    // media viewer
    const viewer = document.querySelector(".media-viewer-whole");
    if (!viewer) return;
    const asp = viewer.querySelector(".media-viewer-movers .media-viewer-aspecter");
    const buttons = viewer.querySelector(".media-viewer-topbar .media-viewer-buttons");
    if (!asp || !buttons) return;

    // force-visible native buttons (noforwards channels hide them)
    for (const b of getWebKDlButtons(buttons)) {
      if (!b.disabled && b.getAttribute("aria-disabled") !== "true") b.classList.remove("hide");
    }

    const nativeBtns = getWebKDlButtons(buttons).filter(isUsableBtn);
    if (nativeBtns.length) buttons.querySelectorAll("button.sakerly-dl").forEach((b) => b.remove());
    const hasDl = nativeBtns.length > 0 || buttons.querySelector("button.sakerly-dl");

    if (asp.querySelector(".ckin__player")) {
      const controls = asp.querySelector(".default__controls.ckin__controls");
      if (controls && !controls.querySelector(".sakerly-dl")) {
        const right = controls.querySelector(".bottom-controls .right-controls");
        const b = document.createElement("button");
        b.className = "btn-icon default__button tgico-download sakerly-dl";
        b.innerHTML = createWebKDlIcon();
        b.type = "button";
        b.title = t("download"); b.setAttribute("aria-label", t("download"));
        b.onclick = downloadCurrentWebKMedia;
        right?.prepend(b);
        if (!controls.querySelector(".sakerly-queue")) right?.prepend(makeQueueButton("default__button"));
      }
    } else if (asp.querySelector("video") && !hasDl) {
      const b = document.createElement("button");
      b.className = "btn-icon tgico-download sakerly-dl";
      b.innerHTML = createWebKDlIcon(true);
      b.type = "button";
      b.title = t("download"); b.setAttribute("aria-label", t("download"));
      b.onclick = downloadCurrentWebKMedia;
      buttons.prepend(b);
      if (!buttons.querySelector(".sakerly-queue")) buttons.prepend(makeQueueButton());
    } else if (!hasDl) {
      const thumb = asp.querySelector("img.thumbnail");
      if (!thumb?.src) return;
      const b = document.createElement("button");
      b.className = "btn-icon tgico-download sakerly-dl";
      b.innerHTML = createWebKDlIcon(true);
      b.type = "button";
      b.title = t("download"); b.setAttribute("aria-label", t("download"));
      b.onclick = downloadCurrentWebKMedia;
      buttons.prepend(b);
    }
    // queue button rides the topbar for every media the viewer resolves — regardless of whether TG's own download button is present
    if (resolveViewerWebKMedia() && !buttons.querySelector(".sakerly-queue")) {
      buttons.prepend(makeQueueButton());
    }
  };

  // ===== WebA refresh =======================================================
  const refreshWebA = () => {
    const story = document.getElementById("StoryViewer");
    if (story) {
      const header = story.querySelector(".GrsJNw3y") || story.querySelector(".DropdownMenu")?.parentNode;
      if (header && !header.querySelector(".sakerly-dl") && !getWebADlButtons(header).length) {
        const b = document.createElement("button");
        b.className = "Button TkphaPyQ tiny translucent-white round sakerly-dl";
        b.innerHTML = '<i class="icon icon-download" aria-hidden="true"></i>';
        b.type = "button";
        b.title = t("download"); b.setAttribute("aria-label", t("download"));
        b.onclick = () => {
          const cur = document.getElementById("StoryViewer");
          const vUrl = getMediaSource(cur?.querySelector("video"));
          const imgs = cur?.querySelectorAll("img.PVZ8TOWS");
          const iUrl = getMediaSource(imgs?.[imgs.length - 1]);
          if (vUrl) downloadMedia(vUrl, "video");
          else if (iUrl) downloadMedia(iUrl, "image");
        };
        header.prepend(b);
      }
    }
    const media = document.querySelector("#MediaViewer .MediaViewerSlide--active");
    const actions = document.querySelector("#MediaViewer .MediaViewerActions");
    if (!media || !actions) return;
    const v = media.querySelector(".VideoPlayer video");
    const i = media.querySelector(".MediaViewerContent > div > img");
    if (!getMediaSource(v) && !getMediaSource(i)) return;
    const makeBtn = () => {
      const b = document.createElement("button");
      b.className = "Button smaller translucent-white round sakerly-dl";
      b.innerHTML = '<i class="icon icon-download" aria-hidden="true"></i>';
      b.type = "button";
      b.title = t("download"); b.setAttribute("aria-label", t("download"));
      b.onclick = downloadCurrentWebAMedia;
      return b;
    };
    if (getWebADlButtons(actions).length) {
      actions.querySelectorAll("button.sakerly-dl").forEach((b) => b.remove());
    } else if (!actions.querySelector("button.sakerly-dl")) {
      actions.prepend(makeBtn());
    }
    const controls = media.querySelector(".VideoPlayerControls .buttons");
    if (v && controls && !controls.querySelector("button.sakerly-dl")) {
      const sp = controls.querySelector(".spacer");
      if (sp) sp.after(makeBtn()); else controls.appendChild(makeBtn());
    }
  };

  // ===== app detection + observer ===========================================
  const isWebK = location.hostname === "webk.telegram.org" || location.pathname.startsWith("/k/");
  const isWebA = location.hostname === "webz.telegram.org" || location.pathname.startsWith("/a/");
  const refreshApp = isWebK ? refreshWebK : isWebA ? refreshWebA : null;

  refreshAllLabels();

  if (refreshApp) {
    const roots = isWebK
      ? ".media-viewer-whole, #stories-viewer, .pinned-audio, audio-element"
      : "#MediaViewer, #StoryViewer";
    let pending;
    const schedule = () => {
      if (pending) return;
      pending = setTimeout(() => { pending = null; refreshApp(); }, 100);
    };
    const observer = new MutationObserver((records) => {
      if (records.some((r) => {
        const target = r.target instanceof Element ? r.target : r.target.parentElement;
        if (target?.closest("#sakerly-panel, #sakerly-select-bar, .sakerly-dl, ._sakerly_pinned_dl, .sakerly-queue")) return false;
        return target?.closest(roots) || Array.from(r.addedNodes).some((n) =>
          n instanceof Element && (n.matches(roots) || n.querySelector(roots))
        );
      })) schedule();
    });
    observer.observe(document.body, {
      childList: true, subtree: true, attributes: true,
      attributeFilter: ["class", "src", "data-mid", "data-peer-id", "disabled", "aria-disabled", "hidden"],
    });
    setInterval(() => { if (!document.hidden) refreshApp(); }, REFRESH_DELAY);
    document.addEventListener("visibilitychange", schedule);
    refreshApp();
  }

  log.info(`SakerLy Telegram Media Downloader v1.0 loaded (${currentLang.toUpperCase()})`);
})();