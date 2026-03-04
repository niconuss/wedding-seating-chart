import { AppDndProvider } from '@/dnd/DndProvider';
import { AppShell } from '@/components/layout/AppShell';

export default function App() {
  return (
    <AppDndProvider>
      <AppShell />
    </AppDndProvider>
  );
}
