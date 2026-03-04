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
let pendingSnapshot: PersistedState | null = null;
// Suppress own-write echoes for 3s after writing to Firestore
let suppressNotificationsUntil = 0;

/** Called by the UI when the user clicks "Load changes" */
export function applyPendingUpdate() {
  if (!pendingSnapshot) return;
  isReceivingUpdate = true;
  useAppStore.getState().loadRemoteState(pendingSnapshot);
  useAppStore.getState().clearPendingUpdateFlag();
  pendingSnapshot = null;
  isReceivingUpdate = false;
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

      pendingSnapshot = snapshot.data() as PersistedState;
      useAppStore.getState().setHasRemoteUpdate(Date.now());
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
