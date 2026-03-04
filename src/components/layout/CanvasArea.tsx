import { useRef, useState, useCallback, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useCanvasPanZoom } from '@/hooks/useCanvasPanZoom';
import { TableCanvas } from '@/components/tables/TableCanvas';
import { tableBounds } from '@/utils/geometry';
import { RemoteUpdateBanner } from '@/components/RemoteUpdateBanner';

export function CanvasArea() {
  const canvasTransform = useAppStore((s) => s.canvasTransform);
  const tables = useAppStore((s) => s.tables);
  const setSelectedTableId = useAppStore((s) => s.setSelectedTableId);
  const setCanvasTransform = useAppStore((s) => s.setCanvasTransform);
  const renameTable = useAppStore((s) => s.renameTable);
  const checkpoint = useAppStore((s) => s.checkpoint);

  // On mount: fit all tables into view. Tables may arrive async from Firebase,
  // so subscribe and fit on first non-empty load.
  useEffect(() => {
    function fitTables(tbls: typeof tables) {
      const el = document.getElementById('canvas-area');
      if (!el || tbls.length === 0) return;
      const { width: W, height: H } = el.getBoundingClientRect();
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const t of tbls) {
        const b = tableBounds(t);
        if (b.left   < minX) minX = b.left;
        if (b.top    < minY) minY = b.top;
        if (b.right  > maxX) maxX = b.right;
        if (b.bottom > maxY) maxY = b.bottom;
      }
      const PAD = 48;
      const scale = Math.min(W / (maxX - minX + PAD * 2), H / (maxY - minY + PAD * 2), 1);
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      setCanvasTransform({ x: W / 2 - cx * scale, y: H / 2 - cy * scale, scale });
    }

    const current = useAppStore.getState().tables;
    if (current.length > 0) {
      fitTables(current);
      return;
    }

    // Tables not yet loaded (Firebase async) — wait for first non-empty update
    const unsub = useAppStore.subscribe((state, prev) => {
      if (prev.tables.length === 0 && state.tables.length > 0) {
        fitTables(state.tables);
        unsub();
      }
    });
    return unsub;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleAutoRename() {
    if (tables.length === 0) return;
    checkpoint();
    const sorted = [...tables].sort((a, b) => a.y !== b.y ? a.y - b.y : a.x - b.x);
    sorted.forEach((t, i) => renameTable(t.id, `Table ${i + 1}`));
  }
  const { onWheel, onMouseDown: onPanMouseDown, onMouseMove, onMouseUp, onMouseLeave } = useCanvasPanZoom();

  const [shiftHeld, setShiftHeld] = useState(false);
  const [isShiftPanning, setIsShiftPanning] = useState(false);
  const isPanningRef = useRef(false);
  const lastPanPosRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) { if (e.key === 'Shift') setShiftHeld(true); }
    function onKeyUp(e: KeyboardEvent) { if (e.key === 'Shift') setShiftHeld(false); }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); };
  }, []);

  function startShiftPan(clientX: number, clientY: number) {
    isPanningRef.current = true;
    setIsShiftPanning(true);
    lastPanPosRef.current = { x: clientX, y: clientY };

    function onMove(ev: MouseEvent) {
      if (!isPanningRef.current) return;
      const dx = ev.clientX - lastPanPosRef.current.x;
      const dy = ev.clientY - lastPanPosRef.current.y;
      lastPanPosRef.current = { x: ev.clientX, y: ev.clientY };
      const { x, y, scale } = useAppStore.getState().canvasTransform;
      useAppStore.getState().setCanvasTransform({ x: x + dx, y: y + dy, scale });
    }

    function onUp() {
      isPanningRef.current = false;
      setIsShiftPanning(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  const isOnBackground = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    return e.target === e.currentTarget || (e.target as HTMLElement).id === 'canvas-root';
  }, []);

  function handleBackgroundMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    if (e.button !== 0) {
      // Middle mouse → pan
      onPanMouseDown(e);
      return;
    }

    // Shift+left drag → pan
    if (e.shiftKey) {
      e.preventDefault();
      startShiftPan(e.clientX, e.clientY);
      return;
    }

    if (!isOnBackground(e)) {
      // Clicking a table — let TableNode handle selection
      return;
    }

    // Left click on background → deselect
    setSelectedTableId(null);
  }

  return (
    <div
      id="canvas-area"
      className="flex-1 overflow-hidden bg-gray-100 relative select-none"
      style={{ cursor: shiftHeld ? (isShiftPanning ? 'grabbing' : 'grab') : 'default' }}
      onWheel={onWheel}
      onMouseDown={handleBackgroundMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
    >
      {/* Grid background */}
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      >
        <defs>
          <pattern
            id="grid"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
            patternTransform={`translate(${canvasTransform.x % 40}, ${canvasTransform.y % 40})`}
          >
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e5e7eb" strokeWidth="0.8" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Canvas root */}
      <div
        id="canvas-root"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          transform: `translate(${canvasTransform.x}px, ${canvasTransform.y}px) scale(${canvasTransform.scale})`,
          transformOrigin: '0 0',
          width: 0,
          height: 0,
        }}
      >
        <TableCanvas />
      </div>

      <RemoteUpdateBanner />

      {/* Auto-rename button */}
      {tables.length > 0 && (
        <button
          onClick={handleAutoRename}
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute bottom-6 right-6 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl shadow-sm hover:bg-gray-50 transition-colors z-10"
          title="Rename all tables in order (top-to-bottom, left-to-right)"
        >
          Rename tables
        </button>
      )}

      {/* Empty state */}
      {tables.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center text-gray-400">
            <div className="text-4xl mb-3">🪑</div>
            <p className="text-sm">Add tables using the toolbar below</p>
            <p className="text-xs mt-1">Shift+drag to pan · Scroll to zoom</p>
          </div>
        </div>
      )}
    </div>
  );
}
