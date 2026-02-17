import { db, ensureAnonymousAuth } from "@/lib/firebase";
import { collection, query, where, getDocs, setDoc, doc } from "firebase/firestore";

// Vincula un conductor a una farmacia usando el PIN de la farmacia
export async function connectDriverToPharmacy(driverId: string, pharmacyPin: string) {
  await ensureAnonymousAuth();

  // Buscar farmacia por PIN
  const q = query(
    collection(db, "pharmacies"),
    where("pin", "==", pharmacyPin),
    where("active", "==", true)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    throw new Error("Invalid or inactive pharmacy PIN");
  }
  const pharmacyDoc = snapshot.docs[0];
  const pharmacyId = pharmacyDoc.id;

  // Guardar relación en el documento del conductor
  await setDoc(
    doc(db, "drivers", driverId),
    { pharmacyId },
    { merge: true }
  );

  // Guardar datos de farmacia en localStorage (opcional, para acceso rápido)
  if (typeof window !== "undefined") {
    localStorage.setItem("PHARMACY_ID", pharmacyId);
    localStorage.setItem("PHARMACY_NAME", pharmacyDoc.data().pharmacyName || "");
    localStorage.setItem("PHARMACY_CITY", pharmacyDoc.data().city || "");
    localStorage.setItem("PHARMACY_STATE", pharmacyDoc.data().state || "");
    localStorage.setItem("PHARMACY_COUNTRY", pharmacyDoc.data().country || "");
  }

  return {
    pharmacyId,
    pharmacyName: pharmacyDoc.data().pharmacyName,
    city: pharmacyDoc.data().city,
    state: pharmacyDoc.data().state,
    country: pharmacyDoc.data().country,
  };
}
