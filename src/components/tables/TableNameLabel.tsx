import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';

interface TableNameLabelProps {
  tableId: string;
  name: string;
  isEditing?: boolean;
  onEditEnd?: () => void;
}

export function TableNameLabel({ tableId, name, isEditing: externalEditing, onEditEnd }: TableNameLabelProps) {
  const renameTable = useAppStore((s) => s.renameTable);
  const [internalEditing, setInternalEditing] = useState(false);
  const [value, setValue] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  const editing = externalEditing ?? internalEditing;

  useEffect(() => { setValue(name); }, [name]);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  function commit() {
    const trimmed = value.trim();
    if (trimmed) {
      useAppStore.getState().checkpoint();
      renameTable(tableId, trimmed);
    }
    else setValue(name);
    setInternalEditing(false);
    onEditEnd?.();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') commit();
    if (e.key === 'Escape') {
      setValue(name);
      setInternalEditing(false);
      onEditEnd?.();
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={onKeyDown}
        className="text-center text-xs font-semibold bg-white border border-teal-400 rounded px-1 outline-none w-24"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      />
    );
  }

  return (
    <div className="text-center text-xs font-semibold text-gray-700 select-none px-1 cursor-text">
      {name}
    </div>
  );
}
