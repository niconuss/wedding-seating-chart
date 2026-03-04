import { useCallback, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { MIN_SCALE, MAX_SCALE } from '@/utils/constants';

export function useCanvasPanZoom() {
  const setCanvasTransform = useAppStore((s) => s.setCanvasTransform);
  const isPanningRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  const onWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      e.preventDefault();
      const { x, y, scale } = useAppStore.getState().canvasTransform;

      // Ctrl+scroll (or pinch gesture which also sets ctrlKey) = zoom
      if (e.ctrlKey) {
        const delta = e.deltaY < 0 ? 1.1 : 0.9;
        const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * delta));
        if (newScale === scale) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const newX = mouseX - (mouseX - x) * (newScale / scale);
        const newY = mouseY - (mouseY - y) * (newScale / scale);
        setCanvasTransform({ x: newX, y: newY, scale: newScale });
      } else {
        // Regular scroll = pan
        setCanvasTransform({ x: x - e.deltaX, y: y - e.deltaY, scale });
      }
    },
    [setCanvasTransform]
  );

  const onMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Middle mouse always pans; left mouse pans only if it reaches the background (not stopped by a child)
      const isDraggingTable = useAppStore.getState().isDraggingTable;
      if (isDraggingTable) return;
      if (e.button === 1) {
        isPanningRef.current = true;
        lastPosRef.current = { x: e.clientX, y: e.clientY };
        e.preventDefault();
      }
    },
    []
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isPanningRef.current) return;
      const dx = e.clientX - lastPosRef.current.x;
      const dy = e.clientY - lastPosRef.current.y;
      lastPosRef.current = { x: e.clientX, y: e.clientY };
      const { x, y, scale } = useAppStore.getState().canvasTransform;
      setCanvasTransform({ x: x + dx, y: y + dy, scale });
    },
    [setCanvasTransform]
  );

  const onMouseUp = useCallback(() => {
    isPanningRef.current = false;
  }, []);

  const onMouseLeave = useCallback(() => {
    isPanningRef.current = false;
  }, []);

  return { onWheel, onMouseDown, onMouseMove, onMouseUp, onMouseLeave };
}
