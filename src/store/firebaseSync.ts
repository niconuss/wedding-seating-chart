import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, CHART_ID } from '@/firebase';
import { useAppStore } from './useAppStore';
import type { AppState } from './useAppStore';

const PERSISTED_KEYS = [
  'guests',
  'parties',
  'tables',
  'versions',
  'groupOrder',
  'subgroupOrder',
] as const;

type PersistedKey = (typeof PERSISTED_KEYS)[number];
type PersistedState = Pick<AppState, PersistedKey>;

const LOCALSTORAGE_KEY = 'wedding-seating-chart';

let isReceivingUpdate = false;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

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
          const data: Partial<PersistedState> = {};
          for (const key of PERSISTED_KEYS) {
            if (key in src) (data as Record<string, unknown>)[key] = src[key];
          }
          await setDoc(chartRef, data);
          console.log('Firebase: migrated data from localStorage');
        } catch (e) {
          console.error('Firebase: localStorage migration failed', e);
        }
      }
    } else {
      isReceivingUpdate = true;
      useAppStore.getState().loadRemoteState(snap.data() as PersistedState);
      isReceivingUpdate = false;
    }

    // Listen for remote updates (fires immediately on subscribe, then on each change)
    onSnapshot(chartRef, (snapshot) => {
      if (!snapshot.exists()) return;
      isReceivingUpdate = true;
      useAppStore.getState().loadRemoteState(snapshot.data() as PersistedState);
      isReceivingUpdate = false;
    });

    // Write local changes to Firestore (debounced 500ms)
    useAppStore.subscribe((state, prev) => {
      if (isReceivingUpdate) return;

      const changed = PERSISTED_KEYS.some((key) => state[key] !== prev[key]);
      if (!changed) return;

      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        const s = useAppStore.getState();
        const data: Partial<PersistedState> = {};
        for (const key of PERSISTED_KEYS) {
          (data as Record<string, unknown>)[key] = s[key];
        }
        try {
          await setDoc(chartRef, data);
        } catch (e) {
          console.error('Firebase: write failed', e);
        }
      }, 500);
    });
  } catch (e) {
    console.error('Firebase: init failed', e);
  }
}
