// ==UserScript==
// @name         Telegram Media Downloader
// @name:en      Telegram Media Downloader
// @name:vi      Trình tải media Telegram
// @version      2.2.1
// @namespace    sakerly
// @description  Tải ảnh, GIF, video, voice từ Telegram Web (WebK + WebA) — engine song song kiểu client chính thức: nhiều chunk đồng thời, retry backoff, resume trong phiên, tốc độ thực + ETA.
// @description:en  Download images, GIFs, videos and voice from Telegram Web (WebK + WebA) — official-client-style parallel engine: concurrent chunks, retry with backoff, in-session resume, real speed + ETA.
// @author       SakerLy
// @license      GPL-3.0-or-later
// @match        https://web.telegram.org/*
// @match        https://webk.telegram.org/*
// @match        https://webz.telegram.org/*
// @icon         https://web.telegram.org/k/assets/img/android-chrome-144x144.png
// @run-at       document-end
// @grant        none
// @homepageURL  https://github.com/SakerLy/telegram-dl
// @supportURL   https://github.com/SakerLy/telegram-dl/issues
// @updateURL    https://raw.githubusercontent.com/SakerLy/telegram-dl/main/telegram-dl.user.js
// @downloadURL  https://raw.githubusercontent.com/SakerLy/telegram-dl/main/telegram-dl.user.js
// ==/UserScript==

/* global globalThis, FileSystemFileHandle */

(function () {
  "use strict";

  const TEST_MODE = typeof globalThis.__SK_TEST__ === "object"; // bật bởi bộ test Node: lộ nội bộ, bỏ qua dựng UI

  const SCRIPT_VERSION =
    (typeof GM_info !== "undefined" && GM_info?.script?.version) || "2.2.1";

  const KB = 1024;
  const MB = 1024 * 1024;

  // 512KB: grid chunk của SW WebK và mức kẹp mỗi response 206 của SW WebA
  const CHUNK_GRID = 512 * KB;
  const CHUNK_DEFAULT = 512 * KB;
  const CHUNK_MAX = 1024 * KB; // = MAX_DOWNLOAD_FILE_PART_SIZE (tweb & gramjs)
  const CHUNK_MIN = 256 * KB;

  // WebA mediaLoader: 5 lần retry, backoff 250ms × 2^n
  const CHUNK_RETRIES = 5;
  const RETRY_BASE_MS = 250;
  const RETRY_MAX_MS = 8000;

  // SW WebA cho mỗi part chờ tới 60s
  const STALL_TIMEOUT_MS = 60 * 1000;

  // dcBandwidthManager của WebA cho 9MB; nới lên vì chạy 2 task cùng lúc
  const NET_BUDGET_BYTES = 12 * MB;

  const MAX_ACTIVE_TASKS = 2;

  const WATCHDOG_MS = 120 * 1000; // ledger đứng yên quá lâu thì fail task, tránh treo vĩnh viễn

  const TASK_AUTO_RETRY_MAX = 1;
  const TASK_AUTO_RETRY_DELAY = 3000;

  const BLOB_REGISTRY_MAX = 96;
  const BLOB_REGISTRY_BYTES = 384 * MB;

  const DOWNLOADED_CAP = 5000;
  const REFRESH_DELAY = 2000;

  const LANGS = {
    vi: {
      downloads: "Tải xuống", downloadsCount: "Tải xuống ({count})",
      download: "Tải xuống", loadingMedia: "Media đang tải",
      hide: "Ẩn", show: "Hiện", dismiss: "Bỏ khỏi danh sách",
      progress: "Tiến trình tải", cancel: "Hủy", retry: "Thử lại",
      pause: "Tạm dừng", resume: "Tiếp tục",
      preparing: "Đang chuẩn bị", queued: "Đang chờ", downloading: "Đang tải",
      paused: "Đã tạm dừng", saving: "Đang lưu", completed: "Hoàn tất",
      handedOff: "Trình duyệt tự tải", failed: "Thất bại", cancelled: "Đã hủy",
      resumedTask: "Tiếp tục từ {percent}%",
      eta: "còn {time}", rate: "{speed}/s",
      video: "video", audio: "âm thanh", image: "ảnh", unknownType: "không rõ định dạng",
      errorHttp: "Yêu cầu thất bại (HTTP {status})",
      errorMime: "Cần {kind}, nhận được {mime}",
      errorRangeMissing: "Thiếu hoặc sai Content-Range",
      errorRangeInconsistent: "Dữ liệu không khớp; đã dừng để tránh file hỏng",
      errorRangeUnsupported: "Nguồn không hỗ trợ tải từng phần",
      errorLength: "Content-Length không hợp lệ", errorEmpty: "Phản hồi rỗng",
      errorTooLarge: "Dữ liệu vượt kích thước dự kiến",
      errorIncomplete: "Dữ liệu không đầy đủ",
      errorStall: "Không nhận được dữ liệu trong 60 giây",
      errorNoData: "Nguồn không trả về dữ liệu",
      errorFatal: "Tải thất bại: {message}",
      selectTitle: "Chọn hàng loạt",
      selectMode: "Chế độ chọn", selectAll: "Chọn tất cả hiển thị",
      clearSelection: "Bỏ chọn", downloadSelected: "Tải mục đã chọn ({count})",
      noTasks: "Chưa có tải xuống nào",
      autoQueue: "Auto-queue video",
      hintPhoto: "Ảnh: bật <b>Chế độ chọn</b> → click bubble",
      hintVideo: "Video: bật <b>Auto-queue</b> → mở viewer → mũi tên",
      hintKeys: "Ctrl+Shift+M · A · D",
      topbarQueue: "Thêm vào hàng chờ",
      settings: "Cài đặt", settingsTitle: "Cài đặt tải xuống",
      connections: "Số luồng tải mỗi file",
      connectionsHint: "1–4 luồng song song (mặc định 3, như Telegram WebA)",
      naming: "Định dạng tên file",
      namingOriginal: "Tên gốc", namingDate: "Ngày giờ",
      namingSeq: "Số thứ tự", namingDateOriginal: "Ngày giờ + Tên gốc",
      namingSeqOriginal: "Số thứ tự + Tên gốc",
      prefix: "Tiền tố (tuỳ chọn)", prefixPlaceholder: "VD: channelname",
      folder: "Thư mục lưu",
      pickFolder: "Chọn thư mục", clearFolder: "Bỏ chọn",
      folderNone: "Chưa chọn (dùng thư mục Downloads mặc định)",
      folderUnsupported: "Trình duyệt không hỗ trợ chọn thư mục",
      resetSeq: "Đặt lại số thứ tự", seqNow: "Số kế tiếp: {n}",
      close: "Đóng", clearHistory: "Xoá danh sách tải",
      skippedDownloaded: "Bỏ qua {n} mục đã tải trước đó",
      postVideosDone: "Xong post: {n} video",
      downloadedCount: "Đã nhớ {n} media đã tải (không tải lại)",
      forgetDownloaded: "Quên hết",
      subfolder: "Thư mục con tự động",
      subfolderNone: "Không (lưu trực tiếp)",
      subfolderDate: "Theo ngày (2026-10-24)",
      subfolderChannel: "Theo kênh/chat",
      subfolderDateChannel: "Ngày / Kênh",
      subfolderChannelDate: "Kênh / Ngày",
      lang: "Ngôn ngữ",
      showInChat: "Bấm để xem trong chat",
      secGeneral: "Chung", secNaming: "Tên file", secSave: "Nơi lưu", secData: "Dữ liệu",
      namingPreview: "Ví dụ:", subfolderNeedsFolder: "Chọn thư mục lưu ở trên để dùng mục này",
    },
    en: {
      downloads: "Downloads", downloadsCount: "Downloads ({count})",
      download: "Download", loadingMedia: "Loading media",
      hide: "Hide", show: "Show", dismiss: "Dismiss",
      progress: "Download progress", cancel: "Cancel", retry: "Retry",
      pause: "Pause", resume: "Resume",
      preparing: "Preparing", queued: "Queued", downloading: "Downloading",
      paused: "Paused", saving: "Saving", completed: "Completed",
      handedOff: "Browser is downloading", failed: "Failed", cancelled: "Cancelled",
      resumedTask: "Resuming from {percent}%",
      eta: "{time} left", rate: "{speed}/s",
      video: "video", audio: "audio", image: "image", unknownType: "unknown type",
      errorHttp: "Request failed (HTTP {status})",
      errorMime: "Expected {kind}, got {mime}",
      errorRangeMissing: "Missing or invalid Content-Range",
      errorRangeInconsistent: "Mismatched data; aborted to avoid corruption",
      errorRangeUnsupported: "Source does not support ranged requests",
      errorLength: "Invalid Content-Length", errorEmpty: "Empty response",
      errorTooLarge: "Data exceeds expected size",
      errorIncomplete: "Incomplete data",
      errorStall: "No data received within 60 seconds",
      errorNoData: "Source returned no data",
      errorFatal: "Download failed: {message}",
      selectTitle: "Batch select",
      selectMode: "Select mode", selectAll: "Select all visible",
      clearSelection: "Clear", downloadSelected: "Download selected ({count})",
      noTasks: "No downloads yet",
      autoQueue: "Auto-queue video",
      hintPhoto: "Photos: enable <b>Select mode</b> → click bubble",
      hintVideo: "Videos: enable <b>Auto-queue</b> → open viewer → arrow",
      hintKeys: "Ctrl+Shift+M · A · D",
      topbarQueue: "Add to queue",
      settings: "Settings", settingsTitle: "Download settings",
      connections: "Connections per file",
      connectionsHint: "1–4 parallel chunks (default 3, same as Telegram WebA)",
      naming: "File naming",
      namingOriginal: "Original name", namingDate: "Date-time",
      namingSeq: "Sequence number", namingDateOriginal: "Date + Original",
      namingSeqOriginal: "Sequence + Original",
      prefix: "Prefix (optional)", prefixPlaceholder: "e.g. channelname",
      folder: "Destination folder",
      pickFolder: "Pick folder", clearFolder: "Clear",
      folderNone: "Not set (browser Downloads folder)",
      folderUnsupported: "Browser does not support folder picker",
      resetSeq: "Reset sequence", seqNow: "Next number: {n}",
      close: "Close", clearHistory: "Clear download list",
      skippedDownloaded: "Skipped {n} already downloaded",
      postVideosDone: "Post done: {n} video(s)",
      downloadedCount: "Remembering {n} downloaded media (won't re-download)",
      forgetDownloaded: "Forget all",
      subfolder: "Auto subfolder",
      subfolderNone: "None (save flat)",
      subfolderDate: "By date (2026-10-24)",
      subfolderChannel: "By channel/chat",
      subfolderDateChannel: "Date / Channel",
      subfolderChannelDate: "Channel / Date",
      lang: "Language",
      showInChat: "Click to show it in the chat",
      secGeneral: "General", secNaming: "File name", secSave: "Saving", secData: "Data",
      namingPreview: "Example:", subfolderNeedsFolder: "Pick a destination folder above to use this",
    },
  };

  const STORAGE_PREFIX = "sakerly:";
  const loadStore = (k, fb) => {
    try {
      const v = localStorage.getItem(STORAGE_PREFIX + k);
      return v == null ? fb : JSON.parse(v);
    } catch { return fb; }
  };
  const saveStore = (k, v) => {
    try { localStorage.setItem(STORAGE_PREFIX + k, JSON.stringify(v)); } catch { /* localStorage bị chặn hoặc đầy: bỏ qua */ }
  };

  const defaultLang = () =>
    ((typeof navigator !== "undefined" && navigator.language) || "en").toLowerCase().startsWith("vi") ? "vi" : "en";
  let currentLang = TEST_MODE ? "vi" : loadStore("lang", defaultLang());
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
    if (!err.translationKey) return t("errorFatal", { message: err.message || String(err) });
    const p = { ...err.params };
    if (err.translationKey === "errorMime") { p.kind = t(p.kind); p.mime ||= t("unknownType"); }
    return t(err.translationKey, p);
  };

  const log = {
    info: (m, f = null) => console.log(`[sakerly]${f ? ` ${f}:` : ""} ${m}`),
    warn: (m, f = null) => console.warn(`[sakerly]${f ? ` ${f}:` : ""} ${m}`),
    error: (m, f = null) => console.error(`[sakerly]${f ? ` ${f}:` : ""} ${m}`),
  };

  const sleep = (ms, signal) => new Promise((resolve, reject) => {
    const timer = setTimeout(finish, ms);
    function finish() {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }
    function onAbort() { finish(); reject(signal.reason); }
    if (signal?.aborted) { onAbort(); return; }
    signal?.addEventListener("abort", onAbort, { once: true });
  });

  const formatBytes = (bytes) => {
    const u = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.min(Math.floor(Math.log(Math.max(bytes, 1)) / Math.log(1024)), u.length - 1);
    return `${(i ? decFmt() : intFmt()).format(bytes / 1024 ** i)} ${u[i]}`;
  };

  const formatDuration = (sec) => {
    if (!Number.isFinite(sec) || sec < 0) return "–";
    sec = Math.round(sec);
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    const pad = (n) => String(n).padStart(2, "0");
    return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
  };

  // pattern getRetryTimeout của WebA, cộng jitter
  const backoffDelay = (attempt) =>
    Math.min(RETRY_BASE_MS * 2 ** attempt, RETRY_MAX_MS) + Math.random() * 250;

  const CONTENT_RANGE_RE = /^bytes (\d+)-(\d+)\/(\d+|\*)$/;

  const DEFAULT_SETTINGS = { naming: "original", prefix: "", subfolder: "none", connections: 3 };
  const settings = Object.assign({}, DEFAULT_SETTINGS, TEST_MODE ? {} : loadStore("settings", {}));
  const getConnections = () => Math.min(4, Math.max(1, Number(settings.connections) || 3));
  let seqCounter = TEST_MODE ? 1 : loadStore("seq", 1);

  const openIDB = () => new Promise((res, rej) => {
    const r = indexedDB.open("sakerly", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("kv");
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  const idbGet = async (k) => {
    try {
      const db = await openIDB();
      return await new Promise((res) => {
        const tx = db.transaction("kv").objectStore("kv").get(k);
        tx.onsuccess = () => res(tx.result); tx.onerror = () => res(null);
      });
    } catch { return null; }
  };
  const idbSet = async (k, v) => {
    try {
      const db = await openIDB();
      await new Promise((res) => {
        const tx = db.transaction("kv", "readwrite").objectStore("kv").put(v, k);
        tx.onsuccess = () => res(); tx.onerror = () => res();
      });
    } catch { /* IndexedDB không dùng được: chỉ mất phần nhớ thư mục */ }
  };
  const idbDel = async (k) => {
    try {
      const db = await openIDB();
      await new Promise((res) => {
        const tx = db.transaction("kv", "readwrite").objectStore("kv").delete(k);
        tx.onsuccess = () => res(); tx.onerror = () => res();
      });
    } catch { /* IndexedDB không dùng được: chỉ mất phần nhớ thư mục */ }
  };

  // Giữ Blob đằng sau blob: URL do app tạo: tải bằng Blob.slice không qua mạng, vẫn đọc được sau khi app revoke URL
  const BlobRegistry = (() => {
    const map = new Map();
    let totalBytes = 0;

    const remember = (url, obj) => {
      if (!url || typeof url !== "string" || !url.startsWith("blob:")) return url;
      const bytes = (obj && typeof obj.size === "number") ? obj.size : 0;
      map.set(url, { obj, bytes, ts: Date.now() });
      totalBytes += bytes;
      while (map.size > BLOB_REGISTRY_MAX || (totalBytes > BLOB_REGISTRY_BYTES && map.size > 1)) {
        const oldest = map.keys().next().value;
        if (oldest === undefined) break;
        totalBytes -= map.get(oldest).bytes;
        map.delete(oldest);
      }
      return url;
    };

    const get = (url) => {
      const e = map.get(url);
      if (!e) return null;
      map.delete(url); map.set(url, e); e.ts = Date.now();
      return e.obj;
    };

    const install = () => {
      try {
        if (typeof URL === "undefined" || typeof URL.createObjectURL !== "function") return;
        const nativeCreate = URL.createObjectURL.bind(URL);
        const nativeRevoke = URL.revokeObjectURL?.bind(URL);
        URL.createObjectURL = function (obj) {
          const url = nativeCreate(obj);
          try { remember(url, obj); } catch { /* lỗi của hook không được làm hỏng createObjectURL của app */ }
          return url;
        };
        if (nativeRevoke) {
          URL.revokeObjectURL = function (url) {
            return nativeRevoke(url); // revoke chỉ hủy URL, Blob vẫn dùng được
          };
        }
      } catch (e) { log.warn("BlobRegistry install failed: " + e.message); }
    };

    return { install, get, remember, size: () => map.size };
  })();
  if (!TEST_MODE) BlobRegistry.install();

  class SpeedMeter {
    constructor(windowMs = 3000) {
      this.windowMs = windowMs;
      this.samples = []; // [ts, cumulativeBytes]
      this.total = 0;
      this.last = performance.now();
    }
    push(bytes) {
      const now = performance.now();
      this.total += bytes;
      this.samples.push([now, this.total]);
      const cutoff = now - this.windowMs;
      while (this.samples.length > 2 && this.samples[0][0] < cutoff) this.samples.shift();
    }
    speed() {
      if (this.samples.length < 2) return 0;
      const first = this.samples[0], last = this.samples[this.samples.length - 1];
      const dt = (last[0] - first[0]) / 1000;
      if (dt <= 0.05) return 0;
      return Math.max(0, (last[1] - first[1]) / dt);
    }
  }

  // Bản đồ interval byte đã xong / đang claim (ý tưởng FileView của WebA): chunk lệch thứ tự và resume đều tự nhiên
  class RangeLedger {
    constructor() {
      this.total = null; // chưa biết cho tới response đầu tiên
      this.done = []; // [start, end) đã xong, sắp xếp, không giao nhau
      this.claimed = []; // [start, end) đang được worker giữ
      this._received = 0;
    }

    get received() { return this._received; }
    get remaining() { return this.total == null ? null : Math.max(0, this.total - this._received); }
    isComplete() { return this.total != null && this._received >= this.total; }

    setTotal(total) {
      if (this.total != null && this.total !== total) {
        throw downloadError("errorRangeInconsistent", {}, "InconsistentError");
      }
      this.total = total;
    }

    _insertInto(list, start, end) {
      const out = [];
      let placed = false;
      let s = start, e = end;
      for (const [is, ie] of list) {
        if (ie < s) { out.push([is, ie]); continue; }
        if (is > e) { if (!placed) { out.push([s, e]); placed = true; } out.push([is, ie]); continue; }
        s = Math.min(s, is); e = Math.max(e, ie);
      }
      if (!placed) out.push([s, e]);
      list.length = 0;
      for (const iv of out) list.push(iv);
    }

    // ưu tiên đầu file để preview phát được sớm
    claim(size) {
      if (this.total == null) {
        // chưa biết tổng dung lượng: chỉ 1 worker dẫn đầu với claim vô hạn + hint size
        if (this.claimed.length || this.done.length) return null;
        this.claimed.push([0, InfinityMarker]);
        return { start: 0, end: InfinityMarker, size };
      }
      let cursor = 0;
      const busy = [...this.done, ...this.claimed].sort((a, b) => a[0] - b[0]);
      for (const [s, e] of busy) {
        if (s > cursor) {
          const end = Math.min(s, cursor + size, this.total);
          if (end > cursor) {
            this._insertInto(this.claimed, cursor, end);
            return { start: cursor, end, size: end - cursor };
          }
        }
        cursor = Math.max(cursor, e);
      }
      if (cursor < this.total) {
        const end = Math.min(this.total, cursor + size);
        this._insertInto(this.claimed, cursor, end);
        return { start: cursor, end, size: end - cursor };
      }
      return null;
    }

    // phần thiếu trả lại cho chính worker (SW có thể trả ngắn); claim vô hạn chỉ giữ đúng hint size để worker khác cùng chia file
    complete(claim, covered) {
      const cs = claim.start, ce = claim.end;
      const hint = (Number.isFinite(claim.size) && claim.size > 0) ? claim.size : 512 * 1024;
      const effEnd = Number.isFinite(ce)
        ? ce
        : Math.min(cs + hint, this.total != null ? this.total : Infinity);
      const doneEnd = cs + covered;
      this._removeClaim(claim);
      if (covered > 0) {
        this._insertInto(this.done, cs, doneEnd);
        this._received += covered;
      }
      if (doneEnd < effEnd) {
        this._insertInto(this.claimed, doneEnd, effEnd);
        const size = effEnd - doneEnd;
        return { start: doneEnd, end: effEnd, size: size > 0 ? size : hint, partial: true };
      }
      return null;
    }

    release(claim) {
      this._removeClaim(claim);
    }

    _removeClaim(claim) {
      const out = [];
      for (const [s, e] of this.claimed) {
        if (claim.start > s) out.push([s, Math.min(e, claim.start)]);
        if (claim.end < e) out.push([Math.max(s, claim.end), e]);
      }
      this.claimed.length = 0;
      for (const iv of out) {
        if (iv[1] > iv[0]) this.claimed.push(iv);
      }
      this.claimed.sort((a, b) => a[0] - b[0]);
    }

    hasClaims() { return this.claimed.length > 0; }
  }
  const InfinityMarker = Infinity;

  const NetBudget = {
    active: 0,
    waiters: [],
    async acquire(bytes) {
      if (this.active + bytes <= NET_BUDGET_BYTES) { this.active += bytes; return; }
      await new Promise((resolve) => { this.waiters.push({ resolve, bytes }); });
    },
    release(bytes) {
      this.active = Math.max(0, this.active - bytes);
      while (this.waiters.length && this.active + this.waiters[0].bytes <= NET_BUDGET_BYTES) {
        const w = this.waiters.shift();
        this.active += w.bytes;
        w.resolve();
      }
    },
  };

  // ghi theo vị trí nên chunk lệch thứ tự vẫn đúng; keepExistingData cho Retry chỉ vá phần thiếu
  class FsWriter {
    constructor(handle, opts = {}) {
      this.handle = handle;
      this.opts = opts;
      this.writable = null;
      this.closed = false;
    }
    static get supported() {
      return typeof FileSystemFileHandle !== "undefined" &&
        typeof FileSystemFileHandle.prototype.createWritable === "function";
    }
    async open(keepExisting = false) {
      if (this.writable && !this.closed) return this.writable;
      this.writable = await this.handle.createWritable(
        keepExisting ? { keepExistingData: true } : {}
      );
      this.closed = false;
      return this.writable;
    }
    async writeAt(position, data) {
      const w = await this.open();
      await w.write({ type: "write", position, data });
    }
    async close() {
      if (this.writable && !this.closed) { await this.writable.close(); this.closed = true; }
      this.writable = null;
    }
    async abort() {
      if (this.writable && !this.closed) { try { await this.writable.abort(); } catch { /* stream đã đóng */ } }
      this.closed = true; this.writable = null;
    }
    get isClosed() { return this.closed || !this.writable; }
  }

  // dự phòng cho trình duyệt không có File System Access
  class MemWriter {
    constructor() { this.parts = new Map(); this._bytes = 0; }
    // LazyWriter gọi open() khi resume; MemWriter không cần mở lại gì
    async open() {}
    async writeAt(position, data) { this.parts.set(position, data); this._bytes += data.byteLength; }
    get bytes() { return this._bytes; }
    get size() { return this.parts.size; }
    assemble(mime) {
      const offsets = [...this.parts.keys()].sort((a, b) => a - b);
      return new Blob(offsets.map((o) => this.parts.get(o)), { type: mime || "application/octet-stream" });
    }
    async close() {}
    async abort() { this.parts.clear(); this._bytes = 0; }
    get isClosed() { return false; }
  }

  const tagError = (err, { retryable = false, fatal = false } = {}) => {
    if (err && typeof err === "object") {
      if (retryable) err.retryable = true;
      if (fatal) err.fatal = true;
    }
    return err;
  };
  const isAbortLike = (err) =>
    err?.name === "AbortError" || err?.name === "DOMException" && /abort/i.test(err?.message || "");

  // SW WebA đôi khi trả application/octet-stream hoặc không có Content-Type
  const mimeAcceptable = (mime, kind) => {
    if (!mime) return true;
    if (!kind) return true;
    if (mime.startsWith(`${kind}/`)) return true;
    return mime === "application/octet-stream" || mime === "application/download";
  };

  async function fetchChunk(task, claim) {
    const { signal } = task.controller;
    const ledger = task.ledger;
    // claim vô hạn đi kèm hint size nên request luôn có giới hạn
    const reqSpan = (Number.isFinite(claim.size) && claim.size > 0)
      ? Math.min(claim.size, CHUNK_MAX)
      : CHUNK_MAX;
    const reqEnd = claim.start + reqSpan - 1;

    await NetBudget.acquire(reqSpan);
    const controller = new AbortController();
    const relayAbort = () => controller.abort(signal.reason);
    if (signal.aborted) relayAbort();
    else signal.addEventListener("abort", relayAbort, { once: true });

    let stallTimer = null;
    const clearStall = () => { if (stallTimer) { clearTimeout(stallTimer); stallTimer = null; } };
    const resetStall = () => {
      clearStall();
      stallTimer = setTimeout(
        () => controller.abort(tagError(downloadError("errorStall", {}, "TimeoutError"), { retryable: true })),
        STALL_TIMEOUT_MS
      );
    };

    let reader = null;
    let chunkReceived = 0; // tính vào task.inflight tới khi ghi xong
    try {
      resetStall();
      const res = await fetch(task.url, {
        headers: { Range: `bytes=${claim.start}-${reqEnd}` },
        signal: controller.signal,
      });

      if (res.status !== 206 && res.status !== 200) {
        const err = tagError(downloadError("errorHttp", { status: res.status }),
          { retryable: res.status >= 500 || res.status === 429, fatal: !(res.status >= 500 || res.status === 429) });
        throw err;
      }

      const mime = res.headers.get("Content-Type")?.split(";")[0].trim().toLowerCase() || "";
      if (!mimeAcceptable(mime, task.kind)) {
        throw tagError(downloadError("errorMime", { kind: task.kind, mime }), { fatal: true });
      }

      let expected = null;
      if (res.status === 206) {
        const m = res.headers.get("Content-Range")?.match(CONTENT_RANGE_RE);
        if (!m) throw tagError(downloadError("errorRangeMissing"), { fatal: true });
        const crStart = +m[1], crEnd = +m[2];
        const crTotal = m[3] === "*" ? null : +m[3];
        if (crStart !== claim.start || crEnd < crStart) {
          throw tagError(downloadError("errorRangeInconsistent"), { fatal: true });
        }
        if (crTotal != null && !Number.isSafeInteger(crTotal)) {
          throw tagError(downloadError("errorRangeInconsistent"), { fatal: true });
        }
        expected = crEnd - crStart + 1;
        if (expected > reqSpan + 1) {
          throw tagError(downloadError("errorTooLarge"), { fatal: true });
        }
        if (crTotal != null) ledger.setTotal(crTotal);
        if (task.mime !== mime && mime) task.mime = mime;
      } else {
        // 200 chỉ hợp lệ từ offset 0 (blob: hoặc server không hỗ trợ Range)
        if (claim.start !== 0) {
          throw tagError(downloadError("errorRangeUnsupported"), { fatal: true });
        }
        const len = res.headers.get("Content-Length");
        if (len !== null && !res.headers.has("Content-Encoding")) {
          if (!/^\d+$/.test(len) || !Number.isSafeInteger(Number(len))) {
            throw tagError(downloadError("errorLength"), { fatal: true });
          }
          expected = Number(len);
          ledger.setTotal(expected);
        }
        if (mime) task.mime = mime;
      }

      if (!res.body) throw tagError(downloadError("errorEmpty"), { fatal: true });
      reader = res.body.getReader();
      const onAbortCancel = () => { reader?.cancel().catch(() => {}); };
      controller.signal.addEventListener("abort", onAbortCancel, { once: true });

      const pieces = [];
      let received = 0;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        received += value.byteLength;
        chunkReceived = received;
        if (expected != null && received > expected) {
          throw tagError(downloadError("errorTooLarge"), { fatal: true });
        }
        task.meter.push(value.byteLength);
        task.inflight = (task.inflight || 0) + value.byteLength;
        resetStall();
        pieces.push(value);
        bumpProgress(task);
      }

      if (received === 0) throw tagError(downloadError("errorEmpty"), { retryable: true });
      // 200 không có Content-Length: body chính là toàn bộ file
      if (res.status === 200 && ledger.total == null) {
        ledger.setTotal(received);
      }

      const data = pieces.length === 1 ? pieces[0] : concatU8(pieces);
      await task.writer.writeAt(claim.start, data);
      return { covered: received, mime };
    } catch (err) {
      // stall timer hủy request (không phải người dùng hủy): cho retry
      if (!signal.aborted && controller.signal.aborted) {
        throw tagError(controller.signal.reason || downloadError("errorStall", {}, "TimeoutError"), { retryable: true });
      }
      if (err instanceof TypeError) tagError(err, { retryable: true });
      throw err;
    } finally {
      clearStall();
      signal.removeEventListener("abort", relayAbort);
      if (reader) { await reader.cancel().catch(() => {}); reader = null; }
      task.inflight = Math.max(0, (task.inflight || 0) - chunkReceived);
      NetBudget.release(reqSpan);
      bumpProgress(task);
    }
  }

  const concatU8 = (arrays) => {
    let len = 0;
    for (const a of arrays) len += a.byteLength;
    const out = new Uint8Array(len);
    let off = 0;
    for (const a of arrays) { out.set(a, off); off += a.byteLength; }
    return out;
  };

  async function downloadFromBlob(task, blob) {
    const total = blob.size;
    task.total = total;
    task.mime = task.mime || blob.type || "";
    task.ledger = null;
    task.receivedDirect = 0;
    const workers = Math.max(1, getConnections());
    const sliceSize = 8 * MB;
    let cursor = 0;

    const worker = async () => {
      while (true) {
        if (task.controller.signal.aborted) throw task.controller.signal.reason;
        if (task.pauseFlag) return;
        const start = cursor;
        cursor = Math.min(start + sliceSize, total);
        if (start >= total) return;
        const end = cursor;
        const buf = new Uint8Array(await blob.slice(start, end).arrayBuffer());
        task.meter.push(buf.byteLength);
        task.receivedDirect = (task.receivedDirect || 0) + buf.byteLength;
        await task.writer.writeAt(start, buf);
        bumpProgress(task);
      }
    };
    await Promise.all(Array.from({ length: workers }, worker));
    task.receivedDirect = total;
  }

  async function parallelRangeDownload(task) {
    const ledger = task.ledger || (task.ledger = new RangeLedger());
    let chunkSize = task.chunkSize || CHUNK_DEFAULT;
    const isWebKStream = /\/stream\//.test(task.url);
    let fullStreak = 0;

    const worker = async () => {
      let claim = null;
      try {
        while (true) {
          // claim đang giữ (nếu có) được trả về ở catch ngoài
          if (task.controller.signal.aborted) throw task.controller.signal.reason;
          if (task.pauseFlag) throw PAUSE_SIGNAL;

          if (!claim) {
            claim = ledger.claim(chunkSize);
            if (!claim) {
              if (ledger.isComplete()) return;
              if (ledger.hasClaims()) { await sleep(120, task.controller.signal); continue; }
              return; // worker khác lỗi thì Promise.all sẽ throw
            }
          }

          let attempt = 0;
          while (true) {
            try {
              const got = await fetchChunk(task, claim);
              const wantFull = Number.isFinite(claim.end)
                ? claim.end - claim.start
                : got.covered;
              const partial = ledger.complete(claim, got.covered);
              bumpProgress(task);
              // stream/ của WebK nhận part 1MB: tăng lên sau 4 chunk đầy liên tiếp
              if (isWebKStream && got.covered >= wantFull) {
                if (++fullStreak >= 4 && chunkSize < CHUNK_MAX) { chunkSize = CHUNK_MAX; }
              } else fullStreak = 0;
              task.chunkSize = chunkSize;
              claim = partial || null;
              break;
            } catch (err) {
              // pause/cancel/fatal ném ra ngoài; lỗi mạng thì giữ claim để retry đúng đoạn đó
              if (task.pauseFlag) throw PAUSE_SIGNAL;
              if (task.controller.signal.aborted) throw task.controller.signal.reason || err;
              if (err?.fatal) throw err;
              attempt++;
              if (attempt >= CHUNK_RETRIES) {
                tagError(err, { retryable: true });
                throw err;
              }
              if (err?.name === "TimeoutError") {
                chunkSize = Math.max(CHUNK_MIN, chunkSize / 2);
                task.chunkSize = chunkSize;
              }
              await sleep(backoffDelay(attempt), task.controller.signal);
            }
          }
        }
      } catch (err) {
        // mọi lối thoát lỗi đều trả claim về ledger, nếu không Resume sẽ chờ một claim không ai giữ
        if (claim) { try { ledger.release(claim); } catch { /* claim đã được trả */ } claim = null; }
        // hủy task để các worker còn lại dừng ngay, không tải lại
        if (!task.pauseFlag && !task.controller.signal.aborted) {
          try { task.controller.abort(err); } catch { /* controller đã bị hủy */ }
        }
        throw err;
      }
    };

    let lastBytes = ledger.received, lastTs = Date.now();
    const watchdog = setInterval(() => {
      const cur = ledger.received + (task.inflight || 0);
      if (cur > lastBytes) { lastBytes = cur; lastTs = Date.now(); return; }
      if (Date.now() - lastTs > WATCHDOG_MS) {
        task.controller.abort(tagError(new Error("watchdog: no progress"), { fatal: true }));
      }
    }, 5000);

    try {
      // khi chưa biết total, claim() chỉ cho 1 worker dẫn đầu; các worker khác poll rồi vào cuộc khi đã biết
      const n = Math.max(1, getConnections());
      await Promise.all(Array.from({ length: n }, worker));
    } finally {
      clearInterval(watchdog);
    }

    if (!ledger.isComplete()) {
      throw tagError(downloadError("errorIncomplete"), { retryable: true });
    }
  }

  const PAUSE_SIGNAL = Object.assign(new Error("paused"), { name: "PauseSignal", pause: true });

  async function engineDownload(task) {
    const blobObj = task.url.startsWith("blob:") ? BlobRegistry.get(task.url) : null;
    if (blobObj instanceof Blob) {
      log.info(`blob fast-path (${formatBytes(blobObj.size)})`, task.fileName);
      await downloadFromBlob(task, blobObj);
      return;
    }
    await parallelRangeDownload(task);
  }

  function bumpProgress(task) {
    if (task.ledger) {
      task.received = task.ledger.received + (task.inflight || 0);
      if (task.ledger.total != null) task.total = task.ledger.total;
    } else if (task.receivedDirect != null) {
      task.received = task.receivedDirect;
      if (task.total == null) task.total = task.received;
    }
    const speed = task.meter?.speed() || 0;
    task.speed = speed;
    task.eta = (speed > 0 && task.total) ? (task.total - task.received) / speed : null;
    throttledRender(task);
  }

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

  let downloadedKeys = new Set(TEST_MODE ? [] : loadStore("downloaded", []));
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
    const seq = () => {
      const s = pad3(seqCounter);
      if (!peek) { seqCounter++; saveStore("seq", seqCounter); }
      return s;
    };
    switch (settings.naming) {
      case "date": return prefix + nowStamp() + ext;
      case "seq": return prefix + seq() + ext;
      case "date_original": return prefix + nowStamp() + "_" + base + ext;
      case "seq_original": return prefix + seq() + "_" + base + ext;
      default: return prefix + base + ext;
    }
  };

  let destDirHandle = null;
  let destDirName = TEST_MODE ? "" : loadStore("destDirName", "");
  if (!TEST_MODE) idbGet("destDirHandle").then((h) => { if (h) destDirHandle = h; });

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
  const uniqueFileHandle = async (dir, name) => {
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

  // chạy lần lượt, cách 400ms, để Chrome không chặn vì "tải nhiều file"
  let saveChain = Promise.resolve();
  const saveMediaBlob = (blob, fileName, hrefOverride) => {
    const run = () => new Promise((res) => {
      const url = hrefOverride || URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = fileName || "";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => { if (!hrefOverride) URL.revokeObjectURL(url); res(); }, 400);
    });
    saveChain = saveChain.then(run, run);
    return saveChain;
  };

  // SW WebA trả download/ dạng attachment: trình duyệt stream thẳng xuống đĩa, không tốn RAM
  const webaDownloadFallback = (url, fileName) => {
    try {
      const u = new URL(url, location.href);
      const idx = u.pathname.indexOf("/progressive/");
      if (idx < 0) return null;
      const hash = u.pathname.slice(idx + "/progressive/".length);
      if (!/^((document|photo)\d+)/.test(hash)) return null;
      u.pathname = u.pathname.slice(0, idx) + "/download/" + hash;
      if (!u.searchParams.has("download")) u.searchParams.set("download", "1");
      if (fileName) u.searchParams.set("filename", sanitizeName(fileName).slice(0, 120));
      return u.href;
    } catch { return null; }
  };

  // chỉ tạo file thật khi chunk đầu về, lúc đã biết mime và tên
  class LazyWriter {
    constructor(task) { this.task = task; this.inner = null; }
    async _ensure() {
      if (this.inner) return this.inner;
      const task = this.task;
      if (task.handle) {
        this.inner = FsWriter.supported ? new FsWriter(task.handle) : new MemWriter();
      } else {
        const dir = await resolveDestDir();
        if (dir && FsWriter.supported) {
          task.fileName = applyNaming(task.fileName);
          const { fh, name } = await uniqueFileHandle(dir, task.fileName);
          task.fileName = name;
          task._createdFile = fh;
          this.inner = new FsWriter(fh);
        } else if (task.total > 1200 * MB && (task.url || "").includes("/progressive/")) {
          // quá lớn để giữ trong RAM mà không có writer ghi đĩa: chuyển cho download/ của WebA
          const fb = webaDownloadFallback(task.url, task.fileName);
          if (fb) throw Object.assign(new Error("large file, no disk writer"), { handoffUrl: fb, handoff: true, fatal: true });
          this.inner = new MemWriter();
        } else {
          this.inner = new MemWriter();
        }
      }
      await this.inner.open(task.resumeMode === true);
      return this.inner;
    }
    async writeAt(position, data) { return (await this._ensure()).writeAt(position, data); }
    async open(keepExisting = false) {
      if (this.inner) await this.inner.open(keepExisting);
    }
    async close() { await this.inner?.close(); }
    async abort() { await this.inner?.abort(); }
    async discardCreatedFile() {
      try { await this.task._createdFile?.remove?.(); } catch { /* file đã bị xoá */ }
      this.task._createdFile = null;
    }
    get real() { return this.inner; }
  }

  const downloadTasks = new Map();
  const activeTasks = new Map(); // dedupe task đang chạy theo key và URL
  const waitingQueue = [];
  let runningCount = 0;

  let renderTask = () => {}; // được thay khi UI dựng xong
  let updatePanelCounts = () => {};

  const throttledRender = (task) => {
    const now = performance.now();
    if (now - (task._renderedAt || 0) >= 50) { task._renderedAt = now; renderTask(task); }
    else if (!task._renderTimer) {
      task._renderTimer = setTimeout(() => {
        task._renderTimer = null; task._renderedAt = performance.now(); renderTask(task);
      }, 50);
    }
  };

  const finishTask = (task, state, error) => {
    if (task.finished) return;
    task.finished = true;
    clearTimeout(task._renderTimer);
    task.state = state; task.error = error;
    task.speed = 0; task.eta = null;
    if (activeTasks.get(task.key) === task) activeTasks.delete(task.key);
    if (state === "completed" || state === "handedOff") markDownloaded(task.mediaKey);
    if (error) log.error(error.message || String(error), task.fileName);
    renderTask(task);
    updatePanelCounts();
    task.resolve({ state, fileName: task.fileName, received: task.received });
  };

  const runTask = async (task) => {
    if (task.running) return;
    task.running = true;
    try {
      if (!task.writer) task.writer = new LazyWriter(task);
      if (task.controller.signal.aborted) throw task.controller.signal.reason;

      task.state = "preparing"; renderTask(task);
      await task.writer.open(task.resumeMode === true);
      if (task.resumeMode) {
        log.info(`resume từ ${formatBytes(task.ledger?.received || 0)}`, task.fileName);
        task.resumeMode = false;
      }
      if (task.controller.signal.aborted) throw task.controller.signal.reason;

      task.state = "downloading"; task.startedAt = performance.now(); renderTask(task);
      await engineDownload(task);
      if (task.controller.signal.aborted) throw task.controller.signal.reason;

      task.state = "saving"; renderTask(task);
      const real = task.writer.real;
      if (real instanceof FsWriter) {
        await real.close();
        finishTask(task, "completed");
      } else {
        // mime chỉ chắc chắn sau chunk cuối nên tính lại đuôi file
        task.fileName = applyNaming(getDownloadFileName(task.url, task.mime, task.kind));
        renderTask(task);
        const blob = real.assemble(task.mime);
        const dir = await resolveDestDir();
        if (dir && FsWriter.supported) {
          const { fh, name } = await uniqueFileHandle(dir, task.fileName);
          task.fileName = name;
          const w = await fh.createWritable();
          await w.write(blob); await w.close();
          finishTask(task, "completed");
        } else {
          await saveMediaBlob(blob, task.fileName);
          finishTask(task, "handedOff");
        }
      }
    } catch (err) {
      if (task.pauseFlag) {
        task.state = "paused"; task.speed = 0; task.eta = null;
        renderTask(task);
        return;
      }
      // chỉ người dùng hủy mới tính là cancelled; stall/watchdog chỉ hủy request bên trong
      const signalReason = task.controller.signal?.reason;
      if (task.cancelRequested || isAbortLike(signalReason)) {
        await task.writer?.abort();
        await task.writer?.discardCreatedFile?.();
        finishTask(task, "cancelled");
        return;
      }
      if (err?.handoff && err.handoffUrl) {
        log.warn("handing off to native download endpoint (large file, no FS Access)", task.fileName);
        task.usedNativeFallback = true;
        try {
          await saveMediaBlob(null, applyNaming(task.fileName), err.handoffUrl);
          finishTask(task, "handedOff");
          return;
        } catch (e) { log.error("native handoff failed: " + e.message); }
      }
      // engine đã hủy controller cũ nên retry bằng controller mới
      if (err?.retryable && !err.fatal && !task.pauseFlag && !task.cancelRequested &&
          (task.autoRetries || 0) < TASK_AUTO_RETRY_MAX) {
        task.autoRetries = (task.autoRetries || 0) + 1;
        task.controller = new AbortController();
        log.warn(`task retry ${task.autoRetries}/${TASK_AUTO_RETRY_MAX}: ${err.message}`, task.fileName);
        try { await sleep(TASK_AUTO_RETRY_DELAY, task.controller.signal); } catch { /* aborted */ }
        if (!task.pauseFlag && !task.controller.signal.aborted) {
          task.running = false;
          return runTask(task);
        }
        if (task.pauseFlag) {
          task.controller = new AbortController();
          task.state = "paused"; renderTask(task);
          return;
        }
        await task.writer?.abort(); await task.writer?.discardCreatedFile?.();
        finishTask(task, "cancelled");
        return;
      }
      // commit phần đã tải để Retry tiếp tục từ đó
      if (task.writer) { try { await task.writer.close(); } catch { /* commit phần đã tải chỉ là cố gắng thêm */ } }
      if (!task.usedNativeFallback) {
        const fb = webaDownloadFallback(task.url, applyNaming(task.fileName));
        if (fb) {
          task.usedNativeFallback = true;
          log.warn("falling back to native download endpoint", task.fileName);
          try {
            await saveMediaBlob(null, task.fileName, fb);
            finishTask(task, "handedOff");
            return;
          } catch (e) { log.error("native fallback failed: " + e.message); }
        }
      }
      finishTask(task, "failed", err);
    } finally {
      task.running = false;
    }
  };

  const onTaskSettled = () => { runningCount--; pumpQueue(); };
  const pumpQueue = () => {
    while (runningCount < MAX_ACTIVE_TASKS && waitingQueue.length) {
      const task = waitingQueue.shift();
      if (task.finished || task.pauseFlag || task.running) continue;
      runningCount++;
      runTask(task).finally(onTaskSettled);
    }
  };

  const downloadMedia = (url, kind, opts = {}) => {
    if (typeof url !== "string" || !url) return Promise.resolve();
    const mk = opts.mediaKey || mediaKey(url);
    if (opts.skipDownloaded && downloadedKeys.has(mk)) return Promise.resolve({ state: "skipped" });
    const key = `${kind}:${mk}`;
    const existing = activeTasks.get(key);
    if (existing && !existing.finished) {
      if (!opts.silent) renderTask(existing, true);
      return existing.promise;
    }
    // cùng nguồn đi qua 2 đường (viewer và chat) vẫn là một file: trả về task đang chạy
    for (const t of activeTasks.values()) {
      if (!t.finished && t.url === url) {
        if (!opts.silent) renderTask(t, true);
        return t.promise;
      }
    }
    if (downloadTasks.size >= 30) {
      for (const prev of downloadTasks.values()) {
        if (downloadTasks.size < 30) break;
        if (prev.finished) {
          document.getElementById("sk-task-" + prev.id)?.remove();
          downloadTasks.delete(prev.id);
        }
      }
    }
    const task = {
      id: Math.random().toString(36).slice(2) + Date.now().toString(36),
      key, url, kind, mediaKey: mk,
      fileName: getDownloadFileName(url, getMediaMetadata(url)?.mimeType, kind),
      state: "preparing", received: 0, total: null, speed: 0, eta: null, inflight: 0,
      controller: new AbortController(),
      meter: new SpeedMeter(),
      startedAt: performance.now(), finished: false,
      pauseFlag: false, cancelRequested: false,
    };
    task.promise = new Promise((r) => (task.resolve = r));
    downloadTasks.set(task.id, task);
    activeTasks.set(key, task);
    renderTask(task, true);
    const enqueue = (handle) => {
      if (task.finished) return;
      task.handle = handle || null;
      task.state = "queued";
      renderTask(task);
      waitingQueue.push(task);
      pumpQueue();
    };
    try {
      const pw = typeof unsafeWindow === "undefined" ? window : unsafeWindow;
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

  const pauseTask = (task) => {
    if (task.finished || task.pauseFlag) return;
    if (task.state === "queued") {
      const idx = waitingQueue.indexOf(task);
      if (idx >= 0) waitingQueue.splice(idx, 1);
      task.pauseFlag = true;
      task.state = "paused";
      renderTask(task);
      return;
    }
    if (task.state !== "downloading" && task.state !== "preparing") return;
    task.pauseFlag = true;
    task.cancelRequested = false;
    task.controller.abort(PAUSE_SIGNAL);
  };

  const resumeTask = (task) => {
    if (task.finished || !task.pauseFlag) return;
    task.pauseFlag = false;
    task.controller = new AbortController();
    task.state = "queued";
    task.autoRetries = 0;
    renderTask(task);
    waitingQueue.push(task);
    pumpQueue();
  };

  const cancelTask = (task) => {
    if (task.finished) return;
    task.cancelRequested = true;
    task.pauseFlag = false;
    task.controller.abort(new DOMException("Download cancelled", "AbortError"));
    const idx = waitingQueue.indexOf(task);
    if (idx >= 0) waitingQueue.splice(idx, 1);
    if (!task.running) {
      const cleanup = task.writer
        ? task.writer.abort().catch(() => {}).then(() => task.writer?.discardCreatedFile?.()).catch(() => {})
        : Promise.resolve();
      cleanup.then(() => finishTask(task, "cancelled"));
    }
  };

  const retryTask = (task) => {
    if (!task.finished || !["failed", "cancelled"].includes(task.state)) return;
    task.finished = false;
    task.error = null;
    task.state = "queued";
    task.autoRetries = 0;
    task.cancelRequested = false;
    task.pauseFlag = false;
    task.controller = new AbortController();
    if (task.ledger && !task.ledger.isComplete()) {
      task.resumeMode = true;
      log.info(`retry-resume: còn thiếu ${formatBytes(task.ledger.remaining)}`, task.fileName);
    } else {
      task.ledger = null;
      task.meter = new SpeedMeter();
    }
    downloadTasks.set(task.id, task);
    activeTasks.set(task.key, task);
    renderTask(task);
    waitingQueue.push(task);
    pumpQueue();
  };

  const TG_LOGO_SVG =
    '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21.5 4.5L2.8 11.7c-.8.3-.8 1.5.1 1.7l4.6 1.4 1.7 5.2c.3.8 1.3 1 1.9.4l2.5-2.4 4.7 3.4c.7.5 1.6.1 1.8-.7L23 5.8c.2-.9-.7-1.6-1.5-1.3z"/></svg>';
  const DL_ICON_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M5 16v4h14v-4"/></svg>';
  const QUEUE_ICON_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 15v4h14v-4"/><path d="M12 4v10"/><path d="M8 10l4 4 4-4"/><circle cx="18" cy="6" r="3" fill="currentColor" stroke="none"/></svg>';
  const GEAR_SVG =
    '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>';
  const TRASH_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>';

  const buildStyles = () => {
    const style = document.createElement("style");
    style.textContent = `
      :root {
        --sk-bg: #ffffff; --sk-bg-head: #f6f9fc; --sk-fg: #101b26;
        --sk-muted: #4a5a6d; --sk-line: #d9e2ec;
        --sk-track: #e3eaf2;
        --sk-accent: #0768c4; --sk-accent-fg: #ffffff;
        --sk-accent-bar: #2f8ce0; --sk-accent-soft: #e2effc; --sk-accent-chip: #0a5fae;
        --sk-ok: #0a7a52; --sk-ok-fg: #ffffff; --sk-ok-bar: #12b981;
        --sk-warn: #b45309; --sk-err: #d92d20; --sk-err-fg: #ffffff;
        --sk-radius: 14px;
        --sk-shadow: 0 12px 40px rgba(10,20,40,.22), 0 2px 6px rgba(10,20,40,.08);
      }
      html.night, html.theme-dark, html.dark {
        --sk-bg: #212e3d; --sk-bg-head: #293748; --sk-fg: #f2f6fa;
        --sk-muted: #c3d0dd; --sk-line: #3c4d61;
        --sk-track: #334257;
        --sk-accent: #1a72bd; --sk-accent-fg: #ffffff;
        --sk-accent-bar: #4aa5ff; --sk-accent-soft: #1c3a5c; --sk-accent-chip: #9fd1ff;
        --sk-ok: #0b7c56; --sk-ok-fg: #ffffff; --sk-ok-bar: #2ee6a8;
        --sk-warn: #f5a623; --sk-err: #ff6b6b; --sk-err-fg: #1a0505;
        --sk-shadow: 0 12px 40px rgba(0,0,0,.6), 0 2px 6px rgba(0,0,0,.4);
      }
      #sk-panel *, #sk-select *, #sk-settings * { box-sizing: border-box; }
      #sk-panel, #sk-select {
        position: fixed; z-index: 2147483646;
        background: var(--sk-bg); color: var(--sk-fg);
        border: 1px solid var(--sk-line); border-radius: var(--sk-radius);
        box-shadow: var(--sk-shadow); font: 13px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
        display: flex; flex-direction: column; overflow: hidden;
      }
      /* Phải ẩn cả ROOT — #sk-settings{display:flex} từng override rule [hidden]
         mặc định của UA khiến modal dính vĩnh viễn trên màn hình (bug 2.0.1). */
      #sk-panel [hidden], #sk-select [hidden], #sk-settings [hidden],
      #sk-panel[hidden], #sk-select[hidden], #sk-settings[hidden] { display: none !important; }

      #sk-panel {
        right: max(16px, env(safe-area-inset-right));
        bottom: max(16px, env(safe-area-inset-bottom));
        width: min(370px, calc(100vw - 32px)); max-height: min(calc(100vh - 32px), 620px);
      }
      #sk-panel.collapsed .sk-task-list, #sk-panel.collapsed .sk-foot,
      #sk-panel.collapsed .sk-empty { display: none; }
      #sk-select {
        right: max(16px, env(safe-area-inset-right));
        top: max(16px, env(safe-area-inset-top));
        width: min(320px, calc(100vw - 32px)); max-height: 70vh;
      }
      #sk-select.collapsed { width: auto; }
      #sk-select.collapsed .sk-select-body { display: none; }

      .sk-head {
        display: flex; align-items: center; gap: 8px; padding: 10px 12px; flex-shrink: 0;
        background: var(--sk-bg-head); border-bottom: 1px solid var(--sk-line);
        touch-action: none;
      }
      .sk-title {
        flex: 1; min-width: 0; font-weight: 700; font-size: 13.5px;
        display: flex; align-items: center; gap: 8px; cursor: move; user-select: none;
      }
      .sk-logo {
        width: 24px; height: 24px; flex-shrink: 0; display: inline-flex;
        align-items: center; justify-content: center; border-radius: 50%;
        background: linear-gradient(135deg, #37aee2, #1e96c8);
        box-shadow: 0 2px 6px rgba(55,174,226,.4);
      }
      .sk-count {
        background: var(--sk-accent-soft); color: var(--sk-accent-chip); border-radius: 10px;
        padding: 3px 10px; font-weight: 700; font-size: 11.5px; font-variant-numeric: tabular-nums;
      }
      .sk-count:empty, .sk-count[data-zero="1"] { opacity: .55; }
      .sk-icon-btn {
        appearance: none; background: var(--sk-track); color: var(--sk-fg); border: 0;
        width: 30px; height: 30px; padding: 0; border-radius: 50%;
        font: 700 16px/1 system-ui; cursor: pointer; display: inline-flex;
        align-items: center; justify-content: center; transition: background .15s, color .15s;
      }
      .sk-icon-btn:hover { background: var(--sk-accent); color: var(--sk-accent-fg); }
      .sk-icon-btn:active { transform: scale(.94); }

      /* min-height:0 + flex để list tự cuộn trong panel max-height thay vì đẩy
         panel dài ra (bug 2.2: panel bị "kéo dài" khi card thêm/đổi state) */
      .sk-task-list {
        overflow-y: auto; overscroll-behavior: contain; padding: 10px;
        display: flex; flex-direction: column; gap: 10px;
        flex: 1 1 auto; min-height: 0;
      }
      .sk-empty {
        padding: 16px 12px; font-size: 12px; color: var(--sk-muted);
        text-align: center; user-select: none;
      }
      .sk-task {
        border: 1px solid var(--sk-line); border-radius: 10px; padding: 10px;
        background: var(--sk-bg);
      }
      .sk-task-head { display: flex; align-items: center; gap: 8px; }
      .sk-task-head .name {
        flex: 1; min-width: 0; font-weight: 600; font-size: 12.5px;
        overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      }
      .sk-task[data-state="completed"] { border-color: var(--sk-ok); }
      .sk-task[data-state="failed"], .sk-task[data-state="cancelled"] { border-color: var(--sk-err); }
      .sk-task[data-state="paused"] { border-color: var(--sk-warn); }
      .sk-bar {
        position: relative; height: 8px; border-radius: 4px; margin: 8px 0 6px;
        background: var(--sk-track); overflow: hidden;
      }
      .sk-bar-fill {
        position: absolute; inset: 0 auto 0 0; width: 0%;
        background: linear-gradient(90deg, var(--sk-accent-bar), #67b3ff);
        border-radius: 4px; transition: width .2s ease;
      }
      .sk-task[data-state="completed"] .sk-bar-fill { background: var(--sk-ok-bar); }
      .sk-task[data-state="failed"] .sk-bar-fill, .sk-task[data-state="cancelled"] .sk-bar-fill { background: var(--sk-err); }
      .sk-task[data-state="paused"] .sk-bar-fill { background: var(--sk-warn); }
      .sk-bar.indeterminate .sk-bar-fill {
        width: 30%; animation: sk-indet 1.2s infinite ease-in-out;
      }
      @keyframes sk-indet { 0% { margin-left: -30%; } 100% { margin-left: 100%; } }
      .sk-stats {
        font-size: 11.5px; color: var(--sk-muted); font-variant-numeric: tabular-nums;
        display: flex; gap: 6px; flex-wrap: wrap;
      }
      .sk-stats .state-label { font-weight: 700; color: var(--sk-fg); }
      .sk-err-text { margin: 6px 0 0; font-size: 11.5px; color: var(--sk-err); }
      /* hàng nút giữ chiều cao cố định — ẩn/hiện nút theo state không làm card
         giật giật kéo panel theo (bug 2.2) */
      .sk-task-actions { display: flex; gap: 6px; margin-top: 8px; min-height: 30px; }
      .sk-task-actions .sk-btn { flex: 1; min-height: 28px; padding: 4px 8px; font-size: 11.5px; }

      .sk-btn {
        appearance: none; border: 1px solid var(--sk-line); background: var(--sk-bg);
        color: var(--sk-fg); border-radius: 10px; padding: 0 12px; min-height: 34px;
        font-family: inherit; font-size: 12px; font-weight: 700; line-height: 1.2; cursor: pointer; user-select: none;
        display: inline-flex; align-items: center; justify-content: center; gap: 7px;
        transition: background .15s, border-color .15s, color .15s, box-shadow .15s, transform .05s;
      }
      .sk-btn:hover { background: var(--sk-track); border-color: var(--sk-muted); }
      .sk-btn:active { transform: translateY(1px); }
      .sk-btn:focus-visible { outline: 2px solid var(--sk-accent-bar); outline-offset: 1px; }
      .sk-btn:disabled { opacity: .6; cursor: not-allowed; }
      .sk-btn .sk-btn-ic { display: inline-flex; flex-shrink: 0; }
      .sk-btn .sk-btn-ic svg { width: 14px; height: 14px; }
      /* nút gắn vào viewer: icon là SVG riêng, không phụ thuộc icon font của Telegram */
      .sk-queue-icon, .sk-wa-icon { display: inline-flex; align-items: center; justify-content: center; color: #fff; pointer-events: none; }
      .sk-queue-icon svg, .sk-wa-icon svg { width: 22px; height: 22px; display: block; }

      .sk-btn.sk-primary {
        background: var(--sk-accent); border-color: var(--sk-accent); color: var(--sk-accent-fg);
        box-shadow: 0 2px 10px rgba(7,104,196,.35);
      }
      .sk-btn.sk-primary:hover { filter: brightness(1.1); background: var(--sk-accent); }
      .sk-btn.sk-primary:disabled {
        background: var(--sk-track); border-color: var(--sk-track);
        color: var(--sk-muted); opacity: 1; box-shadow: none; cursor: not-allowed;
      }

      .sk-btn.toggle::before {
        content: ""; width: 9px; height: 9px; border-radius: 50%;
        background: var(--sk-muted); flex-shrink: 0;
      }
      .sk-btn.toggle:hover { border-color: var(--sk-muted); }
      .sk-btn.toggle.on {
        background: var(--sk-ok); border-color: var(--sk-ok); color: var(--sk-ok-fg);
        box-shadow: 0 2px 10px rgba(10,122,82,.35);
      }
      .sk-btn.toggle.on::before { background: var(--sk-ok-fg); }
      .sk-btn.toggle.on:hover { filter: brightness(1.08); background: var(--sk-ok); }

      .sk-btn.sk-danger { color: var(--sk-err); border-color: var(--sk-line); }
      .sk-btn.sk-danger:hover {
        background: var(--sk-err); border-color: var(--sk-err); color: var(--sk-err-fg);
      }

      .sk-foot {
        display: flex; justify-content: space-between; padding: 8px 14px;
        font-size: 11px; color: var(--sk-muted); border-top: 1px solid var(--sk-line);
      }

      .sk-select-body {
        padding: 10px 12px; overflow-y: auto; overscroll-behavior: contain;
        flex: 1 1 auto; min-height: 0;
      }
      .sk-hint { font-size: 11.5px; color: var(--sk-muted); margin-bottom: 10px; line-height: 1.6; }
      .sk-hint b { color: var(--sk-fg); }
      .sk-hint .keys { opacity: .8; }
      .sk-actions { display: flex; gap: 8px; margin-bottom: 8px; }
      .sk-actions .sk-btn { flex: 1; text-align: center; padding: 0 6px; min-height: 36px; font-size: 12px; }
      #sk-dl-btn { width: 100%; margin-top: 2px; padding: 0 10px; min-height: 42px; font-size: 13px; }
      /* list có scroll riêng để không đẩy panel */
      .sk-select-list {
        border-top: 1px dashed var(--sk-line); margin-top: 10px; padding-top: 8px;
        max-height: 150px; overflow-y: auto; overscroll-behavior: contain;
        display: grid; grid-template-columns: repeat(auto-fill, minmax(52px, 1fr)); gap: 6px;
      }
      .sk-thumb {
        position: relative; aspect-ratio: 1; border-radius: 8px; overflow: hidden;
        background: var(--sk-track); border: 1px solid var(--sk-line); cursor: pointer;
        transition: border-color .15s;
      }
      .sk-thumb:hover { border-color: var(--sk-accent-bar); }
      .sk-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .sk-thumb-n {
        position: absolute; left: 3px; bottom: 3px; padding: 2px 4px; border-radius: 4px;
        background: rgba(0,0,0,.65); color: #fff; font: 700 10px/1 system-ui; pointer-events: none;
      }
      .sk-thumb-rm {
        position: absolute; top: 2px; right: 2px; width: 18px; height: 18px; padding: 0;
        border: 0; border-radius: 50%; background: rgba(0,0,0,.65); color: #fff;
        font: 700 13px/18px system-ui; cursor: pointer; opacity: 0; transition: opacity .15s, background .15s;
      }
      .sk-thumb:hover .sk-thumb-rm, .sk-thumb-rm:focus-visible { opacity: 1; }
      .sk-thumb-rm:hover { background: var(--sk-err); }
      @media (hover: none) { .sk-thumb-rm { opacity: 1; } }

      .sk-sel-item {
        position: relative; outline: 4px solid var(--sk-ok) !important; outline-offset: -4px;
        box-shadow: 0 0 0 4px rgba(34,197,94,.3), 0 0 20px 2px rgba(34,197,94,.5) !important;
        border-radius: 6px;
      }
      .sk-sel { outline: 2px dashed var(--sk-ok) !important; outline-offset: 2px; border-radius: 8px; }
      .sk-tick {
        position: absolute; top: 6px; left: 6px; z-index: 2; width: 28px; height: 28px;
        border-radius: 50%; background: var(--sk-ok); color: var(--sk-ok-fg);
        font: 900 16px/28px system-ui; text-align: center; pointer-events: none;
        box-shadow: 0 2px 10px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.25);
      }
      .sk-tick::before { content: "✓"; }

      #sk-settings {
        position: fixed; inset: 0; z-index: 2147483647;
        display: flex; align-items: center; justify-content: center;
        font: 13px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
      }
      #sk-settings .backdrop { position: absolute; inset: 0; background: rgba(0,0,0,.5); }
      #sk-settings .dialog {
        position: relative; width: min(460px, calc(100vw - 32px)); max-height: calc(100vh - 48px);
        display: flex; flex-direction: column; overflow: hidden;
        background: var(--sk-bg); color: var(--sk-fg);
        border: 1px solid var(--sk-line); border-radius: 16px; box-shadow: var(--sk-shadow);
      }
      #sk-settings .sk-set-head {
        display: flex; align-items: center; gap: 10px; padding: 14px 16px; flex-shrink: 0;
        background: var(--sk-bg-head); border-bottom: 1px solid var(--sk-line);
      }
      #sk-settings h3 { flex: 1; margin: 0; font-size: 15px; font-weight: 700; }
      #sk-settings .sk-set-body {
        padding: 14px 16px 16px; overflow-y: auto; overscroll-behavior: contain;
        display: flex; flex-direction: column; gap: 14px;
      }
      .sk-set-section {
        border: 1px solid var(--sk-line); border-radius: 12px; padding: 12px;
        display: flex; flex-direction: column; gap: 10px;
      }
      .sk-set-section > h4 {
        margin: 0; font-size: 11px; font-weight: 800; letter-spacing: .06em;
        text-transform: uppercase; color: var(--sk-accent-chip);
      }
      .sk-set-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      @media (max-width: 420px) { .sk-set-grid { grid-template-columns: 1fr; } }
      .sk-field { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
      .sk-field > .label { font-size: 12px; font-weight: 700; color: var(--sk-fg); }
      .sk-field select, .sk-field input[type="text"] {
        width: 100%; height: 36px; padding: 0 10px; border-radius: 9px;
        border: 1px solid var(--sk-line); background: var(--sk-bg); color: var(--sk-fg);
        font: inherit; font-size: 13px; transition: border-color .15s, box-shadow .15s;
      }
      .sk-field select:hover:not(:disabled), .sk-field input[type="text"]:hover { border-color: var(--sk-muted); }
      .sk-field select:focus, .sk-field input[type="text"]:focus {
        outline: none; border-color: var(--sk-accent-bar); box-shadow: 0 0 0 3px var(--sk-accent-soft);
      }
      .sk-field select:disabled { opacity: .55; cursor: not-allowed; }
      .sk-field .hint { font-size: 11.5px; color: var(--sk-muted); line-height: 1.4; }
      .sk-name-preview {
        font: 12px/1.4 ui-monospace, SFMono-Regular, Consolas, monospace; color: var(--sk-fg);
        background: var(--sk-track); border-radius: 8px; padding: 7px 10px;
        overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      }
      .sk-name-preview .k { font-family: inherit; color: var(--sk-muted); margin-right: 6px; }
      .sk-folder-row { display: flex; gap: 8px; align-items: center; }
      .sk-folder-chip {
        flex: 1; min-width: 0; height: 36px; display: flex; align-items: center; gap: 8px;
        padding: 0 10px; border-radius: 9px; background: var(--sk-track); font-size: 12.5px; font-weight: 600;
      }
      .sk-folder-chip svg { flex-shrink: 0; color: var(--sk-accent-bar); }
      .sk-folder-chip .name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .sk-folder-chip.muted { color: var(--sk-muted); font-weight: 500; font-style: italic; }
      .sk-folder-chip.muted svg { color: var(--sk-muted); }
      .sk-folder-row .sk-btn, .sk-info-row .sk-btn { min-height: 34px; padding: 0 12px; font-size: 12px; white-space: nowrap; }
      .sk-info-row {
        display: flex; justify-content: space-between; align-items: center; gap: 10px;
        font-size: 12.5px; color: var(--sk-fg);
      }
      .sk-info-row > span { flex: 1; min-width: 0; line-height: 1.4; }
      .sk-info-row .sk-btn { flex-shrink: 0; }
    `;
    document.head.appendChild(style);
  };

  const STATE_ORDER_LABEL = (task) => {
    if (task.state === "downloading" && task.resumeMode) return t("resumedTask", { percent: task.total ? Math.floor(task.received * 100 / task.total) : 0 });
    return t(task.state);
  };

  const attachTaskCard = (task) => {
    const list = document.querySelector("#sk-panel .sk-task-list");
    if (!list) return null;
    const card = document.createElement("div");
    card.id = "sk-task-" + task.id;
    card.className = "sk-task";
    card.innerHTML = `
      <div class="sk-task-head">
        <span class="name" dir="auto"></span>
        <button type="button" class="sk-btn sk-danger act-dismiss" title="×" style="min-height:24px;padding:0 8px;">×</button>
      </div>
      <div class="sk-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100">
        <div class="sk-bar-fill"></div>
      </div>
      <div class="sk-stats">
        <span class="state-label"></span>
        <span class="detail"></span>
      </div>
      <p class="sk-err-text" hidden></p>
      <div class="sk-task-actions">
        <button type="button" class="sk-btn act-pause"></button>
        <button type="button" class="sk-btn act-retry" hidden></button>
        <button type="button" class="sk-btn sk-danger act-cancel"></button>
      </div>`;
    card.querySelector(".act-dismiss").onclick = () => dismissTask(task);
    card.querySelector(".act-pause").onclick = () => {
      if (task.pauseFlag) resumeTask(task); else pauseTask(task);
    };
    card.querySelector(".act-retry").onclick = () => retryTask(task);
    card.querySelector(".act-cancel").onclick = () => cancelTask(task);
    list.prepend(card);
    return card;
  };

  const dismissTask = (task) => {
    document.getElementById("sk-task-" + task.id)?.remove();
    if (task.finished) downloadTasks.delete(task.id);
    updatePanelCounts();
  };

  // cuộn trong .sk-task-list; scrollIntoView sẽ cuộn cả trang
  const scrollCardInsideList = (card) => {
    const list = card?.closest(".sk-task-list");
    if (!list) return;
    const cr = card.getBoundingClientRect(), lr = list.getBoundingClientRect();
    if (cr.top < lr.top - 2) list.scrollTop -= lr.top - cr.top - 8;
    else if (cr.bottom > lr.bottom + 2) list.scrollTop += cr.bottom - lr.bottom + 8;
  };

  const renderTaskImpl = (task, scroll = false) => {
    const panel = document.getElementById("sk-panel");
    if (!panel) return;
    let card = document.getElementById("sk-task-" + task.id);
    if (!card) {
      card = attachTaskCard(task);
      if (!card) return;
      // không tự bung lại nếu người dùng đã thu gọn
      if (!panelUserCollapsed) {
        panel.classList.remove("collapsed");
        const toggle = panel.querySelector(".sk-toggle");
        toggle.textContent = "–"; toggle.title = t("hide");
      }
    }
    if (scroll) scrollCardInsideList(card);
    card.dataset.state = task.state;
    card.querySelector(".name").textContent = task.fileName;
    card.querySelector(".name").title = task.fileName;

    const pct = task.total ? Math.min(100, Math.floor(task.received * 100 / task.total)) : null;
    const bar = card.querySelector(".sk-bar");
    bar.setAttribute("aria-label", t("progress"));
    bar.classList.toggle("indeterminate", task.state === "downloading" && pct === null);
    if (pct === null) bar.removeAttribute("aria-valuenow");
    else bar.setAttribute("aria-valuenow", pct);
    bar.querySelector(".sk-bar-fill").style.width = (pct ?? 0) + "%";

    card.querySelector(".state-label").textContent =
      task.state === "downloading" && pct !== null ? `${intFmt().format(pct)}% · ${t("downloading")}` : STATE_ORDER_LABEL(task);

    const parts = [formatBytes(task.received) + (task.total != null ? ` / ${formatBytes(task.total)}` : "")];
    if (task.state === "downloading" && task.speed) {
      parts.push(t("rate", { speed: formatBytes(task.speed) }));
      if (task.eta != null && task.eta > 1) parts.push(t("eta", { time: formatDuration(task.eta) }));
    }
    card.querySelector(".detail").textContent = parts.join(" · ");

    const errEl = card.querySelector(".sk-err-text");
    errEl.textContent = formatError(task.error);
    errEl.hidden = !task.error;

    const canPause = ["downloading", "preparing", "queued"].includes(task.state) && !task.finished;
    const pauseBtn = card.querySelector(".act-pause");
    pauseBtn.textContent = task.pauseFlag ? t("resume") : t("pause");
    pauseBtn.hidden = !(canPause || task.state === "paused");
    const cancelBtn = card.querySelector(".act-cancel");
    cancelBtn.textContent = t("cancel");
    cancelBtn.hidden = task.finished || task.state === "saving";
    cancelBtn.disabled = task.state === "saving";
    const retryBtn = card.querySelector(".act-retry");
    retryBtn.textContent = t("retry");
    retryBtn.hidden = !["failed", "cancelled"].includes(task.state);
    updatePanelCounts();
  };

  const updatePanelCountsImpl = () => {
    const panel = document.getElementById("sk-panel");
    if (!panel) return;
    const hasTasks = !!panel.querySelector(".sk-task");
    const empty = panel.querySelector(".sk-empty");
    if (empty) {
      empty.hidden = hasTasks;
      empty.textContent = t("noTasks");
    }
    const n = [...downloadTasks.values()].filter((x) => !x.finished).length;
    panel.querySelector(".sk-title-text").textContent = n ? t("downloadsCount", { count: intFmt().format(n) }) : t("downloads");
  };

  let panel, selectBar, settingsModal;
  let selModeBtn, selAutoBtn, selAllBtn, selClearBtn, selDlBtn, selCount, selList, selHint, selTitle;
  let settingsEls = {};
  let panelUserCollapsed = false;

  const buildUI = () => {
    buildStyles();

    // luôn hiển thị, kể cả khi rỗng, để vẫn thấy được trên viewer
    panel = document.createElement("section");
    panel.id = "sk-panel";
    panel.innerHTML = `
      <div class="sk-head">
        <div class="sk-title">
          <span class="sk-logo">${TG_LOGO_SVG}</span>
          <span class="sk-title-text">${t("downloads")}</span>
        </div>
        <button type="button" class="sk-icon-btn sk-clear" title="">${TRASH_SVG}</button>
        <button type="button" class="sk-icon-btn sk-settings-btn" title="">${GEAR_SVG}</button>
        <button type="button" class="sk-icon-btn sk-toggle" title="">–</button>
      </div>
      <div class="sk-task-list">
        <div class="sk-empty" hidden></div>
      </div>
      <div class="sk-foot">
        <span>SakerLy</span>
        <span>v${SCRIPT_VERSION}</span>
      </div>`;
    document.body.appendChild(panel);

    const panelToggle = panel.querySelector(".sk-toggle");
    panelToggle.onclick = () => {
      const col = !panel.classList.contains("collapsed");
      panel.classList.toggle("collapsed", col);
      panelUserCollapsed = col;
      panelToggle.textContent = col ? "+" : "–";
      panelToggle.title = col ? t("show") : t("hide");
    };
    // xoá mọi task trừ task đang tải; card mồ côi cũng bị dọn
    panel.querySelector(".sk-clear").onclick = () => {
      for (const card of [...panel.querySelectorAll(".sk-task")]) {
        const id = (card.id || "").replace("sk-task-", "");
        const task = downloadTasks.get(id);
        const active = task && !task.finished &&
          ["downloading", "preparing", "saving"].includes(task.state);
        if (active) continue;
        if (task && !task.finished) cancelTask(task);
        card.remove();
        downloadTasks.delete(id);
      }
      updatePanelCounts();
    };
    panel.querySelector(".sk-clear").title = t("clearHistory");
    panel.querySelector(".sk-settings-btn").onclick = () => { settingsModal.hidden = false; refreshSettingsUI(); };
    makeDraggable(panel, panel.querySelector(".sk-head"), "panelPos");

    selectBar = document.createElement("section");
    selectBar.id = "sk-select";
    selectBar.innerHTML = `
      <div class="sk-head">
        <div class="sk-title">
          <span class="sk-logo">${TG_LOGO_SVG}</span>
          <span class="sk-select-title"></span>
        </div>
        <span class="sk-count sk-sel-count">0</span>
        <button type="button" class="sk-icon-btn sk-select-settings" title="">${GEAR_SVG}</button>
        <button type="button" class="sk-icon-btn sk-select-toggle" title="">–</button>
      </div>
      <div class="sk-select-body">
        <div class="sk-hint sk-hint-box"></div>
        <div class="sk-actions">
          <button type="button" id="sk-mode-btn" class="sk-btn toggle"></button>
          <button type="button" id="sk-auto-btn" class="sk-btn toggle"></button>
        </div>
        <div class="sk-actions">
          <button type="button" id="sk-all-btn" class="sk-btn"></button>
          <button type="button" id="sk-clear-btn" class="sk-btn"></button>
        </div>
        <button type="button" id="sk-dl-btn" class="sk-btn sk-primary"></button>
        <!-- danh sách nằm dưới cùng: dài thêm không đẩy các nút xuống -->
        <div class="sk-select-list" hidden></div>
      </div>`;
    document.body.appendChild(selectBar);

    const selToggle = selectBar.querySelector(".sk-select-toggle");
    selToggle.onclick = () => {
      const col = !selectBar.classList.contains("collapsed");
      selectBar.classList.toggle("collapsed", col);
      selToggle.textContent = col ? "+" : "–";
      selToggle.title = col ? t("show") : t("hide");
    };
    selectBar.querySelector(".sk-select-settings").onclick = () => {
      settingsModal.hidden = false; refreshSettingsUI();
    };
    makeDraggable(selectBar, selectBar.querySelector(".sk-head"), "selectBarPos");

    selModeBtn = selectBar.querySelector("#sk-mode-btn");
    selAutoBtn = selectBar.querySelector("#sk-auto-btn");
    selAllBtn = selectBar.querySelector("#sk-all-btn");
    selClearBtn = selectBar.querySelector("#sk-clear-btn");
    selDlBtn = selectBar.querySelector("#sk-dl-btn");
    selCount = selectBar.querySelector(".sk-sel-count");
    selList = selectBar.querySelector(".sk-select-list");
    selHint = selectBar.querySelector(".sk-hint-box");
    selTitle = selectBar.querySelector(".sk-select-title");

    settingsModal = document.createElement("div");
    settingsModal.id = "sk-settings";
    settingsModal.hidden = true;
    settingsModal.innerHTML = `
      <div class="backdrop"></div>
      <div class="dialog" role="dialog" aria-modal="true">
        <div class="sk-set-head">
          <span class="sk-logo">${TG_LOGO_SVG}</span>
          <h3></h3>
          <button type="button" class="sk-icon-btn close"></button>
        </div>
        <div class="sk-set-body">
          <section class="sk-set-section">
            <h4 data-key="secGeneral"></h4>
            <div class="sk-set-grid">
              <label class="sk-field">
                <span class="label" data-key="lang"></span>
                <select class="sk-lang-select">
                  <option value="vi">Tiếng Việt</option>
                  <option value="en">English</option>
                </select>
              </label>
              <label class="sk-field">
                <span class="label" data-key="connections"></span>
                <select class="sk-settings-connections">
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                </select>
              </label>
            </div>
            <div class="hint" data-key="connectionsHint"></div>
          </section>

          <section class="sk-set-section">
            <h4 data-key="secNaming"></h4>
            <div class="sk-set-grid">
              <label class="sk-field">
                <span class="label" data-key="naming"></span>
                <select class="sk-settings-naming">
                  <option value="original" data-key="namingOriginal"></option>
                  <option value="date" data-key="namingDate"></option>
                  <option value="seq" data-key="namingSeq"></option>
                  <option value="date_original" data-key="namingDateOriginal"></option>
                  <option value="seq_original" data-key="namingSeqOriginal"></option>
                </select>
              </label>
              <label class="sk-field">
                <span class="label" data-key="prefix"></span>
                <input type="text" class="sk-settings-prefix" maxlength="60">
              </label>
            </div>
            <div class="sk-name-preview"><span class="k" data-key="namingPreview"></span><span class="v"></span></div>
          </section>

          <section class="sk-set-section">
            <h4 data-key="secSave"></h4>
            <!-- div, không phải label: label sẽ chuyển hover/click của cả hàng sang nút đầu tiên -->
            <div class="sk-field">
              <span class="label" data-key="folder"></span>
              <div class="sk-folder-row">
                <span class="sk-folder-chip"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg><span class="name sk-folder-name"></span></span>
                <button type="button" class="sk-btn sk-pickdir"></button>
                <button type="button" class="sk-btn sk-danger sk-cleardir" hidden></button>
              </div>
            </div>
            <label class="sk-field">
              <span class="label" data-key="subfolder"></span>
              <select class="sk-settings-subfolder">
                <option value="none" data-key="subfolderNone"></option>
                <option value="date" data-key="subfolderDate"></option>
                <option value="channel" data-key="subfolderChannel"></option>
                <option value="date_channel" data-key="subfolderDateChannel"></option>
                <option value="channel_date" data-key="subfolderChannelDate"></option>
              </select>
              <span class="hint sk-subfolder-hint" data-key="subfolderNeedsFolder" hidden></span>
            </label>
          </section>

          <section class="sk-set-section">
            <h4 data-key="secData"></h4>
            <div class="sk-info-row">
              <span class="sk-seq-info"></span>
              <button type="button" class="sk-btn sk-resetseq"></button>
            </div>
            <div class="sk-info-row">
              <span class="sk-downloaded-info"></span>
              <button type="button" class="sk-btn sk-danger sk-forget"></button>
            </div>
          </section>
        </div>
      </div>`;
    document.body.appendChild(settingsModal);

    settingsEls = {
      close: settingsModal.querySelector(".close"),
      title: settingsModal.querySelector("h3"),
      lang: settingsModal.querySelector(".sk-lang-select"),
      conn: settingsModal.querySelector(".sk-settings-connections"),
      naming: settingsModal.querySelector(".sk-settings-naming"),
      prefix: settingsModal.querySelector(".sk-settings-prefix"),
      pickDir: settingsModal.querySelector(".sk-pickdir"),
      clearDir: settingsModal.querySelector(".sk-cleardir"),
      folderName: settingsModal.querySelector(".sk-folder-name"),
      subfolder: settingsModal.querySelector(".sk-settings-subfolder"),
      resetSeq: settingsModal.querySelector(".sk-resetseq"),
      seqInfo: settingsModal.querySelector(".sk-seq-info"),
      downloadedInfo: settingsModal.querySelector(".sk-downloaded-info"),
      forget: settingsModal.querySelector(".sk-forget"),
      preview: settingsModal.querySelector(".sk-name-preview .v"),
      subfolderHint: settingsModal.querySelector(".sk-subfolder-hint"),
      folderChip: settingsModal.querySelector(".sk-folder-chip"),
    };

    settingsEls.close.textContent = "×";
    settingsEls.close.onclick = () => { settingsModal.hidden = true; };
    settingsModal.querySelector(".backdrop").onclick = () => { settingsModal.hidden = true; };
    // capture để Esc không đồng thời đóng chat/viewer của Telegram
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !settingsModal.hidden) {
        e.preventDefault(); e.stopPropagation();
        settingsModal.hidden = true;
      }
    }, true);

    settingsEls.lang.onchange = () => {
      currentLang = settingsEls.lang.value;
      saveStore("lang", currentLang);
      refreshAllLabels();
      refreshSettingsUI();
    };
    settingsEls.conn.onchange = () => {
      settings.connections = Number(settingsEls.conn.value) || 3;
      saveStore("settings", settings);
      log.info(`connections = ${getConnections()}`);
    };
    settingsEls.naming.onchange = () => { settings.naming = settingsEls.naming.value; saveStore("settings", settings); updateNamePreview(); };
    settingsEls.subfolder.onchange = () => { settings.subfolder = settingsEls.subfolder.value; saveStore("settings", settings); };
    settingsEls.prefix.oninput = () => { settings.prefix = settingsEls.prefix.value; saveStore("settings", settings); updateNamePreview(); };
    settingsEls.resetSeq.onclick = () => { seqCounter = 1; saveStore("seq", 1); refreshSettingsUI(); };
    settingsEls.forget.onclick = () => {
      downloadedKeys = new Set();
      saveStore("downloaded", []);
      seenAutoQueueKeys.clear();
      queuedViewerKeys.clear();
      refreshSettingsUI();
    };
    settingsEls.pickDir.onclick = async () => {
      if (!supportsDirPicker()) return;
      try {
        const h = await window.showDirectoryPicker({ mode: "readwrite" });
        destDirHandle = h; destDirName = h.name;
        await idbSet("destDirHandle", h);
        saveStore("destDirName", destDirName);
        refreshSettingsUI();
      } catch (e) { if (e?.name !== "AbortError") log.error("pickFolder: " + e.message); }
    };
    settingsEls.clearDir.onclick = async () => {
      destDirHandle = null; destDirName = "";
      await idbDel("destDirHandle");
      saveStore("destDirName", "");
      refreshSettingsUI();
    };

    // dịch ngay lúc dựng để modal không bao giờ trống nhãn
    translateSettingsUI();

    renderTask = renderTaskImpl;
    updatePanelCounts = updatePanelCountsImpl;
    updateSelectBar();
  };

  const supportsDirPicker = () =>
    typeof window.showDirectoryPicker === "function";

  const translateSettingsUI = () => {
    if (!settingsModal || !settingsEls.title) return;
    settingsEls.title.textContent = t("settingsTitle");
    settingsEls.close.title = t("close");
    settingsModal.querySelectorAll("[data-key]").forEach((el) => { el.textContent = t(el.dataset.key); });
    settingsEls.prefix.placeholder = t("prefixPlaceholder");
    settingsEls.pickDir.textContent = t("pickFolder");
    settingsEls.clearDir.textContent = t("clearFolder");
    settingsEls.resetSeq.textContent = t("resetSeq");
    settingsEls.forget.textContent = t("forgetDownloaded");
  };

  const updateNamePreview = () => {
    if (settingsEls.preview) settingsEls.preview.textContent = applyNaming("IMG_2048.jpg", true);
  };

  const refreshSettingsUI = () => {
    if (!settingsModal || settingsModal.hidden) return;
    updateNamePreview();
    settingsEls.subfolderHint.hidden = !!destDirName;
    translateSettingsUI();
    settingsEls.lang.value = currentLang;
    settingsEls.conn.value = String(getConnections());
    settingsEls.naming.value = settings.naming;
    settingsEls.subfolder.value = settings.subfolder || "none";
    settingsEls.subfolder.disabled = !destDirName;
    settingsEls.prefix.value = settings.prefix || "";
    settingsEls.folderName.textContent = destDirName || t("folderNone");
    settingsEls.folderChip.classList.toggle("muted", !destDirName);
    settingsEls.pickDir.disabled = !supportsDirPicker();
    settingsEls.pickDir.title = supportsDirPicker() ? "" : t("folderUnsupported");
    settingsEls.clearDir.hidden = !destDirName;
    settingsEls.seqInfo.textContent = t("seqNow", { n: seqCounter });
    settingsEls.downloadedInfo.textContent = t("downloadedCount", { n: downloadedKeys.size });
    settingsEls.forget.disabled = downloadedKeys.size === 0;
  };

  const makeDraggable = (el, handle, storageKey) => {
    const apply = () => {
      try {
        const pos = loadStore(storageKey, null);
        if (!pos || typeof pos.left !== "number" || typeof pos.top !== "number") return;
        const maxL = window.innerWidth - el.offsetWidth - 4;
        const maxT = window.innerHeight - el.offsetHeight - 4;
        el.style.left = Math.max(4, Math.min(pos.left, maxL)) + "px";
        el.style.top = Math.max(4, Math.min(pos.top, maxT)) + "px";
        el.style.right = "auto"; el.style.bottom = "auto";
      } catch { /* vị trí đã lưu bị hỏng: giữ vị trí mặc định */ }
    };
    requestAnimationFrame(apply);
    let dragging = false, sx = 0, sy = 0, sl = 0, st = 0;
    handle.style.cursor = "move";
    handle.addEventListener("pointerdown", (e) => {
      if (e.target.closest("button, select, input, a")) return;
      dragging = true;
      handle.setPointerCapture(e.pointerId);
      const r = el.getBoundingClientRect();
      sl = r.left; st = r.top; sx = e.clientX; sy = e.clientY;
      el.style.left = sl + "px"; el.style.top = st + "px";
      el.style.right = "auto"; el.style.bottom = "auto";
    });
    handle.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const l = sl + (e.clientX - sx), tp = st + (e.clientY - sy);
      const maxL = window.innerWidth - el.offsetWidth - 4;
      const maxT = window.innerHeight - el.offsetHeight - 4;
      el.style.left = Math.max(4, Math.min(l, maxL)) + "px";
      el.style.top = Math.max(4, Math.min(tp, maxT)) + "px";
    });
    const end = (e) => {
      if (!dragging) return;
      dragging = false;
      try { handle.releasePointerCapture(e.pointerId); } catch { /* pointer đã được nhả */ }
      saveStore(storageKey, { left: parseFloat(el.style.left), top: parseFloat(el.style.top) });
    };
    handle.addEventListener("pointerup", end);
    handle.addEventListener("pointercancel", end);
  };

  const refreshAllLabels = () => {
    if (!panel) return;
    panel.querySelector(".sk-clear").title = t("clearHistory");
    panel.querySelector(".sk-settings-btn").title = t("settings");
    const pToggle = panel.querySelector(".sk-toggle");
    pToggle.title = panel.classList.contains("collapsed") ? t("show") : t("hide");
    const sToggle = selectBar.querySelector(".sk-select-toggle");
    sToggle.title = selectBar.classList.contains("collapsed") ? t("show") : t("hide");
    for (const task of downloadTasks.values()) renderTask(task);
    updateSelectBar();
    document.querySelectorAll("button.sk-dl-btn").forEach((b) => {
      const label = t(b.disabled ? "loadingMedia" : "download");
      b.title = label; b.setAttribute("aria-label", label);
    });
    document.querySelectorAll("button.sk-queue-btn").forEach((b) => {
      b.title = t("topbarQueue"); b.setAttribute("aria-label", t("topbarQueue"));
    });
    refreshSettingsUI();
  };

  // Viewer WebA là <dialog>.showModal() (top layer): vẽ trên mọi z-index và làm phần còn lại inert, nên panel phải nằm trong dialog
  const keepPanelsOnTop = () => {
    if (TEST_MODE) return;
    let host = document.body;
    const dlg = document.getElementById("MediaViewer");
    if (dlg && dlg.open) host = dlg;
    for (const el of [panel, selectBar, settingsModal]) {
      if (el && el.parentElement !== host) host.appendChild(el);
    }
  };

  const getMediaSource = (m) =>
    m?.getAttribute?.("src") ? m.src : m?.currentSrc || m?.querySelector?.("source")?.src;

  const isUsableBtn = (b) => {
    if (b.disabled || b.getAttribute("aria-disabled") === "true" ||
        b.hidden || b.classList.contains("hide") || b.closest("[inert]")) return false;
    const s = getComputedStyle(b);
    return s.visibility !== "hidden" && s.visibility !== "collapse" && b.getClientRects().length > 0;
  };

  const WEBK_DL_SELECTOR = [
    "button.quality-download-options-button-menu",
    "button.tgico-download",
    'button[aria-label="Download"]',
    'button[title="Download"]',
  ].join(",");
  const getWebKDlButtons = (c) =>
    Array.from(c.querySelectorAll(WEBK_DL_SELECTOR)).filter((b) => !b.matches(".sk-dl-btn"));

  let webKGlyph = "";
  const createWebKDlIcon = (btnIcon = false) => {
    const glyph = webKGlyph || DL_ICON_SVG;
    return `<span class="tgico sk-dl-icon${btnIcon ? " button-icon" : ""}" aria-hidden="true">${glyph}</span>`;
  };
  const refreshWebKGlyph = () => {
    for (const b of getWebKDlButtons(document)) {
      const g = b.querySelector(":scope > .tgico")?.textContent.trim();
      if (!g || !/^[\uE000-\uF8FF]$/.test(g)) continue;
      if (g !== webKGlyph) {
        webKGlyph = g;
        document.querySelectorAll(".sk-dl-icon").forEach((i) => (i.textContent = g));
      }
      return;
    }
  };

  const VIDEO_CONTEXT_SELECTOR = "video, .ckin__player, .media-viewer-video-progress, [class*='video-time']";

  // tweb append wrapper slide mới sau wrapper cũ (base.ts setNewMover) và giữ slide cũ ~350ms: ưu tiên mover `center active`, không thì mover cuối
  const currentWebKMover = () => {
    const viewer = document.querySelector(".media-viewer-whole");
    if (!viewer) return null;
    const movers = viewer.querySelectorAll(".media-viewer-movers .media-viewer-mover");
    for (const m of movers) {
      if (m.classList.contains("center") && m.classList.contains("active") &&
          !m.classList.contains("moving")) return m;
    }
    return movers.length ? movers[movers.length - 1] : null;
  };

  const resolveViewerWebKMedia = () => {
    const mover = currentWebKMover();
    if (!mover) return null;
    const media = mover.querySelector(":scope > .media-viewer-aspecter") || mover;
    const videoEl = media.querySelector("video");
    const videoUrl = getMediaSource(videoEl);
    if (videoUrl) return { url: videoUrl, kind: "video" };
    if (videoEl || media.querySelector(VIDEO_CONTEXT_SELECTOR)) return null;
    const imgUrl = getMediaSource(media.querySelector("img.thumbnail"));
    if (imgUrl) return { url: imgUrl, kind: "image" };
    return null;
  };

  // chỉ slide active có <video>; slide video chưa có src thì trả null thay vì nhầm poster là ảnh
  const resolveViewerWebAMedia = () => {
    const media = document.querySelector("#MediaViewer .MediaViewerSlide--active");
    if (!media) return null;
    const player = media.querySelector(".VideoPlayer");
    const videoUrl = getMediaSource(player?.querySelector("video"));
    if (videoUrl) return { url: videoUrl, kind: "video" };
    if (player) return null;
    const imgUrl = getMediaSource(media.querySelector(".MediaViewerContent > div > img"))
      || getMediaSource(media.querySelector(".MediaViewerContent img"));
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

  const queuedViewerKeys = new Set();
  const queueCurrentWebKMedia = () => {
    const r = resolveViewerWebKMedia();
    if (!r) return;
    const mk = mediaKey(r.url);
    if (queuedViewerKeys.has(mk)) return;
    queuedViewerKeys.add(mk);
    downloadMedia(r.url, r.kind, { batch: true, silent: true, mediaKey: mk });
    log.info(`queued: ${r.kind}`);
  };

  const queueCurrentWebAMedia = () => {
    const r = resolveViewerWebAMedia();
    if (!r) return;
    const mk = mediaKey(r.url);
    if (queuedViewerKeys.has(mk)) return;
    queuedViewerKeys.add(mk);
    downloadMedia(r.url, r.kind, { batch: true, silent: true, mediaKey: mk });
    log.info(`queued: ${r.kind}`);
  };

  // dùng class nút gốc của WebA để hợp giao diện viewer
  const makeWebAQueueButton = () => {
    const b = document.createElement("button");
    b.className = "Button smaller translucent-white round sk-queue-btn";
    b.type = "button";
    b.title = t("topbarQueue");
    b.setAttribute("aria-label", t("topbarQueue"));
    b.innerHTML = `<span class="sk-queue-icon" aria-hidden="true">${QUEUE_ICON_SVG}</span>`;
    b.onclick = (e) => {
      e.stopPropagation();
      queueCurrentWebAMedia();
      b.classList.add("queued");
      setTimeout(() => b.classList.remove("queued"), 1200);
    };
    return b;
  };

  const WEBK_NEXT_SELECTORS = ".media-viewer-switcher.media-viewer-switcher-next, .media-viewer-switcher-next";
  let autoAdvanceRunning = false;
  // trả về: true = đã chuyển, false = hết slide, null = chưa chuyển được lúc này
  const autoAdvanceViewer = () => {
    if (autoAdvanceRunning) return null;
    if (isWebA) {
      const dlg = document.getElementById("MediaViewer");
      if (!dlg || !dlg.open) return false;
      // nút next của telegram-tt không có click handler: đổi slide bằng keydown ArrowRight; hết slide thì nút có class `hide`
      const next = dlg.querySelector("button.navigation.next");
      if (!next || next.classList.contains("hide")) return false;
      autoAdvanceRunning = true;
      try {
        document.dispatchEvent(new KeyboardEvent("keydown", {
          key: "ArrowRight", code: "ArrowRight", bubbles: true, cancelable: true,
        }));
      } catch { /* không gửi được phím thì lần refresh sau thử lại */ }
      setTimeout(() => { autoAdvanceRunning = false; }, 350);
      return true;
    }
    const viewer = document.querySelector(".media-viewer-whole");
    if (!viewer) return false;
    const next = viewer.querySelector(WEBK_NEXT_SELECTORS);
    if (!next || next.classList.contains("hide") || !isUsableBtn(next)) return false;
    autoAdvanceRunning = true;
    try { next.click(); } catch { /* nút bị gỡ khỏi DOM giữa chừng */ }
    setTimeout(() => { autoAdvanceRunning = false; }, 350);
    return true;
  };

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

  const BUBBLE_SELECTORS = ".bubble, .Message";

  const ATTACHMENT_CONTAINER = ".bubble .attachment, .bubble .bubble__media-container, .Message .media-inner";
  // kiểm tra closest() từ cả scope lẫn từng img: sticker (.sticker-media) và bản đồ (.Location) WebA cũng nằm trong .media-inner
  const EXCLUDED_SCOPES = [
    ".EmbeddedMessage", ".WebPage", ".reply", ".reply-content", ".reply-summary", ".reply-wrapper",
    ".reply-media", ".webpage", ".webpage-preview", ".webpage-with-thumb", ".webpage-thumb",
    ".bubbles-group-avatar", ".bubbles-group-avatar-container", ".user-avatar",
    ".bubble-name-forwarded-avatar", "avatar-element", ".avatar", ".service-msg",
    ".bubble-service-media", ".sticker-wrapper", "[class*='Sticker']", ".custom-emoji",
    "[class*='CustomEmoji']", ".emoji", ".reactions", ".reactions-like-block", ".reaction",
    "[class*='Reaction']", ".peer-title", ".bubble-name-chip-container", "[class*='Avatar']",
    ".sticker-media", ".Location", ".map", ".venue-icon",
    ".WebPage--sticker", ".webpage-stickerset-grid", ".webpage-stickerset-cell",
    ".SponsoredMessage", ".sponsored-media-preview", ".bubble.sponsored",
  ].join(", ");
  const EXCLUDED_BUBBLE_CLASSES = ".bubble.service, .bubble.has-fake-service, .bubble.sticker, .bubble.round, .bubble.emoji-big, .bubble.is-invoice";

  const PHOTO_SCOPE_SELECTOR = ".bubble .album-item, .bubble .attachment, .bubble .bubble__media-container, .Message .album-item, .Message .media-inner";
  const PHOTO_IMG_SELECTOR = "img.media-photo, img.full-media";
  const VIDEO_MARKERS = "video, .media-video, .video-time, .video-play, .media-round, .media-gif-wrapper, .media-sticker-wrapper, .ckin__player, .media-inner.dark, .message-media-duration, .RoundVideo";

  const scopeIsVideoLike = (scope) => scope.matches(VIDEO_MARKERS) || !!scope.querySelector(VIDEO_MARKERS);

  const pickPhotoScopes = (root) =>
    Array.from(root.querySelectorAll(PHOTO_SCOPE_SELECTOR)).filter((s) => {
      if (s.closest(EXCLUDED_SCOPES)) return false;
      const bubble = s.closest(".bubble, .Message");
      if (!bubble || bubble.matches(EXCLUDED_BUBBLE_CLASSES)) return false;
      if (scopeIsVideoLike(s)) return false;
      if (s.matches(".attachment") && s.querySelector(".album-item")) return false;
      if (s.matches(".media-inner") && s.closest(".album-item")) return false;
      return !!s.querySelector(PHOTO_IMG_SELECTOR);
    });

  const scopeToPhotoItem = (scope) => {
    const img = Array.from(scope.querySelectorAll(PHOTO_IMG_SELECTOR))
      .filter((i) => i.naturalWidth > 100 && !i.closest(EXCLUDED_SCOPES))
      .sort((a, b) => b.naturalWidth * b.naturalHeight - a.naturalWidth * a.naturalHeight)[0];
    if (!img) return null;
    const url = getMediaSource(img);
    if (!url) return null;
    // key msg: là chung cho cả album: thêm hash URL để mỗi ảnh là một mục riêng
    const base = mediaKey(url, img);
    const key = base.startsWith("msg:") ? `${base}.${hashCode(url).toString(36)}` : base;
    return { url, kind: "image", el: img, key };
  };

  const findBubble = (node) => {
    let n = node;
    while (n && n !== document.body) {
      if (n.matches && n.matches(BUBBLE_SELECTORS)) return n;
      n = n.parentElement;
    }
    return null;
  };
  const bubbleHasMedia = (b) => {
    if (!b || b.matches(EXCLUDED_BUBBLE_CLASSES)) return false;
    const atts = b.querySelectorAll(ATTACHMENT_CONTAINER);
    for (const a of atts) if (!a.closest(EXCLUDED_SCOPES)) return true;
    return false;
  };

  const selectedBubbles = new Set();
  const selectedItems = new Map();
  let selectMode = false;
  let autoQueueMode = TEST_MODE ? false : loadStore("autoQueue", false);
  let lastClickedBubble = null;
  const seenAutoQueueKeys = new Set();

  const totalSelectedItems = () => {
    let n = 0;
    for (const items of selectedItems.values()) n += items.length;
    return n;
  };

  const describeItem = (item, n) => {
    const label = item.kind === "video" ? "Video"
      : item.kind === "audio" ? (currentLang === "vi" ? "Âm thanh" : "Audio")
      : (currentLang === "vi" ? "Ảnh" : "Image");
    const size = item.el?.naturalWidth ? ` · ${item.el.naturalWidth}×${item.el.naturalHeight}` : "";
    return `${label} ${n}${size}\n${t("showInChat")}`;
  };

  const paintTick = (item) => {
    const anchor = item.el?.closest(".album-item-media, .album-item, .attachment, .media-inner") || item.el?.parentElement;
    if (!anchor) return;
    if (getComputedStyle(anchor).position === "static") anchor.style.position = "relative";
    anchor.classList.add("sk-sel-item");
    if (!anchor.querySelector(":scope > .sk-tick")) {
      const tick = document.createElement("div");
      tick.className = "sk-tick";
      anchor.appendChild(tick);
    }
    item._tickAnchor = anchor;
  };
  const removeTick = (item) => {
    const anchor = item._tickAnchor;
    if (!anchor) return;
    anchor.classList.remove("sk-sel-item");
    anchor.querySelector(":scope > .sk-tick")?.remove();
    item._tickAnchor = null;
  };

  const markSelected = (bubble, on) => {
    if (!on) {
      bubble.classList.remove("sk-sel");
      const prev = selectedItems.get(bubble);
      if (prev) prev.forEach(removeTick);
      selectedBubbles.delete(bubble);
      selectedItems.delete(bubble);
      updateSelectBar();
      return;
    }
    const scopes = pickPhotoScopes(bubble);
    const items = [], seen = new Set();
    for (const sc of scopes) {
      const it = scopeToPhotoItem(sc);
      if (it && !seen.has(it.key)) { seen.add(it.key); items.push(it); }
    }
    if (!items.length) {
      log.info("nothing selectable in this post");
      return;
    }
    bubble.classList.add("sk-sel");
    selectedBubbles.add(bubble);
    selectedItems.set(bubble, items);
    items.forEach(paintTick);
    updateSelectBar();
  };

  const clearSelection = () => {
    for (const b of selectedBubbles) {
      b.classList.remove("sk-sel");
      selectedItems.get(b)?.forEach(removeTick);
    }
    selectedBubbles.clear();
    selectedItems.clear();
    updateSelectBar();
  };

  const rangeSelect = (from, to) => {
    const container = from.closest(".bubbles-inner, .bubbles, .MessageList");
    if (!container || !container.contains(to)) return;
    const list = Array.from(container.querySelectorAll(BUBBLE_SELECTORS)).filter(bubbleHasMedia);
    const i1 = list.indexOf(from), i2 = list.indexOf(to);
    if (i1 < 0 || i2 < 0) return;
    const [a, b] = i1 < i2 ? [i1, i2] : [i2, i1];
    for (let i = a; i <= b; i++) markSelected(list[i], true);
  };

  // vùng nhìn thấy thật của khung chat: .bubbles-viewport (WebK), .MessageList (WebA)
  const chatViewportRect = () => {
    const el = document.querySelector(".bubbles-viewport, .bubbles, .MessageList");
    if (el && el.isConnected) {
      const r = el.getBoundingClientRect();
      if (r.width > 80 && r.height > 80) return r;
    }
    return { top: 0, left: 0, right: innerWidth, bottom: innerHeight, width: innerWidth, height: innerHeight };
  };

  // hiển thị = ≥50% diện tích ảnh nằm trong vùng nhìn thấy của khung chat
  const isMeaningfullyVisible = (el) => {
    if (!el || !el.isConnected) return false;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") return false;
    const r = el.getBoundingClientRect();
    if (r.width < 60 || r.height < 60) return false;
    const vr = chatViewportRect();
    const ix = Math.max(0, Math.min(r.right, vr.right) - Math.max(r.left, vr.left));
    const iy = Math.max(0, Math.min(r.bottom, vr.bottom) - Math.max(r.top, vr.top));
    if (ix <= 0 || iy <= 0) return false;
    return (ix * iy) / (r.width * r.height) >= 0.5;
  };

  const updateSelectBar = () => {
    if (!selectBar) return;
    // giữ vị trí cuộn khi vẽ lại list
    const bodyEl = selectBar.querySelector(".sk-select-body");
    const stick = bodyEl ? bodyEl.scrollTop : 0;
    const count = totalSelectedItems();
    selCount.textContent = String(count);
    selCount.dataset.zero = count === 0 ? "1" : "";
    selTitle.textContent = t("selectTitle");
    selHint.innerHTML =
      `<div>${t("hintPhoto")}</div><div>${t("hintVideo")}</div><div class="keys">${t("hintKeys")}</div>`;
    selModeBtn.textContent = t("selectMode");
    selModeBtn.classList.toggle("on", selectMode);
    selAutoBtn.textContent = t("autoQueue");
    selAutoBtn.classList.toggle("on", autoQueueMode);
    selAllBtn.textContent = t("selectAll");
    selClearBtn.textContent = t("clearSelection");
    selDlBtn.innerHTML =
      `<span class="sk-btn-ic">${DL_ICON_SVG}</span><span>${t("downloadSelected", { count })}</span>`;
    selDlBtn.disabled = count === 0;
    const listScroll = selList.scrollTop;
    selList.innerHTML = "";
    let n = 0;
    for (const [bubble, items] of selectedItems) {
      for (const item of items) {
        const tile = document.createElement("div");
        tile.className = "sk-thumb";
        tile.title = describeItem(item, ++n);
        // tên blob: chỉ là uuid ngẫu nhiên, nên hiện chính ảnh để người dùng nhận ra
        const img = document.createElement("img");
        img.alt = "";
        img.loading = "lazy";
        img.src = item.el?.currentSrc || item.url;
        img.onerror = () => img.remove();
        const num = document.createElement("span");
        num.className = "sk-thumb-n";
        num.textContent = String(n);
        const rm = document.createElement("button");
        rm.type = "button"; rm.className = "sk-thumb-rm"; rm.textContent = "×";
        rm.setAttribute("aria-label", t("clearSelection"));
        rm.onclick = (e) => {
          e.stopPropagation();
          removeTick(item);
          const rem = selectedItems.get(bubble).filter((x) => x !== item);
          if (rem.length) selectedItems.set(bubble, rem);
          else { bubble.classList.remove("sk-sel"); selectedBubbles.delete(bubble); selectedItems.delete(bubble); }
          updateSelectBar();
        };
        tile.onclick = () => item.el?.isConnected && item.el.scrollIntoView({ block: "center", behavior: "smooth" });
        tile.append(img, num, rm);
        selList.appendChild(tile);
      }
    }
    selList.scrollTop = listScroll;
    selList.hidden = selectedItems.size === 0;
    if (bodyEl) bodyEl.scrollTop = stick;
  };

  const flashDlButton = (text) => {
    selDlBtn.textContent = text;
    clearTimeout(flashDlButton.timer);
    flashDlButton.timer = setTimeout(updateSelectBar, 2500);
  };

  // Auto-queue. Lúc click vào media, đọc khung chat để biết trước còn bao nhiêu video phía trước:
  // ở cả tweb (listLoader: next = msgid cao hơn) lẫn telegram-tt (getNextItem: messageMediaIds[i + 1]),
  // slide kế tiếp là media kế tiếp phía dưới trong chat. Đi từng slide, dừng ngay khi đã gặp đủ số video đó.
  const AQ_PENDING_TIMEOUT_MS = 15000; // slide video mãi không có src: bỏ qua
  const AQ_STUCK_MS = 2500; // đã bấm next mà slide không đổi: bấm lại
  const AQ_END_RETRIES = 8; // nút next ẩn có thể chỉ là viewer đang tải thêm slide
  let aqPlan = null;

  const POST_ITEM_SELECTOR = ".album-item, .bubble__media-container, .attachment, .media-inner";
  // gif, video tròn, sticker không nằm trong danh sách slide của viewer
  const NON_VIEWER_MEDIA = ".media-gif-wrapper, .media-round, .media-sticker-wrapper, .RoundVideo, .sticker-media";
  const postMediaItems = (bubble) => {
    if (bubble.matches(EXCLUDED_BUBBLE_CLASSES)) return [];
    const albumItems = bubble.querySelectorAll(".album-item");
    const items = albumItems.length
      ? Array.from(albumItems)
      : Array.from(bubble.querySelectorAll(".bubble__media-container, .attachment, .media-inner"))
        .filter((el) => !el.closest(".album-item"))
        .slice(0, 1);
    return items.filter((el) => !el.closest(EXCLUDED_SCOPES) &&
      !el.matches(NON_VIEWER_MEDIA) && !el.querySelector(NON_VIEWER_MEDIA) &&
      !!el.querySelector("img, video, canvas"));
  };
  const isViewerVideo = (el) => {
    if (!scopeIsVideoLike(el)) return false;
    // telegram-tt dùng chung component Video cho gif, chỉ khác badge "GIF"
    const badge = el.querySelector(".message-media-duration");
    return !(badge && /^gif/i.test(badge.textContent.trim()));
  };

  const armPostFromClick = (e) => {
    if (!autoQueueMode || selectMode) return;
    const item = e.target.closest?.(POST_ITEM_SELECTOR);
    const bubble = item?.closest(".bubble, .Message");
    if (!item || !bubble || item.closest(EXCLUDED_SCOPES)) return;
    const list = bubble.closest(".bubbles-inner, .bubbles, .MessageList");
    const all = (list ? Array.from(list.querySelectorAll(BUBBLE_SELECTORS)) : [bubble]).flatMap(postMediaItems);
    const start = all.findIndex((el) => el === item || el.contains(item) || item.contains(el));
    if (start < 0) return;
    const ahead = all.slice(start);
    aqPlan = {
      videoCount: ahead.filter(isViewerVideo).length, videosSeen: 0,
      lastSlide: null, lastUrl: null, pendingEl: null, pendingSince: 0, advanceAt: 0, endRetries: 0,
    };
    log.info(`auto-queue: còn ${aqPlan.videoCount} video phía trước (${ahead.length} media)`);
  };

  const viewerOpen = () => {
    if (isWebA) return !!document.getElementById("MediaViewer");
    return !!document.querySelector(".media-viewer-whole");
  };
  const currentSlideEl = () => isWebA
    ? document.querySelector("#MediaViewer .MediaViewerSlide--active")
    : currentWebKMover();
  const slideLooksLikeVideo = (el) =>
    !!el?.querySelector(isWebA ? ".VideoPlayer, video" : VIDEO_CONTEXT_SELECTOR);

  const queueAutoVideo = (r) => {
    const mk = mediaKey(r.url);
    if (seenAutoQueueKeys.has(mk)) return;
    seenAutoQueueKeys.add(mk);
    if (downloadedKeys.has(mk)) { log.info("auto-queue: đã tải rồi, bỏ qua"); return; }
    queuedViewerKeys.add(mk);
    downloadMedia(r.url, "video", { batch: true, silent: true, mediaKey: mk, skipDownloaded: true });
    log.info("auto-queue: video");
  };

  const finishPlan = (plan, msg) => {
    if (aqPlan !== plan) return;
    aqPlan = null;
    log.info(msg);
    flashDlButton(t("postVideosDone", { n: plan.videosSeen }));
  };

  const requestAdvance = (plan) => {
    if (aqPlan !== plan) return;
    const res = autoAdvanceViewer();
    if (res === true) { plan.advanceAt = Date.now(); plan.endRetries = 0; return; }
    if (res === null) { setTimeout(() => requestAdvance(plan), 300); return; } // lần chuyển trước chưa xong
    if (++plan.endRetries <= AQ_END_RETRIES) { setTimeout(() => requestAdvance(plan), 500); return; }
    finishPlan(plan, `auto-queue: hết slide, ${plan.videoCount - plan.videosSeen} video không tới được`);
  };

  const processAutoQueue = () => {
    if (!autoQueueMode) return;
    if (!viewerOpen()) { aqPlan = null; return; }
    const r = isWebA ? resolveViewerWebAMedia() : resolveViewerWebKMedia();
    const plan = aqPlan;
    if (!plan) {
      // viewer không mở từ một click vào post: chỉ xếp hàng video đang xem, không tự chuyển slide
      if (r?.kind === "video") queueAutoVideo(r);
      return;
    }
    const el = currentSlideEl();
    if (!el) return;
    // slide được nhận diện bằng phần tử + nguồn, không bằng media key: cùng một file có thể xuất hiện 2 lần
    if (el === plan.lastSlide && (r?.url ?? null) === plan.lastUrl) {
      if (plan.advanceAt && Date.now() - plan.advanceAt > AQ_STUCK_MS) requestAdvance(plan);
      return;
    }
    if (!r) {
      if (plan.pendingEl !== el) { plan.pendingEl = el; plan.pendingSince = Date.now(); return; }
      if (Date.now() - plan.pendingSince < AQ_PENDING_TIMEOUT_MS) return;
      if (slideLooksLikeVideo(el)) {
        plan.videosSeen++;
        log.warn("auto-queue: không lấy được nguồn video, bỏ qua slide này");
      }
    } else if (r.kind === "video") {
      plan.videosSeen++;
      queueAutoVideo(r);
    }
    plan.lastSlide = el; plan.lastUrl = r?.url ?? null; plan.pendingEl = null;
    if (plan.videosSeen >= plan.videoCount) {
      finishPlan(plan, `auto-queue: xong, ${plan.videosSeen}/${plan.videoCount} video`);
      return;
    }
    plan.advanceAt = 0;
    setTimeout(() => requestAdvance(plan), 400);
  };

  const makeQueueButton = (extraClass) => {
    const btn = document.createElement("button");
    btn.className = `btn-icon sk-queue-btn${extraClass ? " " + extraClass : ""}`;
    btn.type = "button";
    btn.title = t("topbarQueue");
    btn.setAttribute("aria-label", t("topbarQueue"));
    btn.innerHTML = `<span class="sk-queue-icon" aria-hidden="true">${QUEUE_ICON_SVG}</span>`;
    btn.onclick = (e) => {
      e.stopPropagation();
      queueCurrentWebKMedia();
      btn.classList.add("queued");
      setTimeout(() => btn.classList.remove("queued"), 1200);
    };
    return btn;
  };

  const refreshWebK = () => {
    keepPanelsOnTop(); // kéo panel về body nếu viewer đã bị gỡ
    refreshWebKGlyph();
    processAutoQueue();

    const pinned = document.querySelector(".pinned-audio");
    const pinnedUtils = pinned?.querySelector(".pinned-container-wrapper-utils");
    if (pinnedUtils) {
      let b = pinnedUtils.querySelector(".sk-pinned-dl");
      if (!b) {
        b = document.createElement("button");
        b.className = "btn-icon tgico-download sk-pinned-dl";
        b.innerHTML = createWebKDlIcon(true);
        b.type = "button";
        b.onclick = (ev) => {
          ev.stopPropagation();
          const m = getPinnedMedia();
          if (m) downloadMedia(m.url, m.kind);
        };
        pinnedUtils.appendChild(b);
      }
      const dis = !getPinnedMedia();
      if (b.disabled !== dis) b.disabled = dis;
      const label = t(dis ? "loadingMedia" : "download");
      b.title = label; b.setAttribute("aria-label", label);
    }

    const stories = document.getElementById("stories-viewer");
    if (stories) {
      const makeBtn = () => {
        const b = document.createElement("button");
        b.className = "btn-icon rp sk-dl-btn";
        b.innerHTML = `${createWebKDlIcon()}<div class="c-ripple"></div>`;
        b.type = "button";
        b.title = t("download"); b.setAttribute("aria-label", t("download"));
        b.onclick = () => {
          const vSrc = getMediaSource(stories.querySelector("video.media-video"));
          if (vSrc) return downloadMedia(vSrc, "video");
          const iSrc = stories.querySelector("img.media-photo")?.src;
          if (iSrc) downloadMedia(iSrc, "image");
        };
        return b;
      };
      const h = stories.querySelector("[class*='_ViewerStoryHeaderRight']");
      if (h && !h.querySelector(".sk-dl-btn")) h.prepend(makeBtn());
      const f = stories.querySelector("[class*='_ViewerStoryFooterRight']");
      if (f && !f.querySelector(".sk-dl-btn")) f.prepend(makeBtn());
    }

    const viewer = document.querySelector(".media-viewer-whole");
    if (!viewer) return;
    // aspecter của slide hiện tại, không phải slide cũ đang trượt ra
    const mover = currentWebKMover();
    const asp = mover ? (mover.querySelector(":scope > .media-viewer-aspecter") || mover) : null;
    const buttons = viewer.querySelector(".media-viewer-topbar .media-viewer-buttons");
    if (!asp || !buttons) return;

    // kênh chặn lưu ẩn nút tải gốc: hiện lại
    for (const b of getWebKDlButtons(buttons)) {
      if (!b.disabled && b.getAttribute("aria-disabled") !== "true") b.classList.remove("hide");
    }
    const nativeBtns = getWebKDlButtons(buttons).filter(isUsableBtn);
    if (nativeBtns.length) buttons.querySelectorAll("button.sk-dl-btn").forEach((b) => b.remove());
    const hasDl = nativeBtns.length > 0 || !!buttons.querySelector("button.sk-dl-btn");

    const makeViewerDlBtn = (cls) => {
      const b = document.createElement("button");
      b.className = `btn-icon ${cls} sk-dl-btn`;
      b.innerHTML = createWebKDlIcon(true);
      b.type = "button";
      b.title = t("download"); b.setAttribute("aria-label", t("download"));
      b.onclick = downloadCurrentWebKMedia;
      return b;
    };

    if (asp.querySelector(".ckin__player")) {
      const controls = asp.querySelector(".default__controls.ckin__controls");
      if (controls && !controls.querySelector(".sk-dl-btn")) {
        const right = controls.querySelector(".bottom-controls .right-controls");
        right?.prepend(makeViewerDlBtn("default__button tgico-download"));
        if (!controls.querySelector(".sk-queue-btn")) right?.prepend(makeQueueButton("default__button"));
      }
    } else if (asp.querySelector("video") && !hasDl) {
      buttons.prepend(makeViewerDlBtn("tgico-download"));
      if (!buttons.querySelector(".sk-queue-btn")) buttons.prepend(makeQueueButton());
    } else if (!hasDl) {
      const thumb = asp.querySelector("img.thumbnail");
      if (thumb?.src) buttons.prepend(makeViewerDlBtn("tgico-download"));
    }
    if (resolveViewerWebKMedia() && !buttons.querySelector(".sk-queue-btn")) {
      buttons.prepend(makeQueueButton());
    }
  };

  const getWebADlButtons = (c) =>
    Array.from(c.querySelectorAll("button")).filter(
      (b) => !b.classList.contains("sk-dl-btn") &&
        (b.querySelector(".icon-download") || b.title === "Download" ||
          b.getAttribute("aria-label") === "Download") && isUsableBtn(b)
    );

  const downloadCurrentWebAMedia = () => {
    const r = resolveViewerWebAMedia();
    if (r) downloadMedia(r.url, r.kind);
    else log.warn("WebA viewer: chưa đọc được nguồn media — thử bấm phát video rồi tải lại");
  };

  const refreshWebA = () => {
    keepPanelsOnTop(); // panel phải nằm trong dialog top-layer của viewer
    processAutoQueue();
    const story = document.getElementById("StoryViewer");
    if (story) {
      const header = story.querySelector(".GrsJNw3y") || story.querySelector(".DropdownMenu")?.parentNode;
      if (header && !header.querySelector(".sk-dl-btn") && !getWebADlButtons(header).length) {
        const b = document.createElement("button");
        b.className = "Button TkphaPyQ tiny translucent-white round sk-dl-btn";
        b.innerHTML = `<span class="sk-wa-icon" aria-hidden="true">${DL_ICON_SVG}</span>`;
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
    const dlg = document.getElementById("MediaViewer");
    const media = dlg?.querySelector(".MediaViewerSlide--active");
    if (!media) return;
    const makeBtn = () => {
      const b = document.createElement("button");
      b.className = "Button smaller translucent-white round sk-dl-btn";
      b.innerHTML = `<span class="sk-wa-icon" aria-hidden="true">${DL_ICON_SVG}</span>`;
      b.type = "button";
      b.title = t("download"); b.setAttribute("aria-label", t("download"));
      b.onclick = downloadCurrentWebAMedia;
      return b;
    };
    // thanh trên và player xử lý riêng: thiếu cái này không được chặn cái kia.
    // Nút được gắn ngay khi viewer mở, không chờ video có src: lúc bấm mới đọc nguồn.
    // layout mobile của telegram-tt render .MediaViewerActions-mobile thay cho .MediaViewerActions
    const actions = dlg.querySelector(".MediaViewerActions, .MediaViewerActions-mobile");
    if (actions) {
      if (getWebADlButtons(actions).length) {
        actions.querySelectorAll("button.sk-dl-btn").forEach((b) => b.remove());
      } else if (!actions.querySelector("button.sk-dl-btn")) {
        actions.prepend(makeBtn());
      }
      if (!actions.querySelector("button.sk-queue-btn")) actions.prepend(makeWebAQueueButton());
    }
    const controls = media.querySelector(".VideoPlayerControls .buttons");
    if (controls) {
      const sp = controls.querySelector(".spacer");
      const place = (b) => (sp ? sp.after(b) : controls.appendChild(b));
      if (!controls.querySelector("button.sk-dl-btn")) place(makeBtn());
      if (!controls.querySelector("button.sk-queue-btn")) place(makeWebAQueueButton());
    }
  };

  const isWebK = typeof location !== "undefined" &&
    (location.hostname === "webk.telegram.org" || location.pathname.startsWith("/k/"));
  const isWebA = typeof location !== "undefined" &&
    (location.hostname === "webz.telegram.org" || location.pathname.startsWith("/a/"));
  const refreshApp = isWebK ? refreshWebK : isWebA ? refreshWebA : null;

  const boot = () => {
    buildUI();
    refreshAllLabels();

    document.addEventListener("click", (e) => {
      if (!selectMode) return;
      const b = findBubble(e.target);
      if (!b || !b.querySelector(PHOTO_SCOPE_SELECTOR)) return;
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      if (e.shiftKey && lastClickedBubble) rangeSelect(lastClickedBubble, b);
      else markSelected(b, !selectedBubbles.has(b));
      lastClickedBubble = b;
    }, true);

    // đếm video của post trước khi viewer mở
    document.addEventListener("click", armPostFromClick, true);

    selModeBtn.onclick = () => { selectMode = !selectMode; updateSelectBar(); };
    selAutoBtn.onclick = () => {
      autoQueueMode = !autoQueueMode;
      saveStore("autoQueue", autoQueueMode);
      if (autoQueueMode) { seenAutoQueueKeys.clear(); log.info("auto-queue on"); }
      updateSelectBar();
    };
    selClearBtn.onclick = clearSelection;
    selAllBtn.onclick = () => {
      const seen = new Set();
      for (const items of selectedItems.values()) for (const it of items) seen.add(it.key);
      const scopes = pickPhotoScopes(document);
      let added = 0;
      for (const sc of scopes) {
        const item = scopeToPhotoItem(sc);
        if (!item || seen.has(item.key)) continue;
        // kiểm tra đúng ảnh sẽ được tải, không phải ảnh đầu tiên trong scope
        if (!isMeaningfullyVisible(item.el)) continue;
        seen.add(item.key);
        const bubble = sc.closest(".bubble, .Message");
        if (!bubble) continue;
        const list = selectedItems.get(bubble) || [];
        list.push(item);
        selectedItems.set(bubble, list);
        selectedBubbles.add(bubble);
        bubble.classList.add("sk-sel");
        paintTick(item);
        added++;
      }
      log.info(`select-visible: +${added} (total ${totalSelectedItems()})`);
      updateSelectBar();
    };
    selDlBtn.onclick = () => {
      const items = [...selectedItems.values()].flat();
      if (!items.length) return;
      let queued = 0, skipped = 0;
      for (const it of items) {
        if (downloadedKeys.has(it.key)) { skipped++; continue; }
        downloadMedia(it.url, it.kind, { batch: true, silent: true, mediaKey: it.key });
        queued++;
      }
      log.info(`batch: queued ${queued}, skipped ${skipped} already downloaded`);
      clearSelection();
      if (skipped) flashDlButton(t("skippedDownloaded", { n: skipped }));
    };

    window.addEventListener("keydown", (e) => {
      if (!e.ctrlKey || !e.shiftKey) return;
      const k = e.key.toLowerCase();
      if (k === "m") { e.preventDefault(); selectMode = !selectMode; updateSelectBar(); }
      else if (k === "a") { e.preventDefault(); selAutoBtn.click(); }
      else if (k === "d") { e.preventDefault(); selDlBtn.onclick(); }
    });

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
          if (target?.closest("#sk-panel, #sk-select, #sk-settings, .sk-dl-btn, .sk-pinned-dl, .sk-queue-btn")) return false;
          if (target?.closest(roots) || Array.from(r.addedNodes).some((n) =>
            n instanceof Element && (n.matches(roots) || n.querySelector(roots))
          )) return true;
          // dialog WebA bị gỡ khi đóng: refresh để kéo panel về body
          return Array.from(r.removedNodes).some((n) =>
            n instanceof Element && (n.matches?.(roots) || n.querySelector?.(roots))
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

    log.info(`SakerLy Telegram Media Downloader v${SCRIPT_VERSION} loaded — parallel engine ×${getConnections()} (${currentLang.toUpperCase()}, ${isWebK ? "WebK" : isWebA ? "WebA" : "?"})`);
  };

  if (TEST_MODE) {
    Object.assign(globalThis.__SK_TEST__, {
      RangeLedger, SpeedMeter, NetBudget, MemWriter, FsWriter, BlobRegistry,
      backoffDelay, formatBytes, formatDuration, t, LANGS,
      getConnections, setSettings: (s) => Object.assign(settings, s),
      __internal: {
        CHUNK_GRID, CHUNK_DEFAULT, CHUNK_MAX, CHUNK_MIN, CHUNK_RETRIES,
        buildEngine: () => ({ engineDownload, fetchChunk, parallelRangeDownload, downloadFromBlob, concatU8 }),
        makeTask: (url, kind = "video") => ({
          id: "test-" + Math.random().toString(36).slice(2),
          key: "test:" + url, url, kind, mediaKey: "test",
          fileName: "test.bin", state: "preparing", received: 0, total: null,
          speed: 0, eta: null, inflight: 0,
          controller: new AbortController(), meter: new SpeedMeter(),
          startedAt: performance.now(), finished: false,
          pauseFlag: false, cancelRequested: false,
          writer: new MemWriter(), onProgress: () => {},
        }),
      },
    });
    return;
  }

  boot();
})();
