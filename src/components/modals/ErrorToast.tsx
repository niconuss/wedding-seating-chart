import { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';

export function ErrorToast() {
  const activeError = useAppStore((s) => s.activeError);
  const setActiveError = useAppStore((s) => s.setActiveError);

  useEffect(() => {
    if (!activeError) return;
    const timer = setTimeout(() => setActiveError(null), 3000);
    return () => clearTimeout(timer);
  }, [activeError, setActiveError]);

  if (!activeError) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-red-600 text-white px-4 py-3 rounded-lg shadow-xl max-w-sm text-sm flex items-start gap-2">
        <span className="shrink-0 mt-0.5">⚠️</span>
        <span>{activeError}</span>
        <button
          onClick={() => setActiveError(null)}
          className="ml-auto shrink-0 opacity-70 hover:opacity-100 leading-none text-lg"
        >
          ×
        </button>
      </div>
    </div>
  );
}
