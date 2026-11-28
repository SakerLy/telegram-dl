// Giao diện trong trang: nút nổi (FAB) + dock có tab Tải xuống · Chọn · Thư mục, thông báo nhỏ, kéo thả nút nổi.

let panel, selectBar, fab, toastEl; // panel = dock, selectBar = tab Chọn
let selModeBtn, selAutoBtn, selAllBtn, selClearBtn, selDlBtn, selCount, selList, selHint, selTitle;
let activeTab = "dl";
let refitFab = () => {}; // canh lại nút nổi trong màn hình (gán trong makeFabDraggable)

const KIND_ICON = { video: VIDEO_SVG, image: IMAGE_SVG, audio: AUDIO_SVG };
const taskIcon = (task) =>
  ["completed", "handedOff"].includes(task.state) ? CHECK_SVG
    : task.state === "failed" ? ALERT_SVG
    : KIND_ICON[task.kind] || DL_ICON_SVG;

const attachTaskCard = (task) => {
  const list = panel?.querySelector(".sk-task-list");
  if (!list) return null;
  const card = document.createElement("div");
  card.id = "sk-task-" + task.id;
  card.className = "sk-task";
  card.innerHTML = `
    <div class="sk-task-ic"></div>
    <div class="sk-task-main">
      <div class="sk-task-top"><span class="name" dir="auto"></span><span class="pct"></span></div>
      <div class="sk-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100"><div class="sk-bar-fill"></div></div>
      <div class="sk-task-meta"><span class="state-label"></span><span class="detail"></span></div>
      <p class="sk-err-text" hidden></p>
    </div>
    <div class="sk-task-acts">
      <button type="button" class="sk-icon-btn act-pause"></button>
      <button type="button" class="sk-icon-btn act-retry">${RETRY_SVG}</button>
      <button type="button" class="sk-icon-btn act-close">${STOP_SVG}</button>
    </div>`;
  card.querySelector(".act-pause").onclick = () => {
    if (task.pauseFlag) resumeTask(task); else pauseTask(task);
  };
  card.querySelector(".act-retry").onclick = () => retryTask(task);
  // một nút ×: task chưa xong thì hủy (thẻ ở lại để Thử lại), xong rồi thì gỡ khỏi danh sách
  card.querySelector(".act-close").onclick = () => (task.finished ? dismissTask(task) : cancelTask(task));
  list.prepend(card);
  fab?.classList.remove("bump"); void fab?.offsetWidth; fab?.classList.add("bump");
  return card;
};

// X trên task chưa xong = hủy luôn; nếu chỉ gỡ card, task vẫn chạy/tự thử lại và card hiện lại ở lần vẽ sau
const dismissTask = (task) => {
  task.dismissed = true;
  document.getElementById("sk-task-" + task.id)?.remove();
  if (task.finished) downloadTasks.delete(task.id);
  else cancelTask(task);
  updatePanelCounts();
};

// cuộn trong danh sách; scrollIntoView sẽ cuộn cả trang
const scrollCardInsideList = (card) => {
  const list = card?.closest(".sk-scroll");
  if (!list) return;
  const cr = card.getBoundingClientRect(), lr = list.getBoundingClientRect();
  if (cr.top < lr.top - 2) list.scrollTop -= lr.top - cr.top - 8;
  else if (cr.bottom > lr.bottom + 2) list.scrollTop += cr.bottom - lr.bottom + 8;
};

const setBtn = (btn, label, icon) => {
  btn.title = label; btn.setAttribute("aria-label", label);
  if (icon != null && btn.dataset.icon !== label) { btn.innerHTML = icon; btn.dataset.icon = label; }
};

const renderTaskImpl = (task, scroll = false) => {
  if (!panel || task.dismissed) return;
  let card = document.getElementById("sk-task-" + task.id);
  if (!card) card = attachTaskCard(task);
  if (!card) return;
  if (scroll) scrollCardInsideList(card);
  card.dataset.state = task.state;
  const name = card.querySelector(".name");
  name.textContent = task.fileName; name.title = task.fileName;
  const ic = card.querySelector(".sk-task-ic");
  const icon = taskIcon(task);
  if (ic.dataset.icon !== icon) { ic.innerHTML = icon; ic.dataset.icon = icon; }

  const pct = task.total ? Math.min(100, Math.floor(task.received * 100 / task.total)) : null;
  const bar = card.querySelector(".sk-bar");
  bar.setAttribute("aria-label", t("progress"));
  bar.classList.toggle("indeterminate", task.state === "downloading" && pct === null);
  if (pct === null) bar.removeAttribute("aria-valuenow");
  else bar.setAttribute("aria-valuenow", pct);
  bar.querySelector(".sk-bar-fill").style.width = (pct ?? 0) + "%";
  card.querySelector(".pct").textContent =
    pct !== null && ["downloading", "paused", "preparing"].includes(task.state) ? `${intFmt().format(pct)}%` : "";

  card.querySelector(".state-label").textContent = t(task.state);
  const parts = [];
  if (task.state !== "skipped" && task.received) {
    parts.push(formatBytes(task.received) + (task.total != null ? ` / ${formatBytes(task.total)}` : ""));
  }
  if (task.state === "downloading" && task.speed) {
    parts.push(t("rate", { speed: formatBytes(task.speed) }));
    if (task.eta != null && task.eta > 1) parts.push(t("eta", { time: formatDuration(task.eta) }));
  }
  card.querySelector(".detail").textContent = parts.length ? "· " + parts.join(" · ") : "";

  const errEl = card.querySelector(".sk-err-text");
  errEl.textContent = formatError(task.error);
  errEl.hidden = !task.error;

  const canPause = ["downloading", "preparing", "queued"].includes(task.state) && !task.finished;
  const pauseBtn = card.querySelector(".act-pause");
  pauseBtn.hidden = !(canPause || task.state === "paused");
  setBtn(pauseBtn, t(task.pauseFlag ? "resume" : "pause"), task.pauseFlag ? PLAY_SVG : PAUSE_SVG);
  const retryBtn = card.querySelector(".act-retry");
  retryBtn.hidden = !["failed", "cancelled"].includes(task.state);
  setBtn(retryBtn, t("retry"));
  const closeBtn = card.querySelector(".act-close");
  closeBtn.hidden = task.state === "saving";
  setBtn(closeBtn, t(task.finished ? "dismiss" : "cancel"));
  updatePanelCounts();
};

// số task trên tab và nút nổi; vòng quanh nút nổi = tiến độ chung của các task đang chạy
const RING_C = 2 * Math.PI * 25;
const updatePanelCountsImpl = () => {
  if (!panel) return;
  const visible = [...downloadTasks.values()].filter((x) => !x.dismissed);
  const active = visible.filter((x) => !x.finished);
  const failed = visible.some((x) => x.state === "failed");
  panel.querySelector(".sk-tab[data-tab=dl] .n").textContent = active.length ? intFmt().format(active.length) : "";
  panel.querySelector(".sk-task-list .sk-empty").hidden = !!panel.querySelector(".sk-task");
  panel.querySelector(".sk-clear").disabled = !visible.some((x) => x.finished);

  const sized = active.filter((x) => x.total);
  const total = sized.reduce((s, x) => s + x.total, 0);
  const done = sized.reduce((s, x) => s + Math.min(x.received, x.total), 0);
  fab.classList.toggle("busy", active.length > 0);
  fab.classList.toggle("has-error", failed && !active.length);
  fab.querySelector(".val").style.strokeDashoffset = String(RING_C * (1 - (total ? done / total : 0)));
  const badge = fab.querySelector(".sk-fab-badge");
  badge.textContent = active.length ? intFmt().format(active.length) : failed ? "!" : "";
  badge.hidden = !badge.textContent;
  const label = active.length ? t("downloadsCount", { count: intFmt().format(active.length) }) : t("openDock");
  fab.title = label; fab.setAttribute("aria-label", label);
};

// dock và thông báo mở về phía còn trống quanh nút nổi (hoặc quanh dock), không tràn khỏi màn hình
const placeNear = (el, anchor, gap = 10) => {
  const r = anchor.getBoundingClientRect(), W = window.innerWidth, H = window.innerHeight, m = 12;
  const w = el.offsetWidth;
  const right = r.left + r.width / 2 > W / 2, below = r.top + r.height / 2 < H / 2;
  if (right) { el.style.left = "auto"; el.style.right = Math.min(Math.max(m, W - r.right), W - w - m) + "px"; }
  else { el.style.right = "auto"; el.style.left = Math.min(Math.max(m, r.left), W - w - m) + "px"; }
  if (below) {
    el.style.bottom = "auto"; el.style.top = r.bottom + gap + "px";
    el.style.setProperty("--sk-room", `${H - r.bottom - gap - m}px`);
  } else {
    el.style.top = "auto"; el.style.bottom = H - r.top + gap + "px";
    el.style.setProperty("--sk-room", `${r.top - gap - m}px`);
  }
  el.style.setProperty("--sk-origin", `${below ? "top" : "bottom"} ${right ? "right" : "left"}`);
};
const positionDock = () => { if (panel && !panel.hidden) placeNear(panel, fab); };

// kích thước và độ mờ của nút nổi (trang cài đặt); đổi kích thước thì canh lại nút và dock
const applyFabLook = () => {
  if (!fab) return;
  const size = getFabSize() + "px";
  const changed = fab.style.getPropertyValue("--sk-fab-size") !== size;
  fab.style.setProperty("--sk-fab-size", size);
  fab.style.setProperty("--sk-fab-opacity", String(1 - getFabFade() / 100));
  if (changed) refitFab();
};

const setDockOpen = (open) => {
  panel.hidden = !open;
  fab.setAttribute("aria-expanded", String(open));
  if (open) { positionDock(); if (activeTab === "dir") renderFileList(); }
};

const setTab = (tab) => {
  activeTab = tab;
  saveStore("dockTab", tab);
  for (const b of panel.querySelectorAll(".sk-tab")) {
    b.classList.toggle("on", b.dataset.tab === tab);
    b.setAttribute("aria-selected", String(b.dataset.tab === tab));
  }
  for (const p of panel.querySelectorAll(".sk-pane")) p.hidden = p.dataset.pane !== tab;
  if (tab === "dir") renderFileList();
};

let toastTimer = 0;
const notify = (text) => {
  if (!toastEl) return;
  toastEl.textContent = text;
  toastEl.hidden = false;
  placeNear(toastEl, panel && !panel.hidden ? panel : fab);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastEl.hidden = true; }, 2800);
};

const buildUI = () => {
  buildStyles();

  fab = document.createElement("button");
  fab.type = "button";
  fab.id = "sk-fab";
  fab.setAttribute("aria-expanded", "false");
  fab.innerHTML = `
    <svg class="sk-ring" viewBox="0 0 56 56" aria-hidden="true">
      <circle class="track" cx="28" cy="28" r="25"/>
      <circle class="val" cx="28" cy="28" r="25" stroke-dasharray="${RING_C}" stroke-dashoffset="${RING_C}"/>
    </svg>
    <span class="sk-fab-ic">${DL_ICON_SVG}</span>
    <span class="sk-fab-badge" hidden></span>`;
  document.body.appendChild(fab);

  // luôn có trong DOM để renderTask vẽ task được cả khi dock đang đóng
  panel = document.createElement("section");
  panel.id = "sk-dock";
  panel.hidden = true;
  panel.setAttribute("aria-label", "Telegram Media Downloader");
  panel.innerHTML = `
    <div class="sk-dock-head">
      <div class="sk-tabs" role="tablist">
        <button type="button" class="sk-tab" role="tab" data-tab="dl"><span class="lbl"></span><span class="n"></span></button>
        <button type="button" class="sk-tab" role="tab" data-tab="sel"><span class="lbl sk-select-title"></span><span class="n sk-sel-count"></span></button>
        <button type="button" class="sk-tab" role="tab" data-tab="dir"><span class="lbl"></span></button>
      </div>
      <button type="button" class="sk-icon-btn sk-select-settings">${GEAR_SVG}</button>
      <button type="button" class="sk-icon-btn sk-close">${CHEVRON_SVG}</button>
    </div>

    <div class="sk-pane" data-pane="dl" role="tabpanel">
      <div class="sk-scroll sk-task-list">
        <div class="sk-empty">${svg('<path d="M12 3v12m-5-5 5 5 5-5M5 16v4h14v-4"/>', 36)}<span></span></div>
      </div>
      <div class="sk-foot">
        <span>v${SCRIPT_VERSION}</span>
        <button type="button" class="sk-btn sk-ghost sk-clear"></button>
      </div>
    </div>

    <div class="sk-pane" data-pane="sel" role="tabpanel">
      <div class="sk-scroll">
        <div class="sk-sel-body">
          <button type="button" id="sk-mode-btn" class="sk-switch" role="switch"><span class="lbl"></span><span class="sk-switch-track"><span class="sk-switch-knob"></span></span></button>
          <button type="button" id="sk-auto-btn" class="sk-switch" role="switch"><span class="lbl"></span><span class="sk-switch-track"><span class="sk-switch-knob"></span></span></button>
          <div class="sk-aq-status" role="status" hidden></div>
          <div class="sk-hint"></div>
          <div class="sk-actions">
            <button type="button" id="sk-all-btn" class="sk-btn"></button>
            <button type="button" id="sk-clear-btn" class="sk-btn"></button>
          </div>
          <div class="sk-select-list" hidden></div>
        </div>
      </div>
      <div class="sk-foot"><button type="button" id="sk-dl-btn" class="sk-btn sk-primary"></button></div>
    </div>

    <div class="sk-pane" data-pane="dir" role="tabpanel">
      <div class="sk-folder-card">
        ${FOLDER_SVG}
        <div class="sk-folder-text"><span class="sk-folder-name"></span><span class="sk-folder-sub"></span></div>
        <button type="button" class="sk-btn sk-pick-folder"></button>
      </div>
      <div class="sk-scroll sk-file-list"></div>
    </div>`;
  document.body.appendChild(panel);

  toastEl = document.createElement("div");
  toastEl.id = "sk-toast";
  toastEl.setAttribute("role", "status");
  toastEl.hidden = true;
  document.body.appendChild(toastEl);

  applyFabLook();
  makeFabDraggable(fab, "fabPos", () => setDockOpen(panel.hidden));
  for (const b of panel.querySelectorAll(".sk-tab")) b.onclick = () => setTab(b.dataset.tab);
  panel.querySelector(".sk-close").onclick = () => setDockOpen(false);
  panel.querySelector(".sk-select-settings").onclick = openOptions;
  panel.querySelector(".sk-pick-folder").onclick = pickSaveFolder;
  // xoá mọi task đã xong khỏi danh sách; task đang chạy giữ nguyên
  panel.querySelector(".sk-clear").onclick = () => {
    for (const task of [...downloadTasks.values()]) {
      if (!task.finished) continue;
      document.getElementById("sk-task-" + task.id)?.remove();
      downloadTasks.delete(task.id);
    }
    updatePanelCounts();
  };

  selectBar = panel.querySelector('[data-pane="sel"]');
  selModeBtn = selectBar.querySelector("#sk-mode-btn");
  selAutoBtn = selectBar.querySelector("#sk-auto-btn");
  selAllBtn = selectBar.querySelector("#sk-all-btn");
  selClearBtn = selectBar.querySelector("#sk-clear-btn");
  selDlBtn = selectBar.querySelector("#sk-dl-btn");
  selCount = panel.querySelector(".sk-sel-count");
  selList = selectBar.querySelector(".sk-select-list");
  selHint = selectBar.querySelector(".sk-hint");
  selTitle = panel.querySelector(".sk-select-title");

  renderTask = renderTaskImpl;
  updatePanelCounts = updatePanelCountsImpl;
  const saved = loadStore("dockTab", "dl");
  setTab(["dl", "sel", "dir"].includes(saved) ? saved : "dl");
  refreshAllLabels();
};

const supportsDirPicker = () =>
  typeof window.showDirectoryPicker === "function";

// trình duyệt chỉ mở hộp chọn thư mục từ thao tác trong trang, nên việc này nằm ở tab Thư mục, không ở trang Options
const pickSaveFolder = async () => {
  try {
    const h = await window.showDirectoryPicker({ mode: "readwrite" });
    destDirHandle = h; destDirName = h.name;
    await idbSet("destDirHandle", h);
    saveStore("destDirName", destDirName);
    updateFolderBtn();
    if (activeTab === "dir") renderFileList();
  } catch (e) { if (e?.name !== "AbortError") log.error("pickFolder: " + e.message); }
};

// thẻ thư mục ở tab Thư mục: tên, nút chọn/đổi (trang web không mở được Explorer và không biết đường dẫn thật)
const updateFolderBtn = () => {
  if (!panel) return;
  const name = panel.querySelector(".sk-folder-name");
  name.textContent = destDirName || t("folderNone");
  name.classList.toggle("none", !destDirName);
  panel.querySelector(".sk-folder-sub").textContent = supportsDirPicker() ? "" : t("folderUnsupported");
  const btn = panel.querySelector(".sk-pick-folder");
  btn.hidden = !supportsDirPicker();
  btn.textContent = t(destDirName ? "changeFolder" : "pickFolder");
};

let fileListRun = 0; // bấm mở/đóng liên tục: chỉ lần đọc mới nhất được vẽ
const renderFileList = async () => {
  const run = ++fileListRun;
  const box = panel.querySelector(".sk-file-list");
  const note = (cls, text) => {
    const el = document.createElement("div");
    el.className = cls; el.textContent = text;
    box.appendChild(el);
  };
  box.textContent = "";
  if (!destDirName) return;
  note("sk-file-msg", t("folderLoading"));
  let files = null;
  try {
    if (await ensureDirPermission(destDirHandle)) files = await listSavedFiles(destDirHandle);
  } catch (e) { log.error("browseFolder: " + e.message); }
  if (run !== fileListRun || activeTab !== "dir") return;
  box.textContent = "";
  if (!files) return note("sk-file-msg", t("folderNoAccess"));
  if (!files.length) return note("sk-file-msg", t("folderEmpty"));
  note("sk-file-head", t("folderFiles", { name: destDirName, n: intFmt().format(files.length) }));
  for (const { path, file } of files.slice(0, FILE_LIST_SHOW_MAX)) {
    // chỉ hiển thị: mở blob trong tab mới làm Chrome tải lại file nó không phát được (.mov, .mkv)
    const row = document.createElement("div");
    row.className = "sk-file"; row.title = `${destDirName}/${path}`;
    const name = document.createElement("span");
    name.className = "name"; name.dir = "auto"; name.textContent = path;
    const meta = document.createElement("span");
    meta.className = "meta";
    meta.textContent = `${formatBytes(file.size)} · ${new Date(file.lastModified).toLocaleString(currentLang)}`;
    row.append(name, meta);
    box.appendChild(row);
  }
  if (files.length > FILE_LIST_SHOW_MAX) note("sk-file-msg", t("folderMore", { shown: FILE_LIST_SHOW_MAX }));
};

// Nút nổi: kéo (quá 5px) để dời, bấm để mở/đóng dock. Neo theo mép gần hơn ở cả 2 chiều
// nên đổi kích thước cửa sổ vẫn giữ đúng góc; vị trí lưu lại cho lần sau.
const makeFabDraggable = (el, storageKey, onClick) => {
  const place = (l, tp) => {
    const W = window.innerWidth, H = window.innerHeight, w = el.offsetWidth, h = el.offsetHeight;
    if (!W || !H) return; // cửa sổ chưa có kích thước (tab ẩn): canh lúc này sẽ đẩy nút ra ngoài màn hình
    l = Math.max(8, Math.min(l, W - w - 8));
    tp = Math.max(8, Math.min(tp, H - h - 8));
    if (l + w / 2 > W / 2) { el.style.left = "auto"; el.style.right = (W - l - w) + "px"; }
    else { el.style.right = "auto"; el.style.left = l + "px"; }
    if (tp + h / 2 > H / 2) { el.style.top = "auto"; el.style.bottom = (H - tp - h) + "px"; }
    else { el.style.bottom = "auto"; el.style.top = tp + "px"; }
  };
  const apply = () => {
    try {
      const pos = loadStore(storageKey, null);
      if (pos && typeof pos.left === "number" && typeof pos.top === "number") {
        const l = pos.anchorX === "right" ? window.innerWidth - pos.right - el.offsetWidth : pos.left;
        const tp = pos.anchorY === "bottom" ? window.innerHeight - pos.bottom - el.offsetHeight : pos.top;
        place(l, tp);
      }
    } catch { /* vị trí đã lưu bị hỏng: giữ vị trí mặc định */ }
    positionDock();
  };
  requestAnimationFrame(apply);
  window.addEventListener("resize", apply);
  refitFab = () => {
    const r = el.getBoundingClientRect();
    place(r.left, r.top);
    positionDock();
  };

  let down = null, dragging = false;
  el.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    const r = el.getBoundingClientRect();
    down = { x: e.clientX, y: e.clientY, l: r.left, t: r.top };
    el.setPointerCapture(e.pointerId);
  });
  el.addEventListener("pointermove", (e) => {
    if (!down) return;
    const dx = e.clientX - down.x, dy = e.clientY - down.y;
    if (!dragging && Math.hypot(dx, dy) < 5) return;
    dragging = true;
    el.classList.add("dragging");
    place(down.l + dx, down.t + dy);
    positionDock();
  });
  const end = (e) => {
    if (!down) return;
    try { el.releasePointerCapture(e.pointerId); } catch { /* pointer đã được nhả */ }
    const wasDrag = dragging;
    down = null; dragging = false;
    el.classList.remove("dragging");
    if (wasDrag) {
      const r = el.getBoundingClientRect();
      saveStore(storageKey, {
        left: r.left, top: r.top, right: window.innerWidth - r.right, bottom: window.innerHeight - r.bottom,
        anchorX: el.style.left === "auto" ? "right" : "left",
        anchorY: el.style.top === "auto" ? "bottom" : "top",
      });
    } else if (e.type === "pointerup") onClick();
  };
  el.addEventListener("pointerup", end);
  el.addEventListener("pointercancel", end);
  // Enter/Space trên bàn phím sinh click không có pointer (detail = 0)
  el.addEventListener("click", (e) => { if (e.detail === 0) onClick(); });
};

const refreshAllLabels = () => {
  if (!panel) return;
  applyFabLook();
  panel.querySelector(".sk-tab[data-tab=dl] .lbl").textContent = t("downloads");
  panel.querySelector(".sk-tab[data-tab=dir] .lbl").textContent = t("tabFolder");
  panel.querySelector(".sk-task-list .sk-empty span").textContent = t("noTasks");
  panel.querySelector(".sk-clear").textContent = t("clearHistory");
  setBtn(panel.querySelector(".sk-select-settings"), t("settings"));
  setBtn(panel.querySelector(".sk-close"), t("hide"));
  updateFolderBtn();
  updatePanelCounts();
  if (activeTab === "dir" && !panel.hidden) renderFileList();
  for (const task of downloadTasks.values()) renderTask(task);
  updateSelectBar();
  renderAqStatus();
  document.querySelectorAll("button.sk-dl-btn").forEach((b) => {
    const label = t(b.disabled ? "loadingMedia" : "download");
    b.title = label; b.setAttribute("aria-label", label);
  });
  document.querySelectorAll("button.sk-queue-btn").forEach((b) => {
    b.title = t("topbarQueue"); b.setAttribute("aria-label", t("topbarQueue"));
  });
};

// Viewer WebA là <dialog>.showModal() (top layer): vẽ trên mọi z-index và làm phần còn lại inert, nên giao diện phải nằm trong dialog
const keepPanelsOnTop = () => {
  let host = document.body;
  const dlg = document.getElementById("MediaViewer");
  if (dlg && dlg.open) host = dlg;
  for (const el of [fab, panel, toastEl]) {
    if (el && el.parentElement !== host) host.appendChild(el);
  }
};
