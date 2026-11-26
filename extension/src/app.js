// Gắn nút vào WebK/WebA, copy ở kênh chặn lưu, khởi động (boot).

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
      if (!controls.querySelector(".sk-queue-btn")) right?.prepend(makeQueueButton("btn-icon default__button"));
    }
  } else if (asp.querySelector("video") && !hasDl) {
    buttons.prepend(makeViewerDlBtn("tgico-download"));
    if (!buttons.querySelector(".sk-queue-btn")) buttons.prepend(makeQueueButton("btn-icon"));
  } else if (!hasDl) {
    const thumb = asp.querySelector("img.thumbnail");
    if (thumb?.src) buttons.prepend(makeViewerDlBtn("tgico-download"));
  }
  if (resolveViewerWebKMedia() && !buttons.querySelector(".sk-queue-btn")) {
    buttons.prepend(makeQueueButton("btn-icon"));
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
    if (!actions.querySelector("button.sk-queue-btn")) actions.prepend(makeQueueButton(WEBA_BTN_CLASS));
  }
  const controls = media.querySelector(".VideoPlayerControls .buttons");
  if (controls) {
    const sp = controls.querySelector(".spacer");
    const place = (b) => (sp ? sp.after(b) : controls.appendChild(b));
    if (!controls.querySelector("button.sk-dl-btn")) place(makeBtn());
    if (!controls.querySelector("button.sk-queue-btn")) place(makeQueueButton(WEBA_BTN_CLASS));
  }
};

const isWebK = typeof location !== "undefined" &&
  (location.hostname === "webk.telegram.org" || location.pathname.startsWith("/k/"));
const isWebA = typeof location !== "undefined" &&
  (location.hostname === "webz.telegram.org" || location.pathname.startsWith("/a/"));
const refreshApp = isWebK ? refreshWebK : isWebA ? refreshWebA : null;

// Chat bật "Hạn chế lưu nội dung": WebK gắn .bubble.no-forwards, WebA gắn .Message.is-protected và onCopy={stopEvent}.
// Nghe ở pha capture của window (chạy trước mọi handler của app) và chỉ khi vùng chọn nằm trong tin nhắn bị chặn,
// nên copy ở chat thường (định dạng, emoji…) vẫn do app xử lý.
const PROTECTED_MSG = ".bubble.no-forwards, .Message.is-protected";
const inProtectedMsg = (node) => (node?.nodeType === 1 ? node : node?.parentElement)?.closest?.(PROTECTED_MSG);
const allowProtectedCopy = () => {
  window.addEventListener("copy", (e) => {
    const sel = window.getSelection();
    const text = sel?.toString();
    if (!text || !e.clipboardData || !(inProtectedMsg(sel.anchorNode) || inProtectedMsg(sel.focusNode))) return;
    e.clipboardData.setData("text/plain", text);
    e.preventDefault();
    e.stopImmediatePropagation();
  }, true);
  // app có thể hủy selectstart để không cho bôi đen
  window.addEventListener("selectstart", (e) => {
    if (inProtectedMsg(e.target)) e.stopImmediatePropagation();
  }, true);
};

const boot = () => {
  if (isWebK) watchHlsRequests();
  allowProtectedCopy();
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
    aqPlan = null;
    renderAqStatus();
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
        if (target?.closest("#sk-panel, #sk-select, .sk-dl-btn, .sk-pinned-dl, .sk-queue-btn")) return false;
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

boot();
