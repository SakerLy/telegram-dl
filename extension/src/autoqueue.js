// Auto-queue video: đếm video phía trước, đi từng slide, dòng trạng thái.

// Auto-queue. Lúc click vào media, đọc khung chat để biết trước còn bao nhiêu video phía trước:
// ở cả tweb (listLoader: next = msgid cao hơn) lẫn telegram-tt (getNextItem: messageMediaIds[i + 1]),
// slide kế tiếp là media kế tiếp phía dưới trong chat. Đi từng slide, dừng ngay khi đã gặp đủ số video đó.
const AQ_PENDING_TIMEOUT_MS = 15000; // slide video mãi không có src: bỏ qua
const AQ_STUCK_MS = 2500; // đã bấm next mà slide không đổi: bấm lại
const AQ_END_RETRIES = 8; // nút next ẩn có thể chỉ là viewer đang tải thêm slide
let aqPlan = null;

const POST_ITEM_SELECTOR = ".album-item, .bubble__media-container, .attachment, .media-inner";
// gif, video tròn, sticker không nằm trong danh sách slide của viewer
const NON_VIEWER_MEDIA = ".media-gif-wrapper, .media-round, .media-sticker-wrapper, .RoundVideo, .sticker-media";
const postMediaItems = (bubble) => {
  if (bubble.matches(EXCLUDED_BUBBLE_CLASSES)) return [];
  const albumItems = bubble.querySelectorAll(".album-item");
  const items = albumItems.length
    ? Array.from(albumItems)
    : Array.from(bubble.querySelectorAll(".bubble__media-container, .attachment, .media-inner"))
      .filter((el) => !el.closest(".album-item"))
      .slice(0, 1);
  return items.filter((el) => !el.closest(EXCLUDED_SCOPES) &&
    !el.matches(NON_VIEWER_MEDIA) && !el.querySelector(NON_VIEWER_MEDIA) &&
    !!el.querySelector("img, video, canvas"));
};
const isViewerVideo = (el) => {
  if (!scopeIsVideoLike(el)) return false;
  // telegram-tt dùng chung component Video cho gif, chỉ khác badge "GIF"
  const badge = el.querySelector(".message-media-duration");
  return !(badge && /^gif/i.test(badge.textContent.trim()));
};

// số video từ media `item` trở xuống trong phần chat đã tải; null nếu item đã bị gỡ khỏi DOM
const countVideosAhead = (item) => {
  const bubble = item?.isConnected ? item.closest(".bubble, .Message") : null;
  if (!bubble || item.closest(EXCLUDED_SCOPES)) return null;
  const list = bubble.closest(".bubbles-inner, .bubbles, .MessageList");
  const all = (list ? Array.from(list.querySelectorAll(BUBBLE_SELECTORS)) : [bubble]).flatMap(postMediaItems);
  const start = all.findIndex((el) => el === item || el.contains(item) || item.contains(el));
  return start < 0 ? null : all.slice(start).filter(isViewerVideo).length;
};

const armPostFromClick = (e) => {
  if (!autoQueueMode || selectMode) return;
  const item = e.target.closest?.(POST_ITEM_SELECTOR);
  const videoCount = countVideosAhead(item);
  if (videoCount == null) return;
  aqPlan = {
    startEl: item, videoCount, videosSeen: 0,
    lastSlide: null, lastUrl: null, pendingEl: null, pendingSince: 0, advanceAt: 0, endRetries: 0,
  };
  log.info(`auto-queue: còn ${videoCount} video phía trước`);
  renderAqStatus();
};

// dòng trạng thái trong panel Chọn hàng loạt; "đã qua" gồm cả video đã tải trước đó (bị bỏ qua)
const renderAqStatus = () => {
  const el = selectBar?.querySelector(".sk-aq-status");
  if (!el) return;
  const plan = autoQueueMode ? aqPlan : null;
  el.hidden = !plan;
  if (!plan) return;
  const left = plan.videoCount - plan.videosSeen;
  el.textContent = left > 0
    ? t("aqStatus", { left, seen: plan.videosSeen })
    : t("aqStatusSearching", { seen: plan.videosSeen });
};

const viewerOpen = () => {
  if (isWebA) return !!document.getElementById("MediaViewer");
  return !!document.querySelector(".media-viewer-whole");
};
const currentSlideEl = () => isWebA
  ? document.querySelector("#MediaViewer .MediaViewerSlide--active")
  : currentWebKMover();
const slideLooksLikeVideo = (el) =>
  !!el?.querySelector(isWebA ? ".VideoPlayer, video" : VIDEO_CONTEXT_SELECTOR);

const queueAutoVideo = (r) => {
  const mk = mediaKey(r.url);
  if (seenAutoQueueKeys.has(mk)) return;
  seenAutoQueueKeys.add(mk);
  log.info("auto-queue: video");
  return downloadViewerMedia(r, { batch: true, silent: true, mediaKey: mk, skipDownloaded: true });
};

const finishPlan = (plan, msg) => {
  if (aqPlan !== plan) return;
  aqPlan = null;
  log.info(msg);
  renderAqStatus();
  flashDlButton(t("postVideosDone", { n: plan.videosSeen }));
};

const requestAdvance = (plan) => {
  if (aqPlan !== plan) return;
  const res = autoAdvanceViewer();
  if (res === true) { plan.advanceAt = Date.now(); plan.endRetries = 0; return; }
  if (res === null) { setTimeout(() => requestAdvance(plan), 300); return; } // lần chuyển trước chưa xong
  if (++plan.endRetries <= AQ_END_RETRIES) { setTimeout(() => requestAdvance(plan), 500); return; }
  const missed = plan.videoCount - plan.videosSeen;
  finishPlan(plan, missed > 0
    ? `auto-queue: hết slide, ${missed} video không tới được`
    : `auto-queue: hết slide, ${plan.videosSeen} video`);
};

const processAutoQueue = () => { stepAutoQueue(); renderAqStatus(); };
const stepAutoQueue = () => {
  if (!autoQueueMode) return;
  if (!viewerOpen()) { aqPlan = null; return; }
  const r = isWebA ? resolveViewerWebAMedia() : resolveViewerWebKMedia();
  const plan = aqPlan;
  if (!plan) {
    // viewer không mở từ một click vào post: chỉ xếp hàng video đang xem, không tự chuyển slide
    if (r?.kind === "video") queueAutoVideo(r);
    return;
  }
  const el = currentSlideEl();
  if (!el) return;
  // slide được nhận diện bằng phần tử + nguồn, không bằng media key: cùng một file có thể xuất hiện 2 lần
  if (el === plan.lastSlide && (r?.url ?? null) === plan.lastUrl) {
    if (plan.advanceAt && Date.now() - plan.advanceAt > AQ_STUCK_MS) requestAdvance(plan);
    return;
  }
  let queued = null;
  if (!r) {
    if (plan.pendingEl !== el) { plan.pendingEl = el; plan.pendingSince = Date.now(); return; }
    if (Date.now() - plan.pendingSince < AQ_PENDING_TIMEOUT_MS) return;
    if (slideLooksLikeVideo(el)) {
      plan.videosSeen++;
      log.warn("auto-queue: không lấy được nguồn video, bỏ qua slide này");
    }
  } else if (r.kind === "video") {
    plan.videosSeen++;
    queued = queueAutoVideo(r);
  }
  plan.lastSlide = el; plan.lastUrl = r?.url ?? null; plan.pendingEl = null;
  // chế độ "hết slide": cứ đi tới khi requestAdvance hết nút next
  if (plan.videosSeen >= plan.videoCount && settings.aqUntil !== "end") {
    // chat có thể đã tải thêm tin bên dưới từ lúc click: đếm lại trước khi dừng
    const n = countVideosAhead(plan.startEl);
    if (n != null && n > plan.videoCount) {
      log.info(`auto-queue: chat có thêm video, ${plan.videoCount} → ${n}`);
      plan.videoCount = n;
    } else {
      finishPlan(plan, `auto-queue: xong, ${plan.videosSeen}/${plan.videoCount} video`);
      return;
    }
  }
  plan.advanceAt = 0;
  // đợi xử lý xong slide này (nhờ Telegram tải cần slide còn mở) rồi mới chuyển
  Promise.resolve(queued).catch(() => {}).finally(() => setTimeout(() => requestAdvance(plan), 400));
};
