import { useState, useMemo, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '@/store/useAppStore';
import { TableNode } from './TableNode';
import { tableBounds } from '@/utils/geometry';
import type { Table } from '@/types/table';

export function getLinkedGroup(selectedId: string, tables: Table[]): Table[] {
  const visited = new Set<string>();
  const queue = [selectedId];
  while (queue.length > 0) {
    const id = queue.pop()!;
    if (visited.has(id)) continue;
    visited.add(id);
    const t = tables.find((t) => t.id === id);
    if (!t) continue;
    if (t.snappedTo && !visited.has(t.snappedTo)) queue.push(t.snappedTo);
    for (const other of tables) {
      if (other.snappedTo === id && !visited.has(other.id)) queue.push(other.id);
    }
  }
  return tables.filter((t) => visited.has(t.id));
}

function ActionBtn({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={onClick}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`
          w-7 h-7 flex items-center justify-center rounded-md border shadow-sm text-sm
          transition-colors
          ${danger
            ? 'bg-white border-red-200 text-red-500 hover:bg-red-50'
            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}
        `}
      >
        {icon}
      </button>
      {hovered && (
        <div
          style={{
            position: 'absolute',
            left: 'calc(100% + 6px)',
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
          }}
          className="bg-gray-800 text-white text-[11px] px-2 py-0.5 rounded whitespace-nowrap z-50"
        >
          {label}
        </div>
      )}
    </div>
  );
}

export function TableCanvas() {
  const tables = useAppStore((s) => s.tables);
  const selectedTableId = useAppStore((s) => s.selectedTableId);
  const removeTable = useAppStore((s) => s.removeTable);
  const unseatAllAtTable = useAppStore((s) => s.unseatAllAtTable);
  const unsnapPair = useAppStore((s) => s.unsnapPair);

  const checkpoint = useAppStore((s) => s.checkpoint);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const selectionRingRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ left: number; top: number } | null>(null);

  useEffect(() => { setShowDeleteConfirm(false); }, [selectedTableId]);

  useLayoutEffect(() => {
    if (!selectionRingRef.current) { setMenuPos(null); return; }
    const rect = selectionRingRef.current.getBoundingClientRect();
    const left = rect.right + 10;
    const top = rect.top;
    setMenuPos((prev) => (prev?.left === left && prev?.top === top ? prev : { left, top }));
  });

  const selectedTableIds = useAppStore((s) => s.selectedTableIds);

  const selectedGroup = useMemo(() => {
    if (selectedTableIds.length === 0) return [];
    // Expand each selected ID to its linked group, deduplicate
    const visited = new Set<string>();
    for (const id of selectedTableIds) {
      for (const t of getLinkedGroup(id, tables)) visited.add(t.id);
    }
    return tables.filter((t) => visited.has(t.id));
  }, [selectedTableIds, tables]);

  const groupHasGuests = selectedGroup.some((t) => t.seats.some((s) => s.guestId !== null));
  const isLinked = selectedGroup.length > 1 && selectedTableIds.length === 1; // only show Unlink for snapped groups

  // Compute selection bounding box
  let selectionBox: { left: number; top: number; width: number; height: number } | null = null;
  if (selectedGroup.length > 0) {
    const PAD = 10;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const t of selectedGroup) {
      const b = tableBounds(t);
      if (b.left < minX) minX = b.left;
      if (b.top < minY) minY = b.top;
      if (b.right > maxX) maxX = b.right;
      if (b.bottom > maxY) maxY = b.bottom;
    }
    selectionBox = {
      left: minX - PAD,
      top: minY - PAD,
      width: maxX - minX + PAD * 2,
      height: maxY - minY + PAD * 2,
    };
  }

  function handleDelete() {
    checkpoint();
    if (groupHasGuests) {
      setShowDeleteConfirm(true);
    } else {
      for (const t of selectedGroup) removeTable(t.id);
    }
  }

  function confirmDelete() {
    for (const t of selectedGroup) {
      unseatAllAtTable(t.id);
      removeTable(t.id);
    }
    setShowDeleteConfirm(false);
  }

  function handleClear() {
    checkpoint();
    for (const t of selectedGroup) unseatAllAtTable(t.id);
  }

  function handleUnlink() {
    checkpoint();
    if (selectedTableId) unsnapPair(selectedTableId);
  }

  return (
    <>
      {/* Figma-style selection ring */}
      {selectionBox && (
        <div
          ref={selectionRingRef}
          style={{
            position: 'absolute',
            left: selectionBox.left,
            top: selectionBox.top,
            width: selectionBox.width,
            height: selectionBox.height,
            pointerEvents: 'none',
            borderRadius: 6,
            border: '2px solid #2B7FFF',
            boxSizing: 'border-box',
          }}
        >
          {[
            { top: -4, left: -4 },
            { top: -4, right: -4 },
            { bottom: -4, left: -4 },
            { bottom: -4, right: -4 },
          ].map((pos, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                width: 8,
                height: 8,
                background: '#fff',
                border: '2px solid #2B7FFF',
                borderRadius: 1,
                ...pos,
              }}
            />
          ))}
        </div>
      )}

      {/* Action buttons — portaled to body so position:fixed works outside the CSS-transformed canvas */}
      {selectionBox && menuPos && createPortal(
        <div
          style={{
            position: 'fixed',
            left: menuPos.left,
            top: menuPos.top,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            zIndex: 50,
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {showDeleteConfirm ? (
            <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 w-44 text-sm">
              <p className="text-gray-700 mb-2 text-xs leading-snug">
                {isLinked ? 'Delete all linked tables?' : 'Delete this table?'}
                {groupHasGuests && ' Seated guests will be removed.'}
              </p>
              <div className="flex gap-1.5">
                <button
                  onClick={confirmDelete}
                  className="flex-1 bg-red-500 text-white rounded px-2 py-1 text-xs hover:bg-red-600"
                >
                  Delete
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 bg-gray-100 text-gray-700 rounded px-2 py-1 text-xs hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <ActionBtn icon="🗑" label="Delete" onClick={handleDelete} danger />
              <ActionBtn icon="✕" label="Clear seats" onClick={handleClear} />
              {isLinked && <ActionBtn icon="⛓" label="Unlink" onClick={handleUnlink} />}
            </>
          )}
        </div>,
        document.body
      )}

      {tables.map((table) => (
        <TableNode key={table.id} table={table} />
      ))}
    </>
  );
}
