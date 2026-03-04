import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import type { Page } from '@/types/page';

// Module-level clipboard (not persisted, lives for the session)
let clipboardPage: Page | null = null;

export function PagesPanel() {
  const pages = useAppStore((s) => s.pages);
  const currentPageId = useAppStore((s) => s.currentPageId);
  const createPage = useAppStore((s) => s.createPage);
  const switchPage = useAppStore((s) => s.switchPage);
  const renamePage = useAppStore((s) => s.renamePage);
  const deletePage = useAppStore((s) => s.deletePage);
  const duplicatePage = useAppStore((s) => s.duplicatePage);

  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingPageId) editRef.current?.select();
  }, [editingPageId]);

  // Keyboard shortcuts: Cmd/Ctrl+C copies current page, Cmd/Ctrl+V pastes
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const isInput =
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement;
      if (isInput) return;

      if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
        const s = useAppStore.getState();
        const currentPage = s.pages.find((p) => p.id === s.currentPageId);
        if (!currentPage) return;
        // Snapshot current live state into clipboard
        const guestSeating: Record<string, { tableId: string | null; seatIndex: number | null }> = {};
        for (const g of s.guests) guestSeating[g.id] = { tableId: g.tableId, seatIndex: g.seatIndex };
        clipboardPage = {
          ...currentPage,
          tables: JSON.parse(JSON.stringify(s.tables)),
          guestSeating,
          canvasGuests: JSON.parse(JSON.stringify(s.canvasGuests)),
        };
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
        if (!clipboardPage) return;
        e.preventDefault();
        createPage(`${clipboardPage.name} (copy)`, {
          tables: clipboardPage.tables,
          guestSeating: clipboardPage.guestSeating,
          canvasGuests: clipboardPage.canvasGuests,
        });
      }
    }

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function startRename(page: Page) {
    setEditName(page.name);
    setEditingPageId(page.id);
  }

  function commitRename() {
    if (editingPageId && editName.trim()) {
      renamePage(editingPageId, editName.trim());
    }
    setEditingPageId(null);
  }

  function handleRenameKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') commitRename();
    if (e.key === 'Escape') setEditingPageId(null);
  }

  return (
    <div className="shrink-0 border-b border-gray-200">
      {/* Header */}
      <div className="px-3 py-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pages</span>
        <button
          onClick={() => createPage()}
          className="w-5 h-5 flex items-center justify-center rounded text-gray-500 hover:text-teal-600 hover:bg-teal-50 transition-colors text-base leading-none"
          title="New page"
        >
          +
        </button>
      </div>

      {/* Page list */}
      <div className="pb-1">
        {pages.map((page) => {
          const isActive = page.id === currentPageId;
          const isEditing = editingPageId === page.id;

          return (
            <div
              key={page.id}
              className="group flex items-center gap-1.5 px-3 py-1.5 hover:bg-gray-50 cursor-pointer"
              onClick={() => { if (!isEditing) switchPage(page.id); }}
            >
              {/* Active indicator dot */}
              <div
                className={`w-1.5 h-1.5 rounded-full shrink-0 transition-colors ${
                  isActive ? 'bg-teal-500' : 'bg-transparent'
                }`}
              />

              {/* Page name / edit field */}
              {isEditing ? (
                <input
                  ref={editRef}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={handleRenameKeyDown}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 text-xs px-1 py-0.5 border border-teal-400 rounded outline-none focus:ring-1 focus:ring-teal-200 min-w-0"
                />
              ) : (
                <span
                  className={`flex-1 text-xs truncate ${isActive ? 'font-semibold text-gray-800' : 'text-gray-600'}`}
                  onDoubleClick={(e) => { e.stopPropagation(); startRename(page); }}
                >
                  {page.name}
                </span>
              )}

              {/* Action buttons — visible on hover */}
              {!isEditing && (
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); duplicatePage(page.id); }}
                    className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-teal-600 hover:bg-teal-50 transition-colors text-xs"
                    title="Duplicate page"
                  >
                    ⧉
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deletePage(page.id); }}
                    disabled={pages.length <= 1}
                    className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors text-xs disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Delete page"
                  >
                    🗑
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
