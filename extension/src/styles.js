// Icon SVG và CSS của toàn bộ giao diện.

const TG_LOGO_SVG =
  '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21.5 4.5L2.8 11.7c-.8.3-.8 1.5.1 1.7l4.6 1.4 1.7 5.2c.3.8 1.3 1 1.9.4l2.5-2.4 4.7 3.4c.7.5 1.6.1 1.8-.7L23 5.8c.2-.9-.7-1.6-1.5-1.3z"/></svg>';
const DL_ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M5 16v4h14v-4"/></svg>';
const QUEUE_ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 15v4h14v-4"/><path d="M12 4v10"/><path d="M8 10l4 4 4-4"/><circle cx="18" cy="6" r="3" fill="currentColor" stroke="none"/></svg>';
const GEAR_SVG =
  '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>';
const FOLDER_SVG =
  '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>';
const TRASH_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>';

const buildStyles = () => {
  const style = document.createElement("style");
  style.textContent = `
    :root {
      --sk-bg: #ffffff; --sk-bg-head: #f6f9fc; --sk-fg: #101b26;
      --sk-muted: #4a5a6d; --sk-line: #d9e2ec;
      --sk-track: #e3eaf2;
      --sk-accent: #0768c4; --sk-accent-fg: #ffffff;
      --sk-accent-bar: #2f8ce0; --sk-accent-soft: #e2effc; --sk-accent-chip: #0a5fae;
      --sk-ok: #0a7a52; --sk-ok-fg: #ffffff; --sk-ok-bar: #12b981;
      --sk-warn: #b45309; --sk-err: #d92d20; --sk-err-fg: #ffffff;
      --sk-radius: 14px;
      --sk-shadow: 0 12px 40px rgba(10,20,40,.22), 0 2px 6px rgba(10,20,40,.08);
    }
    html.night, html.theme-dark, html.dark {
      --sk-bg: #212e3d; --sk-bg-head: #293748; --sk-fg: #f2f6fa;
      --sk-muted: #c3d0dd; --sk-line: #3c4d61;
      --sk-track: #334257;
      --sk-accent: #1a72bd; --sk-accent-fg: #ffffff;
      --sk-accent-bar: #4aa5ff; --sk-accent-soft: #1c3a5c; --sk-accent-chip: #9fd1ff;
      --sk-ok: #0b7c56; --sk-ok-fg: #ffffff; --sk-ok-bar: #2ee6a8;
      --sk-warn: #f5a623; --sk-err: #ff6b6b; --sk-err-fg: #1a0505;
      --sk-shadow: 0 12px 40px rgba(0,0,0,.6), 0 2px 6px rgba(0,0,0,.4);
    }
    #sk-panel *, #sk-select * { box-sizing: border-box; }
    #sk-panel, #sk-select {
      position: fixed; z-index: 2147483646;
      background: var(--sk-bg); color: var(--sk-fg);
      border: 1px solid var(--sk-line); border-radius: var(--sk-radius);
      box-shadow: var(--sk-shadow); font: 13px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
      display: flex; flex-direction: column; overflow: hidden;
    }
    /* ẩn cả ROOT: rule display của panel từng đè [hidden] mặc định của trình duyệt (bug 2.0.1) */
    #sk-panel [hidden], #sk-select [hidden],
    #sk-panel[hidden], #sk-select[hidden] { display: none !important; }

    #sk-panel {
      right: max(16px, env(safe-area-inset-right));
      bottom: max(16px, env(safe-area-inset-bottom));
      width: min(370px, calc(100vw - 32px)); max-height: min(calc(100vh - 32px), 620px, var(--sk-room, 100vh));
    }
    #sk-panel.collapsed .sk-task-list, #sk-panel.collapsed .sk-foot,
    #sk-panel.collapsed .sk-empty, #sk-panel.collapsed .sk-file-list { display: none; }
    /* chế độ xem file thay chỗ danh sách task */
    #sk-panel.files .sk-task-list, #sk-panel:not(.files) .sk-file-list { display: none; }
    .sk-file-list {
      overflow-y: auto; overscroll-behavior: contain; padding: 10px;
      display: flex; flex-direction: column; gap: 6px; flex: 1 1 auto; min-height: 0;
    }
    .sk-file-head, .sk-file-msg { font-size: 12px; color: var(--sk-muted); padding: 2px; }
    .sk-file-msg { text-align: center; padding: 12px 2px; }
    .sk-file {
      color: var(--sk-fg); border: 1px solid var(--sk-line); border-radius: 10px;
      padding: 8px 10px; display: flex; flex-direction: column; gap: 2px; min-width: 0;
    }
    .sk-file .name { font-weight: 600; font-size: 12.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .sk-file .meta { font-size: 11.5px; color: var(--sk-muted); font-variant-numeric: tabular-nums; }
    .sk-icon-btn.on { background: var(--sk-accent); color: var(--sk-accent-fg); }

    /* chat "Hạn chế lưu nội dung": cho bôi đen chữ trong tin nhắn (WebK .bubble.no-forwards, WebA .Message.is-protected) */
    .bubble.no-forwards .bubble-content, .bubble.no-forwards .message, .bubble.no-forwards .translatable-message,
    .Message.is-protected .message-content, .Message.is-protected .text-content {
      -webkit-user-select: text !important; user-select: text !important;
    }
    #sk-select {
      right: max(16px, env(safe-area-inset-right));
      top: max(16px, env(safe-area-inset-top));
      width: min(320px, calc(100vw - 32px)); max-height: min(70vh, var(--sk-room, 100vh));
    }
    #sk-select.collapsed { width: auto; }
    #sk-select.collapsed .sk-select-body { display: none; }

    .sk-head {
      display: flex; align-items: center; gap: 8px; padding: 10px 12px; flex-shrink: 0;
      background: var(--sk-bg-head); border-bottom: 1px solid var(--sk-line);
      touch-action: none;
    }
    .sk-title {
      flex: 1; min-width: 0; font-weight: 700; font-size: 13.5px;
      display: flex; align-items: center; gap: 8px; cursor: move; user-select: none;
    }
    .sk-logo {
      width: 24px; height: 24px; flex-shrink: 0; display: inline-flex;
      align-items: center; justify-content: center; border-radius: 50%;
      background: linear-gradient(135deg, #37aee2, #1e96c8);
      box-shadow: 0 2px 6px rgba(55,174,226,.4);
    }
    .sk-count {
      background: var(--sk-accent-soft); color: var(--sk-accent-chip); border-radius: 10px;
      padding: 3px 10px; font-weight: 700; font-size: 11.5px; font-variant-numeric: tabular-nums;
    }
    .sk-count:empty, .sk-count[data-zero="1"] { opacity: .55; }
    .sk-icon-btn {
      appearance: none; background: var(--sk-track); color: var(--sk-fg); border: 0;
      width: 30px; height: 30px; padding: 0; border-radius: 50%;
      font: 700 16px/1 system-ui; cursor: pointer; display: inline-flex;
      align-items: center; justify-content: center; transition: background .15s, color .15s;
    }
    .sk-icon-btn:hover { background: var(--sk-accent); color: var(--sk-accent-fg); }
    .sk-icon-btn:active { transform: scale(.94); }

    /* min-height:0 + flex để list tự cuộn trong panel max-height thay vì đẩy
       panel dài ra (bug 2.2: panel bị "kéo dài" khi card thêm/đổi state) */
    .sk-task-list {
      overflow-y: auto; overscroll-behavior: contain; padding: 10px;
      display: flex; flex-direction: column; gap: 10px;
      flex: 1 1 auto; min-height: 0;
    }
    .sk-empty {
      padding: 16px 12px; font-size: 12px; color: var(--sk-muted);
      text-align: center; user-select: none;
    }
    .sk-task {
      border: 1px solid var(--sk-line); border-radius: 10px; padding: 10px;
      background: var(--sk-bg);
    }
    .sk-task-head { display: flex; align-items: center; gap: 8px; }
    .sk-task-head .name {
      flex: 1; min-width: 0; font-weight: 600; font-size: 12.5px;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .sk-task[data-state="completed"] { border-color: var(--sk-ok); }
    .sk-task[data-state="failed"], .sk-task[data-state="cancelled"] { border-color: var(--sk-err); }
    .sk-task[data-state="paused"] { border-color: var(--sk-warn); }
    .sk-bar {
      position: relative; height: 8px; border-radius: 4px; margin: 8px 0 6px;
      background: var(--sk-track); overflow: hidden;
    }
    .sk-bar-fill {
      position: absolute; inset: 0 auto 0 0; width: 0%;
      background: linear-gradient(90deg, var(--sk-accent-bar), #67b3ff);
      border-radius: 4px; transition: width .2s ease;
    }
    .sk-task[data-state="completed"] .sk-bar-fill { background: var(--sk-ok-bar); }
    .sk-task[data-state="failed"] .sk-bar-fill, .sk-task[data-state="cancelled"] .sk-bar-fill { background: var(--sk-err); }
    .sk-task[data-state="paused"] .sk-bar-fill { background: var(--sk-warn); }
    .sk-bar.indeterminate .sk-bar-fill {
      width: 30%; animation: sk-indet 1.2s infinite ease-in-out;
    }
    @keyframes sk-indet { 0% { margin-left: -30%; } 100% { margin-left: 100%; } }
    .sk-stats {
      font-size: 11.5px; color: var(--sk-muted); font-variant-numeric: tabular-nums;
      display: flex; gap: 6px; flex-wrap: wrap;
    }
    .sk-stats .state-label { font-weight: 700; color: var(--sk-fg); }
    .sk-err-text { margin: 6px 0 0; font-size: 11.5px; color: var(--sk-err); }
    /* hàng nút giữ chiều cao cố định — ẩn/hiện nút theo state không làm card
       giật giật kéo panel theo (bug 2.2) */
    .sk-task-actions { display: flex; gap: 6px; margin-top: 8px; min-height: 30px; }
    .sk-task-actions .sk-btn { flex: 1; min-height: 28px; padding: 4px 8px; font-size: 11.5px; }

    .sk-btn {
      appearance: none; border: 1px solid var(--sk-line); background: var(--sk-bg);
      color: var(--sk-fg); border-radius: 10px; padding: 0 12px; min-height: 34px;
      font-family: inherit; font-size: 12px; font-weight: 700; line-height: 1.2; cursor: pointer; user-select: none;
      display: inline-flex; align-items: center; justify-content: center; gap: 7px;
      transition: background .15s, border-color .15s, color .15s, box-shadow .15s, transform .05s;
    }
    .sk-btn:hover { background: var(--sk-track); border-color: var(--sk-muted); }
    .sk-btn:active { transform: translateY(1px); }
    .sk-btn:focus-visible { outline: 2px solid var(--sk-accent-bar); outline-offset: 1px; }
    .sk-btn:disabled { opacity: .6; cursor: not-allowed; }
    .sk-btn .sk-btn-ic { display: inline-flex; flex-shrink: 0; }
    .sk-btn .sk-btn-ic svg { width: 14px; height: 14px; }
    /* nút gắn vào viewer: icon là SVG riêng, không phụ thuộc icon font của Telegram */
    .sk-queue-icon, .sk-wa-icon { display: inline-flex; align-items: center; justify-content: center; color: #fff; pointer-events: none; }
    .sk-queue-icon svg, .sk-wa-icon svg { width: 22px; height: 22px; display: block; }

    .sk-btn.sk-primary {
      background: var(--sk-accent); border-color: var(--sk-accent); color: var(--sk-accent-fg);
      box-shadow: 0 2px 10px rgba(7,104,196,.35);
    }
    .sk-btn.sk-primary:hover { filter: brightness(1.1); background: var(--sk-accent); }
    .sk-btn.sk-primary:disabled {
      background: var(--sk-track); border-color: var(--sk-track);
      color: var(--sk-muted); opacity: 1; box-shadow: none; cursor: not-allowed;
    }

    .sk-btn.toggle::before {
      content: ""; width: 9px; height: 9px; border-radius: 50%;
      background: var(--sk-muted); flex-shrink: 0;
    }
    .sk-btn.toggle:hover { border-color: var(--sk-muted); }
    .sk-btn.toggle.on {
      background: var(--sk-ok); border-color: var(--sk-ok); color: var(--sk-ok-fg);
      box-shadow: 0 2px 10px rgba(10,122,82,.35);
    }
    .sk-btn.toggle.on::before { background: var(--sk-ok-fg); }
    .sk-btn.toggle.on:hover { filter: brightness(1.08); background: var(--sk-ok); }

    .sk-btn.sk-danger { color: var(--sk-err); border-color: var(--sk-line); }
    .sk-btn.sk-danger:hover {
      background: var(--sk-err); border-color: var(--sk-err); color: var(--sk-err-fg);
    }

    .sk-foot {
      display: flex; justify-content: space-between; padding: 8px 14px;
      font-size: 11px; color: var(--sk-muted); border-top: 1px solid var(--sk-line);
    }

    .sk-aq-status {
      margin: 0 0 8px; padding: 7px 10px; border-radius: 9px; font-size: 12px; font-weight: 600;
      background: var(--sk-accent-soft); color: var(--sk-accent-chip); font-variant-numeric: tabular-nums;
    }
    .sk-select-body {
      padding: 10px 12px; overflow-y: auto; overscroll-behavior: contain;
      flex: 1 1 auto; min-height: 0;
    }
    .sk-hint { font-size: 11.5px; color: var(--sk-muted); margin-bottom: 10px; line-height: 1.6; }
    .sk-hint b { color: var(--sk-fg); }
    .sk-hint .keys { opacity: .8; }
    .sk-actions { display: flex; gap: 8px; margin-bottom: 8px; }
    .sk-actions .sk-btn { flex: 1; text-align: center; padding: 0 6px; min-height: 36px; font-size: 12px; }
    #sk-dl-btn { width: 100%; margin-top: 2px; padding: 0 10px; min-height: 42px; font-size: 13px; }
    /* list có scroll riêng để không đẩy panel */
    .sk-select-list {
      border-top: 1px dashed var(--sk-line); margin-top: 10px; padding-top: 8px;
      max-height: 150px; overflow-y: auto; overscroll-behavior: contain;
      display: grid; grid-template-columns: repeat(auto-fill, minmax(52px, 1fr)); gap: 6px;
    }
    .sk-thumb {
      position: relative; aspect-ratio: 1; border-radius: 8px; overflow: hidden;
      background: var(--sk-track); border: 1px solid var(--sk-line); cursor: pointer;
      transition: border-color .15s;
    }
    .sk-thumb:hover { border-color: var(--sk-accent-bar); }
    .sk-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .sk-thumb-n {
      position: absolute; left: 3px; bottom: 3px; padding: 2px 4px; border-radius: 4px;
      background: rgba(0,0,0,.65); color: #fff; font: 700 10px/1 system-ui; pointer-events: none;
    }
    .sk-thumb-rm {
      position: absolute; top: 2px; right: 2px; width: 18px; height: 18px; padding: 0;
      border: 0; border-radius: 50%; background: rgba(0,0,0,.65); color: #fff;
      font: 700 13px/18px system-ui; cursor: pointer; opacity: 0; transition: opacity .15s, background .15s;
    }
    .sk-thumb:hover .sk-thumb-rm, .sk-thumb-rm:focus-visible { opacity: 1; }
    .sk-thumb-rm:hover { background: var(--sk-err); }
    @media (hover: none) { .sk-thumb-rm { opacity: 1; } }

    .sk-sel-item {
      position: relative; outline: 4px solid var(--sk-ok) !important; outline-offset: -4px;
      box-shadow: 0 0 0 4px rgba(34,197,94,.3), 0 0 20px 2px rgba(34,197,94,.5) !important;
      border-radius: 6px;
    }
    .sk-sel { outline: 2px dashed var(--sk-ok) !important; outline-offset: 2px; border-radius: 8px; }
    .sk-tick {
      position: absolute; top: 6px; left: 6px; z-index: 2; width: 28px; height: 28px;
      border-radius: 50%; background: var(--sk-ok); color: var(--sk-ok-fg);
      font: 900 16px/28px system-ui; text-align: center; pointer-events: none;
      box-shadow: 0 2px 10px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.25);
    }
    .sk-tick::before { content: "✓"; }

  `;
  document.head.appendChild(style);
};
