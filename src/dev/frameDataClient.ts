import type {
  MovementFrame,
  MovementFrameDraft,
  MovementState,
  ReferenceAssetMetadata,
} from '../types/frameData.ts';

interface CreateDraftRequest {
  motionState: MovementState;
  name?: string;
}

interface UpdateDraftRequest {
  name: string;
  frames: MovementFrame[];
  referenceAssetId: string | null;
}

async function requestJson<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
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

export function listMovementDrafts(): Promise<MovementFrameDraft[]> {
  return requestJson('/api/dev/frame-data');
}

export function createMovementDraft(
  input: CreateDraftRequest,
): Promise<MovementFrameDraft> {
  return requestJson('/api/dev/frame-data', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateMovementDraft(
  id: string,
  input: UpdateDraftRequest,
): Promise<MovementFrameDraft> {
  return requestJson(`/api/dev/frame-data/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function deleteMovementDraft(id: string): Promise<void> {
  await requestJson(`/api/dev/frame-data/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export function uploadMovementReference(
  draftId: string,
  file: File,
): Promise<ReferenceAssetMetadata> {
  const parameters = new URLSearchParams({ fileName: file.name });
  return requestJson(
    `/api/dev/frame-data/${encodeURIComponent(draftId)}/assets?${parameters}`,
    {
      method: 'POST',
      body: file,
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
    },
  );
}

export async function getMovementReference(
  draftId: string,
  assetId: string,
): Promise<Blob> {
  const response = await fetch(
    `/api/dev/frame-data/${encodeURIComponent(draftId)}/assets/${encodeURIComponent(assetId)}`,
    { cache: 'no-store' },
  );
  if (!response.ok) {
    const error = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(error?.error ?? `Reference image request failed (${response.status}).`);
  }
  return response.blob();
}

export async function deleteMovementReference(
  draftId: string,
  assetId: string,
): Promise<void> {
  await requestJson(
    `/api/dev/frame-data/${encodeURIComponent(draftId)}/assets/${encodeURIComponent(assetId)}`,
    { method: 'DELETE' },
  );
}
