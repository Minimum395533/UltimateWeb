---
name: Frame data authoring
description: Data sourcing, staging, and approval policy for Captain Falcon frame data and animations.
---

The editor is development/preview-only. Drafts live in Replit's development PostgreSQL database. Hurtboxes and hitboxes are 3D capsules (two endpoints plus a radius), edited on a side-view X/Y unit grid with numeric Z, traced over still/GIF/WebP references.

Hand-drawn shapes (hurtboxes, hitbox positions, silhouettes) stay drafts until the user explicitly approves the specific animations in chat. Only then are they promoted to source-controlled game data.

Published SmashWiki numbers (damage, frame timings, angles, knockback, stats) go directly into game data, with the source cited. They don't need approval.

Every animation has a fixed frame count; the editor shows exactly that many frames. When the wiki doesn't publish a count (walk/run/idle cycles), research the best available value, mark it unconfirmed, and have the user confirm it.

Animation visuals have no gameplay effect, so approximate drafts are acceptable. The user may still adjust ones that feel off.

**Why:** the user set these rules: development-database staging, chat approval for shapes, wiki numbers in directly with citations, and researched frame counts that the user confirms.

**How to apply:** never promote unapproved shapes. Cite the wiki source for every number. Flag unconfirmed frame counts in the editor.
