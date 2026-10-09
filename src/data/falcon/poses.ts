/**
 * Approximate side-view skeleton poses for Captain Falcon, used only to seed
 * draft animations (default hurtboxes, silhouettes, and rough hitbox
 * positions). Units are Smash world units, facing right (+x), with the origin
 * at the character's feet. These are starting points for hand-editing, not
 * gameplay data.
 */

export const JOINT_NAMES = [
  'head', 'neck', 'hip',
  'shoulderL', 'elbowL', 'handL',
  'shoulderR', 'elbowR', 'handR',
  'hipL', 'kneeL', 'footL',
  'hipR', 'kneeR', 'footR',
] as const;

export type JointName = (typeof JOINT_NAMES)[number];
export type Joint2 = readonly [number, number];
export type Pose = Record<JointName, Joint2>;

/** Depth (z) for each limb side; the left side is nearer the camera. */
export const LEFT_DEPTH = 1.6;
export const RIGHT_DEPTH = -1.6;

const STAND: Pose = {
  head: [0.5, 16.4],
  neck: [0.3, 14.2],
  hip: [0, 8.8],
  shoulderL: [0.6, 13.6],
  elbowL: [1.4, 10.9],
  handL: [2, 8.6],
  shoulderR: [-0.2, 13.6],
  elbowR: [-0.6, 10.9],
  handR: [-0.4, 8.4],
  hipL: [0.4, 8.4],
  kneeL: [1.2, 4.6],
  footL: [0.9, 0.6],
  hipR: [-0.4, 8.4],
  kneeR: [-0.6, 4.6],
  footR: [-0.9, 0.6],
};

function pose(overrides: Partial<Pose>, base: Pose = STAND): Pose {
  return { ...base, ...overrides };
}

function shift(base: Pose, dx: number, dy: number): Pose {
  const result = {} as Record<JointName, Joint2>;
  for (const name of JOINT_NAMES) {
    result[name] = [base[name][0] + dx, base[name][1] + dy];
  }
  return result;
}

const CROUCH = pose({
  head: [2.2, 11.6], neck: [1.6, 9.8], hip: [-0.4, 5],
  shoulderL: [1.9, 9.4], elbowL: [3.2, 7.2], handL: [3.8, 5],
  shoulderR: [1.1, 9.4], elbowR: [1.6, 7], handR: [2.4, 4.8],
  hipL: [0, 4.8], kneeL: [2.8, 3.4], footL: [1.2, 0.5],
  hipR: [-0.8, 4.8], kneeR: [-1.6, 2.8], footR: [-2, 0.5],
});

const RUN = pose({
  head: [2.8, 15.6], neck: [2, 13.8], hip: [0, 8.6],
  shoulderL: [2.2, 13.2], elbowL: [3.6, 11.2], handL: [5, 12.6],
  shoulderR: [1.4, 13.2], elbowR: [-0.6, 11.2], handR: [-2.6, 9.6],
  hipL: [0.3, 8.3], kneeL: [3.2, 5.8], footL: [2.4, 1.8],
  hipR: [-0.3, 8.3], kneeR: [-1.6, 4.6], footR: [-4.2, 2.8],
});

const RUN_SWAP = pose({
  shoulderL: [2.2, 13.2], elbowL: [0.4, 11.2], handL: [-1.6, 9.6],
  shoulderR: [1.4, 13.2], elbowR: [3, 11.2], handR: [4.4, 12.6],
  hipL: [0.3, 8.3], kneeL: [-1.2, 4.6], footL: [-3.8, 2.8],
  hipR: [-0.3, 8.3], kneeR: [2.8, 5.8], footR: [2, 1.8],
}, RUN);

const WALK = pose({
  head: [1, 16.3], neck: [0.7, 14.1],
  elbowL: [2, 11], handL: [3, 9],
  elbowR: [-1.2, 11], handR: [-1.8, 8.8],
  kneeL: [2, 4.8], footL: [2.6, 0.6],
  kneeR: [-1.2, 4.6], footR: [-2.4, 0.8],
});

const WALK_SWAP = pose({
  elbowL: [0.2, 11], handL: [-0.6, 8.8],
  elbowR: [1, 11], handR: [2, 9],
  kneeL: [-0.8, 4.6], footL: [-2, 0.8],
  kneeR: [1.6, 4.8], footR: [2.2, 0.6],
}, WALK);

const AIR = pose({
  hip: [0, 9.4],
  elbowL: [2.2, 12.2], handL: [3.4, 10.8],
  elbowR: [-1.6, 12], handR: [-2.6, 10.8],
  hipL: [0.4, 9], kneeL: [2.4, 6.2], footL: [1.4, 2.4],
  hipR: [-0.4, 9], kneeR: [0.4, 5.6], footR: [-0.8, 2],
});

const TUCK = pose({
  head: [1.6, 15.2], neck: [1, 13.4], hip: [-0.4, 9],
  shoulderL: [1.3, 12.8], elbowL: [3, 11], handL: [3.6, 8.6],
  shoulderR: [0.5, 12.8], elbowR: [2, 10.6], handR: [2.8, 8.4],
  hipL: [0, 8.8], kneeL: [3, 9.4], footL: [1.4, 6],
  hipR: [-0.8, 8.8], kneeR: [2.2, 8.6], footR: [0.4, 5.4],
});

const PUNCH_L = pose({
  head: [2, 15.8], neck: [1.4, 13.9], hip: [0, 8.4],
  shoulderL: [1.8, 13.4], elbowL: [4.8, 13.2], handL: [7.8, 13],
  shoulderR: [0.8, 13.4], elbowR: [-1, 11.6], handR: [-1.2, 9.6],
  hipL: [0.4, 8], kneeL: [3.2, 4.8], footL: [4.6, 0.6],
  hipR: [-0.4, 8], kneeR: [-2, 4.4], footR: [-4.6, 0.6],
});

const PUNCH_R = pose({
  shoulderR: [1.6, 13.4], elbowR: [4.6, 13.2], handR: [7.8, 13],
  shoulderL: [2.2, 13.4], elbowL: [1.8, 11.4], handL: [0.8, 9.8],
}, PUNCH_L);

const REACH = pose({
  head: [1.8, 15.6], neck: [1.2, 13.8], hip: [0, 8.4],
  shoulderL: [1.6, 13.2], elbowL: [4.6, 11.8], handL: [7.6, 10.2],
  shoulderR: [0.8, 13.2], elbowR: [3.8, 11.4], handR: [6.8, 9.8],
  hipL: [0.4, 8], kneeL: [2.8, 4.8], footL: [3.4, 0.6],
  hipR: [-0.4, 8], kneeR: [-1.6, 4.6], footR: [-3.2, 0.6],
});

const REACH_UP = pose({
  head: [1.2, 16.6], neck: [0.8, 14.6],
  shoulderL: [1.2, 14], elbowL: [3.4, 16.4], handL: [5, 18.8],
  shoulderR: [0.4, 14], elbowR: [2.6, 16.6], handR: [4.4, 19],
}, AIR);

const UPPERCUT_L = pose({
  shoulderL: [1.8, 13.4], elbowL: [4.4, 14.8], handL: [5.6, 17.6],
}, PUNCH_L);

const BACKHAND_L = pose({
  head: [-0.6, 15.8], neck: [-0.2, 13.9],
  shoulderL: [-0.6, 13.4], elbowL: [-3.8, 13.4], handL: [-7, 13],
  shoulderR: [0.2, 13.4], elbowR: [1.6, 11.8], handR: [2.4, 10],
}, AIR);

const KICK_FORWARD_R = pose({
  head: [-0.8, 15.8], neck: [-0.6, 13.8], hip: [-0.4, 8.8],
  shoulderL: [-0.2, 13.2], elbowL: [-1.4, 11], handL: [-0.6, 9],
  shoulderR: [-1, 13.2], elbowR: [-2.6, 11.4], handR: [-3.2, 9.6],
  hipL: [-0.2, 8.4], kneeL: [-0.8, 4.6], footL: [-1, 0.6],
  hipR: [0, 8.8], kneeR: [4.4, 9], footR: [8.6, 8.6],
});

const DASH_KICK = pose({
  head: [-0.4, 15.4], hip: [0.4, 9],
  hipR: [0.8, 9], kneeR: [5.4, 9.6], footR: [10.2, 9.2],
  hipL: [0, 8.8], kneeL: [-1.2, 5.6], footL: [-0.4, 2],
}, KICK_FORWARD_R);

const KICK_LOW_L = pose({
  head: [-0.6, 11.2], neck: [-0.4, 9.6], hip: [-0.6, 5.2],
  shoulderL: [-0.2, 9.2], elbowL: [-1.4, 7.2], handL: [-2.4, 5.4],
  shoulderR: [-1, 9.2], elbowR: [-2.2, 7], handR: [-3, 5],
  hipL: [0, 5], kneeL: [4.4, 3], footL: [8.4, 1.2],
  hipR: [-1.2, 5], kneeR: [-2.2, 2.4], footR: [-2.4, 0.4],
});

const KICK_UP_R = pose({
  head: [-1.4, 15.6], neck: [-1, 13.6], hip: [-0.4, 8.6],
  shoulderL: [-0.6, 13], elbowL: [-2, 11.2], handL: [-1.8, 9.2],
  shoulderR: [-1.4, 13], elbowR: [-3, 11.6], handR: [-3.8, 9.8],
  hipL: [-0.6, 8.2], kneeL: [-1, 4.6], footL: [-1, 0.6],
  hipR: [0, 8.6], kneeR: [2.6, 13], footR: [3.6, 18.4],
});

const KNEE_L = pose({
  hipL: [0.4, 9], kneeL: [4.6, 10.2], footL: [2.4, 6.2],
  hipR: [-0.4, 9], kneeR: [-1.6, 6], footR: [-3.4, 3.4],
}, AIR);

const KICK_BOTH = pose({
  hipR: [-0.2, 9.2], kneeR: [3.6, 8.4], footR: [7.2, 7.2],
  hipL: [0.2, 9.2], kneeL: [3.2, 7.2], footL: [6.6, 5.6],
}, AIR);

const KICK_OVERHEAD_L = pose({
  head: [-1.2, 15.2], neck: [-0.8, 13.4],
  hipL: [0.2, 9.2], kneeL: [2.6, 13.4], footL: [1.6, 18.6],
  hipR: [-0.4, 9], kneeR: [-1.8, 6], footR: [-2, 2.4],
}, AIR);

const STOMP = pose({
  head: [0.6, 17.2], neck: [0.4, 15], hip: [0, 9.6],
  shoulderL: [0.8, 14.4], elbowL: [2.6, 15.6], handL: [3.4, 17.4],
  shoulderR: [0, 14.4], elbowR: [-1.8, 15.4], handR: [-2.6, 17.2],
  hipL: [0.4, 9.2], kneeL: [0.8, 5], footL: [0.6, -0.6],
  hipR: [-0.4, 9.2], kneeR: [-0.4, 5], footR: [-0.6, -0.6],
});

const SPLIT_KICK = pose({
  head: [0, 12.4], neck: [0, 10.6], hip: [0, 5.6],
  shoulderL: [0.4, 10], elbowL: [1.6, 8], handL: [1.2, 6],
  shoulderR: [-0.4, 10], elbowR: [-1.6, 8], handR: [-1.2, 6],
  hipL: [0.2, 5.4], kneeL: [-3.8, 4], footL: [-7.6, 2.2],
  hipR: [-0.2, 5.4], kneeR: [4, 4.2], footR: [7.8, 2.4],
});

const KICK_DOWN_L = pose({
  hipL: [0.4, 9], kneeL: [4, 6.4], footL: [7.4, 3],
  hipR: [-0.4, 9], kneeR: [1, 6.6], footR: [-0.6, 3.8],
}, AIR);

const SLIDE_KICK_R = pose({
  head: [-3.4, 8.6], neck: [-2.6, 7.2], hip: [0, 4.2],
  shoulderL: [-2.2, 6.8], elbowL: [-3.8, 4.4], handL: [-5, 2.4],
  shoulderR: [-2.8, 6.8], elbowR: [-4.2, 4.6], handR: [-5.6, 2.6],
  hipL: [0, 4], kneeL: [2.4, 4.4], footL: [2, 1.2],
  hipR: [0.2, 4.2], kneeR: [4.6, 3], footR: [8.8, 1.6],
});

const LYING_UP = pose({
  head: [-7.4, 1.8], neck: [-5.4, 1.6], hip: [0, 1.6],
  shoulderL: [-4.8, 1.8], elbowL: [-2.6, 2.2], handL: [-0.6, 2],
  shoulderR: [-4.8, 1.4], elbowR: [-2.8, 1], handR: [-0.8, 1],
  hipL: [0.2, 1.8], kneeL: [3.8, 2.6], footL: [7.4, 1.4],
  hipR: [0.2, 1.4], kneeR: [3.8, 1.2], footR: [7.6, 0.8],
});

const LYING_DOWN = pose({
  head: [7.4, 1.8], neck: [5.4, 1.6], hip: [0, 1.6],
  shoulderL: [4.8, 1.8], elbowL: [2.6, 2.2], handL: [0.6, 2],
  shoulderR: [4.8, 1.4], elbowR: [2.8, 1], handR: [0.8, 1],
  hipL: [-0.2, 1.8], kneeL: [-3.8, 2.6], footL: [-7.4, 1.4],
  hipR: [-0.2, 1.4], kneeR: [-3.8, 1.2], footR: [-7.6, 0.8],
});

const GUARD = pose({
  head: [1, 14.4], neck: [0.8, 12.6], hip: [-0.4, 7.4],
  shoulderL: [1.2, 12], elbowL: [2.8, 10.6], handL: [2.6, 12.8],
  shoulderR: [0.4, 12], elbowR: [2, 10.2], handR: [1.8, 12.4],
  hipL: [0, 7.2], kneeL: [2, 3.8], footL: [1.6, 0.5],
  hipR: [-0.8, 7.2], kneeR: [-1.4, 3.6], footR: [-2, 0.5],
});

const HURT = pose({
  head: [-1.8, 15.6], neck: [-1.2, 13.8], hip: [0.4, 8.8],
  shoulderL: [-0.8, 13.2], elbowL: [0.8, 14.4], handL: [2.2, 15.8],
  shoulderR: [-1.6, 13.2], elbowR: [-3.2, 12.6], handR: [-4.4, 13.8],
  hipL: [0.8, 8.4], kneeL: [2.4, 5], footL: [2.6, 1.2],
  hipR: [0, 8.4], kneeR: [-0.4, 4.8], footR: [-1.4, 1],
});

const TUMBLE = pose({
  head: [-2.6, 10.6], neck: [-1.6, 10.4], hip: [1.6, 8.6],
  shoulderL: [-1.2, 11], elbowL: [-1, 13.6], handL: [0.4, 15.2],
  shoulderR: [-1.4, 10.2], elbowR: [-3.4, 12], handR: [-4.4, 14],
  hipL: [1.8, 9], kneeL: [4.6, 11], footL: [7, 9.2],
  hipR: [1.4, 8.4], kneeR: [4.2, 6.4], footR: [6.8, 7.6],
});

/** Hanging from a ledge at the origin, body below the ledge, facing the stage (+x). */
const LEDGE_HANG = pose({
  handL: [0.4, 0.2], elbowL: [-0.6, -2.4], shoulderL: [-1.4, -4.4],
  handR: [0, 0.2], elbowR: [-1, -2.6], shoulderR: [-1.8, -4.4],
  head: [-2, -2.6], neck: [-1.8, -4.8], hip: [-2.4, -10],
  hipL: [-2, -10.4], kneeL: [-1.6, -14.2], footL: [-2, -18],
  hipR: [-2.8, -10.4], kneeR: [-2.6, -14.2], footR: [-3, -18],
});

const TAUNT_SALUTE = pose({
  shoulderL: [0.6, 13.6], elbowL: [2.6, 14.8], handL: [1.6, 17],
}, STAND);

const TAUNT_POINT = pose({
  shoulderL: [0.8, 13.6], elbowL: [3.6, 14.6], handL: [6.4, 15.8],
  shoulderR: [-0.2, 13.6], elbowR: [-1.4, 11.8], handR: [-0.2, 10.2],
}, STAND);

function mirrorX(base: Pose): Pose {
  const result = {} as Record<JointName, Joint2>;
  for (const name of JOINT_NAMES) {
    result[name] = [-base[name][0], base[name][1]];
  }
  return result;
}

const KICK_FORWARD_UP_R = pose({ kneeR: [4, 10.8], footR: [7.4, 13.4] }, KICK_FORWARD_R);
const KICK_FORWARD_DOWN_R = pose({ kneeR: [4.2, 7.2], footR: [7.8, 4.8] }, KICK_FORWARD_R);
const PUNCH_UP_L = pose({ elbowL: [4.4, 14.8], handL: [7, 16.6] }, PUNCH_L);
const PUNCH_DOWN_L = pose({ elbowL: [4.4, 11.4], handL: [7.2, 9.4] }, PUNCH_L);
const KICK_UP_L = pose({
  hipL: [0, 8.6], kneeL: [2.4, 13.2], footL: [3, 18.6],
  hipR: [-0.6, 8.2], kneeR: [-1, 4.6], footR: [-1, 0.6],
}, KICK_UP_R);
const CHOP_DOWN_L = pose({
  shoulderL: [1.8, 13.4], elbowL: [4.6, 11.6], handL: [7.2, 9.2],
}, AIR);

export const POSES = {
  stand: STAND,
  breathe: shift(pose({ head: [0.5, 16.2], neck: [0.3, 14], shoulderL: [0.6, 13.4], shoulderR: [-0.2, 13.4] }), 0, 0),
  kickForwardUpR: KICK_FORWARD_UP_R,
  kickForwardDownR: KICK_FORWARD_DOWN_R,
  punchUpL: PUNCH_UP_L,
  punchDownL: PUNCH_DOWN_L,
  kickUpL: KICK_UP_L,
  chopDownL: CHOP_DOWN_L,
  reachBack: mirrorX(REACH),
  crouch: CROUCH,
  walk: WALK,
  walkSwap: WALK_SWAP,
  run: RUN,
  runSwap: RUN_SWAP,
  air: AIR,
  tuck: TUCK,
  punchL: PUNCH_L,
  punchR: PUNCH_R,
  reach: REACH,
  reachUp: REACH_UP,
  uppercutL: UPPERCUT_L,
  backhandL: BACKHAND_L,
  kickForwardR: KICK_FORWARD_R,
  dashKick: DASH_KICK,
  kickLowL: KICK_LOW_L,
  kickUpR: KICK_UP_R,
  kneeL: KNEE_L,
  kickBoth: KICK_BOTH,
  kickOverheadL: KICK_OVERHEAD_L,
  stomp: STOMP,
  splitKick: SPLIT_KICK,
  kickDownL: KICK_DOWN_L,
  slideKickR: SLIDE_KICK_R,
  lyingUp: LYING_UP,
  lyingDown: LYING_DOWN,
  guard: GUARD,
  hurt: HURT,
  tumble: TUMBLE,
  ledgeHang: LEDGE_HANG,
  ledgeClimb: shift(CROUCH, 0, 0),
  tauntSalute: TAUNT_SALUTE,
  tauntPoint: TAUNT_POINT,
  landing: shift(pose({ hip: [-0.2, 6.4], hipL: [0.2, 6.2], hipR: [-0.6, 6.2], kneeL: [2.2, 3.6], kneeR: [-1.4, 3.2], head: [1.2, 13.8], neck: [0.9, 11.8], shoulderL: [1.2, 11.2], shoulderR: [0.4, 11.2], elbowL: [2.6, 9], elbowR: [-0.2, 9], handL: [3.6, 7.2], handR: [0.6, 7] }), 0, 0),
} satisfies Record<string, Pose>;

export type PoseId = keyof typeof POSES;

export function lerpPose(a: Pose, b: Pose, t: number): Pose {
  const result = {} as Record<JointName, Joint2>;
  for (const name of JOINT_NAMES) {
    result[name] = [
      a[name][0] + (b[name][0] - a[name][0]) * t,
      a[name][1] + (b[name][1] - a[name][1]) * t,
    ];
  }
  return result;
}
