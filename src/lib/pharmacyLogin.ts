import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase"; // tu conexión de Firebase

export async function loginWithPin(pin: string) {
  const q = query(
    collection(db, "pharmacies"),
    where("pin", "==", pin),
    where("active", "==", true) // opcional si manejas farmacias activas
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null; // PIN incorrecto
  }

  const doc = snapshot.docs[0];
  return {
    id: doc.id,
    name: doc.data().name,
  };
}
