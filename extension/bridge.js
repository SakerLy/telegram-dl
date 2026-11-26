// Cầu nối giữa chrome.storage (trang Options đọc/ghi) và trang Telegram.
// content.js chạy ở main world nên không có chrome.*: nó đọc/ghi localStorage "sakerly:*" như userscript.
// File này chạy ở isolated world (có chrome.storage, dùng chung localStorage và window với trang):
// chrome.storage → localStorage + báo trang nạp lại; trang lưu gì → chrome.storage.
const KEYS = ["settings", "lang", "seq", "downloaded", "destDirName", "autoQueue"];
const PREFIX = "sakerly:";

// chỉ báo trang khi giá trị thật sự khác, tránh vòng lặp trang lưu → storage → trang
const toPage = (values) => {
  let changed = false;
  for (const [k, v] of Object.entries(values)) {
    const s = v === undefined ? null : JSON.stringify(v);
    if (localStorage.getItem(PREFIX + k) === s) continue;
    if (s === null) localStorage.removeItem(PREFIX + k);
    else localStorage.setItem(PREFIX + k, s);
    changed = true;
  }
  if (changed) window.postMessage({ source: "tgdl-bridge", type: "reload" }, location.origin);
};

chrome.storage.local.get(KEYS).then((stored) => {
  if (Object.keys(stored).length) return toPage(stored);
  // lần đầu cài: lấy dữ liệu đang có trong trang (vd từ userscript) làm gốc
  const init = {};
  for (const k of KEYS) {
    try {
      const v = localStorage.getItem(PREFIX + k);
      if (v != null) init[k] = JSON.parse(v);
    } catch { /* giá trị hỏng: bỏ qua */ }
  }
  if (Object.keys(init).length) chrome.storage.local.set(init);
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  const values = {};
  for (const k of KEYS) if (k in changes) values[k] = changes[k].newValue;
  toPage(values);
});

// Tải lại/cập nhật extension mà chưa tải lại tab: bridge cũ còn trong tab nhưng mọi lệnh chrome.* ném
// "Extension context invalidated". Khi đó gỡ listener và im lặng; tải lại tab sẽ có bridge mới.
const alive = () => { try { return !!chrome.runtime?.id; } catch { return false; } };

const onPageMessage = (e) => {
  if (e.source !== window || e.data?.source !== "tgdl-page") return;
  if (!alive()) { window.removeEventListener("message", onPageMessage); return; }
  try {
    if (e.data.type === "store" && KEYS.includes(e.data.key)) {
      chrome.storage.local.set({ [e.data.key]: e.data.value }).catch(() => {});
    } else if (e.data.type === "openOptions") {
      // options.html khai báo web_accessible_resources cho các domain Telegram; không cần background:
      // MV3 của Chrome chỉ nhận service_worker, Firefox lại cần background.scripts
      window.open(chrome.runtime.getURL("options.html"), "_blank");
    }
  } catch { window.removeEventListener("message", onPageMessage); }
};
window.addEventListener("message", onPageMessage);
