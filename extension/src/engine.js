// Engine tải: đo tốc độ, sổ byte range, writer, tải song song theo Range, blob, ghép HLS.

class SpeedMeter {
  constructor(windowMs = 3000) {
    this.windowMs = windowMs;
    this.samples = []; // [ts, cumulativeBytes]
    this.total = 0;
    this.last = performance.now();
  }
  push(bytes) {
    const now = performance.now();
    this.total += bytes;
    this.samples.push([now, this.total]);
    const cutoff = now - this.windowMs;
    while (this.samples.length > 2 && this.samples[0][0] < cutoff) this.samples.shift();
  }
  speed() {
    if (this.samples.length < 2) return 0;
    const first = this.samples[0], last = this.samples[this.samples.length - 1];
    const dt = (last[0] - first[0]) / 1000;
    if (dt <= 0.05) return 0;
    return Math.max(0, (last[1] - first[1]) / dt);
  }
}

// Bản đồ interval byte đã xong / đang claim (ý tưởng FileView của WebA): chunk lệch thứ tự và resume đều tự nhiên
class RangeLedger {
  constructor() {
    this.total = null; // chưa biết cho tới response đầu tiên
    this.done = []; // [start, end) đã xong, sắp xếp, không giao nhau
    this.claimed = []; // [start, end) đang được worker giữ
    this._received = 0;
  }

  get received() { return this._received; }
  get remaining() { return this.total == null ? null : Math.max(0, this.total - this._received); }
  isComplete() { return this.total != null && this._received >= this.total; }

  setTotal(total) {
    if (this.total != null && this.total !== total) {
      throw downloadError("errorRangeInconsistent", {}, "InconsistentError");
    }
    this.total = total;
  }

  _insertInto(list, start, end) {
    const out = [];
    let placed = false;
    let s = start, e = end;
    for (const [is, ie] of list) {
      if (ie < s) { out.push([is, ie]); continue; }
      if (is > e) { if (!placed) { out.push([s, e]); placed = true; } out.push([is, ie]); continue; }
      s = Math.min(s, is); e = Math.max(e, ie);
    }
    if (!placed) out.push([s, e]);
    list.length = 0;
    for (const iv of out) list.push(iv);
  }

  // ưu tiên đầu file để preview phát được sớm
  claim(size) {
    if (this.total == null) {
      // chưa biết tổng dung lượng: chỉ 1 worker dẫn đầu với claim vô hạn + hint size
      if (this.claimed.length || this.done.length) return null;
      this.claimed.push([0, Infinity]);
      return { start: 0, end: Infinity, size };
    }
    let cursor = 0;
    const busy = [...this.done, ...this.claimed].sort((a, b) => a[0] - b[0]);
    for (const [s, e] of busy) {
      if (s > cursor) {
        const end = Math.min(s, cursor + size, this.total);
        if (end > cursor) {
          this._insertInto(this.claimed, cursor, end);
          return { start: cursor, end, size: end - cursor };
        }
      }
      cursor = Math.max(cursor, e);
    }
    if (cursor < this.total) {
      const end = Math.min(this.total, cursor + size);
      this._insertInto(this.claimed, cursor, end);
      return { start: cursor, end, size: end - cursor };
    }
    return null;
  }

  // phần thiếu trả lại cho chính worker (SW có thể trả ngắn); claim vô hạn chỉ giữ đúng hint size để worker khác cùng chia file
  complete(claim, covered) {
    const cs = claim.start, ce = claim.end;
    const hint = (Number.isFinite(claim.size) && claim.size > 0) ? claim.size : 512 * 1024;
    const effEnd = Number.isFinite(ce)
      ? ce
      : Math.min(cs + hint, this.total != null ? this.total : Infinity);
    const doneEnd = cs + covered;
    this._removeClaim(claim);
    if (covered > 0) {
      this._insertInto(this.done, cs, doneEnd);
      this._received += covered;
    }
    if (doneEnd < effEnd) {
      this._insertInto(this.claimed, doneEnd, effEnd);
      const size = effEnd - doneEnd;
      return { start: doneEnd, end: effEnd, size: size > 0 ? size : hint, partial: true };
    }
    return null;
  }

  release(claim) {
    this._removeClaim(claim);
  }

  _removeClaim(claim) {
    const out = [];
    for (const [s, e] of this.claimed) {
      if (claim.start > s) out.push([s, Math.min(e, claim.start)]);
      if (claim.end < e) out.push([Math.max(s, claim.end), e]);
    }
    this.claimed.length = 0;
    for (const iv of out) {
      if (iv[1] > iv[0]) this.claimed.push(iv);
    }
    this.claimed.sort((a, b) => a[0] - b[0]);
  }

  hasClaims() { return this.claimed.length > 0; }
}

// ghi theo vị trí nên chunk lệch thứ tự vẫn đúng; keepExistingData cho Retry chỉ vá phần thiếu
class FsWriter {
  constructor(handle, opts = {}) {
    this.handle = handle;
    this.opts = opts;
    this.writable = null;
    this.closed = false;
  }
  static get supported() {
    return typeof FileSystemFileHandle !== "undefined" &&
      typeof FileSystemFileHandle.prototype.createWritable === "function";
  }
  async open(keepExisting = false) {
    if (this.writable && !this.closed) return this.writable;
    // gọi song song chỉ mở một writable: hai writable trên cùng file thì cái đóng sau đè mất dữ liệu cái kia
    if (!this._opening) {
      this._opening = this.handle.createWritable(keepExisting ? { keepExistingData: true } : {})
        .then((w) => { this.writable = w; this.closed = false; return w; })
        .finally(() => { this._opening = null; });
    }
    return this._opening;
  }
  async writeAt(position, data) {
    const w = await this.open();
    await w.write({ type: "write", position, data });
  }
  async close() {
    if (this.writable && !this.closed) { await this.writable.close(); this.closed = true; }
    this.writable = null;
  }
  async abort() {
    if (this.writable && !this.closed) { try { await this.writable.abort(); } catch { /* stream đã đóng */ } }
    this.closed = true; this.writable = null;
  }
}

// dự phòng cho trình duyệt không có File System Access
class MemWriter {
  constructor() { this.parts = new Map(); }
  // LazyWriter gọi open() khi resume; MemWriter không cần mở lại gì
  async open() {}
  async writeAt(position, data) { this.parts.set(position, data); }
  assemble(mime) {
    const offsets = [...this.parts.keys()].sort((a, b) => a - b);
    return new Blob(offsets.map((o) => this.parts.get(o)), { type: mime || "application/octet-stream" });
  }
  async close() {}
  async abort() { this.parts.clear(); }
}

const tagError = (err, { retryable = false, fatal = false } = {}) => {
  if (err && typeof err === "object") {
    if (retryable) err.retryable = true;
    if (fatal) err.fatal = true;
  }
  return err;
};
const isAbortLike = (err) =>
  err?.name === "AbortError" || err?.name === "DOMException" && /abort/i.test(err?.message || "");

// SW WebA đôi khi trả application/octet-stream hoặc không có Content-Type
const mimeAcceptable = (mime, kind) => {
  if (!mime) return true;
  if (!kind) return true;
  if (mime.startsWith(`${kind}/`)) return true;
  return mime === "application/octet-stream" || mime === "application/download";
};

async function fetchChunk(task, claim) {
  const { signal } = task.controller;
  const ledger = task.ledger;
  // claim vô hạn đi kèm hint size nên request luôn có giới hạn
  const reqSpan = (Number.isFinite(claim.size) && claim.size > 0)
    ? Math.min(claim.size, CHUNK_MAX)
    : CHUNK_MAX;
  const reqEnd = claim.start + reqSpan - 1;

  const controller = new AbortController();
  const relayAbort = () => controller.abort(signal.reason);
  if (signal.aborted) relayAbort();
  else signal.addEventListener("abort", relayAbort, { once: true });

  let stallTimer = null;
  const clearStall = () => { if (stallTimer) { clearTimeout(stallTimer); stallTimer = null; } };
  const resetStall = () => {
    clearStall();
    stallTimer = setTimeout(
      () => controller.abort(tagError(downloadError("errorStall", {}, "TimeoutError"), { retryable: true })),
      STALL_TIMEOUT_MS
    );
  };

  let reader = null;
  let chunkReceived = 0; // tính vào task.inflight tới khi ghi xong
  try {
    resetStall();
    const res = await fetch(task.fetchUrl || task.url, {
      headers: { Range: `bytes=${claim.start}-${reqEnd}` },
      signal: controller.signal,
    });

    if (res.status !== 206 && res.status !== 200) {
      const err = tagError(downloadError("errorHttp", { status: res.status }),
        { retryable: res.status >= 500 || res.status === 429, fatal: !(res.status >= 500 || res.status === 429) });
      throw err;
    }

    const mime = res.headers.get("Content-Type")?.split(";")[0].trim().toLowerCase() || "";
    if (!mimeAcceptable(mime, task.kind)) {
      throw tagError(downloadError("errorMime", { kind: task.kind, mime }), { fatal: true });
    }

    let expected = null;
    if (res.status === 206) {
      const m = res.headers.get("Content-Range")?.match(CONTENT_RANGE_RE);
      if (!m) throw tagError(downloadError("errorRangeMissing"), { fatal: true });
      const crStart = +m[1], crEnd = +m[2];
      const crTotal = m[3] === "*" ? null : +m[3];
      if (crStart !== claim.start || crEnd < crStart) {
        throw tagError(downloadError("errorRangeInconsistent"), { fatal: true });
      }
      if (crTotal != null && !Number.isSafeInteger(crTotal)) {
        throw tagError(downloadError("errorRangeInconsistent"), { fatal: true });
      }
      expected = crEnd - crStart + 1;
      if (expected > reqSpan + 1) {
        throw tagError(downloadError("errorTooLarge"), { fatal: true });
      }
      if (crTotal != null) ledger.setTotal(crTotal);
      if (task.mime !== mime && mime) task.mime = mime;
    } else {
      // 200 chỉ hợp lệ từ offset 0 (blob: hoặc server không hỗ trợ Range)
      if (claim.start !== 0) {
        throw tagError(downloadError("errorRangeUnsupported"), { fatal: true });
      }
      const len = res.headers.get("Content-Length");
      if (len !== null && !res.headers.has("Content-Encoding")) {
        if (!/^\d+$/.test(len) || !Number.isSafeInteger(Number(len))) {
          throw tagError(downloadError("errorLength"), { fatal: true });
        }
        expected = Number(len);
        ledger.setTotal(expected);
      }
      if (mime) task.mime = mime;
    }

    if (!res.body) throw tagError(downloadError("errorEmpty"), { fatal: true });
    reader = res.body.getReader();
    const onAbortCancel = () => { reader?.cancel().catch(() => {}); };
    controller.signal.addEventListener("abort", onAbortCancel, { once: true });

    const pieces = [];
    let received = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      received += value.byteLength;
      chunkReceived = received;
      if (expected != null && received > expected) {
        throw tagError(downloadError("errorTooLarge"), { fatal: true });
      }
      task.meter.push(value.byteLength);
      task.inflight = (task.inflight || 0) + value.byteLength;
      resetStall();
      pieces.push(value);
      bumpProgress(task);
    }

    if (received === 0) throw tagError(downloadError("errorEmpty"), { retryable: true });
    // 200 không có Content-Length: body chính là toàn bộ file
    if (res.status === 200 && ledger.total == null) {
      ledger.setTotal(received);
    }

    const data = pieces.length === 1 ? pieces[0] : concatU8(pieces);
    await task.writer.writeAt(claim.start, data);
    return { covered: received, mime };
  } catch (err) {
    // stall timer hủy request (không phải người dùng hủy): cho retry
    if (!signal.aborted && controller.signal.aborted) {
      throw tagError(controller.signal.reason || downloadError("errorStall", {}, "TimeoutError"), { retryable: true });
    }
    if (err instanceof TypeError) {
      // blob: lỗi mạng nghĩa là app đã thu hồi URL: thử lại bao nhiêu lần cũng vô ích
      if (task.url.startsWith("blob:")) throw tagError(downloadError("errorBlobGone"), { fatal: true });
      tagError(err, { retryable: true });
    }
    throw err;
  } finally {
    clearStall();
    signal.removeEventListener("abort", relayAbort);
    if (reader) { await reader.cancel().catch(() => {}); reader = null; }
    task.inflight = Math.max(0, (task.inflight || 0) - chunkReceived);
    bumpProgress(task);
  }
}

const concatU8 = (arrays) => {
  let len = 0;
  for (const a of arrays) len += a.byteLength;
  const out = new Uint8Array(len);
  let off = 0;
  for (const a of arrays) { out.set(a, off); off += a.byteLength; }
  return out;
};

async function downloadFromBlob(task, blob) {
  const total = blob.size;
  task.total = total;
  task.mime = task.mime || blob.type || "";
  task.ledger = null;
  task.receivedDirect = 0;
  const workers = Math.max(1, getConnections());
  const sliceSize = 8 * MB;
  let cursor = 0;

  const worker = async () => {
    while (true) {
      if (task.controller.signal.aborted) throw task.controller.signal.reason;
      if (task.pauseFlag) return;
      const start = cursor;
      cursor = Math.min(start + sliceSize, total);
      if (start >= total) return;
      const end = cursor;
      const buf = new Uint8Array(await blob.slice(start, end).arrayBuffer());
      task.meter.push(buf.byteLength);
      task.receivedDirect = (task.receivedDirect || 0) + buf.byteLength;
      await task.writer.writeAt(start, buf);
      bumpProgress(task);
    }
  };
  await Promise.all(Array.from({ length: workers }, worker));
  task.receivedDirect = total;
}

async function parallelRangeDownload(task) {
  const ledger = task.ledger || (task.ledger = new RangeLedger());
  let chunkSize = task.chunkSize || CHUNK_DEFAULT;
  const isWebKStream = /\/stream\//.test(task.fetchUrl || task.url);
  let fullStreak = 0;

  const worker = async () => {
    let claim = null;
    try {
      while (true) {
        // claim đang giữ (nếu có) được trả về ở catch ngoài
        if (task.controller.signal.aborted) throw task.controller.signal.reason;
        if (task.pauseFlag) throw PAUSE_SIGNAL;

        if (!claim) {
          claim = ledger.claim(chunkSize);
          if (!claim) {
            if (ledger.isComplete()) return;
            if (ledger.hasClaims()) { await sleep(120, task.controller.signal); continue; }
            return; // worker khác lỗi thì Promise.all sẽ throw
          }
        }

        let attempt = 0;
        while (true) {
          try {
            const got = await fetchChunk(task, claim);
            const wantFull = Number.isFinite(claim.end)
              ? claim.end - claim.start
              : got.covered;
            const partial = ledger.complete(claim, got.covered);
            bumpProgress(task);
            // stream/ của WebK nhận part 1MB: tăng lên sau 4 chunk đầy liên tiếp
            if (isWebKStream && got.covered >= wantFull) {
              if (++fullStreak >= 4 && chunkSize < CHUNK_MAX) { chunkSize = CHUNK_MAX; }
            } else fullStreak = 0;
            task.chunkSize = chunkSize;
            claim = partial || null;
            break;
          } catch (err) {
            // pause/cancel/fatal ném ra ngoài; lỗi mạng thì giữ claim để retry đúng đoạn đó
            if (task.pauseFlag) throw PAUSE_SIGNAL;
            if (task.controller.signal.aborted) throw task.controller.signal.reason || err;
            if (err?.fatal) throw err;
            attempt++;
            if (attempt >= CHUNK_RETRIES) {
              tagError(err, { retryable: true });
              throw err;
            }
            if (err?.name === "TimeoutError") {
              chunkSize = Math.max(CHUNK_MIN, chunkSize / 2);
              task.chunkSize = chunkSize;
            }
            await sleep(backoffDelay(attempt), task.controller.signal);
          }
        }
      }
    } catch (err) {
      // mọi lối thoát lỗi đều trả claim về ledger, nếu không Resume sẽ chờ một claim không ai giữ
      if (claim) { try { ledger.release(claim); } catch { /* claim đã được trả */ } claim = null; }
      // hủy task để các worker còn lại dừng ngay, không tải lại
      if (!task.pauseFlag && !task.controller.signal.aborted) {
        try { task.controller.abort(err); } catch { /* controller đã bị hủy */ }
      }
      throw err;
    }
  };

  let lastBytes = ledger.received, lastTs = Date.now();
  const watchdog = setInterval(() => {
    const cur = ledger.received + (task.inflight || 0);
    if (cur > lastBytes) { lastBytes = cur; lastTs = Date.now(); return; }
    if (Date.now() - lastTs > WATCHDOG_MS) {
      task.controller.abort(tagError(new Error("watchdog: no progress"), { fatal: true }));
    }
  }, 5000);

  try {
    // khi chưa biết total, claim() chỉ cho 1 worker dẫn đầu; các worker khác poll rồi vào cuộc khi đã biết
    const n = Math.max(1, getConnections());
    await Promise.all(Array.from({ length: n }, worker));
  } finally {
    clearInterval(watchdog);
  }

  if (!ledger.isComplete()) {
    throw tagError(downloadError("errorIncomplete"), { retryable: true });
  }
}

const PAUSE_SIGNAL = Object.assign(new Error("paused"), { name: "PauseSignal", pause: true });

// đúng đoạn [start, start+len) của url; SW có thể trả 200 cả file, hoặc 206 bắt đầu sớm hơn (theo Content-Range): cắt lấy phần cần
const fetchRangeBytes = async (url, start, len, signal, own = false) => {
  const headers = len != null ? { Range: `bytes=${start}-${start + len - 1}` } : {};
  const res = await (own ? ownFetch : fetch)(url, { headers, signal });
  if (!res.ok) {
    const retry = res.status >= 500 || res.status === 429;
    throw tagError(downloadError("errorHttp", { status: res.status }), { retryable: retry, fatal: !retry });
  }
  let buf = new Uint8Array(await res.arrayBuffer());
  if (len != null) {
    const cr = res.status === 206 ? res.headers.get("Content-Range")?.match(CONTENT_RANGE_RE) : null;
    const from = res.status === 206 ? (cr ? start - Number(cr[1]) : 0) : start;
    if (from < 0) throw tagError(downloadError("errorRangeInconsistent"), { fatal: true });
    buf = buf.subarray(from, from + len);
    if (buf.byteLength !== len) throw tagError(downloadError("errorIncomplete"), { retryable: true });
  }
  if (!buf.byteLength) throw tagError(downloadError("errorEmpty"), { retryable: true });
  return buf;
};

// file gốc có tải được qua stream/ không (SW của WebK từ chối một số file, vd .mov)
const probeStream = async (url) => {
  try {
    const res = await ownFetch(url, { headers: { Range: "bytes=0-1" } });
    res.body?.cancel().catch(() => {});
    return res.status === 206 && CONTENT_RANGE_RE.test(res.headers.get("Content-Range") || "");
  } catch { return false; }
};

async function fetchHlsPart(task, p) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fetchRangeBytes(p.url, p.start, p.len, task.controller.signal);
    } catch (err) {
      if (task.pauseFlag) throw PAUSE_SIGNAL;
      if (task.controller.signal.aborted) throw task.controller.signal.reason || err;
      if (err?.fatal || attempt + 1 >= CHUNK_RETRIES) throw tagError(err, { retryable: !err?.fatal });
      await sleep(backoffDelay(attempt + 1), task.controller.signal);
    }
  }
}

// tải các đoạn của bản cao nhất và ghi nối tiếp nhau (init + fragment = file mp4 xem được);
// task.hlsDone nhớ đoạn đã ghi để Tạm dừng/Tiếp tục và tự thử lại không tải lại từ đầu
async function hlsDownload(task) {
  // ưu tiên file gốc qua stream/ (như video thường, đúng file người gửi đăng); SW từ chối thì mới ghép HLS
  if (task.hlsMode == null) task.hlsMode = (await probeStream(hlsToStream(task.url))) ? "original" : "merge";
  if (task.hlsMode === "original") {
    task.fetchUrl = hlsToStream(task.url);
    log.info("HLS: tải file gốc qua stream/", task.fileName);
    return parallelRangeDownload(task);
  }
  const plan = await loadHlsPlan(task.url);
  task.mime = plan.mime;
  if (!task.named) task.fileName = getDownloadFileName(task.url, task.mime, task.kind);
  const parts = plan.parts;
  const sized = parts.every((p) => p.len != null);
  if (!sized || !task.hlsDone) { task.hlsDone = new Set(); task.receivedDirect = 0; } // không biết vị trí ghi thì làm lại từ đầu
  task.ledger = null;
  task.total = sized ? parts.reduce((s, p) => s + p.len, 0) : null;
  const offsets = [];
  parts.reduce((off, p, i) => { offsets[i] = off; return off + (p.len ?? 0); }, 0);
  log.info(`HLS ${plan.height}p ${plan.codec || "?"}: ${parts.length} đoạn${task.total ? ", " + formatBytes(task.total) : ""}`, task.fileName);

  let next = 0, seqPos = 0;
  const worker = async () => {
    try {
      while (next < parts.length) {
        if (task.controller.signal.aborted) throw task.controller.signal.reason;
        if (task.pauseFlag) throw PAUSE_SIGNAL;
        const i = next++;
        if (task.hlsDone.has(i)) continue;
        const buf = await fetchHlsPart(task, parts[i]);
        const pos = sized ? offsets[i] : seqPos;
        if (!sized) seqPos += buf.byteLength;
        await task.writer.writeAt(pos, buf);
        task.hlsDone.add(i);
        task.meter.push(buf.byteLength);
        task.receivedDirect += buf.byteLength;
        bumpProgress(task);
      }
    } catch (err) {
      // một luồng lỗi thì dừng cả task, như parallelRangeDownload
      if (!task.pauseFlag && !task.controller.signal.aborted) {
        try { task.controller.abort(err); } catch { /* controller đã bị hủy */ }
      }
      throw err;
    }
  };
  await Promise.all(Array.from({ length: sized ? getConnections() : 1 }, worker));
  if (task.hlsDone.size < parts.length) throw tagError(downloadError("errorIncomplete"), { retryable: true });
}

async function engineDownload(task) {
  if (HLS_MASTER_RE.test(task.url)) return hlsDownload(task);
  await task.blobReady;
  const blobObj = task.blob || (task.url.startsWith("blob:") ? BlobRegistry.get(task.url) : null);
  if (blobObj instanceof Blob) {
    log.info(`blob fast-path (${formatBytes(blobObj.size)})`, task.fileName);
    await downloadFromBlob(task, blobObj);
    return;
  }
  await parallelRangeDownload(task);
}

function bumpProgress(task) {
  if (task.ledger) {
    task.received = task.ledger.received + (task.inflight || 0);
    if (task.ledger.total != null) task.total = task.ledger.total;
  } else if (task.receivedDirect != null) {
    task.received = task.receivedDirect;
    if (task.total == null) task.total = task.received;
  }
  const speed = task.meter?.speed() || 0;
  task.speed = speed;
  task.eta = (speed > 0 && task.total) ? (task.total - task.received) / speed : null;
  throttledRender(task);
}
