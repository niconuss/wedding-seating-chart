import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, CHART_ID } from '@/firebase';
import { useAppStore } from './useAppStore';
import type { Page } from '@/types/page';
import type { Guest } from '@/types/guest';
import type { Party } from '@/types/party';
import type { Table } from '@/types/table';
import type { Version } from '@/types/version';

interface RemoteData {
  guests?: Guest[];
  parties?: Party[];
  tables?: Table[];
  versions?: Version[];
  groupOrder?: string[];
  subgroupOrder?: Record<string, string[]>;
  pages?: Page[];
}

let isReceivingUpdate = false;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let pendingSnapshot: RemoteData | null = null;
// Suppress own-write echoes for 3s after writing to Firestore
let suppressNotificationsUntil = 0;

const LOCALSTORAGE_KEY = 'wedding-seating-chart';

const WRITE_TRIGGER_KEYS = [
  'guests',
  'parties',
  'tables',
  'versions',
  'groupOrder',
  'subgroupOrder',
  'pages',
  'canvasGuests',
] as const;

/** Called by the UI when the user clicks "Load changes" */
export function applyPendingUpdate() {
  if (!pendingSnapshot) return;
  isReceivingUpdate = true;
  useAppStore.getState().loadRemoteState(pendingSnapshot);
  useAppStore.getState().clearPendingUpdateFlag();
  pendingSnapshot = null;
  isReceivingUpdate = false;
}

/** Build the pages array with the current page's latest state baked in */
function buildPagesForWrite(): Page[] {
  const s = useAppStore.getState();
  return s.pages.map((p) => {
    if (p.id !== s.currentPageId) return p;
    const guestSeating: Record<string, { tableId: string | null; seatIndex: number | null }> = {};
    for (const g of s.guests) {
      guestSeating[g.id] = { tableId: g.tableId, seatIndex: g.seatIndex };
    }
    return {
      ...p,
      tables: s.tables,
      guestSeating,
      canvasGuests: s.canvasGuests,
    };
  });
}

export async function initFirebaseSync() {
  if (!import.meta.env.VITE_FIREBASE_PROJECT_ID) {
    console.warn('Firebase: VITE_FIREBASE_PROJECT_ID not set — sync disabled');
    return;
  }

  try {
    const chartRef = doc(db, 'charts', CHART_ID);

    // Initial load
    const snap = await getDoc(chartRef);

    if (!snap.exists()) {
      // Migrate from localStorage one time
      const raw = localStorage.getItem(LOCALSTORAGE_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          const src = parsed.state ?? parsed;
          await setDoc(chartRef, src);
          console.log('Firebase: migrated data from localStorage');
          // Apply the migrated data
          isReceivingUpdate = true;
          useAppStore.getState().loadRemoteState(src as RemoteData);
          isReceivingUpdate = false;
        } catch (e) {
          console.error('Firebase: localStorage migration failed', e);
        }
      }
      // Init page from current state (migration or fresh)
      if (useAppStore.getState().pages.length === 0) {
        useAppStore.getState().initPage('Version 1');
      }
    } else {
      isReceivingUpdate = true;
      useAppStore.getState().loadRemoteState(snap.data() as RemoteData);
      isReceivingUpdate = false;

      // Migration: remote data has no pages yet → create "Version 1" from current state
      if (useAppStore.getState().pages.length === 0) {
        useAppStore.getState().initPage('Version 1');
      }
    }

    // Listen for remote updates — first fire is always the initial state, skip it
    let isFirstSnapshot = true;
    onSnapshot(chartRef, (snapshot) => {
      if (!snapshot.exists()) return;

      if (isFirstSnapshot) {
        isFirstSnapshot = false;
        return;
      }

      // Suppress echoes from our own writes for 3 seconds
      if (Date.now() < suppressNotificationsUntil) return;

      pendingSnapshot = snapshot.data() as RemoteData;
      useAppStore.getState().setHasRemoteUpdate(Date.now());
    });

    // Write local changes to Firestore (debounced 500ms)
    useAppStore.subscribe((state, prev) => {
      if (isReceivingUpdate) return;

      const changed = WRITE_TRIGGER_KEYS.some((key) => state[key] !== prev[key]);
      if (!changed) return;

      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        const s = useAppStore.getState();
        const pages = buildPagesForWrite();
        const data: Record<string, unknown> = {
          guests: s.guests,
          parties: s.parties,
          versions: s.versions,
          groupOrder: s.groupOrder,
          subgroupOrder: s.subgroupOrder,
          pages,
        };
        suppressNotificationsUntil = Date.now() + 3000;
        try {
          await setDoc(chartRef, data);
        } catch (e) {
          console.error('Firebase: write failed', e);
          suppressNotificationsUntil = 0;
        }
      }, 500);
    });
  } catch (e) {
    console.error('Firebase: init failed', e);
  }
}
