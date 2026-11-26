// Nền tảng dùng chung: lưu trữ, dịch (t), lỗi, log, sleep, định dạng, cài đặt, IndexedDB.

const STORAGE_PREFIX = "sakerly:";
const loadStore = (k, fb) => {
  try {
    const v = localStorage.getItem(STORAGE_PREFIX + k);
    return v == null ? fb : JSON.parse(v);
  } catch { return fb; }
};
const saveStore = (k, v) => {
  try { localStorage.setItem(STORAGE_PREFIX + k, JSON.stringify(v)); } catch { /* localStorage bị chặn hoặc đầy: bỏ qua */ }
  // bridge.js chép sang chrome.storage để trang Options thấy (nó bỏ qua khóa không cần như vị trí panel)
  window.postMessage({ source: "tgdl-page", type: "store", key: k, value: v }, location.origin);
};

const defaultLang = () =>
  ((typeof navigator !== "undefined" && navigator.language) || "en").toLowerCase().startsWith("vi") ? "vi" : "en";
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
  if (!Number.isFinite(sec) || sec < 0) return "-";
  sec = Math.round(sec);
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
};

// pattern getRetryTimeout của WebA, cộng jitter
const backoffDelay = (attempt) =>
  Math.min(RETRY_BASE_MS * 2 ** attempt, RETRY_MAX_MS) + Math.random() * 250;

const CONTENT_RANGE_RE = /^bytes (\d+)-(\d+)\/(\d+|\*)$/;

const DEFAULT_SETTINGS = { naming: "original", prefix: "", template: "{date}_{name}", subfolder: "none", connections: 3, aqUntil: "last" };
const settings = Object.assign({}, DEFAULT_SETTINGS, loadStore("settings", {}));
const getConnections = () => Math.min(4, Math.max(1, Number(settings.connections) || 3));
let seqCounter = loadStore("seq", 1);

const openIDB = () => new Promise((res, rej) => {
  const r = indexedDB.open("sakerly", 1);
  r.onupgradeneeded = () => r.result.createObjectStore("kv");
  r.onsuccess = () => res(r.result);
  r.onerror = () => rej(r.error);
});
// mọi lỗi IndexedDB đều trả null: chỉ mất phần nhớ thư mục
const idbReq = async (mode, op) => {
  try {
    const db = await openIDB();
    return await new Promise((res) => {
      const r = op(db.transaction("kv", mode).objectStore("kv"));
      r.onsuccess = () => res(r.result); r.onerror = () => res(null);
    });
  } catch { return null; }
};
const idbGet = (k) => idbReq("readonly", (s) => s.get(k));
const idbSet = (k, v) => idbReq("readwrite", (s) => s.put(v, k));
const idbDel = (k) => idbReq("readwrite", (s) => s.delete(k));
