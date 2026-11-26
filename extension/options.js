// Trang cài đặt của extension: đọc/ghi chrome.storage.local; bridge.js chép sang trang Telegram đang mở.
// Chuỗi giao diện lấy từ src/strings.js (nạp trước file này, khai báo LANGS).
/* global LANGS */

// khớp DEFAULT_SETTINGS trong src/core.js
const DEFAULT_SETTINGS = { naming: "original", prefix: "", template: "{date}_{name}", subfolder: "none", connections: 3, aqUntil: "last" };
const KEYS = ["settings", "lang", "seq", "downloaded", "destDirName"];

let store = {};
const settings = () => ({ ...DEFAULT_SETTINGS, ...store.settings });
const lang = () => (LANGS[store.lang] ? store.lang : (navigator.language || "en").toLowerCase().startsWith("vi") ? "vi" : "en");
const t = (key, params = {}) =>
  (LANGS[lang()][key] ?? LANGS.en[key] ?? key).replace(/\{(\w+)\}/g, (ph, name) => (name in params ? String(params[name]) : ph));
const $ = (sel) => document.querySelector(sel);

// cùng quy tắc với applyNaming trong src/files.js, trên một tên mẫu
const pad = (n, w = 2) => String(n).padStart(w, "0");
const sanitize = (s) => (s || "").replace(/[\x00-\x1f\x7f<>:"/\\|?*]/g, "_"); // eslint-disable-line no-control-regex
const previewName = () => {
  const s = settings(), d = new Date();
  const base = "IMG_2048", ext = ".jpg";
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const time = `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const stamp = date.replaceAll("-", "") + "-" + time;
  const seq = pad(store.seq ?? 1, 3);
  const prefix = s.prefix ? sanitize(s.prefix) + "_" : "";
  if (s.naming === "custom") {
    const tokens = { name: base, date, time, seq, channel: "Channel" };
    const out = String(s.template || "").replace(/\{(\w+)\}/g, (ph, k) => tokens[k] ?? ph);
    return prefix + (sanitize(out).trim().slice(0, 150) || base) + ext;
  }
  const byMode = { date: stamp, seq, date_original: `${stamp}_${base}`, seq_original: `${seq}_${base}` };
  return prefix + (byMode[s.naming] ?? base) + ext;
};

let toastTimer = 0;
const toast = () => {
  const el = $("#toast");
  el.textContent = t("optionsSaved");
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 1600);
};
const save = (values) => { Object.assign(store, values); chrome.storage.local.set(values).then(toast); render(); };
const saveSetting = (key, value) => save({ settings: { ...settings(), [key]: value } });

const render = () => {
  const s = settings();
  document.documentElement.lang = lang();
  $(".ver").textContent = "v" + chrome.runtime.getManifest().version;
  for (const el of document.querySelectorAll("[data-key]")) el.textContent = t(el.dataset.key);
  $('[data-setting="prefix"]').placeholder = t("prefixPlaceholder");

  for (const seg of document.querySelectorAll(".seg")) {
    const cur = seg.dataset.setting === "lang" ? lang() : String(s[seg.dataset.setting]);
    for (const b of seg.querySelectorAll("button")) b.classList.toggle("on", b.value === cur);
  }
  for (const el of document.querySelectorAll("select[data-setting], input[data-setting]")) {
    // không ghi đè ô đang gõ
    if (document.activeElement !== el) el.value = s[el.dataset.setting] ?? "";
  }
  $("#template-row").hidden = s.naming !== "custom";
  $("#preview").textContent = previewName();

  const folder = store.destDirName || "";
  $("#folder-name").textContent = folder || t("folderNone");
  $("#folder-name").classList.toggle("none", !folder);
  $("#clear-folder").hidden = !folder;
  $('[data-setting="subfolder"]').disabled = !folder;
  $("#subfolder-hint").hidden = !!folder;

  $("#seq-info").textContent = t("seqNow", { n: store.seq ?? 1 });
  const n = (store.downloaded || []).length;
  $("#downloaded-info").textContent = t("downloadedCount", { n });
  $("#forget").disabled = n === 0;
};

for (const seg of document.querySelectorAll(".seg")) {
  seg.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (seg.dataset.setting === "lang") save({ lang: b.value });
    else saveSetting(seg.dataset.setting, Number(b.value));
  });
}
for (const el of document.querySelectorAll("select[data-setting]")) {
  el.addEventListener("change", () => saveSetting(el.dataset.setting, el.value));
}
for (const el of document.querySelectorAll("input[data-setting]")) {
  el.addEventListener("input", () => saveSetting(el.dataset.setting, el.value));
}
$("#clear-folder").addEventListener("click", () => save({ destDirName: "" }));
$("#reset-seq").addEventListener("click", () => save({ seq: 1 }));
$("#forget").addEventListener("click", () => {
  if (confirm(t("forgetDownloaded") + "?")) save({ downloaded: [] });
});

// trang Telegram tải xong file hay đổi thư mục thì số liệu ở đây cập nhật theo
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  for (const k of KEYS) if (k in changes) store[k] = changes[k].newValue;
  render();
});
chrome.storage.local.get(KEYS).then((v) => { store = v; render(); });
