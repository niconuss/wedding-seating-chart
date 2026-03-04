import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useAppStore } from '@/store/useAppStore';
import { GuestItem } from './GuestItem';
import type { Guest } from '@/types/guest';

interface GuestGroupProps {
  groupName: string;
  guests: Guest[];
  onDragHandleStart?: () => void;
  onDragHandleEnd?: () => void;
  selectedGuestIds?: Set<string>;
  onGuestSelect?: (guestId: string, e: React.MouseEvent) => void;
}

function GroupDropTarget({ groupName, children }: { groupName: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `group-drop-${groupName}`,
    data: { type: 'group', groupName },
  });
  return (
    <div ref={setNodeRef} className={isOver ? 'ring-2 ring-teal-400 rounded' : ''}>
      {children}
    </div>
  );
}

function SubgroupDropTarget({ groupName, subgroupName, children }: { groupName: string; subgroupName: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `subgroup-drop-${groupName}-${subgroupName}`,
    data: { type: 'subgroup', groupName, subgroupName },
  });
  return (
    <div ref={setNodeRef} className={isOver ? 'ring-1 ring-teal-400 rounded' : ''}>
      {children}
    </div>
  );
}

function PartyGroupedGuests({
  guests,
  selectedGuestIds,
  onGuestSelect,
}: {
  guests: Guest[];
  selectedGuestIds?: Set<string>;
  onGuestSelect?: (guestId: string, e: React.MouseEvent) => void;
}) {
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
              <GuestItem
                key={g.id}
                guest={g}
                isSelected={selectedGuestIds?.has(g.id)}
                onSelect={(e) => onGuestSelect?.(g.id, e)}
              />
            ))}
          </div>
        );
      })}
    </>
  );
}

export function GuestGroup({ groupName, guests, onDragHandleStart, onDragHandleEnd, selectedGuestIds, onGuestSelect }: GuestGroupProps) {
  const collapsedGroups = useAppStore((s) => s.collapsedGroups);
  const toggleGroupCollapsed = useAppStore((s) => s.toggleGroupCollapsed);
  const subgroupOrder = useAppStore((s) => s.subgroupOrder);
  const addSubgroup = useAppStore((s) => s.addSubgroup);
  const removeSubgroup = useAppStore((s) => s.removeSubgroup);

  const [showAddSubgroup, setShowAddSubgroup] = useState(false);
  const [newSubgroupName, setNewSubgroupName] = useState('');

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

  return (
    <div className="mb-2">
      <div className="border-t border-gray-200 mb-2" />

      {/* Group header with drag handle — wrapped in GroupDropTarget */}
      <GroupDropTarget groupName={groupName}>
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
      </GroupDropTarget>

      {!isCollapsed && (
        <div className="mt-1 space-y-0.5">
          {hasSubgroups ? (
            <>
              {/* Sub-group sections */}
              {subgroups.map((sg) => {
                const sgGuests = guests.filter((g) => g.subgroup === sg);
                return (
                  <div key={sg}>
                    {/* Sub-group header — drop target */}
                    <SubgroupDropTarget groupName={groupName} subgroupName={sg}>
                      <div
                        className="flex items-center gap-1 px-2 py-1 mx-1 rounded text-[11px] font-semibold text-gray-500 transition-colors bg-gray-50"
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
                    </SubgroupDropTarget>
                    {sgGuests.length > 0 ? (
                      <PartyGroupedGuests
                        guests={sgGuests}
                        selectedGuestIds={selectedGuestIds}
                        onGuestSelect={onGuestSelect}
                      />
                    ) : (
                      <SubgroupDropTarget groupName={groupName} subgroupName={sg}>
                        <div className="mx-3 py-1.5 text-[10px] text-center rounded border border-dashed transition-colors border-gray-200 text-gray-300">
                          Drop guests here
                        </div>
                      </SubgroupDropTarget>
                    )}
                  </div>
                );
              })}

              {/* Unassigned section */}
              {(() => {
                const unassigned = guests.filter((g) => g.subgroup === null || !subgroups.includes(g.subgroup));
                if (unassigned.length === 0) return null;
                return (
                  <div>
                    <div className="flex items-center gap-1 px-2 py-1 mx-1 rounded text-[11px] font-semibold transition-colors text-gray-400">
                      Unassigned
                    </div>
                    <PartyGroupedGuests
                      guests={unassigned}
                      selectedGuestIds={selectedGuestIds}
                      onGuestSelect={onGuestSelect}
                    />
                  </div>
                );
              })()}
            </>
          ) : (
            /* Original party-grouped layout when no sub-groups */
            <PartyGroupedGuests
              guests={guests}
              selectedGuestIds={selectedGuestIds}
              onGuestSelect={onGuestSelect}
            />
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
