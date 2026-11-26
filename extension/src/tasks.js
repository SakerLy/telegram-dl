// Lưu file, chuyển giao download/ WebA, LazyWriter, hàng đợi và vòng đời task.

// chạy lần lượt, cách 400ms, để Chrome không chặn vì "tải nhiều file"
let saveChain = Promise.resolve();
const saveMediaBlob = (blob, fileName, hrefOverride) => {
  const run = () => new Promise((res) => {
    const url = hrefOverride || URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = fileName || "";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => { if (!hrefOverride) URL.revokeObjectURL(url); res(); }, 400);
  });
  saveChain = saveChain.then(run, run);
  return saveChain;
};

// SW WebA trả download/ dạng attachment: trình duyệt stream thẳng xuống đĩa, không tốn RAM
const webaDownloadFallback = (url, fileName) => {
  try {
    const u = new URL(url, location.href);
    const idx = u.pathname.indexOf("/progressive/");
    if (idx < 0) return null;
    const hash = u.pathname.slice(idx + "/progressive/".length);
    if (!/^((document|photo)\d+)/.test(hash)) return null;
    u.pathname = u.pathname.slice(0, idx) + "/download/" + hash;
    if (!u.searchParams.has("download")) u.searchParams.set("download", "1");
    if (fileName) u.searchParams.set("filename", sanitizeName(fileName).slice(0, 120));
    return u.href;
  } catch { return null; }
};
// telegram-tt 11/2026 (#7566): SW chỉ phục vụ download/ có token HMAC do chính nó ký, thiếu thì 403.
// Xin ký như mediaLoader.signDownloadUrl: {type: "signDownload", url} qua MessageChannel, trả lại URL có token.
// SW bản cũ không trả lời: hết giờ thì dùng URL chưa ký (bản cũ không đòi token); SW từ chối thì trả null.
const signWebaDownloadUrl = (url) => new Promise((resolve) => {
  const sw = navigator.serviceWorker?.controller;
  if (!sw) { resolve(url); return; }
  const { port1, port2 } = new MessageChannel();
  const timer = setTimeout(() => { port1.close(); resolve(url); }, 3000);
  port1.onmessage = (e) => {
    clearTimeout(timer); port1.close();
    resolve(typeof e.data === "string" ? e.data : null);
  };
  sw.postMessage({ type: "signDownload", url }, [port2]);
});

// chỉ tạo file thật khi chunk đầu về, lúc đã biết mime và tên
class LazyWriter {
  constructor(task) { this.task = task; this.inner = null; this._ready = null; }
  // nhiều luồng ghi đoạn đầu cùng lúc (HLS, blob): chỉ tạo một file, các luồng khác đợi rồi ghi chung
  _ensure() {
    if (!this._ready) this._ready = this._create().catch((e) => { this._ready = null; this.inner = null; throw e; });
    return this._ready;
  }
  async _create() {
    const task = this.task;
    if (task.handle) {
      this.inner = FsWriter.supported ? new FsWriter(task.handle) : new MemWriter();
    } else {
      const dir = await resolveDestDir();
      if (dir && FsWriter.supported) {
        const { fh, name } = await uniqueFileHandle(dir, nameOnce(task));
        task.fileName = name;
        task._createdFile = fh;
        this.inner = new FsWriter(fh);
      } else if (task.total > 1200 * MB && (task.url || "").includes("/progressive/")) {
        // quá lớn để giữ trong RAM mà không có writer ghi đĩa: chuyển cho download/ của WebA
        const fb = webaDownloadFallback(task.url, task.fileName);
        if (fb) throw Object.assign(new Error("large file, no disk writer"), { handoffUrl: fb, handoff: true, fatal: true });
        this.inner = new MemWriter();
      } else {
        this.inner = new MemWriter();
      }
    }
    await this.inner.open(task.resumeMode === true);
    return this.inner;
  }
  async writeAt(position, data) { return (await this._ensure()).writeAt(position, data); }
  async open(keepExisting = false) {
    if (this.inner) await this.inner.open(keepExisting);
  }
  async close() { await this.inner?.close(); }
  async abort() { await this.inner?.abort(); }
  async discardCreatedFile() {
    try { await this.task._createdFile?.remove?.(); } catch { /* file đã bị xoá */ }
    this.task._createdFile = null;
  }
  get real() { return this.inner; }
}

const downloadTasks = new Map();
const activeTasks = new Map(); // dedupe task đang chạy theo key và URL
const waitingQueue = [];
let runningCount = 0;

let renderTask = () => {}; // được thay khi UI dựng xong
let updatePanelCounts = () => {};

const throttledRender = (task) => {
  const now = performance.now();
  if (now - (task._renderedAt || 0) >= 50) { task._renderedAt = now; renderTask(task); }
  else if (!task._renderTimer) {
    task._renderTimer = setTimeout(() => {
      task._renderTimer = null; task._renderedAt = performance.now(); renderTask(task);
    }, 50);
  }
};

const finishTask = (task, state, error) => {
  if (task.finished) return;
  task.finished = true;
  clearTimeout(task._renderTimer);
  task.state = state; task.error = error;
  task.speed = 0; task.eta = null;
  if (activeTasks.get(task.key) === task) activeTasks.delete(task.key);
  if (state === "completed" || state === "handedOff") { markDownloaded(task.mediaKey); task.blob = null; }
  if (task.dismissed) downloadTasks.delete(task.id);
  if (error) log.error(error.message || String(error), task.fileName);
  renderTask(task);
  updatePanelCounts();
  task.resolve({ state, fileName: task.fileName, received: task.received });
};

const runTask = async (task) => {
  if (task.running) return;
  task.running = true;
  try {
    if (!task.writer) task.writer = new LazyWriter(task);
    if (task.controller.signal.aborted) throw task.controller.signal.reason;

    task.state = "preparing"; renderTask(task);
    await task.writer.open(task.resumeMode === true);
    if (task.resumeMode) {
      log.info(`resume từ ${formatBytes(task.ledger?.received || 0)}`, task.fileName);
      task.resumeMode = false;
    }
    if (task.controller.signal.aborted) throw task.controller.signal.reason;

    task.state = "downloading"; task.startedAt = performance.now(); renderTask(task);
    await engineDownload(task);
    if (task.controller.signal.aborted) throw task.controller.signal.reason;

    task.state = "saving"; renderTask(task);
    const real = task.writer.real;
    if (real instanceof FsWriter) {
      await real.close();
      finishTask(task, "completed");
    } else {
      // mime chỉ chắc chắn sau chunk cuối nên tính lại đuôi file
      task.fileName = applyNaming(getDownloadFileName(task.url, task.mime, task.kind));
      task.named = true;
      renderTask(task);
      const blob = real.assemble(task.mime);
      const dir = await resolveDestDir();
      if (dir && FsWriter.supported) {
        const { fh, name } = await uniqueFileHandle(dir, task.fileName);
        task.fileName = name;
        const w = await fh.createWritable();
        await w.write(blob); await w.close();
        finishTask(task, "completed");
      } else {
        await saveMediaBlob(blob, task.fileName);
        finishTask(task, "handedOff");
      }
    }
  } catch (err) {
    if (task.pauseFlag) {
      task.state = "paused"; task.speed = 0; task.eta = null;
      renderTask(task);
      return;
    }
    // chỉ người dùng hủy mới tính là cancelled; stall/watchdog chỉ hủy request bên trong
    const signalReason = task.controller.signal?.reason;
    if (task.cancelRequested || isAbortLike(signalReason)) {
      await task.writer?.abort();
      await task.writer?.discardCreatedFile?.();
      finishTask(task, "cancelled");
      return;
    }
    // Resume bấm khi pause chưa dừng hẳn: pumpQueue đã bỏ qua task vì nó còn chạy, nên chạy tiếp ngay tại đây
    if (err?.pause || signalReason?.pause) {
      task.controller = new AbortController();
      task.running = false;
      return runTask(task);
    }
    if (err?.handoff && err.handoffUrl) {
      log.warn("handing off to native download endpoint (large file, no FS Access)", task.fileName);
      task.usedNativeFallback = true;
      try {
        const signed = await signWebaDownloadUrl(err.handoffUrl);
        if (!signed) throw new Error("service worker refused to sign download URL");
        await saveMediaBlob(null, nameOnce(task), signed);
        finishTask(task, "handedOff");
        return;
      } catch (e) { log.error("native handoff failed: " + e.message); }
    }
    // engine đã hủy controller cũ nên retry bằng controller mới
    if (err?.retryable && !err.fatal && !task.pauseFlag && !task.cancelRequested &&
        (task.autoRetries || 0) < TASK_AUTO_RETRY_MAX) {
      task.autoRetries = (task.autoRetries || 0) + 1;
      task.controller = new AbortController();
      log.warn(`task retry ${task.autoRetries}/${TASK_AUTO_RETRY_MAX}: ${err.message}`, task.fileName);
      try { await sleep(TASK_AUTO_RETRY_DELAY, task.controller.signal); } catch { /* aborted */ }
      if (!task.pauseFlag && !task.controller.signal.aborted) {
        task.running = false;
        return runTask(task);
      }
      if (task.pauseFlag) {
        task.controller = new AbortController();
        task.state = "paused"; renderTask(task);
        return;
      }
      await task.writer?.abort(); await task.writer?.discardCreatedFile?.();
      finishTask(task, "cancelled");
      return;
    }
    // kiểm tra URL trước rồi mới đặt tên, để lỗi không có đường dự phòng không tiêu số thứ tự
    const fbRaw = !task.usedNativeFallback && webaDownloadFallback(task.url)
      ? webaDownloadFallback(task.url, nameOnce(task)) : null;
    // ký trước khi bỏ phần đã tải: SW không ký thì giữ phần đã tải để Thử lại tiếp tục
    const fb = fbRaw ? await signWebaDownloadUrl(fbRaw) : null;
    if (fbRaw && !fb) log.warn("service worker refused to sign download URL", task.fileName);
    if (fb) {
      task.usedNativeFallback = true;
      log.warn("falling back to native download endpoint", task.fileName);
      // trình duyệt tải bản đầy đủ: bỏ file dở dang trong thư mục lưu, Retry sau đó tải lại từ đầu
      await task.writer?.abort(); await task.writer?.discardCreatedFile?.();
      task.ledger = null; task.writer = null;
      try {
        await saveMediaBlob(null, task.fileName, fb);
        finishTask(task, "handedOff");
        return;
      } catch (e) { log.error("native fallback failed: " + e.message); }
    } else if (task.writer) {
      // commit phần đã tải để Retry tiếp tục từ đó
      try { await task.writer.close(); } catch { /* commit phần đã tải chỉ là cố gắng thêm */ }
    }
    finishTask(task, "failed", err);
  } finally {
    task.running = false;
  }
};

const onTaskSettled = () => { runningCount--; pumpQueue(); };
const pumpQueue = () => {
  while (runningCount < MAX_ACTIVE_TASKS && waitingQueue.length) {
    const task = waitingQueue.shift();
    if (task.finished || task.pauseFlag || task.running) continue;
    runningCount++;
    runTask(task).finally(onTaskSettled);
  }
};

// media đã tải trước đó: hiện một thẻ trong panel, không thì người dùng tưởng nút không chạy
const noteSkipped = (url, kind) => {
  const task = {
    id: "skip-" + Math.random().toString(36).slice(2) + Date.now().toString(36), url, kind,
    fileName: getDownloadFileName(url, getMediaMetadata(url)?.mimeType, kind),
    state: "skipped", received: 0, total: null, speed: 0, eta: null, finished: true,
  };
  downloadTasks.set(task.id, task);
  renderTask(task, true);
  log.info(t("skipped"), task.fileName);
};

const downloadMedia = (url, kind, opts = {}) => {
  if (typeof url !== "string" || !url) return Promise.resolve();
  const mk = opts.mediaKey || mediaKey(url);
  if (opts.skipDownloaded && downloadedKeys.has(mk)) { noteSkipped(url, kind); return Promise.resolve({ state: "skipped" }); }
  const key = `${kind}:${mk}`;
  const existing = activeTasks.get(key);
  if (existing && !existing.finished) {
    if (!opts.silent) renderTask(existing, true);
    return existing.promise;
  }
  // cùng nguồn đi qua 2 đường (viewer và chat) vẫn là một file: trả về task đang chạy
  for (const t of activeTasks.values()) {
    if (!t.finished && t.url === url) {
      if (!opts.silent) renderTask(t, true);
      return t.promise;
    }
  }
  if (downloadTasks.size >= 30) {
    for (const prev of downloadTasks.values()) {
      if (downloadTasks.size < 30) break;
      if (prev.finished) {
        document.getElementById("sk-task-" + prev.id)?.remove();
        downloadTasks.delete(prev.id);
      }
    }
  }
  const task = {
    id: Math.random().toString(36).slice(2) + Date.now().toString(36),
    key, url, kind, mediaKey: mk,
    fileName: getDownloadFileName(url, getMediaMetadata(url)?.mimeType, kind),
    state: "preparing", received: 0, total: null, speed: 0, eta: null, inflight: 0,
    controller: new AbortController(),
    meter: new SpeedMeter(),
    startedAt: performance.now(), finished: false,
    pauseFlag: false, cancelRequested: false,
    // giữ Blob ngay khi xếp hàng: tới lượt tải thì app có thể đã thu hồi URL và registry đã đẩy nó ra
    blob: url.startsWith("blob:") ? BlobRegistry.get(url) : null,
  };
  // blob do worker của WebK tạo không đi qua hook nên registry không có: đọc ngay khi media còn trên màn hình,
  // tới lượt tải thì app đã thu hồi URL (ERR_FILE_NOT_FOUND)
  if (url.startsWith("blob:") && !task.blob) {
    task.blobReady = fetch(url).then((r) => r.blob())
      .then((b) => { task.blob = b; }, (e) => log.warn("blob capture: " + e.message, task.fileName));
  }
  task.promise = new Promise((r) => (task.resolve = r));
  downloadTasks.set(task.id, task);
  activeTasks.set(key, task);
  renderTask(task, true);
  const enqueue = (handle) => {
    if (task.finished) return;
    task.handle = handle || null;
    task.state = "queued";
    renderTask(task);
    waitingQueue.push(task);
    pumpQueue();
  };
  try {
    const pw = window;
    if (!opts.batch && !destDirHandle && kind !== "image" &&
        typeof pw.showSaveFilePicker === "function" && pw.self === pw.top) {
      Promise.resolve(pw.showSaveFilePicker({ suggestedName: task.fileName }))
        .then(enqueue, (e) => {
          if (e.name === "AbortError") finishTask(task, "cancelled");
          else finishTask(task, "failed", e);
        });
    } else enqueue(null);
  } catch (e) { finishTask(task, "failed", e); }
  return task.promise;
};

const pauseTask = (task) => {
  if (task.finished || task.pauseFlag) return;
  if (task.state === "queued") {
    const idx = waitingQueue.indexOf(task);
    if (idx >= 0) waitingQueue.splice(idx, 1);
    task.pauseFlag = true;
    task.state = "paused";
    renderTask(task);
    return;
  }
  if (task.state !== "downloading" && task.state !== "preparing") return;
  task.pauseFlag = true;
  task.cancelRequested = false;
  task.controller.abort(PAUSE_SIGNAL);
};

const resumeTask = (task) => {
  if (task.finished || !task.pauseFlag) return;
  task.pauseFlag = false;
  task.controller = new AbortController();
  task.state = "queued";
  task.autoRetries = 0;
  renderTask(task);
  waitingQueue.push(task);
  pumpQueue();
};

const cancelTask = (task) => {
  if (task.finished) return;
  task.cancelRequested = true;
  task.pauseFlag = false;
  task.controller.abort(new DOMException("Download cancelled", "AbortError"));
  const idx = waitingQueue.indexOf(task);
  if (idx >= 0) waitingQueue.splice(idx, 1);
  if (!task.running) {
    const cleanup = task.writer
      ? task.writer.abort().catch(() => {}).then(() => task.writer?.discardCreatedFile?.()).catch(() => {})
      : Promise.resolve();
    cleanup.then(() => finishTask(task, "cancelled"));
  }
};

const retryTask = (task) => {
  if (!task.finished || !["failed", "cancelled"].includes(task.state)) return;
  // hủy đã xoá phần đã tải (bộ nhớ hoặc file), nên phải tải lại từ đầu, không resume
  if (task.state === "cancelled") { task.ledger = null; task.writer = null; task.hlsDone = null; }
  task.finished = false;
  task.error = null;
  task.state = "queued";
  task.autoRetries = 0;
  task.cancelRequested = false;
  task.pauseFlag = false;
  task.controller = new AbortController();
  if (task.ledger && !task.ledger.isComplete()) {
    task.resumeMode = true;
    log.info(`retry-resume: còn thiếu ${formatBytes(task.ledger.remaining)}`, task.fileName);
  } else if (task.hlsDone?.size) {
    task.resumeMode = true; // giữ các đoạn HLS đã ghi (file đã được commit khi lỗi)
  } else {
    task.ledger = null;
    task.meter = new SpeedMeter();
  }
  downloadTasks.set(task.id, task);
  activeTasks.set(task.key, task);
  renderTask(task);
  waitingQueue.push(task);
  pumpQueue();
};
