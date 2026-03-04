import { Toolbar } from '@/components/toolbar/Toolbar';
import { GuestPanel } from './GuestPanel';
import { CanvasArea } from './CanvasArea';
import { ErrorToast } from '@/components/modals/ErrorToast';
import { FloatingTablePalette } from '@/components/toolbar/FloatingTablePalette';
import { ZoomControls } from '@/components/toolbar/ZoomControls';
import { useUndoRedo } from '@/hooks/useUndoRedo';

export function AppShell() {
  useUndoRedo();
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50">
      <Toolbar />
      <div className="flex flex-1 overflow-hidden">
        <GuestPanel />
        <CanvasArea />
      </div>
      <FloatingTablePalette />
      <ZoomControls />
      <ErrorToast />
    </div>
  );
}
