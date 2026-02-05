import { collection, doc } from "firebase/firestore";
import { db } from "./firebase";

/**
 * Helpers simples y DIRECTOS a Firestore raíz
 * (como estaba antes, sin artifacts)
 */

export const getCollectionRef = (name: string) => {
  return collection(db, name);
};

export const getDocRef = (collectionName: string, id: string) => {
  return doc(db, collectionName, id);
};
