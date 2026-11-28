// Trang cài đặt của extension: đọc/ghi chrome.storage.local; bridge.js chép sang trang Telegram đang mở.
// Chuỗi giao diện lấy từ src/strings.js (nạp trước file này, khai báo LANGS).
/* global LANGS */

// khớp DEFAULT_SETTINGS trong src/core.js
const DEFAULT_SETTINGS = { naming: "original", prefix: "", template: "{date}_{name}", subfolder: "none", connections: 3, aqUntil: "last", fabSize: 56, fabFade: 0 };
const KEYS = ["settings", "lang", "seq", "downloaded", "destDirName"];

let store = {};
const settings = () => ({ ...DEFAULT_SETTINGS, ...store.settings });
const lang = () => (LANGS[store.lang] ? store.lang : (navigator.language || "en").toLowerCase().startsWith("vi") ? "vi" : "en");
const t = (key, params = {}) =>
  (LANGS[lang()][key] ?? LANGS.en[key] ?? key).replace(/\{(\w+)\}/g, (ph, name) => (name in params ? String(params[name]) : ph));
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

// ---- tên file ví dụ: cùng quy tắc với applyNaming (src/files.js) và subfolderSegments, trên một tên mẫu ----
const pad = (n, w = 2) => String(n).padStart(w, "0");
const sanitize = (s) => (s || "").replace(/[\x00-\x1f\x7f<>:"/\\|?*]/g, "_"); // eslint-disable-line no-control-regex
const now = () => {
  const d = new Date();
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const time = `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  return { date, time, stamp: date.replaceAll("-", "") + "-" + time };
};
const exampleName = (mode = settings().naming) => {
  const s = settings(), { date, time, stamp } = now();
  const base = "IMG_2048", ext = ".jpg", seq = pad(store.seq ?? 1, 3);
  const prefix = s.prefix ? sanitize(s.prefix) + "_" : "";
  if (mode === "custom") {
    const tokens = { name: base, date, time, seq, channel: "Channel" };
    const out = String(s.template || "").replace(/\{(\w+)\}/g, (ph, k) => tokens[k] ?? ph);
    return prefix + (sanitize(out).trim().slice(0, 150) || base) + ext;
  }
  const byMode = { date: stamp, seq, date_original: `${stamp}_${base}`, seq_original: `${seq}_${base}` };
  return prefix + (byMode[mode] ?? base) + ext;
};
const examplePath = () => {
  const { date } = now();
  const segs = { date: [date], channel: ["Channel"], date_channel: [date, "Channel"], channel_date: ["Channel", date] };
  return [store.destDirName || "Downloads", ...(store.destDirName ? segs[settings().subfolder] || [] : []), exampleName()].join(" / ");
};

// ---- lưu ----
let toastTimer = 0;
const toast = (text = t("optionsSaved")) => {
  const el = $("#toast");
  el.textContent = "✓  " + text;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 1800);
};
const save = (values) => { Object.assign(store, values); chrome.storage.local.set(values).then(() => toast()); render(); };
const saveSetting = (key, value) => save({ settings: { ...settings(), [key]: value } });

// ---- vẽ ----
const render = () => {
  const s = settings();
  const manifest = chrome.runtime.getManifest();
  document.documentElement.lang = lang();
  $(".ver").textContent = "v" + manifest.version;
  $(".ver-num").textContent = manifest.version;
  const src = $("#source");
  src.href = manifest.homepage_url || "#";
  src.textContent = (manifest.homepage_url || "").replace(/^https?:\/\//, "");
  for (const el of $$("[data-key]")) el.textContent = t(el.dataset.key);
  $('[data-setting="prefix"]').placeholder = t("prefixPlaceholder");

  for (const seg of $$(".seg")) {
    const cur = seg.dataset.setting === "lang" ? lang() : String(s[seg.dataset.setting]);
    for (const b of seg.querySelectorAll("button")) {
      b.classList.toggle("on", b.value === cur);
      b.setAttribute("aria-pressed", String(b.value === cur));
    }
  }
  for (const group of $$(".choices")) {
    const cur = String(s[group.dataset.setting]);
    for (const c of group.querySelectorAll(".choice")) {
      const on = c.value === cur;
      c.classList.toggle("on", on);
      c.setAttribute("aria-checked", String(on));
      c.tabIndex = on ? 0 : -1; // radio group: Tab vào lựa chọn đang bật, mũi tên để đổi
    }
  }
  for (const c of $$('.choices[data-setting="naming"] .choice')) {
    if (c.value !== "custom") c.querySelector("code").textContent = exampleName(c.value);
  }
  for (const el of $$("input[data-setting]")) {
    if (document.activeElement !== el) el.value = s[el.dataset.setting] ?? ""; // không ghi đè ô đang gõ
  }
  $("#template-row").hidden = s.naming !== "custom";
  $("#preview").textContent = exampleName();

  const folder = store.destDirName || "";
  const name = $("#folder-name");
  name.textContent = folder || t("folderNoneLong");
  name.classList.toggle("none", !folder);
  $("#clear-folder").hidden = !folder;
  $("#subfolder-hint").hidden = !!folder;
  $('.choices[data-setting="subfolder"]').setAttribute("aria-disabled", String(!folder));
  $("#path").textContent = examplePath();

  // không đặt lại thanh trượt đang kéo
  for (const r of $$("input[data-range]")) if (document.activeElement !== r) r.value = s[r.dataset.range];
  showFab(Number(s.fabSize), Number(s.fabFade));

  $("#seq-value").textContent = pad(store.seq ?? 1, 3);
  const n = (store.downloaded || []).length;
  $("#downloaded-value").textContent = new Intl.NumberFormat(lang()).format(n);
  $("#forget").disabled = n === 0;
};

// ---- sự kiện ----
for (const seg of $$(".seg")) {
  seg.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (seg.dataset.setting === "lang") save({ lang: b.value });
    else saveSetting(seg.dataset.setting, Number(b.value));
  });
}
for (const group of $$(".choices")) {
  group.addEventListener("click", (e) => {
    const c = e.target.closest(".choice");
    if (c) saveSetting(group.dataset.setting, c.value);
  });
  group.addEventListener("keydown", (e) => {
    const dir = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!dir) return;
    e.preventDefault();
    const items = [...group.querySelectorAll(".choice")];
    const next = items[(items.indexOf(document.activeElement) + dir + items.length) % items.length];
    saveSetting(group.dataset.setting, next.value);
    next.focus();
  });
}
for (const el of $$("input[data-setting]")) {
  el.addEventListener("input", () => saveSetting(el.dataset.setting, el.value));
}
// nút tải nổi: kéo thì chỉ đổi xem trước, thả tay mới lưu (đỡ ghi storage liên tục)
const showFab = (size, fade) => {
  const demo = $(".fab-demo");
  demo.style.setProperty("--size", size + "px");
  demo.style.setProperty("--op", String(1 - fade / 100));
  $('[data-out="fabSize"]').textContent = size + " px";
  $('[data-out="fabFade"]').textContent = fade + "%";
};
for (const r of $$("input[data-range]")) {
  const live = () => {
    const v = (k) => Number($(`input[data-range="${k}"]`).value);
    showFab(v("fabSize"), v("fabFade"));
  };
  r.addEventListener("input", live);
  r.addEventListener("change", () => saveSetting(r.dataset.range, Number(r.value)));
}

// chip: chèn {token} vào đúng chỗ con trỏ trong ô mẫu
const tpl = $('[data-setting="template"]');
for (const chip of $$(".chip")) {
  chip.addEventListener("click", () => {
    const token = `{${chip.dataset.token}}`;
    const start = tpl.selectionStart ?? tpl.value.length, end = tpl.selectionEnd ?? start;
    tpl.value = (tpl.value.slice(0, start) + token + tpl.value.slice(end)).slice(0, tpl.maxLength);
    tpl.focus();
    tpl.setSelectionRange(start + token.length, start + token.length);
    saveSetting("template", tpl.value);
  });
}
$("#clear-folder").addEventListener("click", () => save({ destDirName: "" }));
$("#reset-seq").addEventListener("click", () => save({ seq: 1 }));
// xoá danh sách đã tải: bấm 2 lần trong 3 giây, không dùng hộp thoại confirm()
let armTimer = 0;
$("#forget").addEventListener("click", (e) => {
  const btn = e.currentTarget;
  if (!btn.classList.contains("arm")) {
    btn.classList.add("arm");
    btn.textContent = t("confirmAgain");
    armTimer = setTimeout(() => { btn.classList.remove("arm"); render(); }, 3000);
    return;
  }
  clearTimeout(armTimer);
  btn.classList.remove("arm");
  save({ downloaded: [] });
});

// thanh bên sáng theo mục đang xem
const spy = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    for (const a of $$(".nav a")) a.classList.toggle("on", a.dataset.nav === e.target.id);
  }
}, { rootMargin: "-30% 0px -60% 0px" });
for (const sec of $$(".sec")) spy.observe(sec);
$(".nav a").classList.add("on");

// trang Telegram tải xong file hay đổi thư mục thì số liệu ở đây cập nhật theo
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  for (const k of KEYS) if (k in changes) store[k] = changes[k].newValue;
  render();
});
chrome.storage.local.get(KEYS).then((v) => { store = v; render(); });
