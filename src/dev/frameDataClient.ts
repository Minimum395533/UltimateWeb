import type {
  AnimationDraft,
  AnimationFrame,
  ConfirmedFrameCount,
  ReferenceAssetMetadata,
  ReferenceSettings,
} from '../types/frameData.ts';

const API_BASE = '/api/dev/frame-data';

interface CreateDraftRequest {
  animationId: string;
  name?: string;
  frames: AnimationFrame[];
  referenceSettings?: ReferenceSettings;
}

interface UpdateDraftRequest {
  name: string;
  frames: AnimationFrame[];
  referenceAssetId: string | null;
  referenceSettings: ReferenceSettings;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body instanceof Blob ? {} : { 'Content-Type': 'application/json' }),
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(error?.error ?? `Frame data request failed (${response.status}).`);
  }
  return response.json() as Promise<T>;
}

export function listAnimationDrafts(): Promise<AnimationDraft[]> {
  return requestJson(API_BASE);
}

export function createAnimationDraft(input: CreateDraftRequest): Promise<AnimationDraft> {
  return requestJson(API_BASE, { method: 'POST', body: JSON.stringify(input) });
}

export function updateAnimationDraft(id: string, input: UpdateDraftRequest): Promise<AnimationDraft> {
  return requestJson(`${API_BASE}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function deleteAnimationDraft(id: string): Promise<void> {
  await requestJson(`${API_BASE}/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function listConfirmedFrameCounts(): Promise<ConfirmedFrameCount[]> {
  return requestJson(`${API_BASE}/frame-counts`);
}

export function confirmFrameCount(animationId: string, frameCount: number): Promise<ConfirmedFrameCount> {
  return requestJson(`${API_BASE}/frame-counts/${encodeURIComponent(animationId)}`, {
    method: 'PUT',
    body: JSON.stringify({ frameCount }),
  });
}

export async function clearConfirmedFrameCount(animationId: string): Promise<void> {
  await requestJson(`${API_BASE}/frame-counts/${encodeURIComponent(animationId)}`, { method: 'DELETE' });
}

export function uploadReference(draftId: string, file: File): Promise<ReferenceAssetMetadata> {
  const parameters = new URLSearchParams({ fileName: file.name });
  return requestJson(`${API_BASE}/${encodeURIComponent(draftId)}/assets?${parameters}`, {
    method: 'POST',
    body: file,
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
  });
}

export async function getReference(draftId: string, assetId: string): Promise<Blob> {
  const response = await fetch(
    `${API_BASE}/${encodeURIComponent(draftId)}/assets/${encodeURIComponent(assetId)}`,
    { cache: 'no-store' },
  );
  if (!response.ok) {
    const error = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(error?.error ?? `Reference image request failed (${response.status}).`);
  }
  return response.blob();
}

export async function deleteReference(draftId: string, assetId: string): Promise<void> {
  await requestJson(
    `${API_BASE}/${encodeURIComponent(draftId)}/assets/${encodeURIComponent(assetId)}`,
    { method: 'DELETE' },
  );
}
