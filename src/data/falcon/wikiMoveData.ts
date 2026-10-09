/**
 * Captain Falcon (SSBU) move data transcribed from SmashWiki.
 * Retrieved 2026-10-09. Each page lists its source URL; every value
 * below is the published wiki number (hitbox tables, grab boxes, throw data,
 * and timing). Offsets are bone-local, exactly as SmashWiki lists them.
 * A "[a, b]" offset is an extended hitbox that stretches from a to b.
 */

export const SMASHWIKI_RETRIEVED_ON = '2026-10-09';
export const SMASHWIKI_FALCON_BASE_URL = 'https://www.ssbwiki.com/Captain_Falcon_(SSBU)';

export type WikiOffset = number | readonly [number, number];

export interface WikiHitbox {
  section: string;
  group: string;
  id: number;
  part: number;
  rehitRate: number;
  damage: number;
  shieldDamage: number;
  angle: number;
  facing: string;
  baseKnockback: number;
  knockbackGrowth: number;
  fixedKnockback: number;
  setWeight: boolean;
  radius: number;
  bone: string;
  offsetX: WikiOffset;
  offsetY: WikiOffset;
  offsetZ: WikiOffset;
  hitlagMultiplier: number;
  sdiMultiplier: number;
  tripChance: number;
  clang: boolean;
  rebound: boolean;
  effect: string;
  attackType: string;
  hitsGrounded: boolean;
  hitsAerial: boolean;
  soundLevel: string;
  soundKind: string;
  direct: boolean;
  blockable: boolean;
  reflectable: boolean;
  absorbable: boolean;
  flinchless: boolean;
  noGfx: boolean;
  heedless: boolean;
  shieldstunMultiplier: number;
  extraShieldstunFrames: number;
}

export interface WikiGrabbox {
  section: string;
  group: string;
  id: number;
  radius: number;
  bone: string;
  offsetX: WikiOffset;
  offsetY: WikiOffset;
  offsetZ: WikiOffset;
  hitsGrounded: boolean;
  hitsAerial: boolean;
}

export interface WikiThrow {
  section: string;
  kind: string;
  id: number;
  damage: number;
  angle: number;
  facing: string;
  baseKnockback: number;
  knockbackGrowth: number;
  fixedKnockback: number;
  hitlagMultiplier: number;
  effect: string;
  attackType: string;
  soundLevel: string;
  soundKind: string;
}

export interface WikiTiming {
  section: string;
  label: string;
  value: string;
}

export interface WikiMovePage {
  url: string;
  hitboxes: readonly WikiHitbox[];
  grabboxes: readonly WikiGrabbox[];
  throws: readonly WikiThrow[];
  timing: readonly WikiTiming[];
}

export const WIKI_PAGE_KEYS = [
  'Back_aerial',
  'Back_throw',
  'Dash_attack',
  'Down_aerial',
  'Down_smash',
  'Down_special',
  'Down_throw',
  'Down_tilt',
  'Edge_attack',
  'Floor_attack_(back)',
  'Floor_attack_(front)',
  'Floor_attack_(trip)',
  'Forward_aerial',
  'Forward_smash',
  'Forward_throw',
  'Forward_tilt',
  'Grab',
  'Neutral_aerial',
  'Neutral_attack',
  'Neutral_attack/Hit_1',
  'Neutral_attack/Hit_2',
  'Neutral_attack/Hit_3',
  'Neutral_attack/Infinite',
  'Neutral_special',
  'Pummel',
  'Side_special',
  'Up_aerial',
  'Up_smash',
  'Up_special',
  'Up_throw',
  'Up_tilt'
] as const;

export type WikiPageKey = (typeof WIKI_PAGE_KEYS)[number];

export const WIKI_MOVE_DATA: Record<WikiPageKey, WikiMovePage> = {
  'Back_aerial': {
    url: `${SMASHWIKI_FALCON_BASE_URL}/Back_aerial`,
    hitboxes: [
      {"section":"","group":"Clean hit","id":0,"part":0,"rehitRate":0,"damage":13,"shieldDamage":0,"angle":361,"facing":"Backward","baseKnockback":27,"knockbackGrowth":97,"fixedKnockback":0,"setWeight":false,"radius":5.5,"bone":"arml","offsetX":4,"offsetY":0,"offsetZ":0,"hitlagMultiplier":1,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":true,"effect":"Normal","attackType":"Hand","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"L","soundKind":"Punch","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"","group":"Clean hit","id":1,"part":0,"rehitRate":0,"damage":13,"shieldDamage":0,"angle":361,"facing":"Backward","baseKnockback":27,"knockbackGrowth":97,"fixedKnockback":0,"setWeight":false,"radius":4,"bone":"shoulderl","offsetX":3.2,"offsetY":0,"offsetZ":0,"hitlagMultiplier":1,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":true,"effect":"Normal","attackType":"Hand","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"L","soundKind":"Punch","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"","group":"Clean hit","id":2,"part":0,"rehitRate":0,"damage":13,"shieldDamage":0,"angle":361,"facing":"Backward","baseKnockback":27,"knockbackGrowth":97,"fixedKnockback":0,"setWeight":false,"radius":4,"bone":"shoulderl","offsetX":-0.8,"offsetY":0,"offsetZ":0,"hitlagMultiplier":1,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":true,"effect":"Normal","attackType":"Hand","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"L","soundKind":"Punch","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"","group":"Late hit","id":0,"part":0,"rehitRate":0,"damage":8,"shieldDamage":0,"angle":361,"facing":"Backward","baseKnockback":27,"knockbackGrowth":97,"fixedKnockback":0,"setWeight":false,"radius":5.5,"bone":"arml","offsetX":4,"offsetY":0,"offsetZ":0,"hitlagMultiplier":1,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":true,"effect":"Normal","attackType":"Hand","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"M","soundKind":"Punch","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"","group":"Late hit","id":1,"part":0,"rehitRate":0,"damage":8,"shieldDamage":0,"angle":361,"facing":"Backward","baseKnockback":27,"knockbackGrowth":97,"fixedKnockback":0,"setWeight":false,"radius":4,"bone":"shoulderl","offsetX":3.2,"offsetY":0,"offsetZ":0,"hitlagMultiplier":1,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":true,"effect":"Normal","attackType":"Hand","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"M","soundKind":"Punch","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"","group":"Late hit","id":2,"part":0,"rehitRate":0,"damage":8,"shieldDamage":0,"angle":361,"facing":"Backward","baseKnockback":27,"knockbackGrowth":97,"fixedKnockback":0,"setWeight":false,"radius":4,"bone":"shoulderl","offsetX":-0.8,"offsetY":0,"offsetZ":0,"hitlagMultiplier":1,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":true,"effect":"Normal","attackType":"Hand","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"M","soundKind":"Punch","shieldstunMultiplier":1,"extraShieldstunFrames":0},
    ],
    grabboxes: [
    ],
    throws: [
    ],
    timing: [
      {"section":"Attack","label":"Initial autocancel","value":"1-4"},
      {"section":"Attack","label":"Clean hit","value":"10-11"},
      {"section":"Attack","label":"Late hit","value":"12-15"},
      {"section":"Attack","label":"Ending autocancel","value":"19-"},
      {"section":"Attack","label":"Interruptible","value":"36"},
      {"section":"Attack","label":"Animation length","value":"44"},
      {"section":"Landing lag","label":"Interruptible","value":"11"},
      {"section":"Landing lag","label":"Animation length","value":"16"},
    ],
  },
  'Back_throw': {
    url: `${SMASHWIKI_FALCON_BASE_URL}/Back_throw`,
    hitboxes: [
      {"section":"","group":"Hitbox","id":0,"part":0,"rehitRate":0,"damage":3.5,"shieldDamage":0,"angle":110,"facing":"Forward","baseKnockback":70,"knockbackGrowth":100,"fixedKnockback":0,"setWeight":false,"radius":5,"bone":"footr","offsetX":6.8,"offsetY":-1.2,"offsetZ":1.5,"hitlagMultiplier":0.6,"sdiMultiplier":1,"tripChance":0,"clang":false,"rebound":false,"effect":"Normal","attackType":"Foot","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"L","soundKind":"Kick","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"","group":"Hitbox","id":1,"part":0,"rehitRate":0,"damage":3.5,"shieldDamage":0,"angle":110,"facing":"Forward","baseKnockback":70,"knockbackGrowth":100,"fixedKnockback":0,"setWeight":false,"radius":4.5,"bone":"kneer","offsetX":0,"offsetY":0,"offsetZ":1,"hitlagMultiplier":0.6,"sdiMultiplier":1,"tripChance":0,"clang":false,"rebound":false,"effect":"Normal","attackType":"Foot","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"L","soundKind":"Kick","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"","group":"Hitbox","id":2,"part":0,"rehitRate":0,"damage":3.5,"shieldDamage":0,"angle":110,"facing":"Forward","baseKnockback":70,"knockbackGrowth":100,"fixedKnockback":0,"setWeight":false,"radius":4,"bone":"hip","offsetX":0,"offsetY":0,"offsetZ":0,"hitlagMultiplier":0.6,"sdiMultiplier":1,"tripChance":0,"clang":false,"rebound":false,"effect":"Normal","attackType":"Foot","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"L","soundKind":"Kick","shieldstunMultiplier":1,"extraShieldstunFrames":0},
    ],
    grabboxes: [
    ],
    throws: [
      {"section":"","kind":"Throw","id":0,"damage":4,"angle":135,"facing":"Forward","baseKnockback":60,"knockbackGrowth":130,"fixedKnockback":0,"hitlagMultiplier":0,"effect":"Normal","attackType":"Throwing","soundLevel":"S","soundKind":"None"},
      {"section":"","kind":"Break","id":0,"damage":3,"angle":361,"facing":"Forward","baseKnockback":60,"knockbackGrowth":100,"fixedKnockback":0,"hitlagMultiplier":0,"effect":"Normal","attackType":"Throwing","soundLevel":"S","soundKind":"None"},
    ],
    timing: [
      {"section":"","label":"Invincibility","value":"1-13"},
      {"section":"","label":"Hitbox","value":"12"},
      {"section":"","label":"Turnaround","value":"13"},
      {"section":"","label":"Throw release","value":"13"},
      {"section":"","label":"Interruptible","value":"46"},
      {"section":"","label":"Animation length","value":"78"},
    ],
  },
  'Dash_attack': {
    url: `${SMASHWIKI_FALCON_BASE_URL}/Dash_attack`,
    hitboxes: [
      {"section":"","group":"Clean hit","id":0,"part":0,"rehitRate":0,"damage":10,"shieldDamage":1,"angle":65,"facing":"Forward","baseKnockback":90,"knockbackGrowth":67,"fixedKnockback":0,"setWeight":false,"radius":6.2,"bone":"top","offsetX":0,"offsetY":[10,8],"offsetZ":12,"hitlagMultiplier":1.25,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":true,"effect":"Normal","attackType":"Body","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"L","soundKind":"Punch","shieldstunMultiplier":1.5,"extraShieldstunFrames":0},
      {"section":"","group":"Late hit","id":0,"part":0,"rehitRate":0,"damage":6,"shieldDamage":1,"angle":65,"facing":"Forward","baseKnockback":90,"knockbackGrowth":67,"fixedKnockback":0,"setWeight":false,"radius":4.8,"bone":"top","offsetX":0,"offsetY":[10,6],"offsetZ":12,"hitlagMultiplier":1.25,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":true,"effect":"Normal","attackType":"Body","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"M","soundKind":"Punch","shieldstunMultiplier":1.5,"extraShieldstunFrames":0},
    ],
    grabboxes: [
    ],
    throws: [
    ],
    timing: [
      {"section":"","label":"Clean hit","value":"7-9"},
      {"section":"","label":"Late hit","value":"10-16"},
      {"section":"","label":"Interruptible","value":"35"},
      {"section":"","label":"Animation length","value":"39"},
    ],
  },
  'Down_aerial': {
    url: `${SMASHWIKI_FALCON_BASE_URL}/Down_aerial`,
    hitboxes: [
      {"section":"","group":"","id":0,"part":0,"rehitRate":0,"damage":14,"shieldDamage":0,"angle":270,"facing":"Standard","baseKnockback":10,"knockbackGrowth":100,"fixedKnockback":0,"setWeight":false,"radius":5.9,"bone":"top","offsetX":0,"offsetY":-5.2,"offsetZ":0.8,"hitlagMultiplier":1,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":true,"effect":"Normal","attackType":"Foot","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"L","soundKind":"Kick","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"","group":"","id":1,"part":0,"rehitRate":0,"damage":14,"shieldDamage":0,"angle":361,"facing":"Standard","baseKnockback":40,"knockbackGrowth":100,"fixedKnockback":0,"setWeight":false,"radius":6,"bone":"top","offsetX":0,"offsetY":1,"offsetZ":0.8,"hitlagMultiplier":1,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":true,"effect":"Normal","attackType":"Foot","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"L","soundKind":"Kick","shieldstunMultiplier":1,"extraShieldstunFrames":0},
    ],
    grabboxes: [
    ],
    throws: [
    ],
    timing: [
      {"section":"Attack","label":"Initial autocancel","value":"1-3"},
      {"section":"Attack","label":"Hitboxes","value":"16-18"},
      {"section":"Attack","label":"Ending autocancel","value":"39-"},
      {"section":"Attack","label":"Interruptible","value":"45"},
      {"section":"Attack","label":"Animation length","value":"54"},
      {"section":"Landing lag","label":"Interruptible","value":"13"},
      {"section":"Landing lag","label":"Animation length","value":"19"},
    ],
  },
  'Down_smash': {
    url: `${SMASHWIKI_FALCON_BASE_URL}/Down_smash`,
    hitboxes: [
      {"section":"","group":"Hit 1","id":0,"part":0,"rehitRate":0,"damage":14,"shieldDamage":0,"angle":28,"facing":"Standard","baseKnockback":30,"knockbackGrowth":90,"fixedKnockback":0,"setWeight":false,"radius":4.5,"bone":"kneer","offsetX":4.9,"offsetY":-0.9,"offsetZ":0,"hitlagMultiplier":1,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":true,"effect":"Normal","attackType":"Foot","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"L","soundKind":"Kick","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"","group":"Hit 1","id":1,"part":0,"rehitRate":0,"damage":14,"shieldDamage":0,"angle":28,"facing":"Standard","baseKnockback":30,"knockbackGrowth":90,"fixedKnockback":0,"setWeight":false,"radius":4.2,"bone":"kneer","offsetX":0,"offsetY":0,"offsetZ":0,"hitlagMultiplier":1,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":true,"effect":"Normal","attackType":"Foot","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"L","soundKind":"Kick","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"","group":"Hit 1","id":2,"part":0,"rehitRate":0,"damage":14,"shieldDamage":0,"angle":28,"facing":"Standard","baseKnockback":30,"knockbackGrowth":90,"fixedKnockback":0,"setWeight":false,"radius":3.7,"bone":"legr","offsetX":0,"offsetY":0,"offsetZ":0,"hitlagMultiplier":1,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":true,"effect":"Normal","attackType":"Foot","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"L","soundKind":"Kick","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"","group":"Hit 2","id":0,"part":1,"rehitRate":0,"damage":18,"shieldDamage":0,"angle":28,"facing":"Standard","baseKnockback":20,"knockbackGrowth":84,"fixedKnockback":0,"setWeight":false,"radius":4.5,"bone":"kneer","offsetX":4.9,"offsetY":-0.9,"offsetZ":0,"hitlagMultiplier":1,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":true,"effect":"Normal","attackType":"Foot","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"L","soundKind":"Kick","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"","group":"Hit 2","id":1,"part":1,"rehitRate":0,"damage":18,"shieldDamage":0,"angle":28,"facing":"Standard","baseKnockback":20,"knockbackGrowth":84,"fixedKnockback":0,"setWeight":false,"radius":4.2,"bone":"kneer","offsetX":0,"offsetY":0,"offsetZ":0,"hitlagMultiplier":1,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":true,"effect":"Normal","attackType":"Foot","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"L","soundKind":"Kick","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"","group":"Hit 2","id":2,"part":1,"rehitRate":0,"damage":18,"shieldDamage":0,"angle":28,"facing":"Standard","baseKnockback":20,"knockbackGrowth":84,"fixedKnockback":0,"setWeight":false,"radius":3.7,"bone":"legr","offsetX":0,"offsetY":0,"offsetZ":0,"hitlagMultiplier":1,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":true,"effect":"Normal","attackType":"Foot","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"L","soundKind":"Kick","shieldstunMultiplier":1,"extraShieldstunFrames":0},
    ],
    grabboxes: [
    ],
    throws: [
    ],
    timing: [
      {"section":"","label":"Charges between","value":"11-12"},
      {"section":"","label":"Hit 1","value":"19-20"},
      {"section":"","label":"Hit 2","value":"29-30"},
      {"section":"","label":"Interruptible","value":"49"},
      {"section":"","label":"Animation length","value":"67"},
    ],
  },
  'Down_special': {
    url: `${SMASHWIKI_FALCON_BASE_URL}/Down_special`,
    hitboxes: [
      {"section":"Grounded","group":"Clean hit","id":0,"part":0,"rehitRate":0,"damage":15,"shieldDamage":0,"angle":52,"facing":"Standard","baseKnockback":60,"knockbackGrowth":88,"fixedKnockback":0,"setWeight":false,"radius":3.8,"bone":"legr","offsetX":[10,2],"offsetY":0,"offsetZ":0,"hitlagMultiplier":1,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":true,"effect":"Flame","attackType":"Foot","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"L","soundKind":"Kick","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"Grounded","group":"Mid hit","id":0,"part":0,"rehitRate":0,"damage":11,"shieldDamage":0,"angle":52,"facing":"Standard","baseKnockback":90,"knockbackGrowth":60,"fixedKnockback":0,"setWeight":false,"radius":3.2,"bone":"legr","offsetX":[10,2],"offsetY":0,"offsetZ":0,"hitlagMultiplier":1,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":true,"effect":"Flame","attackType":"Foot","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"L","soundKind":"Kick","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"Grounded","group":"Late hit","id":0,"part":0,"rehitRate":0,"damage":7,"shieldDamage":0,"angle":46,"facing":"Standard","baseKnockback":80,"knockbackGrowth":65,"fixedKnockback":0,"setWeight":false,"radius":3.2,"bone":"legr","offsetX":[10,2],"offsetY":0,"offsetZ":0,"hitlagMultiplier":1,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":true,"effect":"Flame","attackType":"Foot","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"M","soundKind":"Kick","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"Aerial","group":"Clean hit","id":0,"part":0,"rehitRate":0,"damage":15,"shieldDamage":0,"angle":361,"facing":"Forward","baseKnockback":80,"knockbackGrowth":57,"fixedKnockback":0,"setWeight":false,"radius":5.76,"bone":"kneel","offsetX":4,"offsetY":0,"offsetZ":0,"hitlagMultiplier":1.2,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":true,"effect":"Flame","attackType":"Foot","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"L","soundKind":"Kick","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"Aerial","group":"Mid hit","id":0,"part":0,"rehitRate":0,"damage":12,"shieldDamage":0,"angle":361,"facing":"Forward","baseKnockback":80,"knockbackGrowth":46,"fixedKnockback":0,"setWeight":false,"radius":5,"bone":"kneel","offsetX":[4,-2],"offsetY":0,"offsetZ":0,"hitlagMultiplier":1,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":true,"effect":"Flame","attackType":"Foot","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"L","soundKind":"Kick","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"Aerial","group":"Late hit","id":0,"part":0,"rehitRate":0,"damage":9,"shieldDamage":0,"angle":361,"facing":"Forward","baseKnockback":80,"knockbackGrowth":46,"fixedKnockback":0,"setWeight":false,"radius":5,"bone":"kneel","offsetX":[4,-2],"offsetY":0,"offsetZ":0,"hitlagMultiplier":1,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":true,"effect":"Flame","attackType":"Foot","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"L","soundKind":"Kick","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"Aerial","group":"Landing","id":0,"part":0,"rehitRate":0,"damage":9,"shieldDamage":0,"angle":60,"facing":"Standard","baseKnockback":80,"knockbackGrowth":35,"fixedKnockback":0,"setWeight":false,"radius":4.5,"bone":"top","offsetX":0,"offsetY":2,"offsetZ":[7.2,-7.2],"hitlagMultiplier":1,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":true,"effect":"Normal","attackType":"Foot","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"L","soundKind":"Kick","shieldstunMultiplier":1,"extraShieldstunFrames":0},
    ],
    grabboxes: [
    ],
    throws: [
    ],
    timing: [
      {"section":"Grounded","label":"Clean hit","value":"13-16"},
      {"section":"Grounded","label":"Mid hit","value":"17-23"},
      {"section":"Grounded","label":"Late hit","value":"24-33"},
      {"section":"Grounded","label":"Interruptible (ground)","value":"69"},
      {"section":"Grounded","label":"Animation length (ground)","value":"83"},
      {"section":"Grounded","label":"Interruptible (off ledge)","value":"66"},
      {"section":"Grounded","label":"Animation length (off ledge)","value":"66"},
      {"section":"Aerial","label":"Clean hit","value":"14-18"},
      {"section":"Aerial","label":"Mid hit","value":"19-24"},
      {"section":"Aerial","label":"Late hit","value":"25-27"},
      {"section":"Aerial","label":"Interruptible","value":"57"},
      {"section":"Aerial","label":"Animation length","value":"57"},
      {"section":"Landing","label":"Hitboxes","value":"1-2"},
      {"section":"Landing","label":"Interruptible","value":"36"},
      {"section":"Landing","label":"Animation length","value":"36"},
      {"section":"Wall crash","label":"Animation length","value":"53"},
    ],
  },
  'Down_throw': {
    url: `${SMASHWIKI_FALCON_BASE_URL}/Down_throw`,
    hitboxes: [
    ],
    grabboxes: [
    ],
    throws: [
      {"section":"","kind":"Throw","id":0,"damage":6,"angle":68,"facing":"Forward","baseKnockback":65,"knockbackGrowth":70,"fixedKnockback":0,"hitlagMultiplier":0,"effect":"Normal","attackType":"Throwing","soundLevel":"S","soundKind":"None"},
      {"section":"","kind":"Break","id":0,"damage":3,"angle":361,"facing":"Forward","baseKnockback":60,"knockbackGrowth":100,"fixedKnockback":0,"hitlagMultiplier":0,"effect":"Normal","attackType":"Throwing","soundLevel":"S","soundKind":"None"},
    ],
    timing: [
      {"section":"","label":"Invincibility","value":"1-21"},
      {"section":"","label":"Throw Release","value":"21"},
      {"section":"","label":"Interruptible","value":"40"},
      {"section":"","label":"Animation length","value":"65"},
    ],
  },
  'Down_tilt': {
    url: `${SMASHWIKI_FALCON_BASE_URL}/Down_tilt`,
    hitboxes: [
      {"section":"","group":"","id":0,"part":0,"rehitRate":0,"damage":10,"shieldDamage":0,"angle":25,"facing":"Standard","baseKnockback":38,"knockbackGrowth":86,"fixedKnockback":0,"setWeight":false,"radius":4.8,"bone":"kneel","offsetX":6.5,"offsetY":-1,"offsetZ":0,"hitlagMultiplier":1,"sdiMultiplier":1,"tripChance":50,"clang":true,"rebound":true,"effect":"Normal","attackType":"Foot","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"M","soundKind":"Kick","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"","group":"","id":1,"part":0,"rehitRate":0,"damage":10,"shieldDamage":0,"angle":25,"facing":"Standard","baseKnockback":38,"knockbackGrowth":86,"fixedKnockback":0,"setWeight":false,"radius":4.8,"bone":"legl","offsetX":3.5,"offsetY":0,"offsetZ":0,"hitlagMultiplier":1,"sdiMultiplier":1,"tripChance":50,"clang":true,"rebound":true,"effect":"Normal","attackType":"Foot","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"M","soundKind":"Kick","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"","group":"","id":2,"part":0,"rehitRate":0,"damage":10,"shieldDamage":0,"angle":155,"facing":"Standard","baseKnockback":38,"knockbackGrowth":86,"fixedKnockback":0,"setWeight":false,"radius":3.5,"bone":"top","offsetX":0,"offsetY":3.5,"offsetZ":-1,"hitlagMultiplier":1,"sdiMultiplier":1,"tripChance":50,"clang":true,"rebound":true,"effect":"Normal","attackType":"Foot","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"M","soundKind":"Kick","shieldstunMultiplier":1,"extraShieldstunFrames":0},
    ],
    grabboxes: [
    ],
    throws: [
    ],
    timing: [
      {"section":"","label":"Hitboxes","value":"11-12"},
      {"section":"","label":"Interruptible","value":"35"},
      {"section":"","label":"Animation length","value":"49"},
    ],
  },
  'Edge_attack': {
    url: `${SMASHWIKI_FALCON_BASE_URL}/Edge_attack`,
    hitboxes: [
      {"section":"","group":"","id":0,"part":0,"rehitRate":0,"damage":10,"shieldDamage":1,"angle":45,"facing":"Forward","baseKnockback":90,"knockbackGrowth":20,"fixedKnockback":0,"setWeight":false,"radius":5,"bone":"top","offsetX":0,"offsetY":5,"offsetZ":[12.5,3.5],"hitlagMultiplier":1,"sdiMultiplier":1,"tripChance":0,"clang":false,"rebound":false,"effect":"Normal","attackType":"Foot","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"M","soundKind":"Kick","shieldstunMultiplier":1,"extraShieldstunFrames":0},
    ],
    grabboxes: [
    ],
    throws: [
    ],
    timing: [
      {"section":"","label":"Intangibility (1st grab)","value":"1-24"},
      {"section":"","label":"Intangibility (2nd grab)","value":"1-19"},
      {"section":"","label":"Intangibility (3rd grab)","value":"1-12"},
      {"section":"","label":"Hitbox","value":"22-24"},
      {"section":"","label":"Interruptible","value":"56"},
      {"section":"","label":"Animation length","value":"57"},
    ],
  },
  'Floor_attack_(back)': {
    url: `${SMASHWIKI_FALCON_BASE_URL}/Floor_attack_(back)`,
    hitboxes: [
      {"section":"","group":"Both hits","id":0,"part":0,"rehitRate":0,"damage":6,"shieldDamage":8,"angle":48,"facing":"Standard","baseKnockback":80,"knockbackGrowth":48,"fixedKnockback":0,"setWeight":false,"radius":5,"bone":"top","offsetX":0,"offsetY":9,"offsetZ":[12,-12],"hitlagMultiplier":1,"sdiMultiplier":1,"tripChance":0,"clang":false,"rebound":false,"effect":"Normal","attackType":"Foot","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"M","soundKind":"Kick","shieldstunMultiplier":1,"extraShieldstunFrames":0},
    ],
    grabboxes: [
    ],
    throws: [
    ],
    timing: [
      {"section":"","label":"Intangibility","value":"1-21"},
      {"section":"","label":"Hit 1","value":"14-15"},
      {"section":"","label":"Hit 2","value":"20-21"},
      {"section":"","label":"Interruptible","value":"46"},
      {"section":"","label":"Animation length","value":"49"},
    ],
  },
  'Floor_attack_(front)': {
    url: `${SMASHWIKI_FALCON_BASE_URL}/Floor_attack_(front)`,
    hitboxes: [
      {"section":"","group":"Hit 1","id":0,"part":0,"rehitRate":0,"damage":7,"shieldDamage":8,"angle":48,"facing":"Standard","baseKnockback":80,"knockbackGrowth":48,"fixedKnockback":0,"setWeight":false,"radius":5,"bone":"top","offsetX":0,"offsetY":5,"offsetZ":[-16,-2],"hitlagMultiplier":1,"sdiMultiplier":1,"tripChance":0,"clang":false,"rebound":false,"effect":"Normal","attackType":"Foot","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"M","soundKind":"Kick","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"","group":"Hit 2","id":0,"part":0,"rehitRate":0,"damage":7,"shieldDamage":8,"angle":48,"facing":"Standard","baseKnockback":80,"knockbackGrowth":48,"fixedKnockback":0,"setWeight":false,"radius":5,"bone":"top","offsetX":0,"offsetY":5,"offsetZ":[15,4],"hitlagMultiplier":1,"sdiMultiplier":1,"tripChance":0,"clang":false,"rebound":false,"effect":"Normal","attackType":"Foot","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"M","soundKind":"Kick","shieldstunMultiplier":1,"extraShieldstunFrames":0},
    ],
    grabboxes: [
    ],
    throws: [
    ],
    timing: [
      {"section":"","label":"Intangibility","value":"1-25"},
      {"section":"","label":"Hit 1","value":"14-15"},
      {"section":"","label":"Hit 2","value":"24-25"},
      {"section":"","label":"Interruptible","value":"46"},
      {"section":"","label":"Animation length","value":"49"},
    ],
  },
  'Floor_attack_(trip)': {
    url: `${SMASHWIKI_FALCON_BASE_URL}/Floor_attack_(trip)`,
    hitboxes: [
      {"section":"","group":"Hit 1","id":0,"part":0,"rehitRate":0,"damage":5,"shieldDamage":8,"angle":361,"facing":"Standard","baseKnockback":60,"knockbackGrowth":50,"fixedKnockback":0,"setWeight":false,"radius":5,"bone":"top","offsetX":0,"offsetY":5,"offsetZ":[10.5,4.5],"hitlagMultiplier":1,"sdiMultiplier":1,"tripChance":0,"clang":false,"rebound":false,"effect":"Normal","attackType":"Hand","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"M","soundKind":"Punch","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"","group":"Hit 2","id":0,"part":0,"rehitRate":0,"damage":5,"shieldDamage":8,"angle":361,"facing":"Standard","baseKnockback":60,"knockbackGrowth":50,"fixedKnockback":0,"setWeight":false,"radius":5,"bone":"top","offsetX":0,"offsetY":5,"offsetZ":[-9.5,-4],"hitlagMultiplier":1,"sdiMultiplier":1,"tripChance":0,"clang":false,"rebound":false,"effect":"Normal","attackType":"Hand","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"M","soundKind":"Punch","shieldstunMultiplier":1,"extraShieldstunFrames":0},
    ],
    grabboxes: [
    ],
    throws: [
    ],
    timing: [
      {"section":"","label":"Intangibility","value":"1-7"},
      {"section":"","label":"Hit 1","value":"18-19"},
      {"section":"","label":"Hit 2","value":"23-24"},
      {"section":"","label":"Interruptible","value":"50"},
      {"section":"","label":"Animation length","value":"49"},
    ],
  },
  'Forward_aerial': {
    url: `${SMASHWIKI_FALCON_BASE_URL}/Forward_aerial`,
    hitboxes: [
      {"section":"","group":"Clean hit","id":0,"part":0,"rehitRate":0,"damage":22,"shieldDamage":0,"angle":32,"facing":"Forward","baseKnockback":30,"knockbackGrowth":81,"fixedKnockback":0,"setWeight":false,"radius":3.75,"bone":"legl","offsetX":4.4,"offsetY":[-0.2,0.3],"offsetZ":-1,"hitlagMultiplier":1.2,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":true,"effect":"Electric","attackType":"Knee","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"L","soundKind":"Kick","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"","group":"Clean hit","id":1,"part":0,"rehitRate":0,"damage":6,"shieldDamage":0,"angle":361,"facing":"Forward","baseKnockback":35,"knockbackGrowth":80,"fixedKnockback":0,"setWeight":false,"radius":3,"bone":"top","offsetX":0,"offsetY":6,"offsetZ":0,"hitlagMultiplier":1.2,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":true,"effect":"Normal","attackType":"Knee","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"S","soundKind":"Kick","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"","group":"Late hit","id":0,"part":0,"rehitRate":0,"damage":3,"shieldDamage":0,"angle":361,"facing":"Forward","baseKnockback":35,"knockbackGrowth":80,"fixedKnockback":0,"setWeight":false,"radius":4.7,"bone":"legl","offsetX":4.4,"offsetY":-0.2,"offsetZ":-1,"hitlagMultiplier":1,"sdiMultiplier":1,"tripChance":20,"clang":true,"rebound":true,"effect":"Normal","attackType":"Knee","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"S","soundKind":"Kick","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"","group":"Late hit","id":1,"part":0,"rehitRate":0,"damage":3,"shieldDamage":0,"angle":361,"facing":"Forward","baseKnockback":35,"knockbackGrowth":80,"fixedKnockback":0,"setWeight":false,"radius":3,"bone":"top","offsetX":0,"offsetY":6,"offsetZ":0,"hitlagMultiplier":1,"sdiMultiplier":1,"tripChance":20,"clang":true,"rebound":true,"effect":"Normal","attackType":"Knee","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"S","soundKind":"Kick","shieldstunMultiplier":1,"extraShieldstunFrames":0},
    ],
    grabboxes: [
    ],
    throws: [
    ],
    timing: [
      {"section":"Attack","label":"Initial autocancel","value":"1-4"},
      {"section":"Attack","label":"Clean hit","value":"14"},
      {"section":"Attack","label":"Late hit","value":"15-30"},
      {"section":"Attack","label":"Ending autocancel","value":"42-"},
      {"section":"Attack","label":"Interruptible","value":"46"},
      {"section":"Attack","label":"Animation length","value":"59"},
      {"section":"Landing lag","label":"Interruptible","value":"19"},
      {"section":"Landing lag","label":"Animation length","value":"29"},
    ],
  },
  'Forward_smash': {
    url: `${SMASHWIKI_FALCON_BASE_URL}/Forward_smash`,
    hitboxes: [
      {"section":"","group":"Angled up","id":0,"part":0,"rehitRate":0,"damage":20,"shieldDamage":0,"angle":45,"facing":"Forward","baseKnockback":36,"knockbackGrowth":94,"fixedKnockback":0,"setWeight":false,"radius":3.8,"bone":"arml","offsetX":2.2,"offsetY":0.7,"offsetZ":0.5,"hitlagMultiplier":1,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":true,"effect":"Flame","attackType":"Hand","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"L","soundKind":"Fire","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"","group":"Angled up","id":1,"part":0,"rehitRate":0,"damage":20,"shieldDamage":0,"angle":45,"facing":"Forward","baseKnockback":36,"knockbackGrowth":94,"fixedKnockback":0,"setWeight":false,"radius":3.2,"bone":"shoulderl","offsetX":0,"offsetY":0,"offsetZ":0,"hitlagMultiplier":1,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":true,"effect":"Flame","attackType":"Hand","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"L","soundKind":"Fire","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"","group":"Angled forward","id":0,"part":0,"rehitRate":0,"damage":19,"shieldDamage":0,"angle":43,"facing":"Forward","baseKnockback":36,"knockbackGrowth":94,"fixedKnockback":0,"setWeight":false,"radius":3.8,"bone":"arml","offsetX":2.2,"offsetY":0.7,"offsetZ":0.5,"hitlagMultiplier":1,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":true,"effect":"Flame","attackType":"Hand","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"L","soundKind":"Fire","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"","group":"Angled forward","id":1,"part":0,"rehitRate":0,"damage":19,"shieldDamage":0,"angle":43,"facing":"Forward","baseKnockback":36,"knockbackGrowth":94,"fixedKnockback":0,"setWeight":false,"radius":3.2,"bone":"shoulderl","offsetX":0,"offsetY":0,"offsetZ":0,"hitlagMultiplier":1,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":true,"effect":"Flame","attackType":"Hand","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"L","soundKind":"Fire","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"","group":"Angled down","id":0,"part":0,"rehitRate":0,"damage":20,"shieldDamage":0,"angle":38,"facing":"Forward","baseKnockback":36,"knockbackGrowth":87,"fixedKnockback":0,"setWeight":false,"radius":3.8,"bone":"arml","offsetX":2.2,"offsetY":0.7,"offsetZ":0.5,"hitlagMultiplier":1,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":true,"effect":"Flame","attackType":"Hand","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"L","soundKind":"Fire","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"","group":"Angled down","id":1,"part":0,"rehitRate":0,"damage":20,"shieldDamage":0,"angle":38,"facing":"Forward","baseKnockback":36,"knockbackGrowth":87,"fixedKnockback":0,"setWeight":false,"radius":3.2,"bone":"shoulderl","offsetX":0,"offsetY":0,"offsetZ":0,"hitlagMultiplier":1,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":true,"effect":"Flame","attackType":"Hand","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"L","soundKind":"Fire","shieldstunMultiplier":1,"extraShieldstunFrames":0},
    ],
    grabboxes: [
    ],
    throws: [
    ],
    timing: [
      {"section":"","label":"Charges between","value":"11-12"},
      {"section":"","label":"Hitboxes","value":"19-22"},
      {"section":"","label":"Interruptible","value":"60"},
      {"section":"","label":"Animation length","value":"83"},
    ],
  },
  'Forward_throw': {
    url: `${SMASHWIKI_FALCON_BASE_URL}/Forward_throw`,
    hitboxes: [
      {"section":"","group":"Hitbox","id":0,"part":0,"rehitRate":0,"damage":3.5,"shieldDamage":0,"angle":80,"facing":"Forward","baseKnockback":70,"knockbackGrowth":100,"fixedKnockback":0,"setWeight":false,"radius":4.8,"bone":"arml","offsetX":4.8,"offsetY":0,"offsetZ":0,"hitlagMultiplier":1.5,"sdiMultiplier":1,"tripChance":0,"clang":false,"rebound":false,"effect":"Normal","attackType":"Hand","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"L","soundKind":"Punch","shieldstunMultiplier":1,"extraShieldstunFrames":0},
    ],
    grabboxes: [
    ],
    throws: [
      {"section":"","kind":"Throw","id":0,"damage":4,"angle":45,"facing":"Forward","baseKnockback":55,"knockbackGrowth":120,"fixedKnockback":0,"hitlagMultiplier":0,"effect":"Normal","attackType":"Throwing","soundLevel":"S","soundKind":"None"},
      {"section":"","kind":"Break","id":0,"damage":3,"angle":361,"facing":"Forward","baseKnockback":60,"knockbackGrowth":100,"fixedKnockback":0,"hitlagMultiplier":0,"effect":"Normal","attackType":"Throwing","soundLevel":"S","soundKind":"None"},
    ],
    timing: [
      {"section":"","label":"Invincibility","value":"1-13"},
      {"section":"","label":"Hitbox","value":"11-12"},
      {"section":"","label":"Throw Release","value":"13"},
      {"section":"","label":"Interruptible","value":"33"},
      {"section":"","label":"Animation length","value":"57"},
    ],
  },
  'Forward_tilt': {
    url: `${SMASHWIKI_FALCON_BASE_URL}/Forward_tilt`,
    hitboxes: [
      {"section":"","group":"Unangled","id":0,"part":0,"rehitRate":0,"damage":8,"shieldDamage":0,"angle":361,"facing":"Forward","baseKnockback":60,"knockbackGrowth":58,"fixedKnockback":0,"setWeight":false,"radius":4.3,"bone":"legr","offsetX":3.5,"offsetY":0,"offsetZ":0,"hitlagMultiplier":1,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":true,"effect":"Normal","attackType":"Foot","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"M","soundKind":"Kick","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"","group":"Unangled","id":1,"part":0,"rehitRate":0,"damage":8,"shieldDamage":0,"angle":361,"facing":"Forward","baseKnockback":60,"knockbackGrowth":58,"fixedKnockback":0,"setWeight":false,"radius":4.3,"bone":"hip","offsetX":0,"offsetY":0,"offsetZ":0,"hitlagMultiplier":1,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":true,"effect":"Normal","attackType":"Foot","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"M","soundKind":"Kick","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"","group":"Unangled","id":2,"part":0,"rehitRate":0,"damage":9,"shieldDamage":0,"angle":361,"facing":"Forward","baseKnockback":60,"knockbackGrowth":58,"fixedKnockback":0,"setWeight":false,"radius":5.3,"bone":"kneer","offsetX":5.5,"offsetY":-1,"offsetZ":0.5,"hitlagMultiplier":1,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":true,"effect":"Normal","attackType":"Foot","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"M","soundKind":"Kick","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"","group":"Angled up or down","id":0,"part":0,"rehitRate":0,"damage":9,"shieldDamage":0,"angle":361,"facing":"Forward","baseKnockback":60,"knockbackGrowth":58,"fixedKnockback":0,"setWeight":false,"radius":4.3,"bone":"legr","offsetX":3.5,"offsetY":0,"offsetZ":0,"hitlagMultiplier":1,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":true,"effect":"Normal","attackType":"Foot","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"M","soundKind":"Kick","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"","group":"Angled up or down","id":1,"part":0,"rehitRate":0,"damage":9,"shieldDamage":0,"angle":361,"facing":"Forward","baseKnockback":60,"knockbackGrowth":58,"fixedKnockback":0,"setWeight":false,"radius":4.3,"bone":"hip","offsetX":0,"offsetY":0,"offsetZ":0,"hitlagMultiplier":1,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":true,"effect":"Normal","attackType":"Foot","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"M","soundKind":"Kick","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"","group":"Angled up or down","id":2,"part":0,"rehitRate":0,"damage":10,"shieldDamage":0,"angle":361,"facing":"Forward","baseKnockback":60,"knockbackGrowth":58,"fixedKnockback":0,"setWeight":false,"radius":5.3,"bone":"kneer","offsetX":5.5,"offsetY":-1,"offsetZ":0.5,"hitlagMultiplier":1,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":true,"effect":"Normal","attackType":"Foot","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"M","soundKind":"Kick","shieldstunMultiplier":1,"extraShieldstunFrames":0},
    ],
    grabboxes: [
    ],
    throws: [
    ],
    timing: [
      {"section":"","label":"Hitboxes","value":"7-10"},
      {"section":"","label":"Interruptible","value":"30"},
      {"section":"","label":"Animation length","value":"35"},
    ],
  },
  'Grab': {
    url: `${SMASHWIKI_FALCON_BASE_URL}/Grab`,
    hitboxes: [
    ],
    grabboxes: [
      {"section":"Standing Grab","group":"","id":0,"radius":3.3,"bone":"top","offsetX":0,"offsetY":8,"offsetZ":[4,9.7],"hitsGrounded":true,"hitsAerial":false},
      {"section":"Standing Grab","group":"","id":1,"radius":1.65,"bone":"top","offsetX":0,"offsetY":8,"offsetZ":[2.35,11.35],"hitsGrounded":false,"hitsAerial":true},
      {"section":"Dash Grab","group":"","id":0,"radius":2.6,"bone":"top","offsetX":0,"offsetY":8,"offsetZ":[4,11.6],"hitsGrounded":true,"hitsAerial":false},
      {"section":"Dash Grab","group":"","id":1,"radius":1.3,"bone":"top","offsetX":0,"offsetY":8,"offsetZ":[2.7,12.9],"hitsGrounded":false,"hitsAerial":true},
      {"section":"Pivot Grab","group":"","id":0,"radius":3.3,"bone":"top","offsetX":0,"offsetY":8,"offsetZ":[-4,-16.2],"hitsGrounded":true,"hitsAerial":false},
      {"section":"Pivot Grab","group":"","id":1,"radius":1.65,"bone":"top","offsetX":0,"offsetY":8,"offsetZ":[-2.35,-17.85],"hitsGrounded":false,"hitsAerial":true},
    ],
    throws: [
    ],
    timing: [
      {"section":"Standing grab","label":"Grab","value":"6-7"},
      {"section":"Standing grab","label":"Interruptible","value":"36"},
      {"section":"Standing grab","label":"Animation length","value":"39"},
      {"section":"Dash grab","label":"Grab","value":"9-10"},
      {"section":"Dash grab","label":"Interruptible","value":"44"},
      {"section":"Dash grab","label":"Animation length","value":"51"},
      {"section":"Pivot grab","label":"Grab","value":"10-11"},
      {"section":"Pivot grab","label":"Interruptible","value":"39"},
      {"section":"Pivot grab","label":"Animation length","value":"45"},
    ],
  },
  'Neutral_aerial': {
    url: `${SMASHWIKI_FALCON_BASE_URL}/Neutral_aerial`,
    hitboxes: [
      {"section":"","group":"Hit 1","id":0,"part":0,"rehitRate":0,"damage":4,"shieldDamage":0,"angle":74,"facing":"Forward","baseKnockback":50,"knockbackGrowth":25,"fixedKnockback":0,"setWeight":true,"radius":6,"bone":"legr","offsetX":3.2,"offsetY":0,"offsetZ":0,"hitlagMultiplier":1,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":true,"effect":"Normal","attackType":"Foot","hitsGrounded":false,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"M","soundKind":"Kick","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"","group":"Hit 1","id":1,"part":0,"rehitRate":0,"damage":4,"shieldDamage":0,"angle":68,"facing":"Forward","baseKnockback":65,"knockbackGrowth":75,"fixedKnockback":0,"setWeight":true,"radius":6,"bone":"legr","offsetX":3.2,"offsetY":0,"offsetZ":0,"hitlagMultiplier":1,"sdiMultiplier":1.4,"tripChance":0,"clang":true,"rebound":true,"effect":"Normal","attackType":"Foot","hitsGrounded":true,"hitsAerial":false,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"M","soundKind":"Kick","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"","group":"Hit 1","id":2,"part":0,"rehitRate":0,"damage":4,"shieldDamage":0,"angle":80,"facing":"Forward","baseKnockback":50,"knockbackGrowth":25,"fixedKnockback":0,"setWeight":true,"radius":4.8,"bone":"kneer","offsetX":4.2,"offsetY":-0.7,"offsetZ":0,"hitlagMultiplier":1,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":true,"effect":"Normal","attackType":"Foot","hitsGrounded":false,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"M","soundKind":"Kick","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"","group":"Hit 1","id":3,"part":0,"rehitRate":0,"damage":4,"shieldDamage":0,"angle":74,"facing":"Forward","baseKnockback":65,"knockbackGrowth":75,"fixedKnockback":0,"setWeight":true,"radius":4.8,"bone":"kneer","offsetX":4.2,"offsetY":-0.7,"offsetZ":0,"hitlagMultiplier":1,"sdiMultiplier":1.4,"tripChance":0,"clang":true,"rebound":true,"effect":"Normal","attackType":"Foot","hitsGrounded":true,"hitsAerial":false,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"M","soundKind":"Kick","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"","group":"Hit 1","id":4,"part":0,"rehitRate":0,"damage":4,"shieldDamage":0,"angle":68,"facing":"Forward","baseKnockback":50,"knockbackGrowth":25,"fixedKnockback":0,"setWeight":true,"radius":3.5,"bone":"hip","offsetX":0,"offsetY":0,"offsetZ":0,"hitlagMultiplier":1,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":true,"effect":"Normal","attackType":"Foot","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"M","soundKind":"Kick","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"","group":"Hit 2","id":0,"part":0,"rehitRate":0,"damage":6,"shieldDamage":0,"angle":361,"facing":"Forward","baseKnockback":45,"knockbackGrowth":120,"fixedKnockback":0,"setWeight":false,"radius":5.2,"bone":"kneel","offsetX":4.4,"offsetY":-0.7,"offsetZ":0,"hitlagMultiplier":1,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":true,"effect":"Normal","attackType":"Foot","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"M","soundKind":"Kick","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"","group":"Hit 2","id":1,"part":0,"rehitRate":0,"damage":6,"shieldDamage":0,"angle":361,"facing":"Forward","baseKnockback":45,"knockbackGrowth":120,"fixedKnockback":0,"setWeight":false,"radius":6,"bone":"legl","offsetX":3.2,"offsetY":0,"offsetZ":0,"hitlagMultiplier":1,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":true,"effect":"Normal","attackType":"Foot","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"M","soundKind":"Kick","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"","group":"Hit 2","id":2,"part":0,"rehitRate":0,"damage":6,"shieldDamage":0,"angle":361,"facing":"Forward","baseKnockback":45,"knockbackGrowth":120,"fixedKnockback":0,"setWeight":false,"radius":3.8,"bone":"hip","offsetX":0,"offsetY":0,"offsetZ":0,"hitlagMultiplier":1,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":true,"effect":"Normal","attackType":"Foot","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"M","soundKind":"Kick","shieldstunMultiplier":1,"extraShieldstunFrames":0},
    ],
    grabboxes: [
    ],
    throws: [
    ],
    timing: [
      {"section":"Attack","label":"Initial autocancel","value":"1-3"},
      {"section":"Attack","label":"Hit 1","value":"7-8"},
      {"section":"Attack","label":"Hit 2","value":"13-15"},
      {"section":"Attack","label":"Ending autocancel","value":"32-"},
      {"section":"Attack","label":"Interruptible","value":"40"},
      {"section":"Attack","label":"Animation length","value":"49"},
      {"section":"Landing lag","label":"Interruptible","value":"8"},
      {"section":"Landing lag","label":"Animation length","value":"12"},
    ],
  },
  'Neutral_attack': {
    url: `${SMASHWIKI_FALCON_BASE_URL}/Neutral_attack`,
    hitboxes: [
    ],
    grabboxes: [
    ],
    throws: [
    ],
    timing: [
      {"section":"","label":"Jab 1","value":"3"},
      {"section":"","label":"Consecutive jab","value":"7"},
      {"section":"","label":"Jab 2","value":"9"},
      {"section":"","label":"Jab 3","value":"17-18"},
      {"section":"","label":"Rapid jab","value":"15, 17, 19, 21, 23, 25, 27, 29"},
      {"section":"","label":"Rapid jab finisher","value":"35-36"},
      {"section":"","label":"Interruptible","value":"18, 23, 44, 79"},
      {"section":"","label":"Animation lengths","value":"39, 40, 51, 78"},
    ],
  },
  'Neutral_attack/Hit_1': {
    url: `${SMASHWIKI_FALCON_BASE_URL}/Neutral_attack/Hit_1`,
    hitboxes: [
      {"section":"","group":"","id":0,"part":0,"rehitRate":0,"damage":1.5,"shieldDamage":0,"angle":361,"facing":"Forward","baseKnockback":20,"knockbackGrowth":25,"fixedKnockback":0,"setWeight":false,"radius":2,"bone":"top","offsetX":0,"offsetY":10,"offsetZ":6,"hitlagMultiplier":1.6,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":true,"effect":"Normal","attackType":"Hand","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"S","soundKind":"Punch","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"","group":"","id":1,"part":0,"rehitRate":0,"damage":1.5,"shieldDamage":0,"angle":180,"facing":"Forward","baseKnockback":20,"knockbackGrowth":20,"fixedKnockback":0,"setWeight":false,"radius":2.5,"bone":"top","offsetX":0,"offsetY":10,"offsetZ":12,"hitlagMultiplier":1.6,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":true,"effect":"Normal","attackType":"Hand","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"S","soundKind":"Punch","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"","group":"","id":2,"part":0,"rehitRate":0,"damage":1.5,"shieldDamage":0,"angle":361,"facing":"Forward","baseKnockback":20,"knockbackGrowth":25,"fixedKnockback":0,"setWeight":false,"radius":2.3,"bone":"top","offsetX":0,"offsetY":10,"offsetZ":8.8,"hitlagMultiplier":1.6,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":true,"effect":"Normal","attackType":"Hand","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"S","soundKind":"Punch","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"","group":"","id":3,"part":0,"rehitRate":0,"damage":1.5,"shieldDamage":0,"angle":361,"facing":"Forward","baseKnockback":20,"knockbackGrowth":20,"fixedKnockback":0,"setWeight":false,"radius":2.5,"bone":"top","offsetX":0,"offsetY":10,"offsetZ":12,"hitlagMultiplier":1.6,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":true,"effect":"Normal","attackType":"Hand","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"S","soundKind":"Punch","shieldstunMultiplier":1,"extraShieldstunFrames":0},
    ],
    grabboxes: [
    ],
    throws: [
    ],
    timing: [
      {"section":"","label":"Hitboxes","value":"3"},
      {"section":"","label":"Continuability window","value":"5-30"},
      {"section":"","label":"Consecutive jab frame","value":"7"},
      {"section":"","label":"Interruptible","value":"18"},
      {"section":"","label":"Animation length","value":"39"},
    ],
  },
  'Neutral_attack/Hit_2': {
    url: `${SMASHWIKI_FALCON_BASE_URL}/Neutral_attack/Hit_2`,
    hitboxes: [
      {"section":"","group":"","id":0,"part":0,"rehitRate":0,"damage":1.5,"shieldDamage":0,"angle":361,"facing":"Forward","baseKnockback":20,"knockbackGrowth":25,"fixedKnockback":0,"setWeight":false,"radius":2.5,"bone":"top","offsetX":0,"offsetY":10,"offsetZ":6.5,"hitlagMultiplier":1.2,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":true,"effect":"Normal","attackType":"Hand","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"S","soundKind":"Punch","shieldstunMultiplier":1,"extraShieldstunFrames":3},
      {"section":"","group":"","id":1,"part":0,"rehitRate":0,"damage":1.5,"shieldDamage":0,"angle":361,"facing":"Forward","baseKnockback":20,"knockbackGrowth":25,"fixedKnockback":0,"setWeight":false,"radius":3,"bone":"top","offsetX":0,"offsetY":10,"offsetZ":10,"hitlagMultiplier":1.2,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":true,"effect":"Normal","attackType":"Hand","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"S","soundKind":"Punch","shieldstunMultiplier":1,"extraShieldstunFrames":3},
      {"section":"","group":"","id":2,"part":0,"rehitRate":0,"damage":1.5,"shieldDamage":0,"angle":361,"facing":"Forward","baseKnockback":20,"knockbackGrowth":20,"fixedKnockback":0,"setWeight":false,"radius":3.6,"bone":"top","offsetX":0,"offsetY":10,"offsetZ":14,"hitlagMultiplier":1.2,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":true,"effect":"Normal","attackType":"Hand","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"S","soundKind":"Punch","shieldstunMultiplier":1,"extraShieldstunFrames":3},
    ],
    grabboxes: [
    ],
    throws: [
    ],
    timing: [
      {"section":"","label":"Hitboxes","value":"5"},
      {"section":"","label":"Continuability (Rapid jab)","value":"7-9"},
      {"section":"","label":"Jab 3","value":"8-30"},
      {"section":"","label":"Interruptible","value":"19"},
      {"section":"","label":"Animation length","value":"36"},
    ],
  },
  'Neutral_attack/Hit_3': {
    url: `${SMASHWIKI_FALCON_BASE_URL}/Neutral_attack/Hit_3`,
    hitboxes: [
      {"section":"","group":"","id":0,"part":0,"rehitRate":0,"damage":5,"shieldDamage":0,"angle":361,"facing":"Forward","baseKnockback":70,"knockbackGrowth":100,"fixedKnockback":0,"setWeight":false,"radius":5.5,"bone":"top","offsetX":0,"offsetY":11,"offsetZ":12,"hitlagMultiplier":2,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":true,"effect":"Normal","attackType":"Knee","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"M","soundKind":"Kick","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"","group":"","id":1,"part":0,"rehitRate":0,"damage":5,"shieldDamage":0,"angle":361,"facing":"Forward","baseKnockback":70,"knockbackGrowth":100,"fixedKnockback":0,"setWeight":false,"radius":3.8,"bone":"top","offsetX":0,"offsetY":10,"offsetZ":6.5,"hitlagMultiplier":2,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":true,"effect":"Normal","attackType":"Knee","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"M","soundKind":"Kick","shieldstunMultiplier":1,"extraShieldstunFrames":0},
    ],
    grabboxes: [
    ],
    throws: [
    ],
    timing: [
      {"section":"","label":"Hitboxes","value":"6-7"},
      {"section":"","label":"Interruptible","value":"33"},
      {"section":"","label":"Animation length","value":"40"},
    ],
  },
  'Neutral_attack/Infinite': {
    url: `${SMASHWIKI_FALCON_BASE_URL}/Neutral_attack/Infinite`,
    hitboxes: [
      {"section":"","group":"Rapid jab","id":1,"part":0,"rehitRate":0,"damage":0.6,"shieldDamage":0,"angle":361,"facing":"Forward","baseKnockback":8,"knockbackGrowth":15,"fixedKnockback":0,"setWeight":false,"radius":2.25,"bone":"shoulderr","offsetX":[7.5,2],"offsetY":[0.8,-1],"offsetZ":[-0.5,0],"hitlagMultiplier":0.5,"sdiMultiplier":0.4,"tripChance":0,"clang":true,"rebound":true,"effect":"Rapid","attackType":"Hand","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"S","soundKind":"Punch","shieldstunMultiplier":1,"extraShieldstunFrames":2},
      {"section":"","group":"Rapid jab","id":2,"part":0,"rehitRate":0,"damage":0.6,"shieldDamage":0,"angle":361,"facing":"Forward","baseKnockback":8,"knockbackGrowth":15,"fixedKnockback":0,"setWeight":false,"radius":6.5,"bone":"top","offsetX":0,"offsetY":8,"offsetZ":[15,12],"hitlagMultiplier":0.5,"sdiMultiplier":0.4,"tripChance":0,"clang":true,"rebound":true,"effect":"Rapid","attackType":"Hand","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"S","soundKind":"Punch","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"","group":"Rapid jab finisher","id":0,"part":0,"rehitRate":0,"damage":3,"shieldDamage":0,"angle":45,"facing":"Forward","baseKnockback":110,"knockbackGrowth":55,"fixedKnockback":0,"setWeight":false,"radius":4.5,"bone":"top","offsetX":0,"offsetY":[13,5.5],"offsetZ":7,"hitlagMultiplier":2,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":true,"effect":"Normal","attackType":"Hand","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"M","soundKind":"Punch","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"","group":"Rapid jab finisher","id":1,"part":0,"rehitRate":0,"damage":3,"shieldDamage":0,"angle":45,"facing":"Forward","baseKnockback":110,"knockbackGrowth":55,"fixedKnockback":0,"setWeight":false,"radius":4.5,"bone":"top","offsetX":0,"offsetY":[13,5.5],"offsetZ":13.5,"hitlagMultiplier":2,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":true,"effect":"Normal","attackType":"Hand","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"M","soundKind":"Punch","shieldstunMultiplier":1,"extraShieldstunFrames":0},
    ],
    grabboxes: [
    ],
    throws: [
    ],
    timing: [
      {"section":"","label":"Loop points","value":"2-3, 19-20"},
      {"section":"","label":"Rapid jab","value":"5, 7, 9, 11, 13, 15, 17, 19"},
      {"section":"","label":"Finisher","value":"6-7"},
      {"section":"","label":"Interruptible","value":"50"},
      {"section":"","label":"Animation length","value":"49"},
    ],
  },
  'Neutral_special': {
    url: `${SMASHWIKI_FALCON_BASE_URL}/Neutral_special`,
    hitboxes: [
      {"section":"Grounded","group":"Normal","id":0,"part":0,"rehitRate":0,"damage":25,"shieldDamage":0,"angle":361,"facing":"Standard","baseKnockback":93,"knockbackGrowth":59,"fixedKnockback":0,"setWeight":false,"radius":4.5,"bone":"armr","offsetX":-1,"offsetY":0,"offsetZ":0,"hitlagMultiplier":1.5,"sdiMultiplier":1,"tripChance":0,"clang":false,"rebound":false,"effect":"Flame","attackType":"Hand","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"L","soundKind":"Kick","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"Grounded","group":"Normal","id":1,"part":0,"rehitRate":0,"damage":25,"shieldDamage":0,"angle":361,"facing":"Standard","baseKnockback":93,"knockbackGrowth":59,"fixedKnockback":0,"setWeight":false,"radius":2.5,"bone":"shoulderr","offsetX":-2.5,"offsetY":0,"offsetZ":0,"hitlagMultiplier":1.5,"sdiMultiplier":1,"tripChance":0,"clang":false,"rebound":false,"effect":"Flame","attackType":"Hand","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"L","soundKind":"Kick","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"Grounded","group":"Normal","id":2,"part":0,"rehitRate":0,"damage":25,"shieldDamage":0,"angle":361,"facing":"Standard","baseKnockback":93,"knockbackGrowth":59,"fixedKnockback":0,"setWeight":false,"radius":4,"bone":"armr","offsetX":4.2,"offsetY":0,"offsetZ":0,"hitlagMultiplier":1.5,"sdiMultiplier":1,"tripChance":0,"clang":false,"rebound":false,"effect":"Flame","attackType":"Hand","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"L","soundKind":"Kick","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"Grounded","group":"Reversed","id":0,"part":0,"rehitRate":0,"damage":28,"shieldDamage":0,"angle":361,"facing":"Standard","baseKnockback":85,"knockbackGrowth":65,"fixedKnockback":0,"setWeight":false,"radius":4.5,"bone":"armr","offsetX":-1,"offsetY":0,"offsetZ":0,"hitlagMultiplier":1.5,"sdiMultiplier":1,"tripChance":0,"clang":false,"rebound":false,"effect":"Flame","attackType":"Hand","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"L","soundKind":"Kick","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"Grounded","group":"Reversed","id":1,"part":0,"rehitRate":0,"damage":28,"shieldDamage":0,"angle":361,"facing":"Standard","baseKnockback":85,"knockbackGrowth":65,"fixedKnockback":0,"setWeight":false,"radius":2.5,"bone":"shoulderr","offsetX":-2.5,"offsetY":0,"offsetZ":0,"hitlagMultiplier":1.5,"sdiMultiplier":1,"tripChance":0,"clang":false,"rebound":false,"effect":"Flame","attackType":"Hand","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"L","soundKind":"Kick","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"Grounded","group":"Reversed","id":2,"part":0,"rehitRate":0,"damage":28,"shieldDamage":0,"angle":361,"facing":"Standard","baseKnockback":85,"knockbackGrowth":65,"fixedKnockback":0,"setWeight":false,"radius":4,"bone":"armr","offsetX":4.2,"offsetY":0,"offsetZ":0,"hitlagMultiplier":1.5,"sdiMultiplier":1,"tripChance":0,"clang":false,"rebound":false,"effect":"Flame","attackType":"Hand","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"L","soundKind":"Kick","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"Aerial","group":"Normal","id":0,"part":0,"rehitRate":0,"damage":22,"shieldDamage":0,"angle":361,"facing":"Standard","baseKnockback":93,"knockbackGrowth":59,"fixedKnockback":0,"setWeight":false,"radius":5.175,"bone":"armr","offsetX":-1,"offsetY":0,"offsetZ":0,"hitlagMultiplier":1.5,"sdiMultiplier":1,"tripChance":0,"clang":false,"rebound":false,"effect":"Flame","attackType":"Hand","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"L","soundKind":"Kick","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"Aerial","group":"Normal","id":1,"part":0,"rehitRate":0,"damage":22,"shieldDamage":0,"angle":361,"facing":"Standard","baseKnockback":93,"knockbackGrowth":59,"fixedKnockback":0,"setWeight":false,"radius":2.875,"bone":"shoulderr","offsetX":-2.5,"offsetY":0,"offsetZ":0,"hitlagMultiplier":1.5,"sdiMultiplier":1,"tripChance":0,"clang":false,"rebound":false,"effect":"Flame","attackType":"Hand","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"L","soundKind":"Kick","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"Aerial","group":"Normal","id":2,"part":0,"rehitRate":0,"damage":22,"shieldDamage":0,"angle":361,"facing":"Standard","baseKnockback":93,"knockbackGrowth":59,"fixedKnockback":0,"setWeight":false,"radius":4.6,"bone":"armr","offsetX":4.2,"offsetY":0,"offsetZ":0,"hitlagMultiplier":1.5,"sdiMultiplier":1,"tripChance":0,"clang":false,"rebound":false,"effect":"Flame","attackType":"Hand","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"L","soundKind":"Kick","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"Aerial","group":"Reversed","id":0,"part":0,"rehitRate":0,"damage":25,"shieldDamage":0,"angle":361,"facing":"Standard","baseKnockback":93,"knockbackGrowth":59,"fixedKnockback":0,"setWeight":false,"radius":5.175,"bone":"armr","offsetX":-1,"offsetY":0,"offsetZ":0,"hitlagMultiplier":1.5,"sdiMultiplier":1,"tripChance":0,"clang":false,"rebound":false,"effect":"Flame","attackType":"Hand","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"L","soundKind":"Kick","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"Aerial","group":"Reversed","id":1,"part":0,"rehitRate":0,"damage":25,"shieldDamage":0,"angle":361,"facing":"Standard","baseKnockback":93,"knockbackGrowth":59,"fixedKnockback":0,"setWeight":false,"radius":2.875,"bone":"shoulderr","offsetX":-2.5,"offsetY":0,"offsetZ":0,"hitlagMultiplier":1.5,"sdiMultiplier":1,"tripChance":0,"clang":false,"rebound":false,"effect":"Flame","attackType":"Hand","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"L","soundKind":"Kick","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"Aerial","group":"Reversed","id":2,"part":0,"rehitRate":0,"damage":25,"shieldDamage":0,"angle":361,"facing":"Standard","baseKnockback":93,"knockbackGrowth":59,"fixedKnockback":0,"setWeight":false,"radius":4.6,"bone":"armr","offsetX":4.2,"offsetY":0,"offsetZ":0,"hitlagMultiplier":1.5,"sdiMultiplier":1,"tripChance":0,"clang":false,"rebound":false,"effect":"Flame","attackType":"Hand","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"L","soundKind":"Kick","shieldstunMultiplier":1,"extraShieldstunFrames":0},
    ],
    grabboxes: [
    ],
    throws: [
    ],
    timing: [
      {"section":"Normal","label":"Hitbox","value":"53-57"},
      {"section":"Normal","label":"Interruptible","value":"104"},
      {"section":"Normal","label":"Animation length (grounded)","value":"115"},
      {"section":"Normal","label":"Animation length (aerial)","value":"124"},
      {"section":"Reversed","label":"Transition start","value":"15"},
      {"section":"Reversed","label":"Turnaround","value":"35"},
      {"section":"Reversed","label":"Hitbox","value":"62-66"},
      {"section":"Reversed","label":"Interruptible","value":"118"},
      {"section":"Reversed","label":"Animation length (grounded)","value":"123"},
      {"section":"Reversed","label":"Animation length (aerial)","value":"133"},
    ],
  },
  'Pummel': {
    url: `${SMASHWIKI_FALCON_BASE_URL}/Pummel`,
    hitboxes: [
      {"section":"","group":"","id":0,"part":0,"rehitRate":0,"damage":1.3,"shieldDamage":0,"angle":361,"facing":"Forward","baseKnockback":0,"knockbackGrowth":100,"fixedKnockback":30,"setWeight":false,"radius":6.2,"bone":"top","offsetX":0,"offsetY":10,"offsetZ":12,"hitlagMultiplier":2.1,"sdiMultiplier":1,"tripChance":0,"clang":false,"rebound":false,"effect":"Normal","attackType":"Knee","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"S","soundKind":"Kick","shieldstunMultiplier":1,"extraShieldstunFrames":0},
    ],
    grabboxes: [
    ],
    throws: [
    ],
    timing: [
      {"section":"","label":"Hitbox","value":"1"},
      {"section":"","label":"Interruptible","value":"7"},
      {"section":"","label":"Animation length","value":"13"},
    ],
  },
  'Side_special': {
    url: `${SMASHWIKI_FALCON_BASE_URL}/Side_special`,
    hitboxes: [
      {"section":"Grounded","group":"Inert detector","id":0,"part":0,"rehitRate":0,"damage":0,"shieldDamage":0,"angle":361,"facing":"Forward","baseKnockback":0,"knockbackGrowth":0,"fixedKnockback":0,"setWeight":false,"radius":4,"bone":"top","offsetX":0,"offsetY":[9,5],"offsetZ":8.8,"hitlagMultiplier":1,"sdiMultiplier":1,"tripChance":0,"clang":false,"rebound":false,"effect":"Inert","attackType":"Typeless","hitsGrounded":true,"hitsAerial":false,"direct":false,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"S","soundKind":"None","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"Grounded","group":"Inert detector","id":1,"part":0,"rehitRate":0,"damage":0,"shieldDamage":0,"angle":361,"facing":"Forward","baseKnockback":0,"knockbackGrowth":0,"fixedKnockback":0,"setWeight":false,"radius":4,"bone":"top","offsetX":0,"offsetY":[12,5],"offsetZ":8.8,"hitlagMultiplier":1,"sdiMultiplier":1,"tripChance":0,"clang":false,"rebound":false,"effect":"Inert","attackType":"Typeless","hitsGrounded":false,"hitsAerial":true,"direct":false,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"S","soundKind":"None","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"Grounded","group":"Clean hit","id":0,"part":0,"rehitRate":0,"damage":10,"shieldDamage":4,"angle":85,"facing":"Forward","baseKnockback":82,"knockbackGrowth":30,"fixedKnockback":0,"setWeight":false,"radius":6,"bone":"handl","offsetX":0,"offsetY":-2,"offsetZ":-1,"hitlagMultiplier":1.5,"sdiMultiplier":1,"tripChance":0,"clang":false,"rebound":false,"effect":"Flame","attackType":"Hand","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"L","soundKind":"Fire","shieldstunMultiplier":1,"extraShieldstunFrames":3},
      {"section":"Grounded","group":"Clean hit","id":1,"part":0,"rehitRate":0,"damage":10,"shieldDamage":4,"angle":85,"facing":"Forward","baseKnockback":82,"knockbackGrowth":30,"fixedKnockback":0,"setWeight":false,"radius":5.5,"bone":"top","offsetX":0,"offsetY":9,"offsetZ":[5.5,12.5],"hitlagMultiplier":1.5,"sdiMultiplier":1,"tripChance":0,"clang":false,"rebound":false,"effect":"Flame","attackType":"Hand","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"L","soundKind":"Fire","shieldstunMultiplier":1,"extraShieldstunFrames":3},
      {"section":"Grounded","group":"Late hit","id":0,"part":0,"rehitRate":0,"damage":10,"shieldDamage":4,"angle":85,"facing":"Forward","baseKnockback":82,"knockbackGrowth":30,"fixedKnockback":0,"setWeight":false,"radius":4.5,"bone":"handl","offsetX":0,"offsetY":0,"offsetZ":0,"hitlagMultiplier":1.5,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":false,"effect":"Flame","attackType":"Hand","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"L","soundKind":"Fire","shieldstunMultiplier":1,"extraShieldstunFrames":3},
      {"section":"Aerial","group":"Inert detector","id":0,"part":0,"rehitRate":0,"damage":0,"shieldDamage":0,"angle":361,"facing":"Standard","baseKnockback":0,"knockbackGrowth":0,"fixedKnockback":0,"setWeight":false,"radius":4.1,"bone":"top","offsetX":0,"offsetY":[12,3],"offsetZ":11,"hitlagMultiplier":1,"sdiMultiplier":1,"tripChance":0,"clang":false,"rebound":false,"effect":"Inert","attackType":"Typeless","hitsGrounded":true,"hitsAerial":true,"direct":false,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"S","soundKind":"None","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"Aerial","group":"Clean hit","id":0,"part":0,"rehitRate":0,"damage":10,"shieldDamage":2,"angle":270,"facing":"Forward","baseKnockback":60,"knockbackGrowth":70,"fixedKnockback":0,"setWeight":false,"radius":8,"bone":"arml","offsetX":8,"offsetY":0,"offsetZ":0.4,"hitlagMultiplier":2,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":false,"effect":"Flame","attackType":"Hand","hitsGrounded":false,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"L","soundKind":"Fire","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"Aerial","group":"Clean hit","id":1,"part":0,"rehitRate":0,"damage":10,"shieldDamage":2,"angle":60,"facing":"Forward","baseKnockback":60,"knockbackGrowth":80,"fixedKnockback":0,"setWeight":false,"radius":8,"bone":"arml","offsetX":8,"offsetY":0,"offsetZ":0.4,"hitlagMultiplier":2,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":false,"effect":"Flame","attackType":"Hand","hitsGrounded":true,"hitsAerial":false,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"L","soundKind":"Fire","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"Aerial","group":"Clean hit","id":2,"part":0,"rehitRate":0,"damage":10,"shieldDamage":2,"angle":60,"facing":"Forward","baseKnockback":60,"knockbackGrowth":80,"fixedKnockback":0,"setWeight":false,"radius":2.5,"bone":"arml","offsetX":[-2,-5],"offsetY":0,"offsetZ":0,"hitlagMultiplier":2,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":false,"effect":"Flame","attackType":"Hand","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"L","soundKind":"Fire","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"Aerial","group":"Late hit","id":0,"part":0,"rehitRate":0,"damage":10,"shieldDamage":2,"angle":270,"facing":"Forward","baseKnockback":60,"knockbackGrowth":70,"fixedKnockback":0,"setWeight":false,"radius":8,"bone":"arml","offsetX":8,"offsetY":0,"offsetZ":0.4,"hitlagMultiplier":2,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":false,"effect":"Flame","attackType":"Hand","hitsGrounded":false,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"L","soundKind":"Fire","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"Aerial","group":"Late hit","id":1,"part":0,"rehitRate":0,"damage":10,"shieldDamage":2,"angle":60,"facing":"Forward","baseKnockback":60,"knockbackGrowth":80,"fixedKnockback":0,"setWeight":false,"radius":8,"bone":"arml","offsetX":8,"offsetY":0,"offsetZ":0.4,"hitlagMultiplier":2,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":false,"effect":"Flame","attackType":"Hand","hitsGrounded":true,"hitsAerial":false,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"L","soundKind":"Fire","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"Aerial","group":"Late hit","id":2,"part":0,"rehitRate":0,"damage":10,"shieldDamage":2,"angle":60,"facing":"Forward","baseKnockback":60,"knockbackGrowth":80,"fixedKnockback":0,"setWeight":false,"radius":4,"bone":"top","offsetX":0,"offsetY":[8,1],"offsetZ":[5.5,3],"hitlagMultiplier":2,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":false,"effect":"Flame","attackType":"Hand","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"L","soundKind":"Fire","shieldstunMultiplier":1,"extraShieldstunFrames":0},
    ],
    grabboxes: [
    ],
    throws: [
    ],
    timing: [
      {"section":"Grounded","label":"Inert hitboxes","value":"10-25"},
      {"section":"Grounded","label":"Interruptible","value":"72"},
      {"section":"Grounded","label":"Animation length","value":"89"},
      {"section":"Aerial","label":"Inert hitbox","value":"19-35"},
      {"section":"Aerial","label":"Animation length","value":"79"},
      {"section":"Grounded hit","label":"Damage-based armor","value":"1-5"},
      {"section":"Grounded hit","label":"Clean hit","value":"5"},
      {"section":"Grounded hit","label":"Late hit","value":"6-7"},
      {"section":"Grounded hit","label":"Interruptible","value":"28"},
      {"section":"Grounded hit","label":"Animation length","value":"37"},
      {"section":"Aerial hit","label":"Clean hit","value":"5"},
      {"section":"Aerial hit","label":"Late hit","value":"6"},
      {"section":"Aerial hit","label":"Interruptible","value":"45"},
      {"section":"Aerial hit","label":"Animation length","value":"64"},
      {"section":"Landing","label":"Interruptible","value":"23"},
      {"section":"Landing","label":"Animation length","value":"32"},
    ],
  },
  'Up_aerial': {
    url: `${SMASHWIKI_FALCON_BASE_URL}/Up_aerial`,
    hitboxes: [
      {"section":"","group":"Clean hit","id":0,"part":0,"rehitRate":0,"damage":10,"shieldDamage":0,"angle":66,"facing":"Standard","baseKnockback":20,"knockbackGrowth":96,"fixedKnockback":0,"setWeight":false,"radius":4.5,"bone":"legl","offsetX":3.2,"offsetY":2.1,"offsetZ":0,"hitlagMultiplier":1,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":true,"effect":"Normal","attackType":"Foot","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"M","soundKind":"Kick","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"","group":"Clean hit","id":1,"part":0,"rehitRate":0,"damage":9,"shieldDamage":0,"angle":66,"facing":"Standard","baseKnockback":20,"knockbackGrowth":96,"fixedKnockback":0,"setWeight":false,"radius":5,"bone":"kneel","offsetX":6.2,"offsetY":0.9,"offsetZ":-0.4,"hitlagMultiplier":1,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":true,"effect":"Normal","attackType":"Foot","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"M","soundKind":"Kick","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"","group":"Late hit","id":0,"part":0,"rehitRate":0,"damage":9,"shieldDamage":0,"angle":30,"facing":"Standard","baseKnockback":12,"knockbackGrowth":80,"fixedKnockback":0,"setWeight":false,"radius":4.5,"bone":"legl","offsetX":3.2,"offsetY":2.1,"offsetZ":0,"hitlagMultiplier":1,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":true,"effect":"Normal","attackType":"Foot","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"M","soundKind":"Kick","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"","group":"Late hit","id":1,"part":0,"rehitRate":0,"damage":8,"shieldDamage":0,"angle":30,"facing":"Standard","baseKnockback":12,"knockbackGrowth":80,"fixedKnockback":0,"setWeight":false,"radius":5,"bone":"kneel","offsetX":6.2,"offsetY":0.9,"offsetZ":-0.4,"hitlagMultiplier":1,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":true,"effect":"Normal","attackType":"Foot","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"M","soundKind":"Kick","shieldstunMultiplier":1,"extraShieldstunFrames":0},
    ],
    grabboxes: [
    ],
    throws: [
    ],
    timing: [
      {"section":"Attack","label":"Clean hit","value":"7-10"},
      {"section":"Attack","label":"Late hit","value":"11-12"},
      {"section":"Attack","label":"Ending autocancel","value":"24-"},
      {"section":"Attack","label":"Interruptible","value":"32"},
      {"section":"Attack","label":"Animation length","value":"52"},
      {"section":"Landing lag","label":"Interruptible","value":"11"},
      {"section":"Landing lag","label":"Animation length","value":"16"},
    ],
  },
  'Up_smash': {
    url: `${SMASHWIKI_FALCON_BASE_URL}/Up_smash`,
    hitboxes: [
      {"section":"","group":"Early hit 1","id":0,"part":0,"rehitRate":0,"damage":7,"shieldDamage":0,"angle":110,"facing":"Standard","baseKnockback":0,"knockbackGrowth":90,"fixedKnockback":150,"setWeight":false,"radius":5.7,"bone":"top","offsetX":0,"offsetY":7.5,"offsetZ":10,"hitlagMultiplier":1,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":true,"effect":"Normal","attackType":"Typeless","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"S","soundKind":"None","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"","group":"Early hit 1","id":1,"part":0,"rehitRate":0,"damage":7,"shieldDamage":0,"angle":96,"facing":"Standard","baseKnockback":0,"knockbackGrowth":90,"fixedKnockback":80,"setWeight":false,"radius":6,"bone":"top","offsetX":0,"offsetY":17,"offsetZ":5,"hitlagMultiplier":1,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":true,"effect":"Normal","attackType":"Foot","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"M","soundKind":"Kick","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"","group":"Early hit 1","id":3,"part":0,"rehitRate":0,"damage":12,"shieldDamage":0,"angle":80,"facing":"Forward","baseKnockback":5,"knockbackGrowth":90,"fixedKnockback":10,"setWeight":false,"radius":4.8,"bone":"top","offsetX":0,"offsetY":21,"offsetZ":1.5,"hitlagMultiplier":1,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":true,"effect":"Normal","attackType":"Foot","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"L","soundKind":"Kick","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"","group":"Early hit 1","id":2,"part":0,"rehitRate":0,"damage":12,"shieldDamage":0,"angle":80,"facing":"Standard","baseKnockback":0,"knockbackGrowth":90,"fixedKnockback":0,"setWeight":false,"radius":4.8,"bone":"top","offsetX":0,"offsetY":28,"offsetZ":5,"hitlagMultiplier":1,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":true,"effect":"Normal","attackType":"Foot","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"L","soundKind":"Kick","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"","group":"Late hit 1","id":0,"part":0,"rehitRate":0,"damage":7,"shieldDamage":0,"angle":110,"facing":"Standard","baseKnockback":0,"knockbackGrowth":90,"fixedKnockback":150,"setWeight":false,"radius":5.7,"bone":"top","offsetX":0,"offsetY":7.5,"offsetZ":10,"hitlagMultiplier":1,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":true,"effect":"Normal","attackType":"Typeless","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"S","soundKind":"None","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"","group":"Late hit 1","id":3,"part":0,"rehitRate":0,"damage":12,"shieldDamage":0,"angle":80,"facing":"Forward","baseKnockback":5,"knockbackGrowth":90,"fixedKnockback":10,"setWeight":false,"radius":4.8,"bone":"top","offsetX":0,"offsetY":21,"offsetZ":1.5,"hitlagMultiplier":1,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":true,"effect":"Normal","attackType":"Foot","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"L","soundKind":"Kick","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"","group":"Late hit 1","id":2,"part":0,"rehitRate":0,"damage":12,"shieldDamage":0,"angle":80,"facing":"Standard","baseKnockback":0,"knockbackGrowth":90,"fixedKnockback":0,"setWeight":false,"radius":4.8,"bone":"top","offsetX":0,"offsetY":28,"offsetZ":5,"hitlagMultiplier":1,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":true,"effect":"Normal","attackType":"Foot","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"L","soundKind":"Kick","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"","group":"Hit 2","id":0,"part":0,"rehitRate":0,"damage":14,"shieldDamage":0,"angle":83,"facing":"Forward","baseKnockback":70,"knockbackGrowth":80,"fixedKnockback":0,"setWeight":false,"radius":6,"bone":"top","offsetX":0,"offsetY":29,"offsetZ":5.5,"hitlagMultiplier":1,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":true,"effect":"Normal","attackType":"Foot","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"L","soundKind":"Kick","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"","group":"Hit 2","id":1,"part":0,"rehitRate":0,"damage":14,"shieldDamage":0,"angle":85,"facing":"Forward","baseKnockback":70,"knockbackGrowth":81,"fixedKnockback":0,"setWeight":false,"radius":5.5,"bone":"top","offsetX":0,"offsetY":21,"offsetZ":2.5,"hitlagMultiplier":1,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":true,"effect":"Normal","attackType":"Foot","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"L","soundKind":"Kick","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"","group":"Hit 2","id":2,"part":0,"rehitRate":0,"damage":13,"shieldDamage":0,"angle":70,"facing":"Forward","baseKnockback":70,"knockbackGrowth":88,"fixedKnockback":0,"setWeight":false,"radius":5,"bone":"top","offsetX":0,"offsetY":16,"offsetZ":0.5,"hitlagMultiplier":1,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":true,"effect":"Normal","attackType":"Foot","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"L","soundKind":"Kick","shieldstunMultiplier":1,"extraShieldstunFrames":0},
    ],
    grabboxes: [
    ],
    throws: [
    ],
    timing: [
      {"section":"","label":"Charges between","value":"8-9"},
      {"section":"","label":"Early hit 1","value":"22"},
      {"section":"","label":"Late hit 1","value":"23"},
      {"section":"","label":"Right lower leg intangible","value":"22-23"},
      {"section":"","label":"Hit 2","value":"28-29"},
      {"section":"","label":"Left lower leg intangible","value":"28-29"},
      {"section":"","label":"Interruptible","value":"46"},
      {"section":"","label":"Animation length","value":"61"},
    ],
  },
  'Up_special': {
    url: `${SMASHWIKI_FALCON_BASE_URL}/Up_special`,
    hitboxes: [
      {"section":"","group":"Hit 1","id":0,"part":0,"rehitRate":0,"damage":5,"shieldDamage":0,"angle":361,"facing":"Forward","baseKnockback":50,"knockbackGrowth":100,"fixedKnockback":0,"setWeight":false,"radius":9.6,"bone":"rot","offsetX":0,"offsetY":0,"offsetZ":0,"hitlagMultiplier":1,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":true,"effect":"Flame","attackType":"Typeless","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"S","soundKind":"None","shieldstunMultiplier":1,"extraShieldstunFrames":0},
    ],
    grabboxes: [
      {"section":"","group":"Early grab","id":0,"radius":5,"bone":"top","offsetX":0,"offsetY":13,"offsetZ":7,"hitsGrounded":true,"hitsAerial":true},
      {"section":"","group":"Early grab","id":1,"radius":5.5,"bone":"top","offsetX":0,"offsetY":8.8,"offsetZ":13.7,"hitsGrounded":true,"hitsAerial":false},
      {"section":"","group":"Late grab","id":0,"radius":5,"bone":"top","offsetX":0,"offsetY":15,"offsetZ":6,"hitsGrounded":true,"hitsAerial":true},
      {"section":"","group":"Late grab","id":1,"radius":5,"bone":"top","offsetX":0,"offsetY":11,"offsetZ":6,"hitsGrounded":true,"hitsAerial":true},
    ],
    throws: [
      {"section":"","kind":"Throw","id":0,"damage":13,"angle":50,"facing":"Forward","baseKnockback":85,"knockbackGrowth":62,"fixedKnockback":0,"hitlagMultiplier":0,"effect":"Normal","attackType":"Throwing","soundLevel":"L","soundKind":"Fire"},
      {"section":"","kind":"Break","id":0,"damage":8,"angle":0,"facing":"Forward","baseKnockback":100,"knockbackGrowth":10,"fixedKnockback":0,"hitlagMultiplier":0,"effect":"Normal","attackType":"Throwing","soundLevel":"S","soundKind":"Kick"},
    ],
    timing: [
      {"section":"Rising","label":"Optional reverse","value":"14"},
      {"section":"Rising","label":"Early grab","value":"14"},
      {"section":"Rising","label":"Late grab","value":"15-30"},
      {"section":"Rising","label":"Animation length","value":"66"},
      {"section":"Throw","label":"Hitbox","value":"2-3"},
      {"section":"Throw","label":"Throw release","value":"17"},
      {"section":"Throw","label":"Interruptible","value":"40"},
      {"section":"Throw","label":"Animation length","value":"71"},
      {"section":"Landing","label":"Interruptible","value":"25"},
      {"section":"Landing","label":"Animation length","value":"35"},
    ],
  },
  'Up_throw': {
    url: `${SMASHWIKI_FALCON_BASE_URL}/Up_throw`,
    hitboxes: [
      {"section":"","group":"Hitbox","id":0,"part":0,"rehitRate":0,"damage":4,"shieldDamage":0,"angle":80,"facing":"Forward","baseKnockback":60,"knockbackGrowth":100,"fixedKnockback":0,"setWeight":false,"radius":4.5,"bone":"arml","offsetX":4.8,"offsetY":0,"offsetZ":0,"hitlagMultiplier":1.6,"sdiMultiplier":1,"tripChance":0,"clang":false,"rebound":false,"effect":"Normal","attackType":"Hand","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"L","soundKind":"Punch","shieldstunMultiplier":1,"extraShieldstunFrames":0},
    ],
    grabboxes: [
    ],
    throws: [
      {"section":"","kind":"Throw","id":0,"damage":5,"angle":84,"facing":"Forward","baseKnockback":68,"knockbackGrowth":100,"fixedKnockback":0,"hitlagMultiplier":0,"effect":"Normal","attackType":"Throwing","soundLevel":"S","soundKind":"None"},
      {"section":"","kind":"Break","id":0,"damage":3,"angle":361,"facing":"Forward","baseKnockback":60,"knockbackGrowth":100,"fixedKnockback":0,"hitlagMultiplier":0,"effect":"Normal","attackType":"Throwing","soundLevel":"S","soundKind":"None"},
    ],
    timing: [
      {"section":"","label":"Invincibility","value":"1-14"},
      {"section":"","label":"Hitbox","value":"12-13"},
      {"section":"","label":"Throw Release","value":"14"},
      {"section":"","label":"Interruptible","value":"38"},
      {"section":"","label":"Animation length","value":"64"},
    ],
  },
  'Up_tilt': {
    url: `${SMASHWIKI_FALCON_BASE_URL}/Up_tilt`,
    hitboxes: [
      {"section":"","group":"","id":0,"part":0,"rehitRate":0,"damage":11,"shieldDamage":0,"angle":285,"facing":"Standard","baseKnockback":35,"knockbackGrowth":100,"fixedKnockback":0,"setWeight":false,"radius":6,"bone":"kneer","offsetX":7,"offsetY":-1,"offsetZ":0.5,"hitlagMultiplier":1,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":true,"effect":"Normal","attackType":"Foot","hitsGrounded":true,"hitsAerial":false,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"M","soundKind":"Kick","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"","group":"","id":1,"part":0,"rehitRate":0,"damage":11,"shieldDamage":0,"angle":285,"facing":"Standard","baseKnockback":22,"knockbackGrowth":90,"fixedKnockback":0,"setWeight":false,"radius":3.5,"bone":"kneer","offsetX":7,"offsetY":-1,"offsetZ":0.5,"hitlagMultiplier":1.4,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":true,"effect":"Normal","attackType":"Foot","hitsGrounded":false,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"M","soundKind":"Kick","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"","group":"","id":2,"part":0,"rehitRate":0,"damage":11,"shieldDamage":0,"angle":285,"facing":"Standard","baseKnockback":35,"knockbackGrowth":100,"fixedKnockback":0,"setWeight":false,"radius":4,"bone":"legr","offsetX":5,"offsetY":0,"offsetZ":0.5,"hitlagMultiplier":1,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":true,"effect":"Normal","attackType":"Foot","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"M","soundKind":"Kick","shieldstunMultiplier":1,"extraShieldstunFrames":0},
      {"section":"","group":"","id":3,"part":0,"rehitRate":0,"damage":11,"shieldDamage":0,"angle":285,"facing":"Standard","baseKnockback":35,"knockbackGrowth":100,"fixedKnockback":0,"setWeight":false,"radius":3,"bone":"legr","offsetX":0,"offsetY":0,"offsetZ":0,"hitlagMultiplier":1,"sdiMultiplier":1,"tripChance":0,"clang":true,"rebound":true,"effect":"Normal","attackType":"Foot","hitsGrounded":true,"hitsAerial":true,"direct":true,"blockable":true,"reflectable":false,"absorbable":false,"flinchless":false,"noGfx":false,"heedless":false,"soundLevel":"M","soundKind":"Kick","shieldstunMultiplier":1,"extraShieldstunFrames":0},
    ],
    grabboxes: [
    ],
    throws: [
    ],
    timing: [
      {"section":"","label":"Hitboxes","value":"14-17"},
      {"section":"","label":"Lower leg intangible","value":"14-17"},
      {"section":"","label":"Interruptible","value":"37"},
      {"section":"","label":"Animation length","value":"56"},
    ],
  },
};
