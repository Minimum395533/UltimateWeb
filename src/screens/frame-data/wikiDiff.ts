import { WIKI_MOVE_DATA } from '../../data/falcon/wikiMoveData';
import type { WikiGrabbox, WikiHitbox, WikiPageKey } from '../../data/falcon/wikiMoveData';
import type { FrameGrabbox, FrameHitbox, HitboxSource } from '../../types/frameData';

/** Hitbox properties that come straight from the SmashWiki table. */
export const WIKI_HITBOX_KEYS = [
  'part', 'rehitRate', 'damage', 'shieldDamage', 'angle', 'facing', 'baseKnockback',
  'knockbackGrowth', 'fixedKnockback', 'setWeight', 'radius', 'hitlagMultiplier',
  'sdiMultiplier', 'tripChance', 'clang', 'rebound', 'effect', 'attackType',
  'hitsGrounded', 'hitsAerial', 'soundLevel', 'soundKind', 'direct', 'blockable',
  'reflectable', 'absorbable', 'flinchless', 'noGfx', 'heedless',
  'shieldstunMultiplier', 'extraShieldstunFrames',
] as const satisfies readonly (keyof FrameHitbox & keyof WikiHitbox)[];

export type WikiHitboxKey = (typeof WIKI_HITBOX_KEYS)[number];

function isWikiPage(page: string): page is WikiPageKey {
  return Object.prototype.hasOwnProperty.call(WIKI_MOVE_DATA, page);
}

export function findWikiHitbox(source: HitboxSource): WikiHitbox | undefined {
  if (source.kind !== 'smashwiki' || !isWikiPage(source.page)) return undefined;
  return WIKI_MOVE_DATA[source.page].hitboxes.find(
    (row) => row.section === source.section && row.group === source.group && row.id === source.wikiId,
  );
}

export function findWikiGrabbox(source: HitboxSource): WikiGrabbox | undefined {
  if (source.kind !== 'smashwiki' || !isWikiPage(source.page)) return undefined;
  return WIKI_MOVE_DATA[source.page].grabboxes.find(
    (row) => row.section === source.section && row.group === source.group && row.id === source.wikiId,
  );
}

/** Wiki-sourced hitbox properties whose values no longer match SmashWiki. */
export function modifiedHitboxKeys(hitbox: FrameHitbox): Set<WikiHitboxKey> {
  const row = findWikiHitbox(hitbox.source);
  const changed = new Set<WikiHitboxKey>();
  if (!row) return changed;
  for (const key of WIKI_HITBOX_KEYS) {
    if (hitbox[key] !== row[key]) changed.add(key);
  }
  return changed;
}

/** Restores every SmashWiki-sourced property (position is left alone). */
export function restoreWikiHitbox(hitbox: FrameHitbox): FrameHitbox {
  const row = findWikiHitbox(hitbox.source);
  if (!row) return hitbox;
  const restored: FrameHitbox = { ...hitbox, hitboxId: row.id };
  for (const key of WIKI_HITBOX_KEYS) {
    (restored as unknown as Record<string, unknown>)[key] = row[key];
  }
  return restored;
}

export function grabboxModified(grabbox: FrameGrabbox): boolean {
  const row = findWikiGrabbox(grabbox.source);
  return Boolean(row && (row.radius !== grabbox.radius || row.id !== grabbox.grabboxId));
}
