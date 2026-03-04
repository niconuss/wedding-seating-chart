import { useAppStore } from '@/store/useAppStore';
import { MIN_SCALE, MAX_SCALE } from '@/utils/constants';

export function ZoomControls() {
  const canvasTransform = useAppStore((s) => s.canvasTransform);
  const setCanvasTransform = useAppStore((s) => s.setCanvasTransform);
  const fitToScreen = useAppStore((s) => s.fitToScreen);

  function zoom(factor: number) {
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, canvasTransform.scale * factor));
    setCanvasTransform({ ...canvasTransform, scale: newScale });
  }

  return (
    <div className="fixed top-16 right-3 z-40 flex flex-col items-center gap-0.5 bg-white/90 backdrop-blur border border-gray-200 rounded-xl shadow-md p-1">
      <button
        onClick={() => zoom(1.25)}
        className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-lg text-base font-semibold transition-colors"
        title="Zoom in"
      >+</button>

      <button
        onClick={fitToScreen}
        className="w-7 h-5 flex items-center justify-center text-[10px] font-semibold text-gray-500 hover:bg-gray-100 rounded transition-colors tabular-nums"
        title="Reset zoom"
      >
        {Math.round(canvasTransform.scale * 100)}%
      </button>

      <button
        onClick={() => zoom(0.8)}
        className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-lg text-base font-semibold transition-colors"
        title="Zoom out"
      >−</button>
    </div>
  );
}
