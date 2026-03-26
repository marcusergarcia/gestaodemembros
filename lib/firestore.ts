// Firestore helpers para multi-tenant (multi-igrejas)
import { collection, doc } from "firebase/firestore";
import { db } from "./firebase";

// Mapeamento de nomes de coleção (código -> Firestore)
// O Firestore usa "members" (inglês) mas o código usa "membros"
const COLLECTION_MAP: Record<string, string> = {
  membros: "members",
  grupos: "grupos",
  acompanhamentos: "acompanhamentos",
};

/**
 * Retorna a referência da coleção na RAIZ do Firestore
 * Estrutura: /{collectionName} (filtrando por igrejaID no documento)
 * 
 * NOTA: Os membros são salvos na raiz com campo igrejaID para filtro
 */
export function getIgrejaCollection(igrejaId: string, collectionName: string) {
  if (!db) throw new Error("Firebase não configurado");
  if (!igrejaId) throw new Error("igrejaId é obrigatório");

  const firestoreCollectionName =
    COLLECTION_MAP[collectionName] || collectionName;

  // 🔥 NOVA ESTRUTURA (CORRETA)
  return collection(db, "igrejas", igrejaId, firestoreCollectionName);
}

/**
 * Retorna a referência do documento na coleção raiz
 * Estrutura: /{collectionName}/{docId}
 */
export function getIgrejaDoc(igrejaId: string, collectionName: string, docId: string) {
  if (!db) throw new Error("Firebase não configurado");
  if (!igrejaId) throw new Error("igrejaId é obrigatório");

  // Mapeia o nome da coleção se necessário
  const firestoreCollectionName = COLLECTION_MAP[collectionName] || collectionName;

  return doc(db, firestoreCollectionName, docId);
}

/**
 * Retorna a referência do documento da igreja
 * Estrutura: /igrejas/{igrejaId}
 */
export function getIgrejaDoc2(igrejaId: string) {
  if (!db) throw new Error("Firebase não configurado");
  if (!igrejaId) throw new Error("igrejaId é obrigatório");
  return doc(db, "igrejas", igrejaId);
}

// Nomes das coleções padronizados
export const COLLECTIONS = {
  MEMBROS: "membros", // Mapeado para "members" no Firestore
  GRUPOS: "grupos",
  ACOMPANHAMENTOS: "acompanhamentos",
  USUARIOS: "usuarios", // Usuários ficam na raiz, com igrejaId no documento
} as const;


