// Panel Tải xuống, panel Chọn hàng loạt, Cài đặt, xem file đã lưu, kéo thả panel.

const attachTaskCard = (task) => {
  const list = document.querySelector("#sk-panel .sk-task-list");
  if (!list) return null;
  const card = document.createElement("div");
  card.id = "sk-task-" + task.id;
  card.className = "sk-task";
  card.innerHTML = `
    <div class="sk-task-head">
      <span class="name" dir="auto"></span>
      <button type="button" class="sk-btn sk-danger act-dismiss" title="×" style="min-height:24px;padding:0 8px;">×</button>
    </div>
    <div class="sk-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100">
      <div class="sk-bar-fill"></div>
    </div>
    <div class="sk-stats">
      <span class="state-label"></span>
      <span class="detail"></span>
    </div>
    <p class="sk-err-text" hidden></p>
    <div class="sk-task-actions">
      <button type="button" class="sk-btn act-pause"></button>
      <button type="button" class="sk-btn act-retry" hidden></button>
      <button type="button" class="sk-btn sk-danger act-cancel"></button>
    </div>`;
  card.querySelector(".act-dismiss").onclick = () => dismissTask(task);
  card.querySelector(".act-pause").onclick = () => {
    if (task.pauseFlag) resumeTask(task); else pauseTask(task);
  };
  card.querySelector(".act-retry").onclick = () => retryTask(task);
  card.querySelector(".act-cancel").onclick = () => cancelTask(task);
  list.prepend(card);
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

// cuộn trong .sk-task-list; scrollIntoView sẽ cuộn cả trang
const scrollCardInsideList = (card) => {
  const list = card?.closest(".sk-task-list");
  if (!list) return;
  const cr = card.getBoundingClientRect(), lr = list.getBoundingClientRect();
  if (cr.top < lr.top - 2) list.scrollTop -= lr.top - cr.top - 8;
  else if (cr.bottom > lr.bottom + 2) list.scrollTop += cr.bottom - lr.bottom + 8;
};

const renderTaskImpl = (task, scroll = false) => {
  const panel = document.getElementById("sk-panel");
  if (!panel || task.dismissed) return;
  let card = document.getElementById("sk-task-" + task.id);
  if (!card) {
    card = attachTaskCard(task);
    if (!card) return;
    // không tự bung lại nếu người dùng đã thu gọn
    if (!panelUserCollapsed) {
      panel.classList.remove("collapsed");
      const toggle = panel.querySelector(".sk-toggle");
      toggle.textContent = "-"; toggle.title = t("hide");
    }
  }
  if (scroll) scrollCardInsideList(card);
  card.dataset.state = task.state;
  card.querySelector(".name").textContent = task.fileName;
  card.querySelector(".name").title = task.fileName;

  const pct = task.total ? Math.min(100, Math.floor(task.received * 100 / task.total)) : null;
  const bar = card.querySelector(".sk-bar");
  bar.setAttribute("aria-label", t("progress"));
  bar.classList.toggle("indeterminate", task.state === "downloading" && pct === null);
  if (pct === null) bar.removeAttribute("aria-valuenow");
  else bar.setAttribute("aria-valuenow", pct);
  bar.querySelector(".sk-bar-fill").style.width = (pct ?? 0) + "%";

  card.querySelector(".state-label").textContent =
    task.state === "downloading" && pct !== null ? `${intFmt().format(pct)}% · ${t("downloading")}` : t(task.state);

  const parts = [formatBytes(task.received) + (task.total != null ? ` / ${formatBytes(task.total)}` : "")];
  if (task.state === "downloading" && task.speed) {
    parts.push(t("rate", { speed: formatBytes(task.speed) }));
    if (task.eta != null && task.eta > 1) parts.push(t("eta", { time: formatDuration(task.eta) }));
  }
  card.querySelector(".detail").textContent = task.state === "skipped" ? "" : parts.join(" · ");

  const errEl = card.querySelector(".sk-err-text");
  errEl.textContent = formatError(task.error);
  errEl.hidden = !task.error;

  const canPause = ["downloading", "preparing", "queued"].includes(task.state) && !task.finished;
  const pauseBtn = card.querySelector(".act-pause");
  pauseBtn.textContent = task.pauseFlag ? t("resume") : t("pause");
  pauseBtn.hidden = !(canPause || task.state === "paused");
  const cancelBtn = card.querySelector(".act-cancel");
  cancelBtn.textContent = t("cancel");
  cancelBtn.hidden = task.finished || task.state === "saving";
  cancelBtn.disabled = task.state === "saving";
  const retryBtn = card.querySelector(".act-retry");
  retryBtn.textContent = t("retry");
  retryBtn.hidden = !["failed", "cancelled"].includes(task.state);
  updatePanelCounts();
};

const updatePanelCountsImpl = () => {
  const panel = document.getElementById("sk-panel");
  if (!panel) return;
  const hasTasks = !!panel.querySelector(".sk-task");
  const empty = panel.querySelector(".sk-empty");
  if (empty) {
    empty.hidden = hasTasks;
    empty.textContent = t("noTasks");
  }
  const n = [...downloadTasks.values()].filter((x) => !x.finished).length;
  panel.querySelector(".sk-title-text").textContent = n ? t("downloadsCount", { count: intFmt().format(n) }) : t("downloads");
};

let panel, selectBar;
let selModeBtn, selAutoBtn, selAllBtn, selClearBtn, selDlBtn, selCount, selList, selHint, selTitle;
let panelUserCollapsed = false;

const buildUI = () => {
  buildStyles();

  // luôn hiển thị, kể cả khi rỗng, để vẫn thấy được trên viewer
  panel = document.createElement("section");
  panel.id = "sk-panel";
  panel.innerHTML = `
    <div class="sk-head">
      <div class="sk-title">
        <span class="sk-logo">${TG_LOGO_SVG}</span>
        <span class="sk-title-text">${t("downloads")}</span>
      </div>
      <button type="button" class="sk-icon-btn sk-folder-btn" title="">${FOLDER_SVG}</button>
      <button type="button" class="sk-icon-btn sk-clear" title="">${TRASH_SVG}</button>
      <button type="button" class="sk-icon-btn sk-toggle" title="">-</button>
    </div>
    <div class="sk-task-list">
      <div class="sk-empty" hidden></div>
    </div>
    <div class="sk-file-list"></div>
    <div class="sk-foot">
      <span>SakerLy</span>
      <span>v${SCRIPT_VERSION}</span>
    </div>`;
  document.body.appendChild(panel);

  const panelToggle = panel.querySelector(".sk-toggle");
  panelToggle.onclick = () => {
    const col = !panel.classList.contains("collapsed");
    panel.classList.toggle("collapsed", col);
    panelUserCollapsed = col;
    panelToggle.textContent = col ? "+" : "-";
    panelToggle.title = col ? t("show") : t("hide");
  };
  // xoá mọi task trừ task đang tải; card mồ côi cũng bị dọn
  panel.querySelector(".sk-clear").onclick = () => {
    for (const card of [...panel.querySelectorAll(".sk-task")]) {
      const id = (card.id || "").replace("sk-task-", "");
      const task = downloadTasks.get(id);
      const active = task && !task.finished &&
        ["downloading", "preparing", "saving"].includes(task.state);
      if (active) continue;
      if (task && !task.finished) cancelTask(task);
      card.remove();
      downloadTasks.delete(id);
    }
    updatePanelCounts();
  };
  panel.querySelector(".sk-clear").title = t("clearHistory");
  panel.querySelector(".sk-folder-btn").onclick = () => {
    if (!destDirName) return pickSaveFolder();
    const on = !panel.classList.contains("files");
    panel.classList.toggle("files", on);
    panel.querySelector(".sk-folder-btn").classList.toggle("on", on);
    if (on && panel.classList.contains("collapsed")) panelToggle.click();
    if (on) renderFileList();
  };
  updateFolderBtn();
  makeDraggable(panel, panel.querySelector(".sk-head"), "panelPos");

  selectBar = document.createElement("section");
  selectBar.id = "sk-select";
  selectBar.innerHTML = `
    <div class="sk-head">
      <div class="sk-title">
        <span class="sk-logo">${TG_LOGO_SVG}</span>
        <span class="sk-select-title"></span>
      </div>
      <span class="sk-count sk-sel-count">0</span>
      <button type="button" class="sk-icon-btn sk-select-settings" title="">${GEAR_SVG}</button>
      <button type="button" class="sk-icon-btn sk-select-toggle" title="">-</button>
    </div>
    <div class="sk-select-body">
      <div class="sk-hint sk-hint-box"></div>
      <div class="sk-actions">
        <button type="button" id="sk-mode-btn" class="sk-btn toggle"></button>
        <button type="button" id="sk-auto-btn" class="sk-btn toggle"></button>
      </div>
      <div class="sk-aq-status" role="status" hidden></div>
      <div class="sk-actions">
        <button type="button" id="sk-all-btn" class="sk-btn"></button>
        <button type="button" id="sk-clear-btn" class="sk-btn"></button>
      </div>
      <button type="button" id="sk-dl-btn" class="sk-btn sk-primary"></button>
      <!-- danh sách nằm dưới cùng: dài thêm không đẩy các nút xuống -->
      <div class="sk-select-list" hidden></div>
    </div>`;
  document.body.appendChild(selectBar);

  const selToggle = selectBar.querySelector(".sk-select-toggle");
  selToggle.onclick = () => {
    const col = !selectBar.classList.contains("collapsed");
    selectBar.classList.toggle("collapsed", col);
    selToggle.textContent = col ? "+" : "-";
    selToggle.title = col ? t("show") : t("hide");
  };
  selectBar.querySelector(".sk-select-settings").onclick = openOptions;
  makeDraggable(selectBar, selectBar.querySelector(".sk-head"), "selectBarPos");

  selModeBtn = selectBar.querySelector("#sk-mode-btn");
  selAutoBtn = selectBar.querySelector("#sk-auto-btn");
  selAllBtn = selectBar.querySelector("#sk-all-btn");
  selClearBtn = selectBar.querySelector("#sk-clear-btn");
  selDlBtn = selectBar.querySelector("#sk-dl-btn");
  selCount = selectBar.querySelector(".sk-sel-count");
  selList = selectBar.querySelector(".sk-select-list");
  selHint = selectBar.querySelector(".sk-hint-box");
  selTitle = selectBar.querySelector(".sk-select-title");

  renderTask = renderTaskImpl;
  updatePanelCounts = updatePanelCountsImpl;
  updateSelectBar();
};

const supportsDirPicker = () =>
  typeof window.showDirectoryPicker === "function";

// trình duyệt chỉ mở hộp chọn thư mục từ thao tác trong trang, nên việc này nằm ở nút thư mục của panel, không ở trang Options
const pickSaveFolder = async () => {
  try {
    const h = await window.showDirectoryPicker({ mode: "readwrite" });
    destDirHandle = h; destDirName = h.name;
    await idbSet("destDirHandle", h);
    saveStore("destDirName", destDirName);
    updateFolderBtn();
  } catch (e) { if (e?.name !== "AbortError") log.error("pickFolder: " + e.message); }
};

// chưa có thư mục lưu: nút chọn thư mục; có rồi: xem file trong đó (trang web không mở được Explorer và không biết đường dẫn thật)
const updateFolderBtn = () => {
  const btn = panel?.querySelector(".sk-folder-btn");
  if (!btn) return;
  btn.hidden = !destDirName && !supportsDirPicker();
  const label = t(destDirName ? "browseFolder" : "pickFolder");
  btn.title = label; btn.setAttribute("aria-label", label);
  if (!destDirName && panel.classList.contains("files")) {
    panel.classList.remove("files"); btn.classList.remove("on");
  }
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
  note("sk-file-msg", t("folderLoading"));
  let files = null;
  try {
    if (await ensureDirPermission(destDirHandle)) files = await listSavedFiles(destDirHandle);
  } catch (e) { log.error("browseFolder: " + e.message); }
  if (run !== fileListRun || !panel.classList.contains("files")) return;
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

const makeDraggable = (el, handle, storageKey) => {
  // neo theo mép gần hơn ở cả 2 chiều: panel sát góc phải/dưới mở rộng hay thêm task thì mọc vào trong,
  // không chui qua viền; --sk-room giới hạn chiều cao theo chỗ còn trống, danh sách bên trong tự cuộn
  let placed = false;
  const place = (l, tp) => {
    placed = true;
    const W = window.innerWidth, H = window.innerHeight, w = el.offsetWidth, h = el.offsetHeight;
    l = Math.max(4, Math.min(l, W - w - 4));
    tp = Math.max(4, Math.min(tp, H - h - 4));
    if (l + w / 2 > W / 2) { el.style.left = "auto"; el.style.right = (W - l - w) + "px"; }
    else { el.style.right = "auto"; el.style.left = l + "px"; }
    if (tp + h / 2 > H / 2) {
      const b = H - tp - h;
      el.style.top = "auto"; el.style.bottom = b + "px";
      el.style.setProperty("--sk-room", `${H - b - 8}px`);
    } else {
      el.style.bottom = "auto"; el.style.top = tp + "px";
      el.style.setProperty("--sk-room", `${H - tp - 8}px`);
    }
  };
  const apply = () => {
    try {
      const pos = loadStore(storageKey, null);
      if (!pos || typeof pos.left !== "number" || typeof pos.top !== "number") return;
      // giữ khoảng cách tới mép đã neo, kể cả khi lúc tải trang panel to/nhỏ khác lúc kéo
      const l = pos.anchorX === "right" ? window.innerWidth - pos.right - el.offsetWidth : pos.left;
      const tp = pos.anchorY === "bottom" ? window.innerHeight - pos.bottom - el.offsetHeight : pos.top;
      place(l, tp);
    } catch { /* vị trí đã lưu bị hỏng: giữ vị trí mặc định */ }
  };
  requestAnimationFrame(apply);
  window.addEventListener("resize", apply);
  // thu gọn/mở rộng, thêm task: kích thước đổi thì kéo panel vào lại trong màn hình
  if (typeof ResizeObserver === "function") {
    new ResizeObserver(() => {
      if (!placed || dragging) return;
      const r = el.getBoundingClientRect();
      place(r.left, r.top);
    }).observe(el);
  }
  let dragging = false, sx = 0, sy = 0, sl = 0, st = 0;
  handle.style.cursor = "move";
  handle.addEventListener("pointerdown", (e) => {
    if (e.target.closest("button, select, input, a")) return;
    dragging = true;
    handle.setPointerCapture(e.pointerId);
    const r = el.getBoundingClientRect();
    sl = r.left; st = r.top; sx = e.clientX; sy = e.clientY;
    place(sl, st);
  });
  handle.addEventListener("pointermove", (e) => {
    if (dragging) place(sl + (e.clientX - sx), st + (e.clientY - sy));
  });
  const end = (e) => {
    if (!dragging) return;
    dragging = false;
    try { handle.releasePointerCapture(e.pointerId); } catch { /* pointer đã được nhả */ }
    const r = el.getBoundingClientRect();
    saveStore(storageKey, {
      left: r.left, top: r.top, right: window.innerWidth - r.right, bottom: window.innerHeight - r.bottom,
      anchorX: el.style.left === "auto" ? "right" : "left",
      anchorY: el.style.top === "auto" ? "bottom" : "top",
    });
  };
  handle.addEventListener("pointerup", end);
  handle.addEventListener("pointercancel", end);
};

const refreshAllLabels = () => {
  if (!panel) return;
  panel.querySelector(".sk-clear").title = t("clearHistory");
  selectBar.querySelector(".sk-select-settings").title = t("settings");
  updateFolderBtn();
  updatePanelCounts(); // tiêu đề panel đổi ngôn ngữ cả khi chưa có task nào
  if (panel.classList.contains("files")) renderFileList();
  const pToggle = panel.querySelector(".sk-toggle");
  pToggle.title = panel.classList.contains("collapsed") ? t("show") : t("hide");
  const sToggle = selectBar.querySelector(".sk-select-toggle");
  sToggle.title = selectBar.classList.contains("collapsed") ? t("show") : t("hide");
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

// Viewer WebA là <dialog>.showModal() (top layer): vẽ trên mọi z-index và làm phần còn lại inert, nên panel phải nằm trong dialog
const keepPanelsOnTop = () => {
  let host = document.body;
  const dlg = document.getElementById("MediaViewer");
  if (dlg && dlg.open) host = dlg;
  for (const el of [panel, selectBar]) {
    if (el && el.parentElement !== host) host.appendChild(el);
  }
};
