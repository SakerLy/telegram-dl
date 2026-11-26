// Chọn hàng loạt ảnh trong chat.

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
let autoQueueMode = loadStore("autoQueue", false);
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

const setSwitch = (btn, label, on) => {
  btn.querySelector(".lbl").textContent = label;
  btn.classList.toggle("on", on);
  btn.setAttribute("aria-checked", String(on));
};

const updateSelectBar = () => {
  if (!selectBar) return;
  // giữ vị trí cuộn khi vẽ lại list
  const bodyEl = selectBar.querySelector(".sk-scroll");
  const stick = bodyEl ? bodyEl.scrollTop : 0;
  const count = totalSelectedItems();
  selCount.textContent = count ? intFmt().format(count) : "";
  selTitle.textContent = t("tabSelect");
  selHint.innerHTML =
    `<div>${t("hintPhoto")}</div><div>${t("hintVideo")}</div><div class="keys">${t("hintKeys")}</div>`;
  setSwitch(selModeBtn, t("selectMode"), selectMode);
  setSwitch(selAutoBtn, t("autoQueue"), autoQueueMode);
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

