# Gameplay Units

## World scale

Use `u` (world units) for positions, distances, radii, and hitbox/hurtbox
offsets. The project uses the modern Smash reference scale:

**1 u ≈ 0.1 meters**

This is an approximate reference for authoring and comparison. Character,
stage, and collision dimensions should be selected for gameplay feel and
balance, not to reproduce real-world or source-game measurements. Do not mix
the historical original-Smash scale or Melee's legacy hitbox scale into modern
gameplay data without a named conversion.

## Gameplay time

A gameplay frame is one discrete simulation update. It is not a browser render
frame; rendering at a different rate must not change simulation results. The
unit layer does not assume a particular simulation rate.

Use these dimensions for dynamic values:

- Velocity and speed: `u / gameplay frame`
- Acceleration and gravity: `u / gameplay frame²`
- Friction/deceleration: signed `u / gameplay frame²`; apply the sign opposite
  the direction of travel

The `src/physics/units.ts` module is the source of truth for branded scalar and
vector types, constructors, and conversions. Converting a per-frame rate to
meters per second (or per-second-squared) requires an explicit simulation frame
rate. Keep that rate at the simulation boundary rather than deriving it from
the render loop.
