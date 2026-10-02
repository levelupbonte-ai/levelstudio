import { initializeApp, getApps, cert, type ServiceAccount } from "firebase-admin/app";
import {
  getFirestore,
  type Firestore,
  type DocumentReference,
  type CollectionReference,
  type QuerySnapshot,
} from "firebase-admin/firestore";

export type { Firestore };

function loadServiceAccount(): ServiceAccount | null {
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
  if (!b64) return null;
  try {
    return JSON.parse(Buffer.from(b64, "base64").toString("utf-8"));
  } catch {
    console.warn("[Firestore Admin] FIREBASE_SERVICE_ACCOUNT_B64 is not valid base64 JSON");
    return null;
  }
}

export function initAdminFirestore(): Firestore | null {
  const sa = loadServiceAccount();
  if (!sa) return null;
  const existing = getApps().find((a) => a.name === "levelstudio-admin");
  const app = existing || initializeApp({ credential: cert(sa), projectId: (sa as any).project_id }, "levelstudio-admin");
  const fs = getFirestore(app);
  try {
    fs.settings({ ignoreUndefinedProperties: true });
  } catch {
    // settings can only be applied once per instance
  }
  return fs;
}

export function doc(db: Firestore, col: string, id: string): DocumentReference {
  return db.collection(col).doc(id);
}
export function collection(db: Firestore, col: string): CollectionReference {
  return db.collection(col);
}
export async function setDoc(ref: DocumentReference, data: Record<string, unknown>, opts?: { merge?: boolean }) {
  await ref.set(data, { merge: Boolean(opts?.merge) });
}
export async function deleteDoc(ref: DocumentReference) {
  await ref.delete();
}
export async function getDocs(ref: CollectionReference): Promise<QuerySnapshot> {
  return ref.get();
}
