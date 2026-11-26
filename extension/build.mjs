// Ghép src/*.js thành content.js: node build.mjs
// Content script không dùng được import/export, và nạp nhiều file vào main world thì biến dùng chung lọt ra
// phạm vi toàn cục của trang Telegram. Nên các file nằm chung một IIFE, theo đúng thứ tự dưới đây:
// file sau dùng được mọi thứ file trước khai báo; lệnh chạy ngay khi nạp (loadStore, BlobRegistry.install…)
// chỉ được dùng thứ đã khai báo ở trên nó.
import { readFileSync, writeFileSync } from "node:fs";

const ORDER = [
  "config.js",
  "strings.js",
  "core.js",
  "blob-registry.js",
  "hls.js",
  "engine.js",
  "files.js",
  "tasks.js",
  "styles.js",
  "panels.js",
  "viewer.js",
  "select.js",
  "autoqueue.js",
  "ext-sync.js",
  "app.js", // gọi boot() ở cuối
];

const here = (p) => new URL(p, import.meta.url);
const { version } = JSON.parse(readFileSync(here("manifest.json"), "utf8"));
const body = ORDER
  .map((f) => `// ---- src/${f} ----\n${readFileSync(here(`src/${f}`), "utf8").trimEnd()}\n`)
  .join("\n");

const out = `// Telegram Media Downloader — extension ${version} (Manifest V3).
// FILE SINH RA, ĐỪNG SỬA TRỰC TIẾP: sửa trong src/ rồi chạy "node build.mjs".
// Chạy trong main world của trang (manifest: "world": "MAIN") để gắn được vào URL.createObjectURL, fetch, XHR của Telegram.
// SPDX-License-Identifier: GPL-3.0-or-later

/* global FileSystemFileHandle */

(function () {
"use strict";

const SCRIPT_VERSION = ${JSON.stringify(version)}; // lấy từ manifest.json

${body}})();
`;
writeFileSync(here("content.js"), out);
console.log(`content.js ${version}: ${ORDER.length} file, ${out.split("\n").length} dòng`);
