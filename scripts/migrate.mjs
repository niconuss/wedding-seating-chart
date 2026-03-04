import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local manually
const envPath = join(__dirname, '../.env.local');
const env = readFileSync(envPath, 'utf8');
const vars = Object.fromEntries(
  env.split('\n')
    .filter(l => l && !l.startsWith('#'))
    .map(l => l.split('=').map(s => s.trim()))
    .filter(([k]) => k)
);

const firebaseConfig = {
  apiKey: vars.VITE_FIREBASE_API_KEY,
  authDomain: vars.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: vars.VITE_FIREBASE_PROJECT_ID,
  storageBucket: vars.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: vars.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: vars.VITE_FIREBASE_APP_ID,
};

// Load seating data
const raw = readFileSync(join(__dirname, 'seating-data.json'), 'utf8');
const parsed = JSON.parse(raw);
const state = parsed.state ?? parsed;

const { guests, parties, tables, versions, groupOrder, subgroupOrder } = state;

// Write to Firestore under "wedding" document
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const chartRef = doc(db, 'charts', 'wedding');

await setDoc(chartRef, { guests, parties, tables, versions: versions ?? [], groupOrder: groupOrder ?? [], subgroupOrder: subgroupOrder ?? {} });

console.log(`✓ Migrated ${guests.length} guests, ${tables.length} tables to Firestore (charts/wedding)`);
process.exit(0);
