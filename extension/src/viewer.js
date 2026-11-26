// Trình xem media WebK/WebA: đọc nguồn slide, nút tải, nút xếp hàng, chuyển slide, audio ghim.

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
  if (videoUrl) return { url: videoUrl, kind: "video", el: videoEl };
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

const blobReadable = (url) =>
  ownFetch(url).then((res) => { res.body?.cancel().catch(() => {}); return true; }, () => false);

// video WebK có nguồn blob: không phải Blob (MediaSource của hls.js) thì tải lại qua HLS;
// phải gọi khi slide còn mở (cần video.duration để nhận đúng playlist). Không chờ tải xong.
// Không dò blob: bằng fetch trừ khi bắt buộc: request lỗi nào trình duyệt cũng in đỏ ra Console
const downloadViewerMedia = async (r, opts) => {
  if (isWebK && r.kind === "video" && r.url.startsWith("blob:") && !(BlobRegistry.get(r.url) instanceof Blob)) {
    const isMs = BlobRegistry.isMediaSource(r.url);
    // chưa chắc là HLS thì playlist phải khớp thời lượng mới nhận
    const master = r.el ? await findHlsMaster(r.el, !isMs) : null;
    if (master) {
      // media key tính từ master (file:<id>) để chống trùng đúng file, không theo blob: tạm thời
      const { mediaKey: _mk, ...rest } = opts;
      downloadMedia(master, "video", rest);
      return true;
    }
    if (isMs || !(await blobReadable(r.url))) {
      log.warn("HLS: không tìm được playlist của video này");
      flashDlButton(t("hlsNotFound"));
      return false;
    }
  }
  downloadMedia(r.url, r.kind, opts);
  return true;
};

const downloadCurrentWebKMedia = () => {
  const r = resolveViewerWebKMedia();
  if (r) downloadViewerMedia(r, {});
};

// downloadMedia đã gộp task đang chạy; skipDownloaded bỏ qua file đã tải, còn file lỗi/đã hủy thì xếp hàng lại được
const queueViewerMedia = () => {
  const r = isWebA ? resolveViewerWebAMedia() : resolveViewerWebKMedia();
  if (!r) return;
  downloadViewerMedia(r, { batch: true, silent: true, skipDownloaded: true });
  log.info(`queued: ${r.kind}`);
};

const WEBA_BTN_CLASS = "Button smaller translucent-white round";
// className lấy class nút gốc của từng app để hợp giao diện viewer
const makeQueueButton = (className) => {
  const btn = document.createElement("button");
  btn.className = `${className} sk-queue-btn`;
  btn.type = "button";
  btn.title = t("topbarQueue");
  btn.setAttribute("aria-label", t("topbarQueue"));
  btn.innerHTML = `<span class="sk-queue-icon" aria-hidden="true">${QUEUE_ICON_SVG}</span>`;
  btn.onclick = (e) => {
    e.stopPropagation();
    queueViewerMedia();
    btn.classList.add("queued");
    setTimeout(() => btn.classList.remove("queued"), 1200);
  };
  return btn;
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
