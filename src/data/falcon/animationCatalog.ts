import { WIKI_MOVE_DATA } from './wikiMoveData.ts';
import type { WikiPageKey } from './wikiMoveData.ts';
import type { PoseId } from './poses.ts';
import type { HurtboxState } from '../../types/frameData.ts';

/**
 * Every Captain Falcon animation the frame editor knows about.
 *
 * Frame counts:
 * - `confirmed: true` counts are SmashWiki "Animation length" values (or a
 *   published universal value on SmashWiki), cited per entry.
 * - `confirmed: false` counts are researched estimates or values from a
 *   secondary source. The editor flags them until the user confirms a count.
 *
 * Hitbox, grab-box, and throw numbers are referenced by SmashWiki page,
 * section, and group, so the numbers live only in `wikiMoveData.ts`.
 */

export const ANIMATION_GROUPS = [
  { id: 'movement', label: 'Movement' },
  { id: 'ground-attacks', label: 'Ground attacks' },
  { id: 'aerials', label: 'Aerials' },
  { id: 'specials', label: 'Specials' },
  { id: 'grabs-throws', label: 'Grabs & throws' },
  { id: 'shield-dodges', label: 'Shield & dodges' },
  { id: 'ledge', label: 'Ledge' },
  { id: 'damage', label: 'Hitstun & knockdown' },
  { id: 'floor', label: 'Getups & floor attacks' },
  { id: 'taunts', label: 'Taunts' },
] as const;

export type AnimationGroupId = (typeof ANIMATION_GROUPS)[number]['id'];

export interface FrameCountSource {
  confirmed: boolean;
  source: 'SmashWiki' | 'UltimateFrameData' | 'Movement physics' | 'Estimate';
  url: string | null;
  note: string;
}

export type FrameWindow = readonly [number, number];

export interface PoseKey {
  frame: number;
  pose: PoseId;
}

export interface WikiShapeSeed {
  page: WikiPageKey;
  section: string;
  group: string;
  frames: readonly FrameWindow[];
}

export interface HurtboxStateSeed {
  frames: FrameWindow;
  state: Exclude<HurtboxState, 'normal'>;
  /** Hurtbox part labels; omit for every hurtbox. */
  parts?: readonly string[];
  source: string;
}

export interface WikiTimingRef {
  page: WikiPageKey;
  section: string;
}

export interface AnimationCatalogEntry {
  id: string;
  label: string;
  group: AnimationGroupId;
  frameCount: number;
  count: FrameCountSource;
  loop: boolean;
  /** Pose keyframes used to seed the default animation. */
  keys: readonly PoseKey[];
  hitboxes?: readonly WikiShapeSeed[];
  grabboxes?: readonly WikiShapeSeed[];
  hurtboxStates?: readonly HurtboxStateSeed[];
  timing?: WikiTimingRef;
  throwData?: WikiTimingRef;
  note?: string;
}

const UFD_URL = 'https://ultimateframedata.com/captain_falcon';

function wiki(page: WikiPageKey, label = 'Animation length'): FrameCountSource {
  return {
    confirmed: true,
    source: 'SmashWiki',
    url: WIKI_MOVE_DATA[page].url,
    note: `SmashWiki timing table: ${label}.`,
  };
}

function estimate(note: string, url: string | null = null): FrameCountSource {
  return { confirmed: false, source: 'Estimate', url, note };
}

function ufd(note: string): FrameCountSource {
  return { confirmed: false, source: 'UltimateFrameData', url: UFD_URL, note };
}

function physics(note: string): FrameCountSource {
  return { confirmed: false, source: 'Movement physics', url: null, note };
}

function hold(pose: PoseId): PoseKey[] {
  return [{ frame: 1, pose }];
}

/** Two-pose loop that returns to the first pose after the last frame. */
function cycle(a: PoseId, b: PoseId, total: number): PoseKey[] {
  return [
    { frame: 1, pose: a },
    { frame: Math.floor(total / 2) + 1, pose: b },
    { frame: total + 1, pose: a },
  ];
}

function moveTo(from: PoseId, to: PoseId, total: number): PoseKey[] {
  return total <= 1 ? hold(to) : [{ frame: 1, pose: from }, { frame: total, pose: to }];
}

/** Base pose, eases into the attack pose for the active window, then recovers. */
function strike(
  base: PoseId,
  attack: PoseId,
  start: number,
  end: number,
  total: number,
): PoseKey[] {
  const keys: PoseKey[] = [];
  if (start > 1) keys.push({ frame: 1, pose: base });
  keys.push({ frame: start, pose: attack });
  if (end > start) keys.push({ frame: end, pose: attack });
  if (total > end) keys.push({ frame: total, pose: base });
  return keys;
}

function seed(
  page: WikiPageKey,
  section: string,
  group: string,
  ...frames: FrameWindow[]
): WikiShapeSeed {
  return { page, section, group, frames };
}

const entries: AnimationCatalogEntry[] = [
  // Movement -----------------------------------------------------------------
  {
    id: 'idle', label: 'Idle', group: 'movement', frameCount: 60, loop: true,
    count: estimate('Idle loop length is not published; 60-frame loop estimate.'),
    keys: cycle('stand', 'breathe', 60),
  },
  {
    id: 'idle-variance', label: 'Idle variance', group: 'movement', frameCount: 100, loop: false,
    count: estimate('Idle variation length is not published; estimate.'),
    keys: [{ frame: 1, pose: 'stand' }, { frame: 30, pose: 'tauntPoint' }, { frame: 70, pose: 'tauntPoint' }, { frame: 100, pose: 'stand' }],
  },
  {
    id: 'walk', label: 'Walk', group: 'movement', frameCount: 60, loop: true,
    count: estimate('Walk cycle length is not published; estimate.'),
    keys: cycle('walk', 'walkSwap', 60),
  },
  {
    id: 'initial-dash', label: 'Initial dash', group: 'movement', frameCount: 15, loop: false,
    count: physics('Matches the training dash length (15 frames).'),
    keys: moveTo('stand', 'run', 15),
  },
  {
    id: 'run', label: 'Run', group: 'movement', frameCount: 30, loop: true,
    count: estimate('Run cycle length is not published; estimate.'),
    keys: cycle('run', 'runSwap', 30),
  },
  {
    id: 'turnaround-dash', label: 'Turnaround dash', group: 'movement', frameCount: 17, loop: false,
    count: physics('Matches the training pivot-dash length (17 frames).'),
    keys: moveTo('crouch', 'run', 17),
  },
  {
    id: 'run-brake', label: 'Run brake', group: 'movement', frameCount: 20, loop: false,
    count: estimate('Skid length is not published; estimate.'),
    keys: [{ frame: 1, pose: 'run' }, { frame: 8, pose: 'crouch' }, { frame: 20, pose: 'stand' }],
  },
  {
    id: 'run-turn', label: 'Run turnaround', group: 'movement', frameCount: 30, loop: false,
    count: estimate('Run turnaround length is not published; estimate.'),
    keys: [{ frame: 1, pose: 'run' }, { frame: 12, pose: 'crouch' }, { frame: 30, pose: 'run' }],
  },
  {
    id: 'standing-turn', label: 'Standing turn', group: 'movement', frameCount: 11, loop: false,
    count: estimate('Standing turnaround length is not published; estimate.'),
    keys: [{ frame: 1, pose: 'stand' }, { frame: 6, pose: 'breathe' }, { frame: 11, pose: 'stand' }],
  },
  {
    id: 'crouch-start', label: 'Crouch (start)', group: 'movement', frameCount: 8, loop: false,
    count: estimate('Crouch transition length is not published; estimate.'),
    keys: moveTo('stand', 'crouch', 8),
  },
  {
    id: 'crouch', label: 'Crouch (hold)', group: 'movement', frameCount: 60, loop: true,
    count: estimate('Crouch loop length is not published; estimate.'),
    keys: hold('crouch'),
  },
  {
    id: 'crouch-end', label: 'Crouch (stand up)', group: 'movement', frameCount: 10, loop: false,
    count: estimate('Crouch exit length is not published; estimate.'),
    keys: moveTo('crouch', 'stand', 10),
  },
  {
    id: 'jump-squat', label: 'Jump squat', group: 'movement', frameCount: 3, loop: false,
    count: {
      confirmed: true,
      source: 'SmashWiki',
      url: 'https://www.ssbwiki.com/Jumpsquat',
      note: 'Every character has a 3-frame jumpsquat in Ultimate (also listed by UltimateFrameData).',
    },
    keys: moveTo('stand', 'crouch', 3),
  },
  {
    id: 'rising', label: 'Jump (rising)', group: 'movement', frameCount: 30, loop: false,
    count: estimate('Jump animation length is not published; estimate.'),
    keys: moveTo('crouch', 'air', 30),
  },
  {
    id: 'double-jump', label: 'Double jump', group: 'movement', frameCount: 40, loop: false,
    count: estimate('Double jump animation length is not published; estimate.'),
    keys: [{ frame: 1, pose: 'air' }, { frame: 14, pose: 'tuck' }, { frame: 40, pose: 'air' }],
  },
  {
    id: 'falling', label: 'Falling', group: 'movement', frameCount: 20, loop: true,
    count: estimate('Fall loop length is not published; estimate.'),
    keys: hold('air'),
  },
  {
    id: 'fast-fall', label: 'Fast fall', group: 'movement', frameCount: 20, loop: true,
    count: estimate('Fast-fall loop length is not published; estimate.'),
    keys: hold('stomp'),
  },
  {
    id: 'landing', label: 'Landing', group: 'movement', frameCount: 4, loop: false,
    count: estimate('Normal landing length estimate; confirm against the game.'),
    keys: moveTo('landing', 'stand', 4),
  },
  {
    id: 'helpless', label: 'Helpless fall', group: 'movement', frameCount: 30, loop: true,
    count: estimate('Helpless (special fall) loop length is not published; estimate.'),
    keys: cycle('tuck', 'air', 30),
  },
  {
    id: 'platform-drop', label: 'Platform drop', group: 'movement', frameCount: 12, loop: false,
    count: estimate('Platform drop animation length is not published; estimate.'),
    keys: moveTo('crouch', 'air', 12),
  },

  // Ground attacks -----------------------------------------------------------
  {
    id: 'jab-1', label: 'Jab 1', group: 'ground-attacks', frameCount: 39, loop: false,
    count: wiki('Neutral_attack/Hit_1'),
    keys: strike('stand', 'punchL', 3, 3, 39),
    hitboxes: [seed('Neutral_attack/Hit_1', '', '', [3, 3])],
    timing: { page: 'Neutral_attack/Hit_1', section: '' },
  },
  {
    id: 'jab-2', label: 'Jab 2', group: 'ground-attacks', frameCount: 36, loop: false,
    count: wiki('Neutral_attack/Hit_2'),
    keys: strike('punchL', 'punchR', 5, 5, 36),
    hitboxes: [seed('Neutral_attack/Hit_2', '', '', [5, 5])],
    timing: { page: 'Neutral_attack/Hit_2', section: '' },
  },
  {
    id: 'jab-3', label: 'Jab 3 (knee)', group: 'ground-attacks', frameCount: 40, loop: false,
    count: wiki('Neutral_attack/Hit_3'),
    keys: strike('punchR', 'kneeL', 6, 7, 40),
    hitboxes: [seed('Neutral_attack/Hit_3', '', '', [6, 7])],
    timing: { page: 'Neutral_attack/Hit_3', section: '' },
  },
  {
    id: 'rapid-jab', label: 'Rapid jab (loop)', group: 'ground-attacks', frameCount: 20, loop: true,
    count: estimate(
      'SmashWiki lists loop points at 2-3 and 19-20 with hits on 5, 7, …, 19 but no loop length; 20-frame estimate.',
      WIKI_MOVE_DATA['Neutral_attack/Infinite'].url,
    ),
    keys: cycle('punchL', 'punchR', 4).concat(
      { frame: 9, pose: 'punchR' }, { frame: 13, pose: 'punchL' }, { frame: 17, pose: 'punchR' }, { frame: 21, pose: 'punchL' },
    ),
    hitboxes: [seed('Neutral_attack/Infinite', '', 'Rapid jab', [5, 5], [7, 7], [9, 9], [11, 11], [13, 13], [15, 15], [17, 17], [19, 19])],
    timing: { page: 'Neutral_attack/Infinite', section: '' },
  },
  {
    id: 'rapid-jab-finisher', label: 'Rapid jab finisher', group: 'ground-attacks', frameCount: 49, loop: false,
    count: wiki('Neutral_attack/Infinite'),
    keys: strike('punchR', 'punchL', 6, 7, 49),
    hitboxes: [seed('Neutral_attack/Infinite', '', 'Rapid jab finisher', [6, 7])],
    timing: { page: 'Neutral_attack/Infinite', section: '' },
  },
  {
    id: 'ftilt-up', label: 'Forward tilt (up)', group: 'ground-attacks', frameCount: 35, loop: false,
    count: wiki('Forward_tilt'),
    keys: strike('stand', 'kickForwardUpR', 7, 10, 35),
    hitboxes: [seed('Forward_tilt', '', 'Angled up or down', [7, 10])],
    timing: { page: 'Forward_tilt', section: '' },
  },
  {
    id: 'ftilt', label: 'Forward tilt', group: 'ground-attacks', frameCount: 35, loop: false,
    count: wiki('Forward_tilt'),
    keys: strike('stand', 'kickForwardR', 7, 10, 35),
    hitboxes: [seed('Forward_tilt', '', 'Unangled', [7, 10])],
    timing: { page: 'Forward_tilt', section: '' },
  },
  {
    id: 'ftilt-down', label: 'Forward tilt (down)', group: 'ground-attacks', frameCount: 35, loop: false,
    count: wiki('Forward_tilt'),
    keys: strike('stand', 'kickForwardDownR', 7, 10, 35),
    hitboxes: [seed('Forward_tilt', '', 'Angled up or down', [7, 10])],
    timing: { page: 'Forward_tilt', section: '' },
  },
  {
    id: 'utilt', label: 'Up tilt', group: 'ground-attacks', frameCount: 56, loop: false,
    count: wiki('Up_tilt'),
    keys: strike('stand', 'kickUpR', 14, 17, 56),
    hitboxes: [seed('Up_tilt', '', '', [14, 17])],
    hurtboxStates: [{ frames: [14, 17], state: 'intangible', parts: ['shinR'], source: 'SmashWiki: lower leg intangible 14-17' }],
    timing: { page: 'Up_tilt', section: '' },
  },
  {
    id: 'dtilt', label: 'Down tilt', group: 'ground-attacks', frameCount: 49, loop: false,
    count: wiki('Down_tilt'),
    keys: strike('crouch', 'kickLowL', 11, 12, 49),
    hitboxes: [seed('Down_tilt', '', '', [11, 12])],
    timing: { page: 'Down_tilt', section: '' },
  },
  {
    id: 'dash-attack', label: 'Dash attack', group: 'ground-attacks', frameCount: 39, loop: false,
    count: wiki('Dash_attack'),
    keys: strike('run', 'dashKick', 7, 16, 39),
    hitboxes: [
      seed('Dash_attack', '', 'Clean hit', [7, 9]),
      seed('Dash_attack', '', 'Late hit', [10, 16]),
    ],
    timing: { page: 'Dash_attack', section: '' },
  },
  {
    id: 'fsmash-up', label: 'Forward smash (up)', group: 'ground-attacks', frameCount: 83, loop: false,
    count: wiki('Forward_smash'),
    keys: [{ frame: 1, pose: 'stand' }, { frame: 12, pose: 'backhandL' }, { frame: 19, pose: 'punchUpL' }, { frame: 22, pose: 'punchUpL' }, { frame: 83, pose: 'stand' }],
    hitboxes: [seed('Forward_smash', '', 'Angled up', [19, 22])],
    timing: { page: 'Forward_smash', section: '' },
  },
  {
    id: 'fsmash', label: 'Forward smash', group: 'ground-attacks', frameCount: 83, loop: false,
    count: wiki('Forward_smash'),
    keys: [{ frame: 1, pose: 'stand' }, { frame: 12, pose: 'backhandL' }, { frame: 19, pose: 'punchL' }, { frame: 22, pose: 'punchL' }, { frame: 83, pose: 'stand' }],
    hitboxes: [seed('Forward_smash', '', 'Angled forward', [19, 22])],
    timing: { page: 'Forward_smash', section: '' },
  },
  {
    id: 'fsmash-down', label: 'Forward smash (down)', group: 'ground-attacks', frameCount: 83, loop: false,
    count: wiki('Forward_smash'),
    keys: [{ frame: 1, pose: 'stand' }, { frame: 12, pose: 'backhandL' }, { frame: 19, pose: 'punchDownL' }, { frame: 22, pose: 'punchDownL' }, { frame: 83, pose: 'stand' }],
    hitboxes: [seed('Forward_smash', '', 'Angled down', [19, 22])],
    timing: { page: 'Forward_smash', section: '' },
  },
  {
    id: 'usmash', label: 'Up smash', group: 'ground-attacks', frameCount: 61, loop: false,
    count: wiki('Up_smash'),
    keys: [{ frame: 1, pose: 'stand' }, { frame: 9, pose: 'crouch' }, { frame: 22, pose: 'kickUpR' }, { frame: 23, pose: 'kickUpR' }, { frame: 28, pose: 'kickUpL' }, { frame: 29, pose: 'kickUpL' }, { frame: 61, pose: 'stand' }],
    hitboxes: [
      seed('Up_smash', '', 'Early hit 1', [22, 22]),
      seed('Up_smash', '', 'Late hit 1', [23, 23]),
      seed('Up_smash', '', 'Hit 2', [28, 29]),
    ],
    hurtboxStates: [
      { frames: [22, 23], state: 'intangible', parts: ['shinR'], source: 'SmashWiki: right lower leg intangible 22-23' },
      { frames: [28, 29], state: 'intangible', parts: ['shinL'], source: 'SmashWiki: left lower leg intangible 28-29' },
    ],
    timing: { page: 'Up_smash', section: '' },
  },
  {
    id: 'dsmash', label: 'Down smash', group: 'ground-attacks', frameCount: 67, loop: false,
    count: wiki('Down_smash'),
    keys: [{ frame: 1, pose: 'stand' }, { frame: 12, pose: 'crouch' }, { frame: 19, pose: 'splitKick' }, { frame: 30, pose: 'splitKick' }, { frame: 67, pose: 'stand' }],
    hitboxes: [
      seed('Down_smash', '', 'Hit 1', [19, 20]),
      seed('Down_smash', '', 'Hit 2', [29, 30]),
    ],
    timing: { page: 'Down_smash', section: '' },
  },

  // Aerials ------------------------------------------------------------------
  {
    id: 'nair', label: 'Neutral air', group: 'aerials', frameCount: 49, loop: false,
    count: wiki('Neutral_aerial'),
    keys: strike('air', 'kickBoth', 7, 15, 49),
    hitboxes: [
      seed('Neutral_aerial', '', 'Hit 1', [7, 8]),
      seed('Neutral_aerial', '', 'Hit 2', [13, 15]),
    ],
    timing: { page: 'Neutral_aerial', section: 'Attack' },
  },
  {
    id: 'nair-landing', label: 'Neutral air landing', group: 'aerials', frameCount: 12, loop: false,
    count: wiki('Neutral_aerial', 'Landing lag animation length'),
    keys: moveTo('landing', 'stand', 12),
    timing: { page: 'Neutral_aerial', section: 'Landing lag' },
  },
  {
    id: 'fair', label: 'Forward air (knee)', group: 'aerials', frameCount: 59, loop: false,
    count: wiki('Forward_aerial'),
    keys: strike('air', 'kneeL', 14, 30, 59),
    hitboxes: [
      seed('Forward_aerial', '', 'Clean hit', [14, 14]),
      seed('Forward_aerial', '', 'Late hit', [15, 30]),
    ],
    timing: { page: 'Forward_aerial', section: 'Attack' },
  },
  {
    id: 'fair-landing', label: 'Forward air landing', group: 'aerials', frameCount: 29, loop: false,
    count: wiki('Forward_aerial', 'Landing lag animation length'),
    keys: moveTo('landing', 'stand', 29),
    timing: { page: 'Forward_aerial', section: 'Landing lag' },
  },
  {
    id: 'bair', label: 'Back air', group: 'aerials', frameCount: 44, loop: false,
    count: wiki('Back_aerial'),
    keys: strike('air', 'backhandL', 10, 15, 44),
    hitboxes: [
      seed('Back_aerial', '', 'Clean hit', [10, 11]),
      seed('Back_aerial', '', 'Late hit', [12, 15]),
    ],
    timing: { page: 'Back_aerial', section: 'Attack' },
  },
  {
    id: 'bair-landing', label: 'Back air landing', group: 'aerials', frameCount: 16, loop: false,
    count: wiki('Back_aerial', 'Landing lag animation length'),
    keys: moveTo('landing', 'stand', 16),
    timing: { page: 'Back_aerial', section: 'Landing lag' },
  },
  {
    id: 'uair', label: 'Up air', group: 'aerials', frameCount: 52, loop: false,
    count: wiki('Up_aerial'),
    keys: strike('air', 'kickOverheadL', 7, 12, 52),
    hitboxes: [
      seed('Up_aerial', '', 'Clean hit', [7, 10]),
      seed('Up_aerial', '', 'Late hit', [11, 12]),
    ],
    timing: { page: 'Up_aerial', section: 'Attack' },
  },
  {
    id: 'uair-landing', label: 'Up air landing', group: 'aerials', frameCount: 16, loop: false,
    count: wiki('Up_aerial', 'Landing lag animation length'),
    keys: moveTo('landing', 'stand', 16),
    timing: { page: 'Up_aerial', section: 'Landing lag' },
  },
  {
    id: 'dair', label: 'Down air (stomp)', group: 'aerials', frameCount: 54, loop: false,
    count: wiki('Down_aerial'),
    keys: [{ frame: 1, pose: 'air' }, { frame: 10, pose: 'tuck' }, { frame: 16, pose: 'stomp' }, { frame: 18, pose: 'stomp' }, { frame: 54, pose: 'air' }],
    hitboxes: [seed('Down_aerial', '', '', [16, 18])],
    timing: { page: 'Down_aerial', section: 'Attack' },
  },
  {
    id: 'dair-landing', label: 'Down air landing', group: 'aerials', frameCount: 19, loop: false,
    count: wiki('Down_aerial', 'Landing lag animation length'),
    keys: moveTo('landing', 'stand', 19),
    timing: { page: 'Down_aerial', section: 'Landing lag' },
  },

  // Specials -----------------------------------------------------------------
  {
    id: 'falcon-punch', label: 'Falcon Punch', group: 'specials', frameCount: 115, loop: false,
    count: wiki('Neutral_special', 'Animation length (grounded)'),
    keys: [{ frame: 1, pose: 'stand' }, { frame: 40, pose: 'backhandL' }, { frame: 53, pose: 'punchR' }, { frame: 57, pose: 'punchR' }, { frame: 115, pose: 'stand' }],
    hitboxes: [seed('Neutral_special', 'Grounded', 'Normal', [53, 57])],
    timing: { page: 'Neutral_special', section: 'Normal' },
  },
  {
    id: 'falcon-punch-reverse', label: 'Falcon Punch (reversed)', group: 'specials', frameCount: 123, loop: false,
    count: wiki('Neutral_special', 'Reversed animation length (grounded)'),
    keys: [{ frame: 1, pose: 'stand' }, { frame: 35, pose: 'backhandL' }, { frame: 62, pose: 'punchR' }, { frame: 66, pose: 'punchR' }, { frame: 123, pose: 'stand' }],
    hitboxes: [seed('Neutral_special', 'Grounded', 'Reversed', [62, 66])],
    timing: { page: 'Neutral_special', section: 'Reversed' },
  },
  {
    id: 'falcon-punch-air', label: 'Falcon Punch (air)', group: 'specials', frameCount: 124, loop: false,
    count: wiki('Neutral_special', 'Animation length (aerial)'),
    keys: [{ frame: 1, pose: 'air' }, { frame: 40, pose: 'backhandL' }, { frame: 53, pose: 'punchR' }, { frame: 57, pose: 'punchR' }, { frame: 124, pose: 'air' }],
    hitboxes: [seed('Neutral_special', 'Aerial', 'Normal', [53, 57])],
    timing: { page: 'Neutral_special', section: 'Normal' },
  },
  {
    id: 'falcon-punch-air-reverse', label: 'Falcon Punch (air, reversed)', group: 'specials', frameCount: 133, loop: false,
    count: wiki('Neutral_special', 'Reversed animation length (aerial)'),
    keys: [{ frame: 1, pose: 'air' }, { frame: 35, pose: 'backhandL' }, { frame: 62, pose: 'punchR' }, { frame: 66, pose: 'punchR' }, { frame: 133, pose: 'air' }],
    hitboxes: [seed('Neutral_special', 'Aerial', 'Reversed', [62, 66])],
    timing: { page: 'Neutral_special', section: 'Reversed' },
  },
  {
    id: 'raptor-boost', label: 'Raptor Boost', group: 'specials', frameCount: 89, loop: false,
    count: wiki('Side_special', 'Grounded animation length'),
    keys: [{ frame: 1, pose: 'stand' }, { frame: 10, pose: 'run' }, { frame: 25, pose: 'runSwap' }, { frame: 89, pose: 'stand' }],
    hitboxes: [seed('Side_special', 'Grounded', 'Inert detector', [10, 25])],
    timing: { page: 'Side_special', section: 'Grounded' },
    note: 'The inert detector starts the hit animation (Raptor Boost hit) on contact.',
  },
  {
    id: 'raptor-boost-hit', label: 'Raptor Boost (hit)', group: 'specials', frameCount: 37, loop: false,
    count: wiki('Side_special', 'Grounded hit animation length'),
    keys: strike('run', 'uppercutL', 5, 7, 37),
    hitboxes: [
      seed('Side_special', 'Grounded', 'Clean hit', [5, 5]),
      seed('Side_special', 'Grounded', 'Late hit', [6, 7]),
    ],
    timing: { page: 'Side_special', section: 'Grounded hit' },
  },
  {
    id: 'raptor-boost-air', label: 'Raptor Boost (air)', group: 'specials', frameCount: 79, loop: false,
    count: wiki('Side_special', 'Aerial animation length'),
    keys: [{ frame: 1, pose: 'air' }, { frame: 19, pose: 'reach' }, { frame: 35, pose: 'reach' }, { frame: 79, pose: 'tuck' }],
    hitboxes: [seed('Side_special', 'Aerial', 'Inert detector', [19, 35])],
    timing: { page: 'Side_special', section: 'Aerial' },
  },
  {
    id: 'raptor-boost-air-hit', label: 'Raptor Boost (air hit)', group: 'specials', frameCount: 64, loop: false,
    count: wiki('Side_special', 'Aerial hit animation length'),
    keys: strike('reach', 'chopDownL', 5, 6, 64),
    hitboxes: [
      seed('Side_special', 'Aerial', 'Clean hit', [5, 5]),
      seed('Side_special', 'Aerial', 'Late hit', [6, 6]),
    ],
    timing: { page: 'Side_special', section: 'Aerial hit' },
  },
  {
    id: 'raptor-boost-landing', label: 'Raptor Boost landing', group: 'specials', frameCount: 32, loop: false,
    count: wiki('Side_special', 'Landing animation length'),
    keys: moveTo('landing', 'stand', 32),
    timing: { page: 'Side_special', section: 'Landing' },
  },
  {
    id: 'falcon-dive', label: 'Falcon Dive', group: 'specials', frameCount: 66, loop: false,
    count: wiki('Up_special', 'Rising animation length'),
    keys: [{ frame: 1, pose: 'crouch' }, { frame: 14, pose: 'reachUp' }, { frame: 30, pose: 'reachUp' }, { frame: 66, pose: 'tuck' }],
    grabboxes: [
      seed('Up_special', '', 'Early grab', [14, 14]),
      seed('Up_special', '', 'Late grab', [15, 30]),
    ],
    timing: { page: 'Up_special', section: 'Rising' },
  },
  {
    id: 'falcon-dive-catch', label: 'Falcon Dive (catch & throw)', group: 'specials', frameCount: 71, loop: false,
    count: wiki('Up_special', 'Throw animation length'),
    keys: [{ frame: 1, pose: 'reachUp' }, { frame: 2, pose: 'reach' }, { frame: 17, pose: 'punchUpL' }, { frame: 71, pose: 'tuck' }],
    hitboxes: [seed('Up_special', '', 'Hit 1', [2, 3])],
    timing: { page: 'Up_special', section: 'Throw' },
    throwData: { page: 'Up_special', section: '' },
  },
  {
    id: 'falcon-dive-landing', label: 'Falcon Dive landing', group: 'specials', frameCount: 35, loop: false,
    count: wiki('Up_special', 'Landing animation length'),
    keys: moveTo('landing', 'stand', 35),
    timing: { page: 'Up_special', section: 'Landing' },
  },
  {
    id: 'falcon-kick', label: 'Falcon Kick', group: 'specials', frameCount: 83, loop: false,
    count: wiki('Down_special', 'Animation length (ground)'),
    keys: strike('stand', 'slideKickR', 13, 33, 83),
    hitboxes: [
      seed('Down_special', 'Grounded', 'Clean hit', [13, 16]),
      seed('Down_special', 'Grounded', 'Mid hit', [17, 23]),
      seed('Down_special', 'Grounded', 'Late hit', [24, 33]),
    ],
    timing: { page: 'Down_special', section: 'Grounded' },
    note: 'Going off a ledge shortens it to 66 frames (SmashWiki).',
  },
  {
    id: 'falcon-kick-air', label: 'Falcon Kick (air)', group: 'specials', frameCount: 57, loop: false,
    count: wiki('Down_special', 'Aerial animation length'),
    keys: strike('air', 'kickDownL', 14, 27, 57),
    hitboxes: [
      seed('Down_special', 'Aerial', 'Clean hit', [14, 18]),
      seed('Down_special', 'Aerial', 'Mid hit', [19, 24]),
      seed('Down_special', 'Aerial', 'Late hit', [25, 27]),
    ],
    timing: { page: 'Down_special', section: 'Aerial' },
  },
  {
    id: 'falcon-kick-landing', label: 'Falcon Kick landing', group: 'specials', frameCount: 36, loop: false,
    count: wiki('Down_special', 'Landing animation length'),
    keys: moveTo('landing', 'stand', 36),
    hitboxes: [seed('Down_special', 'Aerial', 'Landing', [1, 2])],
    timing: { page: 'Down_special', section: 'Landing' },
  },
  {
    id: 'falcon-kick-wall-crash', label: 'Falcon Kick wall crash', group: 'specials', frameCount: 53, loop: false,
    count: wiki('Down_special', 'Wall crash animation length'),
    keys: moveTo('hurt', 'stand', 53),
    timing: { page: 'Down_special', section: 'Wall crash' },
  },

  // Grabs & throws -----------------------------------------------------------
  {
    id: 'grab', label: 'Standing grab', group: 'grabs-throws', frameCount: 39, loop: false,
    count: wiki('Grab', 'Standing grab animation length'),
    keys: strike('stand', 'reach', 6, 7, 39),
    grabboxes: [seed('Grab', 'Standing Grab', '', [6, 7])],
    timing: { page: 'Grab', section: 'Standing grab' },
  },
  {
    id: 'dash-grab', label: 'Dash grab', group: 'grabs-throws', frameCount: 51, loop: false,
    count: wiki('Grab', 'Dash grab animation length'),
    keys: strike('run', 'reach', 9, 10, 51),
    grabboxes: [seed('Grab', 'Dash Grab', '', [9, 10])],
    timing: { page: 'Grab', section: 'Dash grab' },
  },
  {
    id: 'pivot-grab', label: 'Pivot grab', group: 'grabs-throws', frameCount: 45, loop: false,
    count: wiki('Grab', 'Pivot grab animation length'),
    keys: strike('stand', 'reachBack', 10, 11, 45),
    grabboxes: [seed('Grab', 'Pivot Grab', '', [10, 11])],
    timing: { page: 'Grab', section: 'Pivot grab' },
  },
  {
    id: 'grab-hold', label: 'Grab hold', group: 'grabs-throws', frameCount: 30, loop: true,
    count: estimate('Grab hold loop length is not published; estimate.'),
    keys: hold('reach'),
  },
  {
    id: 'pummel', label: 'Pummel', group: 'grabs-throws', frameCount: 13, loop: false,
    count: wiki('Pummel'),
    keys: strike('reach', 'punchL', 1, 1, 13),
    hitboxes: [seed('Pummel', '', '', [1, 1])],
    timing: { page: 'Pummel', section: '' },
  },
  {
    id: 'fthrow', label: 'Forward throw', group: 'grabs-throws', frameCount: 57, loop: false,
    count: wiki('Forward_throw'),
    keys: strike('reach', 'punchL', 11, 13, 57),
    hitboxes: [seed('Forward_throw', '', 'Hitbox', [11, 12])],
    hurtboxStates: [{ frames: [1, 13], state: 'invincible', source: 'SmashWiki: invincibility 1-13' }],
    timing: { page: 'Forward_throw', section: '' },
    throwData: { page: 'Forward_throw', section: '' },
  },
  {
    id: 'bthrow', label: 'Back throw', group: 'grabs-throws', frameCount: 78, loop: false,
    count: wiki('Back_throw'),
    keys: strike('reach', 'kickForwardR', 12, 13, 78),
    hitboxes: [seed('Back_throw', '', 'Hitbox', [12, 12])],
    hurtboxStates: [{ frames: [1, 13], state: 'invincible', source: 'SmashWiki: invincibility 1-13' }],
    timing: { page: 'Back_throw', section: '' },
    throwData: { page: 'Back_throw', section: '' },
  },
  {
    id: 'uthrow', label: 'Up throw', group: 'grabs-throws', frameCount: 64, loop: false,
    count: wiki('Up_throw'),
    keys: strike('reach', 'uppercutL', 12, 14, 64),
    hitboxes: [seed('Up_throw', '', 'Hitbox', [12, 13])],
    hurtboxStates: [{ frames: [1, 14], state: 'invincible', source: 'SmashWiki: invincibility 1-14' }],
    timing: { page: 'Up_throw', section: '' },
    throwData: { page: 'Up_throw', section: '' },
  },
  {
    id: 'dthrow', label: 'Down throw', group: 'grabs-throws', frameCount: 65, loop: false,
    count: wiki('Down_throw'),
    keys: strike('reach', 'crouch', 21, 21, 65),
    hurtboxStates: [{ frames: [1, 21], state: 'invincible', source: 'SmashWiki: invincibility 1-21' }],
    timing: { page: 'Down_throw', section: '' },
    throwData: { page: 'Down_throw', section: '' },
  },
  {
    id: 'grabbed', label: 'Being held', group: 'grabs-throws', frameCount: 30, loop: true,
    count: estimate('Held (captured) loop length is not published; estimate.'),
    keys: hold('hurt'),
  },

  // Shield & dodges ----------------------------------------------------------
  {
    id: 'shield-up', label: 'Shield (raise)', group: 'shield-dodges', frameCount: 7, loop: false,
    count: estimate('Shield raise animation length is not published; estimate.'),
    keys: moveTo('stand', 'guard', 7),
  },
  {
    id: 'shield-hold', label: 'Shield (hold)', group: 'shield-dodges', frameCount: 30, loop: true,
    count: estimate('Shield hold loop length is not published; estimate.'),
    keys: hold('guard'),
  },
  {
    id: 'shield-drop', label: 'Shield drop', group: 'shield-dodges', frameCount: 11, loop: false,
    count: ufd('Shield drop: 11 frames (universal).'),
    keys: moveTo('guard', 'stand', 11),
  },
  {
    id: 'spot-dodge', label: 'Spot dodge', group: 'shield-dodges', frameCount: 26, loop: false,
    count: ufd('Spot dodge total 26 frames (listed as 21/26).'),
    keys: [{ frame: 1, pose: 'guard' }, { frame: 4, pose: 'crouch' }, { frame: 17, pose: 'crouch' }, { frame: 26, pose: 'stand' }],
    hurtboxStates: [{ frames: [3, 17], state: 'intangible', source: 'UltimateFrameData: intangible 3-17' }],
  },
  {
    id: 'roll-forward', label: 'Forward roll', group: 'shield-dodges', frameCount: 30, loop: false,
    count: ufd('Forward roll total 30 frames.'),
    keys: [{ frame: 1, pose: 'guard' }, { frame: 6, pose: 'tuck' }, { frame: 15, pose: 'tuck' }, { frame: 30, pose: 'stand' }],
    hurtboxStates: [{ frames: [4, 15], state: 'intangible', source: 'UltimateFrameData: intangible 4-15' }],
  },
  {
    id: 'roll-back', label: 'Back roll', group: 'shield-dodges', frameCount: 35, loop: false,
    count: ufd('Back roll total 35 frames.'),
    keys: [{ frame: 1, pose: 'guard' }, { frame: 7, pose: 'tuck' }, { frame: 16, pose: 'tuck' }, { frame: 35, pose: 'stand' }],
    hurtboxStates: [{ frames: [5, 16], state: 'intangible', source: 'UltimateFrameData: intangible 5-16' }],
  },
  {
    id: 'air-dodge', label: 'Air dodge (neutral)', group: 'shield-dodges', frameCount: 42, loop: false,
    count: ufd('Neutral air dodge total 42 frames.'),
    keys: [{ frame: 1, pose: 'air' }, { frame: 5, pose: 'tuck' }, { frame: 30, pose: 'tuck' }, { frame: 42, pose: 'air' }],
    hurtboxStates: [{ frames: [3, 30], state: 'intangible', source: 'UltimateFrameData: intangible 3-30' }],
  },
  {
    id: 'air-dodge-directional', label: 'Air dodge (directional)', group: 'shield-dodges', frameCount: 72, loop: false,
    count: ufd('Left/right air dodge total 72 frames (down 62, diagonal down 66, diagonal up 85, up 94).'),
    keys: [{ frame: 1, pose: 'air' }, { frame: 5, pose: 'tuck' }, { frame: 21, pose: 'tuck' }, { frame: 72, pose: 'air' }],
    hurtboxStates: [{ frames: [3, 21], state: 'intangible', source: 'UltimateFrameData: intangible 3-21' }],
  },

  // Ledge --------------------------------------------------------------------
  {
    id: 'ledge-catch', label: 'Ledge grab', group: 'ledge', frameCount: 8, loop: false,
    count: estimate('Ledge catch animation length is not published; estimate.'),
    keys: moveTo('reachUp', 'ledgeHang', 8),
  },
  {
    id: 'ledge-hang', label: 'Ledge hang', group: 'ledge', frameCount: 60, loop: true,
    count: estimate('Ledge hang loop length is not published; estimate.'),
    keys: hold('ledgeHang'),
  },
  {
    id: 'ledge-getup', label: 'Ledge getup', group: 'ledge', frameCount: 33, loop: false,
    count: estimate('Neutral ledge getup length for Captain Falcon is not published; estimate.'),
    keys: [{ frame: 1, pose: 'ledgeHang' }, { frame: 16, pose: 'ledgeClimb' }, { frame: 33, pose: 'stand' }],
  },
  {
    id: 'ledge-attack', label: 'Ledge attack', group: 'ledge', frameCount: 57, loop: false,
    count: wiki('Edge_attack'),
    keys: [{ frame: 1, pose: 'ledgeHang' }, { frame: 14, pose: 'ledgeClimb' }, { frame: 22, pose: 'kickForwardR' }, { frame: 24, pose: 'kickForwardR' }, { frame: 57, pose: 'stand' }],
    hitboxes: [seed('Edge_attack', '', '', [22, 24])],
    hurtboxStates: [{ frames: [1, 24], state: 'intangible', source: 'SmashWiki: intangibility 1-24 (first ledge grab)' }],
    timing: { page: 'Edge_attack', section: '' },
  },
  {
    id: 'ledge-roll', label: 'Ledge roll', group: 'ledge', frameCount: 49, loop: false,
    count: estimate('Ledge roll length for Captain Falcon is not published; estimate.'),
    keys: [{ frame: 1, pose: 'ledgeHang' }, { frame: 18, pose: 'tuck' }, { frame: 34, pose: 'tuck' }, { frame: 49, pose: 'stand' }],
  },
  {
    id: 'ledge-jump', label: 'Ledge jump', group: 'ledge', frameCount: 20, loop: false,
    count: estimate('Ledge jump length for Captain Falcon is not published; estimate.'),
    keys: [{ frame: 1, pose: 'ledgeHang' }, { frame: 10, pose: 'reachUp' }, { frame: 20, pose: 'air' }],
  },
  {
    id: 'ledge-drop', label: 'Ledge drop', group: 'ledge', frameCount: 6, loop: false,
    count: estimate('Ledge release length is not published; estimate.'),
    keys: moveTo('ledgeHang', 'air', 6),
  },

  // Hitstun & knockdown ------------------------------------------------------
  {
    id: 'hitstun-ground', label: 'Flinch (grounded)', group: 'damage', frameCount: 30, loop: false,
    count: estimate('Flinch animation length is not published; hitstun itself varies per hit.'),
    keys: [{ frame: 1, pose: 'hurt' }, { frame: 30, pose: 'stand' }],
  },
  {
    id: 'hitstun-air', label: 'Flinch (air)', group: 'damage', frameCount: 30, loop: false,
    count: estimate('Aerial flinch animation length is not published; hitstun itself varies per hit.'),
    keys: [{ frame: 1, pose: 'hurt' }, { frame: 30, pose: 'air' }],
  },
  {
    id: 'tumble', label: 'Tumble', group: 'damage', frameCount: 40, loop: true,
    count: estimate('Tumble loop length is not published; estimate.'),
    keys: cycle('tumble', 'tuck', 40),
  },
  {
    id: 'knockdown', label: 'Missed tech bounce', group: 'damage', frameCount: 26, loop: false,
    count: estimate('Knockdown bounce length is not published; estimate.'),
    keys: moveTo('tumble', 'lyingUp', 26),
  },
  {
    id: 'trip', label: 'Trip', group: 'damage', frameCount: 26, loop: false,
    count: estimate('Trip animation length is not published; estimate.'),
    keys: moveTo('stand', 'lyingDown', 26),
  },

  // Getups & floor attacks ---------------------------------------------------
  {
    id: 'lying-face-up', label: 'Lying (face up)', group: 'floor', frameCount: 60, loop: true,
    count: estimate('Lying loop length is not published; estimate.'),
    keys: hold('lyingUp'),
  },
  {
    id: 'lying-face-down', label: 'Lying (face down)', group: 'floor', frameCount: 60, loop: true,
    count: estimate('Lying loop length is not published; estimate.'),
    keys: hold('lyingDown'),
  },
  {
    id: 'getup-face-up', label: 'Getup (face up)', group: 'floor', frameCount: 30, loop: false,
    count: estimate('Neutral getup length is not published for Captain Falcon; estimate.'),
    keys: [{ frame: 1, pose: 'lyingUp' }, { frame: 15, pose: 'crouch' }, { frame: 30, pose: 'stand' }],
  },
  {
    id: 'getup-face-down', label: 'Getup (face down)', group: 'floor', frameCount: 30, loop: false,
    count: estimate('Neutral getup length is not published for Captain Falcon; estimate.'),
    keys: [{ frame: 1, pose: 'lyingDown' }, { frame: 15, pose: 'crouch' }, { frame: 30, pose: 'stand' }],
  },
  {
    id: 'getup-roll-forward', label: 'Getup roll (forward)', group: 'floor', frameCount: 35, loop: false,
    count: estimate('Getup roll length is not published for Captain Falcon; estimate.'),
    keys: [{ frame: 1, pose: 'lyingUp' }, { frame: 12, pose: 'tuck' }, { frame: 24, pose: 'tuck' }, { frame: 35, pose: 'stand' }],
  },
  {
    id: 'getup-roll-back', label: 'Getup roll (back)', group: 'floor', frameCount: 35, loop: false,
    count: estimate('Getup roll length is not published for Captain Falcon; estimate.'),
    keys: [{ frame: 1, pose: 'lyingUp' }, { frame: 12, pose: 'tuck' }, { frame: 24, pose: 'tuck' }, { frame: 35, pose: 'stand' }],
  },
  {
    id: 'tech-in-place', label: 'Tech in place', group: 'floor', frameCount: 26, loop: false,
    count: estimate('Neutral tech length estimate; confirm against the game.', 'https://www.ssbwiki.com/Tech'),
    keys: [{ frame: 1, pose: 'tumble' }, { frame: 6, pose: 'crouch' }, { frame: 26, pose: 'stand' }],
    hurtboxStates: [{ frames: [1, 20], state: 'intangible', source: 'Estimate: tech intangibility 1-20 (unconfirmed)' }],
  },
  {
    id: 'tech-roll-forward', label: 'Tech roll (forward)', group: 'floor', frameCount: 40, loop: false,
    count: estimate('Tech roll length estimate; confirm against the game.', 'https://www.ssbwiki.com/Tech'),
    keys: [{ frame: 1, pose: 'tumble' }, { frame: 8, pose: 'tuck' }, { frame: 24, pose: 'tuck' }, { frame: 40, pose: 'stand' }],
    hurtboxStates: [{ frames: [1, 20], state: 'intangible', source: 'Estimate: tech intangibility 1-20 (unconfirmed)' }],
  },
  {
    id: 'tech-roll-back', label: 'Tech roll (back)', group: 'floor', frameCount: 40, loop: false,
    count: estimate('Tech roll length estimate; confirm against the game.', 'https://www.ssbwiki.com/Tech'),
    keys: [{ frame: 1, pose: 'tumble' }, { frame: 8, pose: 'tuck' }, { frame: 24, pose: 'tuck' }, { frame: 40, pose: 'stand' }],
    hurtboxStates: [{ frames: [1, 20], state: 'intangible', source: 'Estimate: tech intangibility 1-20 (unconfirmed)' }],
  },
  {
    id: 'floor-attack-back', label: 'Getup attack (face up)', group: 'floor', frameCount: 49, loop: false,
    count: wiki('Floor_attack_(back)'),
    keys: [{ frame: 1, pose: 'lyingUp' }, { frame: 14, pose: 'slideKickR' }, { frame: 21, pose: 'slideKickR' }, { frame: 49, pose: 'stand' }],
    hitboxes: [seed('Floor_attack_(back)', '', 'Both hits', [14, 15], [20, 21])],
    hurtboxStates: [{ frames: [1, 21], state: 'intangible', source: 'SmashWiki: intangibility 1-21' }],
    timing: { page: 'Floor_attack_(back)', section: '' },
  },
  {
    id: 'floor-attack-front', label: 'Getup attack (face down)', group: 'floor', frameCount: 49, loop: false,
    count: wiki('Floor_attack_(front)'),
    keys: [{ frame: 1, pose: 'lyingDown' }, { frame: 14, pose: 'splitKick' }, { frame: 25, pose: 'splitKick' }, { frame: 49, pose: 'stand' }],
    hitboxes: [
      seed('Floor_attack_(front)', '', 'Hit 1', [14, 15]),
      seed('Floor_attack_(front)', '', 'Hit 2', [24, 25]),
    ],
    hurtboxStates: [{ frames: [1, 25], state: 'intangible', source: 'SmashWiki: intangibility 1-25' }],
    timing: { page: 'Floor_attack_(front)', section: '' },
  },
  {
    id: 'floor-attack-trip', label: 'Getup attack (trip)', group: 'floor', frameCount: 49, loop: false,
    count: wiki('Floor_attack_(trip)'),
    keys: [{ frame: 1, pose: 'lyingDown' }, { frame: 18, pose: 'splitKick' }, { frame: 24, pose: 'splitKick' }, { frame: 49, pose: 'stand' }],
    hitboxes: [
      seed('Floor_attack_(trip)', '', 'Hit 1', [18, 19]),
      seed('Floor_attack_(trip)', '', 'Hit 2', [23, 24]),
    ],
    hurtboxStates: [{ frames: [1, 7], state: 'intangible', source: 'SmashWiki: intangibility 1-7' }],
    timing: { page: 'Floor_attack_(trip)', section: '' },
    note: 'SmashWiki lists interruptible on frame 50, after the 49-frame animation ends.',
  },

  // Taunts -------------------------------------------------------------------
  {
    id: 'taunt-up', label: 'Up taunt', group: 'taunts', frameCount: 80, loop: false,
    count: estimate('Taunt length is not published on SmashWiki; estimate.'),
    keys: [{ frame: 1, pose: 'stand' }, { frame: 20, pose: 'tauntSalute' }, { frame: 60, pose: 'tauntSalute' }, { frame: 80, pose: 'stand' }],
  },
  {
    id: 'taunt-side', label: 'Side taunt', group: 'taunts', frameCount: 100, loop: false,
    count: estimate('Taunt length is not published on SmashWiki; estimate.'),
    keys: [{ frame: 1, pose: 'stand' }, { frame: 25, pose: 'tauntPoint' }, { frame: 75, pose: 'tauntPoint' }, { frame: 100, pose: 'stand' }],
  },
  {
    id: 'taunt-down', label: 'Down taunt', group: 'taunts', frameCount: 90, loop: false,
    count: estimate('Taunt length is not published on SmashWiki; estimate.'),
    keys: [{ frame: 1, pose: 'stand' }, { frame: 20, pose: 'punchUpL' }, { frame: 70, pose: 'punchUpL' }, { frame: 90, pose: 'stand' }],
  },
];

export const ANIMATION_CATALOG: readonly AnimationCatalogEntry[] = entries;

const catalogById = new Map(entries.map((entry) => [entry.id, entry]));

export function getCatalogEntry(animationId: string): AnimationCatalogEntry | undefined {
  return catalogById.get(animationId);
}

export function isCatalogAnimationId(value: unknown): value is string {
  return typeof value === 'string' && catalogById.has(value);
}

/** The frame count the editor must show: a user-confirmed count wins over the catalog. */
export function getEffectiveFrameCount(
  entry: AnimationCatalogEntry,
  confirmedCount?: number | null,
): number {
  return confirmedCount ?? entry.frameCount;
}
