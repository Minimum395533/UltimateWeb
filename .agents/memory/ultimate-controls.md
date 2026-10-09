---
name: Ultimate controls rules
description: How Ultimate's button settings and stick sensitivity actually work, per SmashWiki.
---

Bindings work like Ultimate's: each physical button is assigned an action (Attack, Special, Jump, Shield, Grab, Smash, Tilt, taunts, none), not the other way round. The control stick and Start/Pause can't be rebound. Other Settings has Rumble, A+B Smash, Stick Jump, and Stick Sensitivity (Low/Normal/High).

Stick sensitivity only changes the stick-flick windows. Low/Normal/High gives 5/6/7 frames for forward smash, 3/4/5 for up/down smash, and 7/8/9 for smashed side specials. It does not affect dash, stick jump, fast fall, or platform drop detection.

**Why:** the user wants the controls to match Smash Ultimate. SmashWiki (Controls, Control stick pages) documents these rules. The original prototype wrongly let sensitivity affect dashing.

**How to apply:** keep dash detection independent of sensitivity. Use three sensitivity levels, not a slider.
