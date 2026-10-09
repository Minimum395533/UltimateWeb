import { useEffect, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { TimingMarker } from '../../data/falcon/seedAnimation';
import type { AnimationFrame } from '../../types/frameData';

export interface FrameRange {
  from: number;
  to: number;
}

const CELL = 18;

interface MarkerRow {
  id: string;
  label: string;
  tone: string;
  title?: string;
  has: (frame: AnimationFrame, index: number) => boolean;
}

export function Timeline({
  frames,
  activeIndex,
  range,
  timing,
  playing,
  loop,
  speed,
  onSeek,
  onRangeChange,
  onTogglePlay,
  onLoopChange,
  onSpeedChange,
}: {
  frames: AnimationFrame[];
  activeIndex: number;
  range: FrameRange | null;
  timing: TimingMarker[];
  playing: boolean;
  loop: boolean;
  speed: number;
  onSeek: (index: number) => void;
  onRangeChange: (range: FrameRange | null) => void;
  onTogglePlay: () => void;
  onLoopChange: (loop: boolean) => void;
  onSpeedChange: (speed: number) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const scrub = useRef<{ anchor: number; extend: boolean } | null>(null);
  const count = frames.length;

  // Keep the playhead visible while stepping or playing.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const left = activeIndex * CELL + 92;
    if (left < scroller.scrollLeft + 92 || left + CELL > scroller.scrollLeft + scroller.clientWidth) {
      scroller.scrollLeft = Math.max(0, left - scroller.clientWidth / 2);
    }
  }, [activeIndex]);

  const allRows: MarkerRow[] = [
    { id: 'hit', label: 'Hitbox', tone: 'hit', has: (frame) => frame.hitboxes.length > 0 },
    { id: 'grab', label: 'Grab', tone: 'grab', has: (frame) => frame.grabboxes.length > 0 },
    { id: 'intangible', label: 'Intangible', tone: 'intangible', has: (frame) => frame.hurtboxes.some((box) => box.state === 'intangible') },
    { id: 'invincible', label: 'Invincible', tone: 'invincible', has: (frame) => frame.hurtboxes.some((box) => box.state === 'invincible') },
    ...timing.map((marker, index) => ({
      id: `timing-${index}`,
      label: marker.label,
      title: `SmashWiki: ${marker.label} ${marker.value}`,
      tone: 'wiki',
      has: (_frame: AnimationFrame, frameIndex: number) => marker.frames.includes(frameIndex + 1),
    })),
  ];
  const rows = allRows.filter((row) => row.tone === 'wiki' || frames.some(row.has));

  const indexFromEvent = (event: ReactPointerEvent<HTMLElement>) => {
    const strip = event.currentTarget.getBoundingClientRect();
    return Math.max(0, Math.min(count - 1, Math.floor((event.clientX - strip.left) / CELL)));
  };

  const handleDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const index = indexFromEvent(event);
    event.currentTarget.setPointerCapture(event.pointerId);
    if (event.shiftKey) {
      const anchor = range ? range.from : activeIndex;
      scrub.current = { anchor, extend: true };
      onRangeChange({ from: Math.min(anchor, index), to: Math.max(anchor, index) });
    } else {
      scrub.current = { anchor: index, extend: false };
      onRangeChange(null);
    }
    onSeek(index);
  };

  const handleMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!scrub.current) return;
    const index = indexFromEvent(event);
    if (scrub.current.extend) {
      const { anchor } = scrub.current;
      onRangeChange({ from: Math.min(anchor, index), to: Math.max(anchor, index) });
    }
    onSeek(index);
  };

  const handleUp = () => {
    scrub.current = null;
  };

  const inRange = (index: number) => Boolean(range && index >= range.from && index <= range.to);
  const width = count * CELL;

  return (
    <section className="fe-timeline" aria-label="Animation timeline">
      <div className="fe-timeline-bar">
        <div className="fe-transport" role="group" aria-label="Playback">
          <button type="button" className="fe-icon-button" onClick={() => onSeek(0)} aria-label="First frame" title="First frame (Home)">⏮</button>
          <button type="button" className="fe-icon-button" onClick={() => onSeek(Math.max(0, activeIndex - 1))} aria-label="Previous frame" title="Previous frame (,)">◀</button>
          <button type="button" className="fe-icon-button is-play" onClick={onTogglePlay} aria-label={playing ? 'Pause' : 'Play'} title="Play / pause (Space)">{playing ? '❚❚' : '▶'}</button>
          <button type="button" className="fe-icon-button" onClick={() => onSeek(Math.min(count - 1, activeIndex + 1))} aria-label="Next frame" title="Next frame (.)">▶</button>
          <button type="button" className="fe-icon-button" onClick={() => onSeek(count - 1)} aria-label="Last frame" title="Last frame (End)">⏭</button>
        </div>
        <div className="fe-frame-readout">
          FRAME <strong>{activeIndex + 1}</strong> / {count}
          <small>{((activeIndex + 1) / 60).toFixed(3)}s @ 60 fps</small>
        </div>
        {range && (
          <div className="fe-range-readout">
            RANGE {range.from + 1}–{range.to + 1}
            <button type="button" className="fe-link-button" onClick={() => onRangeChange(null)}>clear</button>
          </div>
        )}
        <div className="fe-transport-options">
          <label className="fe-inline-toggle">
            <input type="checkbox" checked={loop} onChange={(event) => onLoopChange(event.currentTarget.checked)} /> Loop
          </label>
          <label className="fe-inline-select">
            Speed
            <select value={speed} onChange={(event) => onSpeedChange(Number(event.currentTarget.value))}>
              {[0.1, 0.25, 0.5, 1].map((value) => <option key={value} value={value}>{value}×</option>)}
            </select>
          </label>
        </div>
      </div>
      <div className="fe-timeline-scroller" ref={scrollerRef}>
        <div className="fe-timeline-grid" style={{ width: width + 92 }}>
          <div className="fe-timeline-row is-ruler">
            <span className="fe-row-label">Frame</span>
            <div
              className="fe-strip"
              style={{ width }}
              onPointerDown={handleDown}
              onPointerMove={handleMove}
              onPointerUp={handleUp}
              onPointerCancel={handleUp}
              role="slider"
              tabIndex={-1}
              aria-label="Frame scrubber. Shift-drag selects a range."
              aria-valuemin={1}
              aria-valuemax={count}
              aria-valuenow={activeIndex + 1}
            >
              {frames.map((frame, index) => (
                <span
                  key={frame.id}
                  className={`fe-cell${index === activeIndex ? ' is-active' : ''}${inRange(index) ? ' is-range' : ''}${(index + 1) % 10 === 0 ? ' is-tenth' : ''}`}
                  style={{ width: CELL }}
                >
                  {index === 0 || (index + 1) % 5 === 0 || index === activeIndex ? index + 1 : ''}
                </span>
              ))}
              <span className="fe-playhead" style={{ left: activeIndex * CELL }} aria-hidden="true" />
            </div>
          </div>
          {rows.map((row) => (
            <div className="fe-timeline-row" key={row.id} title={row.title}>
              <span className="fe-row-label">{row.label}</span>
              <div className="fe-strip is-markers" style={{ width }}>
                {frames.map((frame, index) => (
                  <span
                    key={frame.id}
                    className={`fe-marker${row.has(frame, index) ? ` is-on is-${row.tone}` : ''}${index === activeIndex ? ' is-active' : ''}${inRange(index) ? ' is-range' : ''}`}
                    style={{ width: CELL }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
