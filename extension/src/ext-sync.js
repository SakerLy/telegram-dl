// Đồng bộ với trang Options của extension (qua bridge.js): nhận báo nạp lại cài đặt, xin mở trang Options.

// bridge.js vừa chép chrome.storage vào localStorage: đọc lại và áp dụng ngay, không cần tải lại trang
const reloadFromStore = () => {
  Object.assign(settings, DEFAULT_SETTINGS, loadStore("settings", {}));
  currentLang = loadStore("lang", currentLang);
  if (!LANGS[currentLang]) currentLang = "en";
  seqCounter = loadStore("seq", 1);
  downloadedKeys = new Set(loadStore("downloaded", []));
  if (!downloadedKeys.size) seenAutoQueueKeys.clear();
  const name = loadStore("destDirName", "");
  if (!name && destDirName) { destDirHandle = null; idbDel("destDirHandle"); } // Options bấm "Bỏ chọn"
  destDirName = name;
  autoQueueMode = loadStore("autoQueue", false);
  refreshAllLabels();
};

window.addEventListener("message", (e) => {
  if (e.source === window && e.data?.source === "tgdl-bridge" && e.data.type === "reload") reloadFromStore();
});

const openOptions = () => window.postMessage({ source: "tgdl-page", type: "openOptions" }, location.origin);
