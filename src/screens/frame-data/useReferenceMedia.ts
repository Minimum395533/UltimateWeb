import { useCallback, useEffect, useRef, useState } from 'react';
import { decompressFrames, parseGIF } from 'gifuct-js';
import type { ParsedFrame } from 'gifuct-js';
import { getReference } from '../../dev/frameDataClient';
import { isAnimatedWebp } from '../../dev/webpAnimation';
import type { ReferenceAssetMetadata } from '../../types/frameData';

type AnimatedReference =
  | { format: 'GIF'; frames: ParsedFrame[]; width: number; height: number }
  | { format: 'WEBP'; decoder: ImageDecoder; frameCount: number };

const isGif = (asset: ReferenceAssetMetadata) =>
  asset.mediaType.toLowerCase().includes('gif') || asset.fileName.toLowerCase().endsWith('.gif');
const isWebp = (asset: ReferenceAssetMetadata) =>
  asset.mediaType.toLowerCase().includes('webp') || asset.fileName.toLowerCase().endsWith('.webp');

export interface ReferenceMedia {
  url: string | null;
  error: string | null;
  loading: boolean;
  /** 0 for still images. */
  frameCount: number;
  format: 'GIF' | 'WEBP' | 'STILL' | null;
  frameIndex: number;
  setFrameIndex: (index: number) => void;
  step: (direction: -1 | 1) => void;
  playing: boolean;
  setPlaying: (playing: boolean) => void;
}

/**
 * Loads a reference asset and exposes frame-by-frame stepping for animated
 * GIF and WebP files. `forcedFrame` pins the shown frame (used when editor
 * frames are linked to reference frames).
 */
export function useReferenceMedia(
  draftId: string | null,
  asset: ReferenceAssetMetadata | null,
  forcedFrame: number | null,
): ReferenceMedia {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [animated, setAnimated] = useState<AnimatedReference | null>(null);
  const [isStill, setIsStill] = useState(false);
  const [frameIndex, setFrameIndexState] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [webpDuration, setWebpDuration] = useState(100);
  const decodeRequest = useRef(0);
  const assetId = asset?.id ?? null;

  useEffect(() => {
    let alive = true;
    let ownedUrl: string | null = null;
    let ownedDecoder: ImageDecoder | null = null;
    setError(null);
    setUrl(null);
    setAnimated(null);
    setIsStill(false);
    setFrameIndexState(0);
    setPlaying(false);
    if (!draftId || !asset) {
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    getReference(draftId, asset.id)
      .then(async (blob) => {
        if (!alive) return;
        if (isGif(asset)) {
          const parsed = parseGIF(await blob.arrayBuffer());
          const frames = decompressFrames(parsed, true);
          if (!frames.length) throw new Error('This GIF contains no displayable frames.');
          if (alive) setAnimated({ format: 'GIF', frames, width: parsed.lsd.width, height: parsed.lsd.height });
          return;
        }
        if (isWebp(asset) && await isAnimatedWebp(blob)) {
          if (typeof ImageDecoder === 'undefined') {
            throw new Error('Animated WebP frame stepping needs a browser with WebCodecs ImageDecoder support.');
          }
          const decoder = new ImageDecoder({ data: await blob.arrayBuffer(), type: 'image/webp', preferAnimation: true });
          ownedDecoder = decoder;
          await decoder.tracks.ready;
          const track = decoder.tracks.selectedTrack;
          if (alive && track?.animated && track.frameCount > 1) {
            setAnimated({ format: 'WEBP', decoder, frameCount: track.frameCount });
            return;
          }
          decoder.close();
          ownedDecoder = null;
        }
        if (!alive) return;
        ownedUrl = URL.createObjectURL(blob);
        setUrl(ownedUrl);
        setIsStill(true);
      })
      .catch((loadError: unknown) => {
        if (alive) setError(loadError instanceof Error ? loadError.message : 'Could not load the reference image.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
      decodeRequest.current += 1;
      ownedDecoder?.close();
      if (ownedUrl) URL.revokeObjectURL(ownedUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload only when the asset changes
  }, [draftId, assetId]);

  const frameCount = animated?.format === 'GIF' ? animated.frames.length : animated?.frameCount ?? 0;
  const shownIndex = forcedFrame !== null && frameCount > 0
    ? Math.max(0, Math.min(frameCount - 1, forcedFrame))
    : frameIndex;

  // Composite GIF frames up to the shown index (handles disposal modes).
  useEffect(() => {
    if (animated?.format !== 'GIF') return;
    const canvas = document.createElement('canvas');
    canvas.width = animated.width;
    canvas.height = animated.height;
    const context = canvas.getContext('2d');
    if (!context) return;
    let restore: ImageData | null = null;
    for (let index = 0; index <= shownIndex; index += 1) {
      const previous = animated.frames[index - 1];
      if (previous?.disposalType === 2) {
        context.clearRect(previous.dims.left, previous.dims.top, previous.dims.width, previous.dims.height);
      } else if (previous?.disposalType === 3 && restore) {
        context.putImageData(restore, 0, 0);
      }
      const current = animated.frames[index];
      restore = current.disposalType === 3 ? context.getImageData(0, 0, canvas.width, canvas.height) : null;
      const patch = new Uint8ClampedArray(current.patch.length);
      patch.set(current.patch);
      context.putImageData(new ImageData(patch, current.dims.width, current.dims.height), current.dims.left, current.dims.top);
    }
    setUrl(canvas.toDataURL('image/png'));
  }, [animated, shownIndex]);

  useEffect(() => {
    if (animated?.format !== 'WEBP') return undefined;
    let alive = true;
    const requestId = ++decodeRequest.current;
    void animated.decoder.decode({ frameIndex: shownIndex, completeFramesOnly: true }).then(({ image }) => {
      if (!alive || requestId !== decodeRequest.current) {
        image.close();
        return;
      }
      const canvas = document.createElement('canvas');
      canvas.width = image.displayWidth || image.codedWidth;
      canvas.height = image.displayHeight || image.codedHeight;
      canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
      setWebpDuration(Math.max(16, (image.duration ?? 100_000) / 1000));
      image.close();
      setUrl(canvas.toDataURL('image/png'));
    }).catch((decodeError: unknown) => {
      if (!alive) return;
      setPlaying(false);
      setError(decodeError instanceof Error ? decodeError.message : 'Could not decode this WebP frame.');
    });
    return () => {
      alive = false;
    };
  }, [animated, shownIndex]);

  const delay = animated?.format === 'GIF'
    ? Math.max(16, (animated.frames[frameIndex]?.delay || 10) * 10)
    : webpDuration;

  useEffect(() => {
    if (!playing || frameCount < 2 || forcedFrame !== null) return undefined;
    const timer = window.setTimeout(() => setFrameIndexState((index) => (index + 1) % frameCount), delay);
    return () => window.clearTimeout(timer);
  }, [playing, frameCount, frameIndex, delay, forcedFrame]);

  const setFrameIndex = useCallback((index: number) => {
    if (frameCount < 1) return;
    setFrameIndexState(Math.max(0, Math.min(frameCount - 1, index)));
  }, [frameCount]);

  const step = useCallback((direction: -1 | 1) => {
    if (frameCount < 1) return;
    setPlaying(false);
    setFrameIndexState((index) => (index + direction + frameCount) % frameCount);
  }, [frameCount]);

  return {
    url,
    error,
    loading,
    frameCount,
    format: animated?.format ?? (isStill ? 'STILL' : null),
    frameIndex: shownIndex,
    setFrameIndex,
    step,
    playing,
    setPlaying,
  };
}
