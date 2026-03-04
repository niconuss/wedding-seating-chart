import { useState, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import type { TableType } from '@/types/table';

// ── Seat constraints ────────────────────────────────────────────────────────
const CONSTRAINTS: Record<TableType, { min: number; max: number; default: number }> = {
  circle:     { min: 3, max: 20, default: 10 },
  rectangle:  { min: 2, max: 20, default: 10 },
  sweetheart: { min: 2, max: 8,  default: 2  },
};

// ── SVG previews ────────────────────────────────────────────────────────────

// Seats animate from center → final position on hover (spring easing, staggered).
// They are rendered BEFORE the table shape so the shape paints on top of them,
// hiding the seats while they're still near center and revealing them as they emerge.

function CircleSvg({ seatCount, hovered }: { seatCount: number; hovered: boolean }) {
  const S = 80, cx = 40, cy = 40, r = 22, sr = 33;
  const seats = Array.from({ length: seatCount }, (_, i) => {
    const a = (2 * Math.PI * i) / seatCount - Math.PI / 2;
    return { x: cx + sr * Math.cos(a), y: cy + sr * Math.sin(a) };
  });
  return (
    <svg width={S} height={S} viewBox="0 0 80 80">
      {seats.map((s, i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={4}
          fill="#5eead4"
          style={{
            opacity: hovered ? 1 : 0,
            transform: hovered ? `translate(${s.x - cx}px, ${s.y - cy}px)` : 'translate(0px, 0px)',
            transition: hovered
              ? `transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 12}ms, opacity 0s ${i * 12}ms`
              : 'transform 0.12s ease-in, opacity 0.08s',
          }}
        />
      ))}
      <circle cx={cx} cy={cy} r={r} fill="#f0fdfa" stroke="#5eead4" strokeWidth="2" />
    </svg>
  );
}

function RectSvg({ seatCount, hovered }: { seatCount: number; hovered: boolean }) {
  const W = 96, H = 80;
  const rx = 12, ry = 22, rw = 72, rh = 24;
  const rcx = rx + rw / 2, rcy = ry + rh / 2;
  const topCount = Math.ceil(seatCount / 2);
  const botCount = seatCount - topCount;
  const topSeats = Array.from({ length: topCount }, (_, i) => ({
    x: rx + (rw / topCount) * i + rw / topCount / 2,
    y: ry - 9,
  }));
  const botSeats = Array.from({ length: botCount }, (_, i) => ({
    x: rx + (rw / Math.max(botCount, 1)) * i + rw / Math.max(botCount, 1) / 2,
    y: ry + rh + 9,
  }));
  const allSeats = [...topSeats, ...botSeats];
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      {allSeats.map((s, i) => (
        <circle
          key={i}
          cx={rcx}
          cy={rcy}
          r={4}
          fill="#5eead4"
          style={{
            opacity: hovered ? 1 : 0,
            transform: hovered ? `translate(${s.x - rcx}px, ${s.y - rcy}px)` : 'translate(0px, 0px)',
            transition: hovered
              ? `transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 12}ms, opacity 0s ${i * 12}ms`
              : 'transform 0.12s ease-in, opacity 0.08s',
          }}
        />
      ))}
      <rect x={rx} y={ry} width={rw} height={rh} rx="5" fill="#f0fdfa" stroke="#5eead4" strokeWidth="2" />
    </svg>
  );
}

function SweetSvg({ seatCount, hovered }: { seatCount: number; hovered: boolean }) {
  const W = 88, H = 80;
  const rx = 12, ry = 22, rw = 64, rh = 22;
  const scx = rx + rw / 2, scy = ry + rh / 2;
  const seats = Array.from({ length: seatCount }, (_, i) => ({
    x: rx + (rw / (seatCount + 1)) * (i + 1),
    y: ry - 9,
  }));
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      {seats.map((s, i) => (
        <circle
          key={i}
          cx={scx}
          cy={scy}
          r={4}
          fill="#5eead4"
          style={{
            opacity: hovered ? 1 : 0,
            transform: hovered ? `translate(${s.x - scx}px, ${s.y - scy}px)` : 'translate(0px, 0px)',
            transition: hovered
              ? `transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 12}ms, opacity 0s ${i * 12}ms`
              : 'transform 0.12s ease-in, opacity 0.08s',
          }}
        />
      ))}
      <rect x={rx} y={ry} width={rw} height={rh} rx={rh / 2} fill="#f0fdfa" stroke="#5eead4" strokeWidth="2" />
      <text x={W / 2} y={ry + rh / 2 + 5} textAnchor="middle" fontSize="13" fill="#2dd4bf">♥</text>
    </svg>
  );
}

const SVG_COMPONENTS = {
  circle: CircleSvg,
  rectangle: RectSvg,
  sweetheart: SweetSvg,
};

// ── Palette item ─────────────────────────────────────────────────────────────

const CONFIGS: { type: TableType; label: string }[] = [
  { type: 'circle',     label: 'Circle'     },
  { type: 'rectangle',  label: 'Rectangle'  },
  { type: 'sweetheart', label: 'Sweetheart' },
];

interface PaletteItemProps {
  type: TableType;
  label: string;
  seatCount: number;
  isDragging: boolean;
  onAdjust: (delta: number) => void;
  onDragStart: (e: React.MouseEvent) => void;
}

function PaletteItem({ type, label, seatCount, isDragging, onAdjust, onDragStart }: PaletteItemProps) {
  const [hovered, setHovered] = useState(false);
  const SvgComp = SVG_COMPONENTS[type];
  const { min, max } = CONSTRAINTS[type];

  return (
    <div
      className="flex flex-col items-center cursor-grab active:cursor-grabbing select-none"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseDown={onDragStart}
    >
      {/* SVG shape — hides while being dragged; lifts and scales on hover */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          transform: hovered && !isDragging ? 'translateY(-22px) scale(1.12)' : 'translateY(0) scale(1)',
          transition: isDragging ? 'none' : 'transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
          transformOrigin: 'bottom center',
          opacity: isDragging ? 0 : 1,
        }}
      >
        <SvgComp seatCount={seatCount} hovered={hovered} />
      </div>

      {/* Card — always on top, covering most of the shape */}
      <div
        className="bg-white border border-gray-200 rounded-xl shadow-sm px-3 pt-1.5 pb-2 text-center min-w-[80px]"
        style={{ marginTop: -48, position: 'relative', zIndex: 10 }}
      >
        <div className="text-xs font-semibold text-gray-700 leading-tight">{label}</div>

        {/* Seat count row with +/- */}
        <div className="flex items-center justify-center gap-1 mt-1" onMouseDown={(e) => e.stopPropagation()}>
          <button
            onClick={() => onAdjust(-1)}
            disabled={seatCount <= min}
            className="w-5 h-5 rounded-full bg-gray-100 border border-gray-300 text-gray-500 hover:bg-gray-200 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-xs font-bold transition-colors select-none"
          >
            −
          </button>
          <span className="text-[10px] text-gray-400 text-center leading-tight w-8">
            {seatCount}<br />seats
          </span>
          <button
            onClick={() => onAdjust(1)}
            disabled={seatCount >= max}
            className="w-5 h-5 rounded-full bg-gray-100 border border-gray-300 text-gray-500 hover:bg-gray-200 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-xs font-bold transition-colors select-none"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main palette ─────────────────────────────────────────────────────────────

export function FloatingTablePalette() {
  const addTable = useAppStore((s) => s.addTable);

  const [counts, setCounts] = useState<Record<TableType, number>>({
    circle:     CONSTRAINTS.circle.default,
    rectangle:  CONSTRAINTS.rectangle.default,
    sweetheart: CONSTRAINTS.sweetheart.default,
  });

  const [dragging, setDragging] = useState<TableType | null>(null);
  const [ghostPos, setGhostPos] = useState({ x: 0, y: 0 });

  function adjust(type: TableType, delta: number) {
    const { min, max } = CONSTRAINTS[type];
    setCounts((prev) => ({
      ...prev,
      [type]: Math.max(min, Math.min(max, prev[type] + delta)),
    }));
  }

  const startDrag = useCallback((type: TableType, seatCount: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(type);
    setGhostPos({ x: e.clientX, y: e.clientY });

    function onMove(ev: MouseEvent) {
      setGhostPos({ x: ev.clientX, y: ev.clientY });
    }

    function onUp(ev: MouseEvent) {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      setDragging(null);

      const canvasArea = document.getElementById('canvas-area');
      if (!canvasArea) return;
      const rect = canvasArea.getBoundingClientRect();
      if (ev.clientX < rect.left || ev.clientX > rect.right ||
          ev.clientY < rect.top  || ev.clientY > rect.bottom) return;

      const state = useAppStore.getState();
      const { x: tx, y: ty, scale } = state.canvasTransform;
      const canvasX = (ev.clientX - rect.left - tx) / scale;
      const canvasY = (ev.clientY - rect.top  - ty) / scale;
      state.checkpoint();
      addTable(type, canvasX, canvasY, seatCount);
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [addTable]);

  const GhostSvg = dragging ? SVG_COMPONENTS[dragging] : null;

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-end gap-6 pointer-events-none">
        {CONFIGS.map(({ type, label }) => (
          <div key={type} className="pointer-events-auto">
            <PaletteItem
              type={type}
              label={label}
              seatCount={counts[type]}
              isDragging={dragging === type}
              onAdjust={(d) => adjust(type, d)}
              onDragStart={startDrag(type, counts[type])}
            />
          </div>
        ))}
      </div>

      {/* Drag ghost — follows cursor, centered on the shape */}
      {dragging && GhostSvg && (
        <div
          style={{
            position: 'fixed',
            left: ghostPos.x - 40,
            top: ghostPos.y - 40,
            pointerEvents: 'none',
            opacity: 0.9,
            zIndex: 9999,
            filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.18))',
          }}
        >
          <GhostSvg seatCount={counts[dragging]} hovered={true} />
        </div>
      )}
    </>
  );
}
