---
name: Frame data authoring
description: Data staging and approval policy for movement frame data.
---

The first frame-data tool phase is for Captain Falcon movement hurtboxes and visual silhouettes across all current movement states; offensive attacks are deferred. The editor is development/preview-only, and drafts belong in Replit's development PostgreSQL database. Use two 3D capsule endpoints plus radius, a side-view X/Y unit grid, numeric Z per endpoint, and still/GIF frame references.

Do not move draft data into source-controlled gameplay data until the user explicitly approves the specific records in chat.

**Why:** the user specified development-database staging, all movement states without attacks, and chat approval as the gate for making data definitive.

**How to apply:** retain unapproved data as drafts; promote only the named, approved clips into source data.
