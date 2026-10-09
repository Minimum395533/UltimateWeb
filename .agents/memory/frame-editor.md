---
name: Frame editor rules
description: Durable authoring rules for the dev-only animation frame editor and the approved-data export.
---

- Frame counts are locked per animation. The catalog count applies until the user confirms a different count in the editor.
- Never discard drawn frames without an explicit confirmation. This covers drafts longer than the lock, count changes (stored frames are reused before any copies are added), and DB migrations (archive old drafts, don't delete them).
  **Why:** the user said "for a 3 frame animation, there should be 3 editable frames, no exception." A code review also rejected an earlier version that silently dropped stored frames and duplicate legacy drafts.
- Approval export runs only from the CLI, and only after the user approves specific animations in chat. Never add an in-editor export button.
  **Why:** the user asked for chat approval before anything becomes game data.
- Training uses the playtest draft first, then approved data, then a seeded default that is labeled as a default.
- The game's global button style (uppercase, heavy) leaks into dev screens. Dev tools must reset it locally.
