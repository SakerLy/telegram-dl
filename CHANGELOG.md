# Changelog

## 1.0

- Dual-panel UI: Downloads (bottom-right) + Batch select (top-right), draggable & collapsible
- Range-fetch engine (HTTP 206, 4 MB chunks, 2 concurrent, 30 s timeout, retry/cancel per task)
- Batch photo select: click, Shift+Click range, and additive "Select all visible" with a tick on each photo
- Auto-queue for videos only: queues each video opened in the viewer and auto-advances to the next slide
- Queue button on viewer topbar + download button on video controls
- Duplicate protection: per-media identity (file id / message id), in-flight dedupe, remembers downloaded media so batch and auto-queue skip them, never overwrites files in the destination folder
- Settings: language (VI / EN), file naming formats, prefix, sequence counter, destination folder, auto subfolders, forget downloaded list
- Auto-update via `@updateURL` / `@downloadURL`
