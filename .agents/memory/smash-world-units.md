---
name: Smash world units
description: User-provided modern Smash scale and frame-based dimensions for gameplay physics.
---

Use the modern Smash reference supplied by the user: one world unit (`u`) is approximately 0.1 meters. Gameplay size is tuned for feel and balance, not literal real-world or source-game dimensions. Dynamic rates are measured per gameplay frame: velocity in `u/frame`, and acceleration, gravity, and friction/deceleration in `u/frame²` (friction acts negatively). The original Smash scale and the Melee hitbox exception are historical context, not the default scale for new gameplay data.

**Why:** The user identified the unit system as foundational to making the game playable and supplied the modern Smash scale.

**How to apply:** Keep positions, geometry, and collision sizes in `u`; name frame-based rates explicitly; make conversions explicit, and avoid tying simulation behavior to rendering frame rate.
