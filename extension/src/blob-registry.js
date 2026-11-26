// Giữ Blob đằng sau blob: URL của app (hook URL.createObjectURL), nhận diện MediaSource.

// Giữ Blob đằng sau blob: URL do app tạo: tải bằng Blob.slice không qua mạng, vẫn đọc được sau khi app revoke URL
const BlobRegistry = (() => {
  const map = new Map();
  let totalBytes = 0;

  const mediaSources = new Set();
  const remember = (url, obj) => {
    if (!url || typeof url !== "string" || !url.startsWith("blob:")) return url;
    if (!(obj instanceof Blob)) {
      // MediaSource của hls.js: không có dữ liệu để tải, chỉ nhớ để biết video này phải tải qua HLS
      if (typeof MediaSource !== "undefined" && obj instanceof MediaSource) {
        mediaSources.add(url);
        if (mediaSources.size > 50) mediaSources.delete(mediaSources.values().next().value);
      }
      return url;
    }
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

  return { install, get, remember, isMediaSource: (url) => mediaSources.has(url) };
})();
BlobRegistry.install();
