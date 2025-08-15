# Update History – WPlace Auto Image Bot

This English changelog mirrors and adapts the Portuguese file `ATUALIZAÇÕES.md`, adding a concise summary and clearer labels for an international audience.

## Legend
- [NEW] New functionality
- [IMPROVEMENT] Enhancement / refinement
- [FIX] Bug fix or behavior correction
- [INTERNAL] Internal refactor / structural change (no direct user‑visible effect)

---
## Initial Refactored Version (commit 8cba59f – reconstructed base)
Major deliverables:
- [NEW] Fully redesigned floating, responsive panel (desktop + mobile).
- [NEW] Multi‑language support (pt / en) with centralized dictionary.
- [NEW] Light / Dark themes via dynamic CSS variables.
- [NEW] Pixel list builder with filters:
  - Skip transparent pixels (threshold `TRANSPARENCY_THRESHOLD`).
  - Skip white pixels (`WHITE_THRESHOLD`).
  - Configurable ordering: Left→Right, Right→Left, Random.
- [NEW] Painting speed modes: safe / normal / fast (affect inter‑pixel delay).
- [NEW] Automatic extraction of available palette colors from the site, ignoring blocked colors (IDs 0 & 5).
- [NEW] Nearest‑color mapping using Euclidean RGB distance.
- [NEW] Resize modal:
  - Keep aspect ratio option.
  - Real‑time preview (no smoothing for pixel art fidelity).
- [NEW] Painting loop with:
  - Charge management (reads `/me`).
  - Automatic cooldown waiting when charges are exhausted.
  - Approximate remaining time (ETA) calculation.
  - Periodic progress reporting.
- [NEW] Real‑time stats: progress %, pixels (painted/total), charges, ETA, pixels/sec (10s rolling window).
- [NEW] Styled toast notification system.
- [NEW] Collapsible settings and minimizable panel.
- [NEW] Core buttons: start bot, upload image, resize, set position, begin painting, stop, rebuild pixels.
- [IMPROVEMENT] Modular separation (utils, API, image processing, UI, painting loop).
- [IMPROVEMENT] Balanced use of timers / rAF for smoother UI.

---
## Drag Rework – First Attempt (commit 2d42ad66)
Objective: migrate from separate mouse + touch listeners to unified Pointer Events.

Result:
- [FIX] Introduced unified pointer handling, right→left position conversion, boundary clamp.
- [REGRESSION] Critical UI interaction handlers were truncated (omitted for brevity), breaking button clicks (panel movable but not interactive).

---
## Drag Rework – Full Correction (commit c3c7b84)
Restorations & enhancements:
- [FIX] Restored ALL interface event handlers (buttons, collapse, minimize, etc.).
- [FIX] Drag area properly limited to header without swallowing button clicks (checks `.no-drag`).
- [FIX] Ensured pointer capture released on `pointerup` / `pointercancel` to avoid lost subsequent clicks.
- [IMPROVEMENT] Single one‑time conversion from right to left positioning after first frame (prevents initial jump).
- [IMPROVEMENT] Position clamping with margin to keep panel on‑screen.
- [IMPROVEMENT] Full painting loop logic preserved (no lost functionality).
- [INTERNAL] Documented drag system and refactored header comments.

---
## Current State (post c3c7b84)
Active & stable features:
- Smooth drag (desktop + mobile) via Pointer Events.
- Fully functional panel (all buttons responsive).
- Translations, theming, resizing, pixel filtering, list building, automated painting.
- Dynamic stats & ETA updates.

---
## Suggested Next Improvements (Not Yet Implemented)
Ordered backlog proposal with suggested GitHub labels:
1. Persist panel position (label: enhancement, ux)
2. Add Reset Position button (enhancement, ux)
3. Persist theme, language, and preferences (enhancement, settings)
4. Drag movement threshold >4px to avoid accidental drags (ux)
5. Granular pause/resume storing current pixel index (enhancement)
6. Overlay alignment preview (feature, visualization)
7. Divergence checker – repaint only mismatched pixels (performance, feature)
8. Completion timestamp estimate (enhancement)
9. Expose internal API (e.g., `window.WPlaceBot`) (developer-experience)
10. Queue support for multiple images (feature)

---
## Technical Notes
- Color distance: simple Euclidean RGB (potential future weighting by luminance or CIEDE2000 if warranted).
- ETA: heuristic; assumes cycles of available charges plus cooldown.
- Performance metric: rolling 10s window for px/s.
- Drag: pointer capture prevents loss of events if pointer leaves header while moving.

---
## Credits
- Original logic foundation: @Eduardo854833 (reconstructed base).
- Current refactor & enhancements: this sequence of commits.

---
## Relevant Commit History
- 8cba59f – Refactored base version (UI + core features)
- 2d42ad66 – First unified drag attempt (introduced regression)
- c3c7b84 – Full drag correction & restoration

---
If you would like these backlog items turned into individual GitHub Issues, just ask.