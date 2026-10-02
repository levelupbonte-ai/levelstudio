import { collection, doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface RegistrationInput {
  email: string;
  name?: string;
  message?: string;
  source?: string;
  app?: "official_site" | "studio" | "levelstudio";
}

/**
 * Submits a new registration or contact lead into Firebase Firestore /registrations collection.
 * Conforms to hardened Zero-Trust write-only security rules.
 */
export async function submitRegistration(input: RegistrationInput): Promise<{ ok: boolean; id: string }> {
  const email = (input.email || "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    throw new Error("Veuillez fournir une adresse email valide.");
  }

  // Generate a clean valid ID matching /^[a-zA-Z0-9_\-]+$/
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const id = `reg_${timestamp}_${random}`;

  const payload: Record<string, any> = {
    id,
    email,
    name: (input.name || "").trim().slice(0, 100) || "Visiteur",
    message: (input.message || "").trim().slice(0, 2000),
    source: (input.source || "web_portal").slice(0, 80),
    app: input.app || "studio",
    status: "new",
    created_at: new Date().toISOString(),
  };

  try {
    const docRef = doc(db, "registrations", id);
    await setDoc(docRef, payload);
    return { ok: true, id };
  } catch (err: any) {
    console.error("[Registration] Submission error:", err);
    throw new Error(err?.message || "Impossible d'enregistrer l'inscription pour le moment.");
  }
}
