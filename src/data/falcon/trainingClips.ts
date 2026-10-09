import { APPROVED_ANIMATIONS } from './approvedAnimations.ts';
import { getCatalogEntry } from './animationCatalog.ts';
import { seedAnimationFrames } from './seedAnimation.ts';
import { MOVEMENT_STATES } from '../../types/frameData.ts';
import type { AnimationDraft, MovementState } from '../../types/frameData.ts';
import type { AnimationClip } from '../../dev/animationPreview.ts';

export type TrainingClips = Partial<Record<MovementState, AnimationClip>>;

let defaultIdCounter = 0;
const defaultId = () => `default-${(defaultIdCounter += 1)}`;

/**
 * Clip for one animation, resolved in priority order:
 * working draft (playtest only) > approved game data > seeded default.
 */
export function resolveAnimationClip(
  animationId: string,
  draft?: AnimationDraft,
): AnimationClip | undefined {
  if (draft?.frames.length) {
    return { key: `draft:${draft.id}:${draft.updatedAt}`, animationId, source: 'draft', frames: draft.frames };
  }
  const approved = APPROVED_ANIMATIONS[animationId];
  if (approved?.frames.length) {
    return { key: `approved:${animationId}:${approved.approvedAt}`, animationId, source: 'approved', frames: approved.frames };
  }
  const entry = getCatalogEntry(animationId);
  if (!entry) return undefined;
  return {
    key: `default:${animationId}`,
    animationId,
    source: 'default',
    frames: seedAnimationFrames(entry, entry.frameCount, defaultId),
  };
}

/** Clips for every training movement state. Drafts are passed only in playtest mode. */
export function buildTrainingClips(drafts: readonly AnimationDraft[] = []): TrainingClips {
  const clips: TrainingClips = {};
  for (const { id } of MOVEMENT_STATES) {
    const clip = resolveAnimationClip(id, drafts.find((draft) => draft.animationId === id));
    if (clip) clips[id] = clip;
  }
  return clips;
}
