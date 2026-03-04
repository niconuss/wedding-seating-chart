import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { GuestItem } from './GuestItem';
import type { Guest } from '@/types/guest';

interface GuestGroupProps {
  groupName: string;
  guests: Guest[];
  onDragHandleStart?: () => void;
  onDragHandleEnd?: () => void;
}

function PartyGroupedGuests({ guests }: { guests: Guest[] }) {
  const parties = useAppStore((s) => s.parties);
  const lockParty = useAppStore((s) => s.lockParty);
  const unlockParty = useAppStore((s) => s.unlockParty);
  const canRelock = useAppStore((s) => s.canRelock);

  const partyIds = [...new Set(guests.map((g) => g.partyId))];

  return (
    <>
      {partyIds.map((partyId) => {
        const partyGuests = guests.filter((g) => g.partyId === partyId);
        const party = parties.find((p) => p.id === partyId);
        if (!party) return null;
        const isMultiMember = party.memberIds.length > 1;

        return (
          <div key={partyId} className="ml-1">
            {isMultiMember && (
              <div className="flex items-center gap-1 px-2 py-0.5">
                <span className="text-[10px] text-gray-400 flex-1 truncate italic">
                  {party.name}
                </span>
                {party.locked ? (
                  <button
                    onClick={() => unlockParty(partyId)}
                    className="text-[10px] bg-teal-100 text-teal-600 px-1.5 py-0.5 rounded hover:bg-teal-200"
                    title="Unlock party — members can be seated individually"
                  >
                    Unlock
                  </button>
                ) : (
                  <button
                    onClick={() => { if (canRelock(partyId)) lockParty(partyId); }}
                    disabled={!canRelock(partyId)}
                    className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
                    title={canRelock(partyId) ? 'Lock party' : 'Members must be seated adjacently first'}
                  >
                    Lock
                  </button>
                )}
              </div>
            )}
            {partyGuests.map((g) => (
              <GuestItem key={g.id} guest={g} />
            ))}
          </div>
        );
      })}
    </>
  );
}

export function GuestGroup({ groupName, guests, onDragHandleStart, onDragHandleEnd }: GuestGroupProps) {
  const collapsedGroups = useAppStore((s) => s.collapsedGroups);
  const toggleGroupCollapsed = useAppStore((s) => s.toggleGroupCollapsed);
  const subgroupOrder = useAppStore((s) => s.subgroupOrder);
  const addSubgroup = useAppStore((s) => s.addSubgroup);
  const removeSubgroup = useAppStore((s) => s.removeSubgroup);
  const setGuestSubgroup = useAppStore((s) => s.setGuestSubgroup);

  const [showAddSubgroup, setShowAddSubgroup] = useState(false);
  const [newSubgroupName, setNewSubgroupName] = useState('');
  const [dropTarget, setDropTarget] = useState<string | null>(null); // subgroup name or 'unassigned'

  const isCollapsed = collapsedGroups.includes(groupName);
  const unseatedCount = guests.filter((g) => g.tableId === null).length;
  const total = guests.length;

  const subgroups = subgroupOrder[groupName] ?? [];
  const hasSubgroups = subgroups.length > 0;

  function handleAddSubgroup(e: React.FormEvent) {
    e.preventDefault();
    const name = newSubgroupName.trim();
    if (!name) return;
    addSubgroup(groupName, name);
    setNewSubgroupName('');
    setShowAddSubgroup(false);
  }

  function handleSubgroupDrop(e: React.DragEvent, targetSubgroup: string | null) {
    e.preventDefault();
    const guestId = e.dataTransfer.getData('subgroupDragGuestId');
    if (guestId) setGuestSubgroup(guestId, targetSubgroup);
    setDropTarget(null);
  }

  function handleSubgroupDragOver(e: React.DragEvent, name: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget(name);
  }

  return (
    <div className="mb-2">
      <div className="border-t border-gray-200 mb-2" />

      {/* Group header with drag handle */}
      <div className="flex items-stretch">
        {/* Drag handle */}
        <div
          draggable
          className="flex items-center px-1.5 cursor-grab text-gray-300 hover:text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-l transition-colors select-none"
          title="Drag to reorder group"
          onPointerDown={(e) => e.stopPropagation()}
          onDragStart={(e) => {
            e.stopPropagation();
            onDragHandleStart?.();
          }}
          onDragEnd={onDragHandleEnd}
        >
          ⠿
        </div>

        {/* Collapse toggle button */}
        <button
          onClick={() => toggleGroupCollapsed(groupName)}
          className="flex-1 flex items-center gap-1.5 px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-r text-left transition-colors"
        >
          <span className="text-gray-500 text-xs">{isCollapsed ? '▶' : '▼'}</span>
          <span className="font-semibold text-sm text-gray-700 flex-1 truncate">{groupName}</span>
          <span className="text-xs text-gray-400 shrink-0">
            {unseatedCount}/{total} unseated
          </span>
        </button>
      </div>

      {!isCollapsed && (
        <div className="mt-1 space-y-0.5">
          {hasSubgroups ? (
            <>
              {/* Sub-group sections */}
              {subgroups.map((sg) => {
                const sgGuests = guests.filter((g) => g.subgroup === sg);
                const isTarget = dropTarget === sg;
                return (
                  <div key={sg}>
                    {/* Sub-group header — drop target */}
                    <div
                      className={[
                        'flex items-center gap-1 px-2 py-1 mx-1 rounded text-[11px] font-semibold text-gray-500 transition-colors',
                        isTarget ? 'bg-teal-100 text-teal-700' : 'bg-gray-50',
                      ].join(' ')}
                      onDragOver={(e) => handleSubgroupDragOver(e, sg)}
                      onDragLeave={() => setDropTarget(null)}
                      onDrop={(e) => handleSubgroupDrop(e, sg)}
                    >
                      <span className="flex-1 truncate">{sg}</span>
                      <button
                        onClick={() => removeSubgroup(groupName, sg)}
                        className="opacity-0 hover:opacity-100 text-gray-300 hover:text-red-400 transition-all"
                        title={`Delete sub-group "${sg}"`}
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8z"/>
                        </svg>
                      </button>
                    </div>
                    {sgGuests.length > 0 ? (
                      <PartyGroupedGuests guests={sgGuests} />
                    ) : (
                      <div
                        className={[
                          'mx-3 py-1.5 text-[10px] text-center rounded border border-dashed transition-colors',
                          isTarget ? 'border-teal-400 text-teal-500 bg-teal-50' : 'border-gray-200 text-gray-300',
                        ].join(' ')}
                        onDragOver={(e) => handleSubgroupDragOver(e, sg)}
                        onDragLeave={() => setDropTarget(null)}
                        onDrop={(e) => handleSubgroupDrop(e, sg)}
                      >
                        Drop guests here
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Unassigned section */}
              {(() => {
                const unassigned = guests.filter((g) => g.subgroup === null || !subgroups.includes(g.subgroup));
                const isTarget = dropTarget === 'unassigned';
                if (unassigned.length === 0 && !isTarget) return null;
                return (
                  <div>
                    <div
                      className={[
                        'flex items-center gap-1 px-2 py-1 mx-1 rounded text-[11px] font-semibold transition-colors',
                        isTarget ? 'bg-gray-200 text-gray-600' : 'text-gray-400',
                      ].join(' ')}
                      onDragOver={(e) => handleSubgroupDragOver(e, 'unassigned')}
                      onDragLeave={() => setDropTarget(null)}
                      onDrop={(e) => handleSubgroupDrop(e, null)}
                    >
                      Unassigned
                    </div>
                    <PartyGroupedGuests guests={unassigned} />
                  </div>
                );
              })()}
            </>
          ) : (
            /* Original party-grouped layout when no sub-groups */
            <PartyGroupedGuests guests={guests} />
          )}

          {/* Add sub-group */}
          {showAddSubgroup ? (
            <form onSubmit={handleAddSubgroup} className="flex gap-1 px-2 mt-1">
              <input
                autoFocus
                value={newSubgroupName}
                onChange={(e) => setNewSubgroupName(e.target.value)}
                placeholder="Sub-group name"
                className="flex-1 text-xs px-2 py-1 border border-gray-200 rounded outline-none focus:border-teal-400"
                onKeyDown={(e) => { if (e.key === 'Escape') { setShowAddSubgroup(false); setNewSubgroupName(''); } }}
              />
              <button
                type="submit"
                disabled={!newSubgroupName.trim()}
                className="text-xs px-2 py-1 bg-teal-600 text-white rounded hover:bg-teal-700 disabled:opacity-40"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => { setShowAddSubgroup(false); setNewSubgroupName(''); }}
                className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
              >
                ✕
              </button>
            </form>
          ) : (
            <button
              onClick={() => setShowAddSubgroup(true)}
              className="w-full text-left text-[10px] text-gray-400 hover:text-teal-600 px-3 py-0.5 transition-colors"
            >
              + Add sub-group
            </button>
          )}
        </div>
      )}
    </div>
  );
}
