// Icon SVG và CSS của toàn bộ giao diện: nút nổi (FAB), dock có tab, thông báo nhỏ, nút gắn vào viewer.

const svg = (d, w = 20) =>
  `<svg viewBox="0 0 24 24" width="${w}" height="${w}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;

const TG_LOGO_SVG =
  '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21.5 4.5L2.8 11.7c-.8.3-.8 1.5.1 1.7l4.6 1.4 1.7 5.2c.3.8 1.3 1 1.9.4l2.5-2.4 4.7 3.4c.7.5 1.6.1 1.8-.7L23 5.8c.2-.9-.7-1.6-1.5-1.3z"/></svg>';
const DL_ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M5 16v4h14v-4"/></svg>';
const QUEUE_ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 15v4h14v-4"/><path d="M12 4v10"/><path d="M8 10l4 4 4-4"/><circle cx="18" cy="6" r="3" fill="currentColor" stroke="none"/></svg>';
const GEAR_SVG = svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"/>', 18);
const FOLDER_SVG = svg('<path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>');
const CLOSE_SVG = svg('<path d="M18 6 6 18M6 6l12 12"/>', 18);
const CHEVRON_SVG = svg('<path d="m6 9 6 6 6-6"/>', 18);
const VIDEO_SVG = svg('<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m10 9 5 3-5 3z" fill="currentColor"/>', 18);
const IMAGE_SVG = svg('<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.6"/><path d="m21 16-5-5-8 8"/>', 18);
const AUDIO_SVG = svg('<path d="M9 18V6l11-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>', 18);
const CHECK_SVG = svg('<path d="m5 12.5 4.5 4.5L19 7.5"/>', 18);
const ALERT_SVG = svg('<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5h.01"/>', 18);
const PAUSE_SVG = svg('<path d="M9 5v14M15 5v14"/>', 16);
const PLAY_SVG = svg('<path d="m7 5 12 7-12 7z" fill="currentColor"/>', 16);
const RETRY_SVG = svg('<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>', 16);
const STOP_SVG = svg('<path d="M18 6 6 18M6 6l12 12"/>', 16);

const buildStyles = () => {
  const style = document.createElement("style");
  style.textContent = `
    /* màu lấy từ theme đang dùng của Telegram (WebK: --primary-color…, WebA: --color-primary…), có giá trị dự phòng */
    #sk-fab, #sk-dock, #sk-toast {
      --sk-accent: var(--primary-color, var(--color-primary, #3390ec));
      --sk-accent-fg: #ffffff;
      --sk-surface: var(--surface-color, var(--color-background, #ffffff));
      --sk-surface-2: var(--light-secondary-text-color-alpha, rgba(112, 117, 121, .08));
      --sk-fg: var(--primary-text-color, var(--color-text, #0f0f0f));
      --sk-muted: var(--secondary-text-color, var(--color-text-secondary, #707579));
      --sk-line: rgba(112, 117, 121, .16);
      --sk-ok: #4fae4e; --sk-err: #e53935; --sk-warn: #e8a53a;
      --sk-shadow: 0 12px 40px rgba(0, 0, 0, .16), 0 2px 8px rgba(0, 0, 0, .08);
      font: 14px/1.4 Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
      color: var(--sk-fg);
      -webkit-font-smoothing: antialiased;
    }
    html.night #sk-dock, html.theme-dark #sk-dock, html.dark #sk-dock,
    html.night #sk-toast, html.theme-dark #sk-toast, html.dark #sk-toast {
      --sk-surface: var(--surface-color, var(--color-background, #212121));
      --sk-fg: var(--primary-text-color, var(--color-text, #ffffff));
      --sk-muted: var(--secondary-text-color, var(--color-text-secondary, #aaaaaa));
      --sk-surface-2: rgba(255, 255, 255, .06);
      --sk-line: rgba(255, 255, 255, .09);
      --sk-shadow: 0 12px 40px rgba(0, 0, 0, .55), 0 2px 8px rgba(0, 0, 0, .3);
    }
    #sk-fab *, #sk-dock *, #sk-toast * { box-sizing: border-box; }
    #sk-fab[hidden], #sk-dock[hidden], #sk-toast[hidden], #sk-dock [hidden], #sk-fab [hidden] { display: none !important; }
    #sk-dock button, #sk-fab { font: inherit; }

    /* ---- nút nổi ---- */
    #sk-fab {
      position: fixed; z-index: 2147483646; right: 20px; bottom: 20px;
      width: 56px; height: 56px; padding: 0; border: 0; border-radius: 50%;
      background: var(--sk-accent); color: var(--sk-accent-fg); cursor: pointer;
      box-shadow: 0 6px 20px rgba(0, 0, 0, .25); touch-action: none; user-select: none;
      display: grid; place-items: center; transition: transform .15s, box-shadow .15s;
    }
    #sk-fab:hover { transform: scale(1.05); box-shadow: 0 8px 26px rgba(0, 0, 0, .3); }
    #sk-fab:focus-visible { outline: 3px solid var(--sk-accent); outline-offset: 3px; }
    #sk-fab.dragging { transition: none; transform: scale(1.08); cursor: grabbing; }
    #sk-fab .sk-fab-ic { display: grid; place-items: center; grid-area: 1 / 1; }
    #sk-fab .sk-fab-ic svg { width: 24px; height: 24px; }
    #sk-fab .sk-ring { grid-area: 1 / 1; width: 56px; height: 56px; transform: rotate(-90deg); pointer-events: none; }
    #sk-fab .sk-ring circle { fill: none; stroke-width: 3; }
    #sk-fab .sk-ring .track { stroke: rgba(255, 255, 255, .25); }
    #sk-fab .sk-ring .val { stroke: #fff; stroke-linecap: round; transition: stroke-dashoffset .3s; }
    #sk-fab:not(.busy) .sk-ring { display: none; }
    #sk-fab .sk-fab-badge {
      position: absolute; top: -2px; right: -2px; min-width: 20px; height: 20px; padding: 0 6px;
      border-radius: 10px; background: #fff; color: var(--sk-accent); font-size: 11.5px; font-weight: 700;
      display: grid; place-items: center; box-shadow: 0 1px 4px rgba(0, 0, 0, .25);
      font-variant-numeric: tabular-nums;
    }
    #sk-fab.has-error .sk-fab-badge { background: var(--sk-err); color: #fff; }
    #sk-fab.bump { animation: sk-bump .45s ease; }
    @keyframes sk-bump { 30% { transform: scale(1.16); } 60% { transform: scale(.96); } }

    /* ---- dock ---- */
    #sk-dock {
      position: fixed; z-index: 2147483646; right: 20px; bottom: 88px;
      width: min(360px, calc(100vw - 24px)); max-height: min(560px, var(--sk-room, calc(100vh - 110px)));
      display: flex; flex-direction: column; overflow: hidden;
      background: var(--sk-surface); border-radius: 16px; box-shadow: var(--sk-shadow);
      transform-origin: var(--sk-origin, bottom right); animation: sk-pop .16s ease-out;
    }
    @keyframes sk-pop { from { opacity: 0; transform: scale(.94); } }
    .sk-dock-head { display: flex; align-items: center; gap: 6px; padding: 10px 10px 8px 12px; flex-shrink: 0; }
    .sk-tabs { flex: 1; min-width: 0; display: flex; gap: 2px; padding: 3px; border-radius: 12px; background: var(--sk-surface-2); }
    .sk-tab {
      flex: 1; min-width: 0; height: 32px; padding: 0 8px; border: 0; border-radius: 9px;
      background: transparent; color: var(--sk-muted); font-size: 13px; font-weight: 500; cursor: pointer;
      display: inline-flex; align-items: center; justify-content: center; gap: 6px; white-space: nowrap;
      transition: background .15s, color .15s;
    }
    .sk-tab:hover { color: var(--sk-fg); }
    .sk-tab.on { background: var(--sk-surface); color: var(--sk-fg); box-shadow: 0 1px 3px rgba(0, 0, 0, .12); }
    .sk-tab .n {
      min-width: 18px; height: 18px; padding: 0 5px; border-radius: 9px; font-size: 11px; font-weight: 700;
      background: var(--sk-accent); color: var(--sk-accent-fg); display: inline-grid; place-items: center;
      font-variant-numeric: tabular-nums;
    }
    .sk-tab .n:empty { display: none; }
    .sk-icon-btn {
      flex-shrink: 0; width: 34px; height: 34px; padding: 0; border: 0; border-radius: 50%;
      background: transparent; color: var(--sk-muted); cursor: pointer; display: grid; place-items: center;
      transition: background .15s, color .15s;
    }
    .sk-icon-btn:hover { background: var(--sk-surface-2); color: var(--sk-fg); }
    .sk-icon-btn:focus-visible, .sk-tab:focus-visible, .sk-btn:focus-visible, .sk-switch:focus-visible {
      outline: 2px solid var(--sk-accent); outline-offset: 1px;
    }
    .sk-pane { display: flex; flex-direction: column; min-height: 0; flex: 1 1 auto; }
    .sk-scroll { overflow-y: auto; overscroll-behavior: contain; min-height: 0; flex: 1 1 auto; padding: 2px 6px 6px; }
    .sk-foot {
      flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; gap: 10px;
      padding: 8px 12px 10px; border-top: 1px solid var(--sk-line); font-size: 12px; color: var(--sk-muted);
    }
    .sk-empty { padding: 36px 16px; text-align: center; color: var(--sk-muted); font-size: 13px; user-select: none; }
    .sk-empty svg { display: block; margin: 0 auto 10px; width: 36px; height: 36px; opacity: .5; }

    /* ---- nút ---- */
    .sk-btn {
      height: 36px; padding: 0 14px; border: 0; border-radius: 10px; cursor: pointer;
      background: var(--sk-surface-2); color: var(--sk-fg); font-size: 13px; font-weight: 500;
      display: inline-flex; align-items: center; justify-content: center; gap: 8px; white-space: nowrap;
      transition: background .15s, filter .15s;
    }
    .sk-btn:hover:not(:disabled) { filter: brightness(.96); }
    html.night .sk-btn:hover:not(:disabled), html.theme-dark .sk-btn:hover:not(:disabled) { filter: brightness(1.2); }
    .sk-btn:disabled { opacity: .45; cursor: default; }
    .sk-btn.sk-primary { background: var(--sk-accent); color: var(--sk-accent-fg); font-weight: 600; }
    .sk-btn.sk-ghost { background: transparent; color: var(--sk-accent); padding: 0 8px; }
    .sk-btn .sk-btn-ic { display: inline-flex; }
    .sk-btn .sk-btn-ic svg { width: 18px; height: 18px; }

    /* ---- dòng task ---- */
    .sk-task {
      display: grid; grid-template-columns: 38px minmax(0, 1fr) auto; align-items: center; gap: 0 12px;
      padding: 9px 8px; border-radius: 12px; transition: background .15s;
    }
    .sk-task:hover { background: var(--sk-surface-2); }
    .sk-task-ic {
      width: 38px; height: 38px; border-radius: 50%; display: grid; place-items: center;
      background: color-mix(in srgb, var(--sk-accent) 14%, transparent); color: var(--sk-accent);
    }
    .sk-task[data-state="completed"] .sk-task-ic, .sk-task[data-state="handedOff"] .sk-task-ic {
      background: color-mix(in srgb, var(--sk-ok) 16%, transparent); color: var(--sk-ok);
    }
    .sk-task[data-state="failed"] .sk-task-ic, .sk-task[data-state="cancelled"] .sk-task-ic {
      background: color-mix(in srgb, var(--sk-err) 14%, transparent); color: var(--sk-err);
    }
    .sk-task[data-state="paused"] .sk-task-ic { background: color-mix(in srgb, var(--sk-warn) 16%, transparent); color: var(--sk-warn); }
    .sk-task[data-state="skipped"] .sk-task-ic { background: var(--sk-surface-2); color: var(--sk-muted); }
    .sk-task-main { min-width: 0; }
    .sk-task-top { display: flex; align-items: baseline; gap: 8px; }
    .sk-task .name { flex: 1; min-width: 0; font-size: 13.5px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .sk-task .pct { font-size: 12px; color: var(--sk-muted); font-variant-numeric: tabular-nums; }
    .sk-bar { position: relative; height: 3px; margin: 6px 0 5px; border-radius: 2px; background: var(--sk-surface-2); overflow: hidden; }
    .sk-bar-fill { position: absolute; inset: 0 auto 0 0; width: 0; border-radius: 2px; background: var(--sk-accent); transition: width .25s ease; }
    .sk-task[data-state="completed"] .sk-bar, .sk-task[data-state="handedOff"] .sk-bar,
    .sk-task[data-state="skipped"] .sk-bar, .sk-task[data-state="cancelled"] .sk-bar { display: none; }
    .sk-task[data-state="failed"] .sk-bar-fill { background: var(--sk-err); }
    .sk-task[data-state="paused"] .sk-bar-fill { background: var(--sk-warn); }
    .sk-bar.indeterminate .sk-bar-fill { width: 35%; animation: sk-indet 1.1s infinite ease-in-out; }
    @keyframes sk-indet { 0% { left: -35%; } 100% { left: 100%; } }
    .sk-task-meta { display: flex; gap: 6px; flex-wrap: wrap; font-size: 12px; color: var(--sk-muted); font-variant-numeric: tabular-nums; }
    .sk-task-meta .state-label { color: var(--sk-fg); opacity: .8; }
    .sk-task[data-state="failed"] .state-label { color: var(--sk-err); opacity: 1; }
    .sk-err-text { margin: 3px 0 0; font-size: 12px; color: var(--sk-err); }
    .sk-task-acts { display: flex; gap: 2px; }
    .sk-task-acts .sk-icon-btn { width: 30px; height: 30px; }

    /* ---- tab Chọn ---- */
    .sk-sel-body { padding: 4px 12px 10px; }
    .sk-switch {
      width: 100%; min-height: 44px; padding: 0 4px; border: 0; background: transparent; color: var(--sk-fg);
      display: flex; align-items: center; justify-content: space-between; gap: 12px; cursor: pointer;
      font-size: 14px; text-align: left; border-bottom: 1px solid var(--sk-line);
    }
    .sk-switch-track {
      flex-shrink: 0; width: 36px; height: 20px; border-radius: 10px; position: relative;
      background: var(--sk-muted); opacity: .45; transition: background .15s, opacity .15s;
    }
    .sk-switch-knob {
      position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%;
      background: #fff; transition: transform .15s; box-shadow: 0 1px 2px rgba(0, 0, 0, .3);
    }
    .sk-switch.on .sk-switch-track { background: var(--sk-accent); opacity: 1; }
    .sk-switch.on .sk-switch-knob { transform: translateX(16px); }
    .sk-aq-status {
      margin: 10px 0 0; padding: 8px 12px; border-radius: 10px; font-size: 12.5px; font-weight: 500;
      background: color-mix(in srgb, var(--sk-accent) 12%, transparent); color: var(--sk-accent);
      font-variant-numeric: tabular-nums;
    }
    .sk-hint { margin: 10px 0 0; font-size: 12px; color: var(--sk-muted); line-height: 1.6; }
    .sk-hint b { color: var(--sk-fg); font-weight: 600; }
    .sk-actions { display: flex; gap: 8px; margin-top: 12px; }
    .sk-actions .sk-btn { flex: 1; }
    .sk-select-list {
      margin-top: 12px; display: grid; grid-template-columns: repeat(auto-fill, minmax(58px, 1fr)); gap: 6px;
    }
    .sk-thumb { position: relative; aspect-ratio: 1; border-radius: 10px; overflow: hidden; background: var(--sk-surface-2); cursor: pointer; }
    .sk-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .sk-thumb:hover img { filter: brightness(.85); }
    .sk-thumb-n {
      position: absolute; left: 4px; bottom: 4px; padding: 1px 5px; border-radius: 6px;
      background: rgba(0, 0, 0, .55); color: #fff; font: 600 10.5px/1.5 system-ui; pointer-events: none;
    }
    .sk-thumb-rm {
      position: absolute; top: 4px; right: 4px; width: 20px; height: 20px; padding: 0; border: 0; border-radius: 50%;
      background: rgba(0, 0, 0, .55); color: #fff; font: 600 13px/20px system-ui; cursor: pointer; opacity: 0; transition: opacity .15s;
    }
    .sk-thumb:hover .sk-thumb-rm, .sk-thumb-rm:focus-visible { opacity: 1; }
    @media (hover: none) { .sk-thumb-rm { opacity: 1; } }
    #sk-dl-btn { width: 100%; height: 42px; }

    /* ---- tab Thư mục ---- */
    .sk-folder-card {
      margin: 4px 12px 8px; padding: 12px; border-radius: 12px; background: var(--sk-surface-2);
      display: flex; align-items: center; gap: 12px;
    }
    .sk-folder-card > svg { flex-shrink: 0; color: var(--sk-accent); width: 28px; height: 28px; }
    .sk-folder-text { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .sk-folder-name { font-weight: 600; overflow-wrap: anywhere; }
    .sk-folder-name.none { font-weight: 400; color: var(--sk-muted); }
    .sk-folder-sub { font-size: 12px; color: var(--sk-muted); }
    .sk-file-head, .sk-file-msg { font-size: 12px; color: var(--sk-muted); padding: 4px 8px; }
    .sk-file-msg { text-align: center; padding: 20px 8px; }
    .sk-file { padding: 8px; border-radius: 10px; display: flex; flex-direction: column; gap: 1px; min-width: 0; }
    .sk-file:hover { background: var(--sk-surface-2); }
    .sk-file .name { font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .sk-file .meta { font-size: 11.5px; color: var(--sk-muted); font-variant-numeric: tabular-nums; }

    /* ---- thông báo nhỏ cạnh nút nổi ---- */
    #sk-toast {
      position: fixed; z-index: 2147483647; max-width: min(320px, calc(100vw - 24px));
      padding: 10px 14px; border-radius: 12px; background: var(--sk-surface); color: var(--sk-fg);
      box-shadow: var(--sk-shadow); font-size: 13px; animation: sk-pop .16s ease-out; pointer-events: none;
    }

    /* ---- nút gắn vào viewer: icon là SVG riêng, không phụ thuộc icon font của Telegram ---- */
    .sk-queue-icon, .sk-wa-icon { display: inline-flex; align-items: center; justify-content: center; color: #fff; pointer-events: none; }
    .sk-queue-icon svg, .sk-wa-icon svg { width: 22px; height: 22px; display: block; }

    /* ---- ảnh đang chọn trong chat ---- */
    .sk-sel-item {
      position: relative; outline: 3px solid var(--primary-color, var(--color-primary, #3390ec)) !important;
      outline-offset: -3px; border-radius: 6px;
    }
    .sk-sel { outline: 2px dashed var(--primary-color, var(--color-primary, #3390ec)) !important; outline-offset: 2px; border-radius: 8px; }
    .sk-tick {
      position: absolute; top: 6px; left: 6px; z-index: 2; width: 26px; height: 26px; border-radius: 50%;
      background: var(--primary-color, var(--color-primary, #3390ec)); color: #fff; border: 2px solid #fff;
      font: 800 14px/22px system-ui; text-align: center; pointer-events: none; box-shadow: 0 2px 8px rgba(0, 0, 0, .35);
    }
    .sk-tick::before { content: "✓"; }

    /* chat "Hạn chế lưu nội dung": cho bôi đen chữ trong tin nhắn (WebK .bubble.no-forwards, WebA .Message.is-protected) */
    .bubble.no-forwards .bubble-content, .bubble.no-forwards .message, .bubble.no-forwards .translatable-message,
    .Message.is-protected .message-content, .Message.is-protected .text-content {
      -webkit-user-select: text !important; user-select: text !important;
    }
  `;
  document.head.appendChild(style);
};
