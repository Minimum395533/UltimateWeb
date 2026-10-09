import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import {
  isSelected,
  normalizeRect,
  shapesInRect,
  toggleSelection,
  translateSelection,
} from '../../dev/editorOps';
import type { Point2, Rect, Selection, ShapeKind, ShapeRef } from '../../dev/editorOps';
import type {
  AnimationFrame,
  FrameGrabbox,
  FrameHitbox,
  FrameHurtbox,
  ReferenceSettings,
} from '../../types/frameData';
import {
  cameraViewBox,
  clampZoom,
  referenceImageBox,
  round2,
  roundTo,
  unitToX,
  unitToY,
  xToUnit,
  yToUnit,
} from './geometry';
import type { Camera } from './geometry';
import { GRABBOX_COLOR, HITBOX_COLOR, HURTBOX_COLORS, KIND_LAYER, editableKinds } from './layers';
import type { LayerState } from './layers';

export type Tool = 'select' | 'pen';

type Capsule = FrameHurtbox | FrameHitbox | FrameGrabbox;

type DragState =
  | { type: 'move'; start: Point2; frame: AnimationFrame; selection: Selection; key: string }
  | { type: 'endpoint'; ref: ShapeRef; endpoint: 'start' | 'end' | 'point'; frame: AnimationFrame; key: string }
  | { type: 'marquee'; start: Point2; additive: boolean }
  | { type: 'pan'; clientX: number; clientY: number; camera: Camera; unitsPerPx: number }
  | { type: 'reference'; start: Point2; offsetX: number; offsetY: number };

/** SVG path for a capsule outline (two semicircles joined by straight sides). */
function capsulePath(capsule: Capsule): string | null {
  const ax = unitToX(capsule.start.x);
  const ay = unitToY(capsule.start.y);
  const bx = unitToX(capsule.end.x);
  const by = unitToY(capsule.end.y);
  const r = capsule.radius * 10;
  const length = Math.hypot(bx - ax, by - ay);
  if (length < 0.01) return null;
  const nx = (-(by - ay) / length) * r;
  const ny = ((bx - ax) / length) * r;
  return `M ${ax + nx} ${ay + ny} L ${bx + nx} ${by + ny} A ${r} ${r} 0 0 0 ${bx - nx} ${by - ny} L ${ax - nx} ${ay - ny} A ${r} ${r} 0 0 0 ${ax + nx} ${ay + ny} Z`;
}

function CapsuleShape({
  capsule,
  color,
  label,
  selected,
  interactive,
  ghost = false,
  scale,
  onPointerDown,
}: {
  capsule: Capsule;
  color: string;
  label?: string;
  selected?: boolean;
  interactive?: boolean;
  ghost?: boolean;
  scale: number;
  onPointerDown?: (event: ReactPointerEvent<SVGElement>) => void;
}) {
  const path = capsulePath(capsule);
  const common = {
    fill: color,
    fillOpacity: ghost ? 0.08 : selected ? 0.42 : 0.28,
    stroke: selected ? '#0d1b2a' : color,
    strokeWidth: (selected ? 2 : 1) * scale,
    strokeDasharray: ghost ? `${3 * scale} ${2 * scale}` : undefined,
    strokeOpacity: ghost ? 0.5 : 1,
    pointerEvents: interactive ? 'all' as const : 'none' as const,
    className: interactive ? 'fe-shape is-interactive' : 'fe-shape',
    onPointerDown,
  };
  const cx = (unitToX(capsule.start.x) + unitToX(capsule.end.x)) / 2;
  const cy = (unitToY(capsule.start.y) + unitToY(capsule.end.y)) / 2;
  return (
    <g>
      {path
        ? <path d={path} {...common} />
        : <circle cx={unitToX(capsule.start.x)} cy={unitToY(capsule.start.y)} r={capsule.radius * 10} {...common} />}
      {!ghost && label && (
        <text className="fe-shape-label" x={cx} y={cy + 2.5 * scale} fontSize={7 * scale} textAnchor="middle" fill="#0d1b2a">
          {label}
        </text>
      )}
    </g>
  );
}

export function Viewport({
  frame,
  ghostFrames,
  layers,
  selection,
  tool,
  camera,
  referenceUrl,
  referenceSettings,
  snapIncrement,
  onCameraChange,
  onSelectionChange,
  onFrameChange,
  onGestureEnd,
  onReferenceChange,
  onAddPoint,
}: {
  frame: AnimationFrame;
  ghostFrames: { frame: AnimationFrame; tone: 'previous' | 'next' }[];
  layers: LayerState;
  selection: Selection;
  tool: Tool;
  camera: Camera;
  referenceUrl: string | null;
  referenceSettings: ReferenceSettings;
  /** Null when snapping is off. */
  snapIncrement: number | null;
  onCameraChange: (camera: Camera) => void;
  onSelectionChange: (selection: ShapeRef[]) => void;
  onFrameChange: (frame: AnimationFrame, historyKey: string) => void;
  onGestureEnd: () => void;
  onReferenceChange: (patch: Partial<ReferenceSettings>) => void;
  onAddPoint: (x: number, y: number) => void;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const drag = useRef<DragState | null>(null);
  const cameraRef = useRef(camera);
  const [marquee, setMarquee] = useState<Rect | null>(null);
  const [cursor, setCursor] = useState<Point2 | null>(null);
  const viewBox = cameraViewBox(camera);
  const scale = 1 / camera.zoom;
  const kinds = editableKinds(layers);
  const canEdit = (kind: ShapeKind) => tool === 'select' && kinds.includes(kind);
  const snap = (value: number) => round2(snapIncrement ? roundTo(value, snapIncrement) : value);
  const referenceBox = referenceImageBox(referenceSettings);
  const referenceDraggable = Boolean(referenceUrl) && layers.reference.visible && !referenceSettings.locked;

  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);

  const svgPoint = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    const matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return { sx: 0, sy: 0, x: 0, y: 0 };
    const point = new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse());
    return { sx: point.x, sy: point.y, x: xToUnit(point.x), y: yToUnit(point.y) };
  };

  // Wheel zoom around the cursor (needs a non-passive listener to prevent page scroll).
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return undefined;
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const current = cameraRef.current;
      const matrix = svg.getScreenCTM();
      if (!matrix) return;
      const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
      const zoom = clampZoom(current.zoom * Math.exp(-event.deltaY * 0.0015));
      const ratio = current.zoom / zoom;
      onCameraChange({
        zoom,
        cx: point.x - (point.x - current.cx) * ratio,
        cy: point.y - (point.y - current.cy) * ratio,
      });
    };
    svg.addEventListener('wheel', handleWheel, { passive: false });
    return () => svg.removeEventListener('wheel', handleWheel);
  }, [onCameraChange]);

  const capture = (event: ReactPointerEvent) => {
    svgRef.current?.setPointerCapture(event.pointerId);
  };

  const beginShapeDrag = (event: ReactPointerEvent<SVGElement>, ref: ShapeRef) => {
    if (event.button !== 0 || event.altKey || !canEdit(ref.kind)) return;
    event.stopPropagation();
    event.preventDefault();
    let nextSelection: Selection = selection;
    if (event.shiftKey) {
      nextSelection = toggleSelection(selection, ref);
      onSelectionChange([...nextSelection]);
      if (!isSelected(nextSelection, ref)) return;
    } else if (!isSelected(selection, ref)) {
      nextSelection = [ref];
      onSelectionChange([ref]);
    }
    const point = svgPoint(event.clientX, event.clientY);
    drag.current = { type: 'move', start: point, frame, selection: nextSelection, key: `move:${Date.now()}` };
    capture(event);
  };

  const beginEndpointDrag = (event: ReactPointerEvent<SVGElement>, ref: ShapeRef, endpoint: 'start' | 'end' | 'point') => {
    if (event.button !== 0 || !canEdit(ref.kind) && !(tool === 'pen' && ref.kind === 'point')) return;
    event.stopPropagation();
    event.preventDefault();
    if (ref.kind === 'point' && event.shiftKey) {
      onSelectionChange(toggleSelection(selection, ref));
      return;
    }
    if (ref.kind === 'point' && !isSelected(selection, ref)) onSelectionChange([ref]);
    drag.current = { type: 'endpoint', ref, endpoint, frame, key: `endpoint:${Date.now()}` };
    capture(event);
  };

  const handleBackgroundDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    const point = svgPoint(event.clientX, event.clientY);
    const svg = svgRef.current;
    if (event.button === 1 || event.button === 2 || event.altKey) {
      event.preventDefault();
      const bounds = svg?.getBoundingClientRect();
      drag.current = {
        type: 'pan',
        clientX: event.clientX,
        clientY: event.clientY,
        camera,
        unitsPerPx: bounds ? viewBox.width / bounds.width : 1,
      };
      capture(event);
      return;
    }
    if (event.button !== 0) return;
    if (tool === 'pen') {
      if (kinds.includes('point') || (layers.silhouette.visible && !layers.silhouette.locked)) {
        onAddPoint(snap(point.x), snap(point.y));
      }
      return;
    }
    if (
      referenceDraggable
      && point.sx >= referenceBox.x && point.sx <= referenceBox.x + referenceBox.width
      && point.sy >= referenceBox.y && point.sy <= referenceBox.y + referenceBox.height
    ) {
      drag.current = { type: 'reference', start: point, offsetX: referenceSettings.offsetX, offsetY: referenceSettings.offsetY };
      capture(event);
      return;
    }
    drag.current = { type: 'marquee', start: point, additive: event.shiftKey };
    setMarquee(normalizeRect(point, point));
    capture(event);
  };

  const handleMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const point = svgPoint(event.clientX, event.clientY);
    setCursor({ x: round2(point.x), y: round2(point.y) });
    const state = drag.current;
    if (!state) return;
    if (state.type === 'pan') {
      onCameraChange({
        ...state.camera,
        cx: state.camera.cx - (event.clientX - state.clientX) * state.unitsPerPx,
        cy: state.camera.cy - (event.clientY - state.clientY) * state.unitsPerPx,
      });
    } else if (state.type === 'marquee') {
      setMarquee(normalizeRect(state.start, point));
    } else if (state.type === 'reference') {
      onReferenceChange({
        offsetX: Math.max(-20, Math.min(20, round2(state.offsetX + point.x - state.start.x))),
        offsetY: Math.max(-20, Math.min(20, round2(state.offsetY + point.y - state.start.y))),
      });
    } else if (state.type === 'move') {
      const dx = snap(point.x - state.start.x);
      const dy = snap(point.y - state.start.y);
      onFrameChange(translateSelection(state.frame, state.selection, dx, dy), state.key);
    } else if (state.type === 'endpoint') {
      const x = snap(point.x);
      const y = snap(point.y);
      const { ref, endpoint } = state;
      const source = state.frame;
      let next: AnimationFrame = source;
      if (ref.kind === 'point') {
        next = {
          ...source,
          silhouette: {
            ...source.silhouette,
            points: source.silhouette.points.map((item) => (item.id === ref.id ? { ...item, x, y } : item)),
          },
        };
      } else {
        const key = ref.kind === 'hurtbox' ? 'hurtboxes' : ref.kind === 'hitbox' ? 'hitboxes' : 'grabboxes';
        const end = endpoint === 'point' ? 'start' : endpoint;
        next = {
          ...source,
          [key]: (source[key] as Capsule[]).map((item) => (
            item.id === ref.id ? { ...item, [end]: { ...item[end], x, y } } : item
          )),
        };
      }
      onFrameChange(next, state.key);
    }
  };

  const handleUp = (event: ReactPointerEvent<SVGSVGElement>) => {
    const state = drag.current;
    drag.current = null;
    if (svgRef.current?.hasPointerCapture(event.pointerId)) svgRef.current.releasePointerCapture(event.pointerId);
    if (!state) return;
    if (state.type === 'marquee') {
      const rect = marquee ?? normalizeRect(state.start, state.start);
      setMarquee(null);
      const tiny = rect.maxX - rect.minX < 0.3 && rect.maxY - rect.minY < 0.3;
      if (tiny) {
        if (!state.additive) onSelectionChange([]);
        return;
      }
      const hits = shapesInRect(frame, rect, kinds);
      if (state.additive) {
        const merged = [...selection];
        for (const ref of hits) if (!isSelected(merged, ref)) merged.push(ref);
        onSelectionChange(merged);
      } else {
        onSelectionChange(hits);
      }
      return;
    }
    if (state.type !== 'pan') onGestureEnd();
  };

  const single = selection.length === 1 ? selection[0] : null;
  const singleCapsule: Capsule | undefined = single && single.kind !== 'point'
    ? (single.kind === 'hurtbox' ? frame.hurtboxes : single.kind === 'hitbox' ? frame.hitboxes : frame.grabboxes)
      .find((item: Capsule) => item.id === single.id)
    : undefined;
  const showPoints = layers.silhouette.visible && !layers.silhouette.locked;
  const silhouettePoints = frame.silhouette.points.map((point) => `${unitToX(point.x)},${unitToY(point.y)}`).join(' ');
  const huge = { x: viewBox.x - 10, y: viewBox.y - 10, width: viewBox.width + 20, height: viewBox.height + 20 };

  return (
    <div className="fe-canvas-wrap">
      <svg
        ref={svgRef}
        className={`fe-canvas is-${tool}`}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        role="application"
        aria-label={`Frame ${frame.frameNumber} viewport. Drag shapes to move them, drag empty space to box-select, Alt-drag or middle-drag to pan, scroll to zoom.`}
        onPointerDown={handleBackgroundDown}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
        onPointerCancel={handleUp}
        onPointerLeave={() => setCursor(null)}
        onContextMenu={(event) => event.preventDefault()}
      >
        <defs>
          <pattern id="fe-grid-minor" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#9fb0c2" strokeWidth={0.5 * Math.min(1, scale * 1.5)} />
          </pattern>
          <pattern id="fe-grid-major" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#6f8399" strokeWidth={0.9 * Math.min(1.5, scale * 1.5)} />
          </pattern>
        </defs>
        <rect {...huge} fill="#e9eff5" />
        {layers.reference.visible && referenceUrl && (
          <image
            className={`fe-reference${referenceDraggable ? ' is-draggable' : ''}`}
            href={referenceUrl}
            {...referenceBox}
            preserveAspectRatio="xMidYMid meet"
            opacity={referenceSettings.opacity}
            pointerEvents="none"
          />
        )}
        {layers.grid.visible && (
          <>
            <rect {...huge} fill="url(#fe-grid-minor)" opacity="0.6" />
            <rect {...huge} fill="url(#fe-grid-major)" opacity="0.55" />
          </>
        )}
        <line x1={huge.x} x2={huge.x + huge.width} y1={unitToY(0)} y2={unitToY(0)} stroke="#475a6e" strokeWidth={1.2 * scale} />
        <line y1={huge.y} y2={huge.y + huge.height} x1={unitToX(0)} x2={unitToX(0)} stroke="#475a6e" strokeWidth={0.8 * scale} strokeDasharray={`${4 * scale} ${3 * scale}`} />
        {referenceDraggable && (
          <rect {...referenceBox} fill="none" stroke="#0e8aa0" strokeWidth={1 * scale} strokeDasharray={`${5 * scale} ${3 * scale}`} pointerEvents="none" />
        )}

        {layers.onion.visible && ghostFrames.map(({ frame: ghost, tone }) => {
          const color = tone === 'previous' ? '#d1495b' : '#2a9d8f';
          return (
            <g key={`${tone}-${ghost.id}`} className="fe-ghost" aria-hidden="true">
              {layers.silhouette.visible && ghost.silhouette.points.length > 1 && (
                <polygon
                  points={ghost.silhouette.points.map((point) => `${unitToX(point.x)},${unitToY(point.y)}`).join(' ')}
                  fill="none"
                  stroke={color}
                  strokeOpacity="0.45"
                  strokeWidth={1 * scale}
                  strokeDasharray={`${3 * scale} ${2 * scale}`}
                />
              )}
              {layers.hurtboxes.visible && ghost.hurtboxes.map((capsule) => (
                <CapsuleShape key={capsule.id} capsule={capsule} color={color} ghost scale={scale} />
              ))}
              {layers.hitboxes.visible && ghost.hitboxes.map((capsule) => (
                <CapsuleShape key={capsule.id} capsule={capsule} color={color} ghost scale={scale} />
              ))}
            </g>
          );
        })}

        {layers.silhouette.visible && frame.silhouette.points.length > 1 && (
          frame.silhouette.closed ? (
            <polygon className="fe-silhouette" points={silhouettePoints} fill={frame.silhouette.color} fillOpacity="0.32" stroke={frame.silhouette.color} strokeWidth={1.2 * scale} pointerEvents="none" />
          ) : (
            <polyline className="fe-silhouette" points={silhouettePoints} fill="none" stroke={frame.silhouette.color} strokeWidth={1.4 * scale} pointerEvents="none" />
          )
        )}

        {layers.hurtboxes.visible && frame.hurtboxes.map((capsule) => {
          const ref: ShapeRef = { kind: 'hurtbox', id: capsule.id };
          return (
            <CapsuleShape
              key={capsule.id}
              capsule={capsule}
              color={HURTBOX_COLORS[capsule.state]}
              selected={isSelected(selection, ref)}
              interactive={canEdit('hurtbox')}
              scale={scale}
              onPointerDown={(event) => beginShapeDrag(event, ref)}
            />
          );
        })}
        {layers.grabboxes.visible && frame.grabboxes.map((capsule) => {
          const ref: ShapeRef = { kind: 'grabbox', id: capsule.id };
          return (
            <CapsuleShape
              key={capsule.id}
              capsule={capsule}
              color={GRABBOX_COLOR}
              label={`G${capsule.grabboxId}`}
              selected={isSelected(selection, ref)}
              interactive={canEdit('grabbox')}
              scale={scale}
              onPointerDown={(event) => beginShapeDrag(event, ref)}
            />
          );
        })}
        {layers.hitboxes.visible && frame.hitboxes.map((capsule) => {
          const ref: ShapeRef = { kind: 'hitbox', id: capsule.id };
          return (
            <CapsuleShape
              key={capsule.id}
              capsule={capsule}
              color={HITBOX_COLOR}
              label={`${capsule.hitboxId}`}
              selected={isSelected(selection, ref)}
              interactive={canEdit('hitbox')}
              scale={scale}
              onPointerDown={(event) => beginShapeDrag(event, ref)}
            />
          );
        })}

        {showPoints && frame.silhouette.points.map((point, index) => {
          const ref: ShapeRef = { kind: 'point', id: point.id };
          const selected = isSelected(selection, ref);
          return (
            <circle
              key={point.id}
              className="fe-point-handle"
              cx={unitToX(point.x)}
              cy={unitToY(point.y)}
              r={(selected ? 3.6 : 2.4) * scale}
              fill={selected ? '#0d1b2a' : '#ffffff'}
              stroke={frame.silhouette.color}
              strokeWidth={1.2 * scale}
              aria-label={`Silhouette point ${index + 1}`}
              onPointerDown={(event) => beginEndpointDrag(event, ref, 'point')}
            />
          );
        })}

        {singleCapsule && single && KIND_LAYER[single.kind] && canEdit(single.kind) && (['start', 'end'] as const).map((endpoint) => {
          const point = singleCapsule[endpoint];
          const same = endpoint === 'end' && singleCapsule.start.x === singleCapsule.end.x && singleCapsule.start.y === singleCapsule.end.y;
          return (
            <g key={endpoint} className="fe-endpoint">
              <circle
                cx={unitToX(point.x) + (same ? 6 * scale : 0)}
                cy={unitToY(point.y)}
                r={4.2 * scale}
                fill="#ffffff"
                stroke="#0d1b2a"
                strokeWidth={1.4 * scale}
                onPointerDown={(event) => beginEndpointDrag(event, single, endpoint)}
                aria-label={`Endpoint ${endpoint === 'start' ? 'A' : 'B'}`}
              />
              <text x={unitToX(point.x) + (same ? 12 : 6) * scale} y={unitToY(point.y) - 5 * scale} fontSize={7 * scale} fill="#0d1b2a" pointerEvents="none">
                {endpoint === 'start' ? 'A' : 'B'}
              </text>
            </g>
          );
        })}

        {marquee && (
          <rect
            className="fe-marquee"
            x={unitToX(marquee.minX)}
            y={unitToY(marquee.maxY)}
            width={(marquee.maxX - marquee.minX) * 10}
            height={(marquee.maxY - marquee.minY) * 10}
            strokeWidth={1 * scale}
            strokeDasharray={`${4 * scale} ${2 * scale}`}
          />
        )}
      </svg>
      <div className="fe-canvas-status" aria-live="off">
        <span>{cursor ? `X ${cursor.x.toFixed(2)} · Y ${cursor.y.toFixed(2)} u` : '1 grid = 1 unit'}</span>
        <span>{Math.round(camera.zoom * 100)}%</span>
        <span>{tool === 'pen' ? 'PEN · click to add silhouette points' : 'SELECT'}</span>
      </div>
    </div>
  );
}
