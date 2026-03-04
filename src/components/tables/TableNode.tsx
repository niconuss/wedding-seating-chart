import { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useTableDrag } from '@/hooks/useTableDrag';
import { CircleTable } from './CircleTable';
import { RectangleTable } from './RectangleTable';
import { SweetheartTable } from './SweetheartTable';
import { getLinkedGroup } from './TableCanvas';
import { CIRCLE_RADIUS, RECT_WIDTH, RECT_HEIGHT, SWEEP_WIDTH, SWEEP_HEIGHT } from '@/utils/constants';
import type { Table } from '@/types/table';

interface TableNodeProps {
  table: Table;
}

function getTableOffset(table: Table): { dx: number; dy: number } {
  if (table.type === 'circle') {
    const size = (CIRCLE_RADIUS + 60) * 2;
    return { dx: -size / 2, dy: -size / 2 };
  }
  if (table.type === 'rectangle') {
    const PAD = 50;
    return { dx: -(RECT_WIDTH / 2 + PAD), dy: -(RECT_HEIGHT / 2 + PAD) };
  }
  const PAD = 40;
  return { dx: -(SWEEP_WIDTH / 2 + PAD), dy: -(SWEEP_HEIGHT / 2 + PAD) };
}

const GAP_BETWEEN_TABLES = 20;

export function TableNode({ table }: TableNodeProps) {
  const tables = useAppStore((s) => s.tables);
  const selectedTableId = useAppStore((s) => s.selectedTableId);
  const selectedTableIds = useAppStore((s) => s.selectedTableIds);
  const setSelectedTableId = useAppStore((s) => s.setSelectedTableId);
  const isGroupRenaming = useAppStore((s) => s.isGroupRenaming);
  const setIsGroupRenaming = useAppStore((s) => s.setIsGroupRenaming);
  const addTable = useAppStore((s) => s.addTable);
  const snapTables = useAppStore((s) => s.snapTables);
  const checkpoint = useAppStore((s) => s.checkpoint);
  const hoveredTableId = useAppStore((s) => s.hoveredTableId);
  const setHoveredTableId = useAppStore((s) => s.setHoveredTableId);

  const [isLocalRenaming, setIsLocalRenaming] = useState(false);

  const { onMouseDown: onTableMouseDown } = useTableDrag(table.id);
  const { dx, dy } = getTableOffset(table);

  // Linked group for this table
  const linkedGroup = useMemo(() => getLinkedGroup(table.id, tables), [table.id, tables]);

  // Is the group currently hovered (any table in the group is hovered)?
  const isGroupHovered = hoveredTableId !== null && linkedGroup.some((t) => t.id === hoveredTableId);

  // Is this the leftmost/rightmost table in the group?
  const isLeftmost = linkedGroup.every((t) => t.x >= table.x);
  const isRightmost = linkedGroup.every((t) => t.x <= table.x);

  // Is this table part of the currently selected group?
  const isInSelectedGroup = useMemo(() => {
    if (selectedTableIds.length === 0) return false;
    if (selectedTableIds.includes(table.id)) return true;
    if (selectedTableId) return getLinkedGroup(selectedTableId, tables).some((t) => t.id === table.id);
    return false;
  }, [selectedTableId, selectedTableIds, tables, table.id]);

  const isEditing = isLocalRenaming || (isGroupRenaming && isInSelectedGroup);

  useEffect(() => {
    if (!isInSelectedGroup) setIsLocalRenaming(false);
  }, [isInSelectedGroup]);

  function handleEditEnd() {
    setIsLocalRenaming(false);
    if (isGroupRenaming) setIsGroupRenaming(false);
  }

  function handleNodeMouseDown(e: React.MouseEvent) {
    if (e.shiftKey) return;
    setSelectedTableId(table.id);
    onTableMouseDown(e);
  }

  function handleDoubleClickName() {
    setSelectedTableId(table.id);
    setIsLocalRenaming(true);
  }

  function handleAddAdjacent(e: React.MouseEvent, side: 'left' | 'right') {
    e.stopPropagation();
    checkpoint();

    const currentTables = useAppStore.getState().tables;
    const group = getLinkedGroup(table.id, currentTables);
    const groupIds = new Set(group.map((t) => t.id));

    // Find the endpoint table in the direction we're adding
    const endTable = group.reduce(
      (best, t) => (side === 'right' ? (t.x > best.x ? t : best) : (t.x < best.x ? t : best)),
      group[0]
    );

    const newX = side === 'right' ? endTable.x + RECT_WIDTH : endTable.x - RECT_WIDTH;
    const newY = endTable.y;
    const bumpDir = side === 'right' ? 1 : -1;

    // Bump any tables that would overlap with the new table position
    for (const other of currentTables) {
      if (groupIds.has(other.id)) continue;
      // Only bump if Y ranges also overlap
      if (Math.abs(newY - other.y) >= RECT_HEIGHT) continue;

      if (side === 'right' && other.x < newX + RECT_WIDTH + GAP_BETWEEN_TABLES) {
        const delta = newX + RECT_WIDTH + GAP_BETWEEN_TABLES - other.x;
        useAppStore.getState().moveSnappedPair(other.id, bumpDir * delta, 0);
      } else if (side === 'left' && other.x > newX - RECT_WIDTH - GAP_BETWEEN_TABLES) {
        const delta = other.x - (newX - RECT_WIDTH - GAP_BETWEEN_TABLES);
        useAppStore.getState().moveSnappedPair(other.id, -delta, 0);
      }
    }

    const newId = addTable('rectangle', newX, newY, 10);
    snapTables(newId, endTable.id, side === 'right' ? 'left' : 'right');
  }

  // Button positions within the TableNode div (rectangle only)
  const cx = -dx;
  const cy = -dy;
  const btnSize = 22;
  const btnGap = 22;

  return (
    <div
      style={{
        position: 'absolute',
        left: table.x + dx,
        top: table.y + dy,
        width: -dx * 2,
        height: -dy * 2,
        cursor: 'default',
        userSelect: 'none',
      }}
      onMouseDown={handleNodeMouseDown}
      onMouseEnter={() => setHoveredTableId(table.id)}
      onMouseLeave={() => setHoveredTableId(null)}
    >
      {table.type === 'circle' && (
        <CircleTable table={table} isEditing={isEditing} onEditEnd={handleEditEnd} onDoubleClickName={handleDoubleClickName} />
      )}
      {table.type === 'rectangle' && (
        <RectangleTable table={table} isEditing={isEditing} onEditEnd={handleEditEnd} onDoubleClickName={handleDoubleClickName} />
      )}
      {table.type === 'sweetheart' && (
        <SweetheartTable table={table} isEditing={isEditing} onEditEnd={handleEditEnd} onDoubleClickName={handleDoubleClickName} />
      )}

      {/* Adjacent-table add buttons — rectangle only, at group endpoints */}
      {table.type === 'rectangle' && (['left', 'right'] as const).map((side) => {
        if (side === 'left' && !isLeftmost) return null;
        if (side === 'right' && !isRightmost) return null;
        return (
          <button
            key={side}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => handleAddAdjacent(e, side)}
            style={{
              position: 'absolute',
              left: side === 'left'
                ? cx - RECT_WIDTH / 2 - btnGap - btnSize
                : cx + RECT_WIDTH / 2 + btnGap,
              top: cy - btnSize / 2,
              width: btnSize,
              height: btnSize,
              opacity: isGroupHovered ? 1 : 0,
              transition: 'opacity 0.15s',
              pointerEvents: isGroupHovered ? 'auto' : 'none',
              zIndex: 25,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'white',
              border: '1.5px solid #d1d5db',
              borderRadius: '50%',
              cursor: 'pointer',
              fontSize: 16,
              color: '#6b7280',
              boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
              lineHeight: 1,
            }}
            title={`Add linked table to the ${side}`}
          >
            +
          </button>
        );
      })}
    </div>
  );
}
