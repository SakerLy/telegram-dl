// HLS của WebK: bắt request playlist, đọc master/quality playlist, chọn bản, khớp video.

// ---- HLS: video nhiều độ phân giải trên WebK ----
// tweb phát qua hls.js (lib/hls): master hls/<JSON> → hls_quality_file/<docId> → các đoạn hls_stream/<JSON> theo byte range.
// src của <video> là blob: của MediaSource, không có dữ liệu để đọc: tải lại các đoạn rồi ghép thành một file.
const HLS_MASTER_RE = /(^|\/)hls\/(%7B|\{)/i;
const hlsToStream = (u) => u.replace(HLS_MASTER_RE, "$1stream/$2"); // master mang DownloadOptions của file gốc
const hlsMasters = []; // [{url, at}] master hls.js đã request, mới nhất cuối
let ownRequest = false; // request của chính script không tính là "video vừa mở"
const ownFetch = (...args) => { ownRequest = true; try { return fetch(...args); } finally { ownRequest = false; } };
const noteHlsMaster = (url) => {
  if (ownRequest || !HLS_MASTER_RE.test(url)) return;
  const abs = new URL(url, location.href).href;
  const i = hlsMasters.findIndex((m) => m.url === abs);
  if (i >= 0) hlsMasters.splice(i, 1);
  hlsMasters.push({ url: abs, at: Date.now() });
  if (hlsMasters.length > 20) hlsMasters.shift();
};
// XHR là loader mặc định của hls.js; fetch cho chắc
const watchHlsRequests = () => {
  try {
    const nativeOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url, ...rest) {
      try { noteHlsMaster(String(url)); } catch { /* hook không được làm hỏng request của app */ }
      return nativeOpen.call(this, method, url, ...rest);
    };
    const nativeFetch = window.fetch;
    window.fetch = function (input, ...rest) {
      try { noteHlsMaster(String(input?.url ?? input)); } catch { /* hook không được làm hỏng request của app */ }
      return nativeFetch.call(this, input, ...rest);
    };
  } catch (e) { log.warn("HLS hook: " + e.message); }
};

const m3uAttrs = (s) => {
  const out = {};
  for (const m of s.matchAll(/([A-Z0-9-]+)=("[^"]*"|[^,]*)/g)) out[m[1]] = m[2].replace(/^"|"$/g, "");
  return out;
};
const parseHlsMaster = (text, base) => {
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  const variants = [];
  lines.forEach((l, i) => {
    if (!l.startsWith("#EXT-X-STREAM-INF:")) return;
    const uri = lines[i + 1];
    if (!uri || uri.startsWith("#")) return;
    const a = m3uAttrs(l.slice(18));
    variants.push({
      url: new URL(uri, base).href,
      height: Number((a.RESOLUTION || "").split("x")[1]) || 0,
      bandwidth: Number(a.BANDWIDTH) || 0,
    });
  });
  return variants;
};
// các đoạn theo thứ tự (cả EXT-X-MAP); BYTERANGE "len@off", thiếu @off thì nối tiếp đoạn trước của cùng URL
const parseHlsMedia = (text, base) => {
  const parts = [], ends = new Map();
  let duration = 0, range = null;
  const add = (uri, br) => {
    const url = new URL(uri, base).href;
    const p = { url, start: null, len: null };
    if (br) {
      const [len, off] = br.split("@");
      p.start = off != null ? Number(off) : (ends.get(url) ?? 0);
      p.len = Number(len);
      ends.set(url, p.start + p.len);
    }
    parts.push(p);
  };
  for (const l of text.split(/\r?\n/).map((x) => x.trim())) {
    if (!l) continue;
    if (l.startsWith("#EXT-X-MAP:")) { const a = m3uAttrs(l.slice(11)); if (a.URI) add(a.URI, a.BYTERANGE); }
    else if (l.startsWith("#EXTINF:")) duration += parseFloat(l.slice(8)) || 0;
    else if (l.startsWith("#EXT-X-BYTERANGE:")) range = l.slice(17);
    else if (!l.startsWith("#")) { add(l, range); range = null; }
  }
  return { parts, duration };
};
const fetchText = async (url) => {
  const res = await ownFetch(url);
  if (!res.ok) throw downloadError("errorHttp", { status: res.status });
  return res.text();
};
// Telegram có bản H.264, HEVC và AV1; HEVC/AV1 nhiều trình phát (vd trình phát mặc định của Windows) không mở được
const CODEC_RANK = { avc1: 0, avc3: 0, hvc1: 1, hev1: 1, av01: 2 };
const detectCodec = (bytes) => {
  const s = new TextDecoder("latin1").decode(bytes);
  return Object.keys(CODEC_RANK).find((c) => s.includes(c)) || null;
};
// master → { parts, duration, height, codec, mime }: bản H.264 cao nhất, không có thì bản cao nhất còn lại;
// codec đọc từ đoạn init (moov) vì master của tweb không ghi CODECS. Nhớ lại để tải khỏi đọc lần nữa
const hlsPlans = new Map();
const loadHlsPlan = (master) => {
  if (!hlsPlans.has(master)) {
    const p = (async () => {
      const variants = parseHlsMaster(await fetchText(master), master)
        .sort((a, b) => b.height - a.height || b.bandwidth - a.bandwidth);
      const cands = [];
      for (const v of variants) {
        try {
          const media = parseHlsMedia(await fetchText(v.url), v.url);
          if (!media.parts.length) continue;
          const init = media.parts[0];
          let codec = null;
          try { codec = detectCodec(await fetchRangeBytes(init.url, init.start ?? 0, init.len ?? 65536, undefined, true)); }
          catch { /* không đọc được init: coi như codec lạ */ }
          const seg = getMediaMetadata(media.parts.at(-1).url); // hls_stream JSON: {docId, dcId, size, mimeType}
          cands.push({ ...media, height: v.height, codec, mime: typeof seg?.mimeType === "string" ? seg.mimeType : "video/mp4" });
          if (CODEC_RANK[codec] === 0) break; // đã sắp cao nhất trước: bản H.264 đầu tiên là tốt nhất
        } catch (e) { log.warn(`HLS ${v.height}p: ${e.message}`); }
      }
      if (!cands.length) throw new Error("HLS: không đọc được bản nào trong playlist");
      const rank = (c) => CODEC_RANK[c.codec] ?? 1.5;
      return cands.reduce((a, b) => (rank(b) < rank(a) ? b : a));
    })();
    p.catch(() => hlsPlans.delete(master));
    hlsPlans.set(master, p);
    if (hlsPlans.size > 20) hlsPlans.delete(hlsPlans.keys().next().value);
  }
  return hlsPlans.get(master);
};
// master của video đang mở: MediaSource lấy duration từ chính playlist nên thời lượng phải khớp
const findHlsMaster = async (video, strict = false) => {
  const durOk = () => video.duration > 0 && Number.isFinite(video.duration);
  for (let i = 0; i < 50 && !durOk(); i++) await sleep(100);
  const dur = durOk() ? video.duration : null;
  if (dur == null && strict) return null;
  for (const m of [...hlsMasters].reverse()) {
    try {
      const plan = await loadHlsPlan(m.url);
      if (dur == null || Math.abs(plan.duration - dur) < 1.5) return m.url;
    } catch (e) { log.warn(e.message); }
  }
  return null;
};
