import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { GuestGroup } from '@/components/guests/GuestGroup';
import { UploadModal } from '@/components/modals/UploadModal';
import { PagesPanel } from './PagesPanel';

export function GuestPanel() {
  const guests = useAppStore((s) => s.guests);
  const addManualGuest = useAppStore((s) => s.addManualGuest);
  const checkpoint = useAppStore((s) => s.checkpoint);
  const groupOrder = useAppStore((s) => s.groupOrder);
  const reorderGroups = useAppStore((s) => s.reorderGroups);

  const [showUpload, setShowUpload] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newGroup, setNewGroup] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Group drag state
  const [draggedGroup, setDraggedGroup] = useState<string | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const groupMap = new Map<string, typeof guests>();
  for (const guest of guests) {
    if (!groupMap.has(guest.group)) groupMap.set(guest.group, []);
    groupMap.get(guest.group)!.push(guest);
  }

  // Ordered groups: use groupOrder for known groups, append any new ones alphabetically
  const allGroupNames = [...groupMap.keys()];
  const orderedGroups = [
    ...groupOrder.filter((g) => allGroupNames.includes(g)),
    ...allGroupNames.filter((g) => !groupOrder.includes(g)).sort(),
  ];

  const existingGroups = allGroupNames.sort();
  const totalGuests = guests.length;
  const seatedGuests = guests.filter((g) => g.tableId !== null).length;

  useEffect(() => {
    if (showAddForm) nameInputRef.current?.focus();
  }, [showAddForm]);

  function handleAddGuest(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    const group = newGroup.trim();
    if (!name || !group) return;
    checkpoint();
    addManualGuest(name, group);
    setNewName('');
    nameInputRef.current?.focus();
  }

  function handleCancelAdd() {
    setShowAddForm(false);
    setNewName('');
    setNewGroup('');
  }

  function handleGroupDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIdx(idx);
  }

  function handleGroupDrop(e: React.DragEvent, idx: number, targetGroup: string) {
    e.preventDefault();
    if (!draggedGroup || draggedGroup === targetGroup) {
      setDraggedGroup(null);
      setDragOverIdx(null);
      return;
    }
    const newOrder = orderedGroups.filter((g) => g !== draggedGroup);
    newOrder.splice(idx, 0, draggedGroup);
    reorderGroups(newOrder);
    setDraggedGroup(null);
    setDragOverIdx(null);
  }

  return (
    <div className="w-64 shrink-0 h-full bg-white border-r border-gray-200 flex flex-col">
      <PagesPanel />
      {/* Header */}
      <div className="p-3 border-b border-gray-200 flex items-center justify-between shrink-0">
        <div>
          <h2 className="font-bold text-gray-800 text-sm">Guests</h2>
          {totalGuests > 0 && (
            <p className="text-xs text-gray-500 mt-0.5">{seatedGuests}/{totalGuests} seated</p>
          )}
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-lg transition-colors border border-teal-200"
          title="Import guests from CSV or Excel"
        >
          <span>📤</span> Import
        </button>
      </div>

      {/* Scrollable guest list */}
      <div className="flex-1 overflow-y-auto p-2 min-h-0">
        {totalGuests === 0 ? (
          <div className="text-center text-sm text-gray-400 mt-8 px-4">
            <div className="text-2xl mb-2">👥</div>
            <p>Add guests manually or import a CSV/Excel file</p>
          </div>
        ) : (
          orderedGroups.map((group, idx) => {
            const groupGuests = groupMap.get(group) ?? [];
            const isDraggingThis = draggedGroup === group;
            const showIndicator = dragOverIdx === idx && draggedGroup && draggedGroup !== group;
            return (
              <div
                key={group}
                style={{ opacity: isDraggingThis ? 0.4 : 1 }}
                onDragOver={(e) => handleGroupDragOver(e, idx)}
                onDragLeave={(e) => {
                  // Only clear if leaving the wrapper entirely
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setDragOverIdx(null);
                  }
                }}
                onDrop={(e) => handleGroupDrop(e, idx, group)}
              >
                {showIndicator && (
                  <div className="h-0.5 bg-teal-400 rounded mx-1 mb-1" />
                )}
                <GuestGroup
                  groupName={group}
                  guests={groupGuests}
                  onDragHandleStart={() => setDraggedGroup(group)}
                  onDragHandleEnd={() => { setDraggedGroup(null); setDragOverIdx(null); }}
                />
              </div>
            );
          })
        )}
      </div>

      {/* Bottom — Add Guest bar */}
      <div className="shrink-0 border-t border-gray-200 bg-white">
        {showAddForm && (
          <form onSubmit={handleAddGuest} className="p-3 space-y-1.5 border-b border-gray-100">
            <input
              ref={nameInputRef}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Guest name"
              className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded-md outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-100"
            />
            <input
              list="group-suggestions"
              value={newGroup}
              onChange={(e) => setNewGroup(e.target.value)}
              placeholder="Group (e.g. Smith Family)"
              className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded-md outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-100"
            />
            <datalist id="group-suggestions">
              {existingGroups.map((g) => <option key={g} value={g} />)}
            </datalist>
            <div className="flex gap-1.5">
              <button
                type="submit"
                disabled={!newName.trim() || !newGroup.trim()}
                className="flex-1 bg-teal-600 text-white text-xs py-1.5 rounded-md hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Add Guest
              </button>
              <button
                type="button"
                onClick={handleCancelAdd}
                className="px-2.5 bg-gray-100 text-gray-600 text-xs py-1.5 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
        <button
          onClick={() => setShowAddForm((v) => !v)}
          className="w-full flex items-center justify-center gap-1.5 py-6 text-xs font-medium text-teal-700 hover:bg-teal-50 transition-colors"
        >
          <span className="text-base leading-none">{showAddForm ? '−' : '+'}</span>
          {showAddForm ? 'Cancel' : 'Add Guest'}
        </button>
      </div>

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} />}
    </div>
  );
}
