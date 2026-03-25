// Firestore helpers para multi-tenant (multi-igrejas)
import { collection, doc } from "firebase/firestore";
import { db } from "./firebase";

/**
 * Retorna a referência da coleção dentro do contexto da igreja
 * Estrutura: /igrejas/{igrejaId}/{collectionName}
 */
export function getIgrejaCollection(igrejaId: string, collectionName: string) {
  if (!db) throw new Error("Firebase não configurado");
  if (!igrejaId) throw new Error("igrejaId é obrigatório");
  return collection(db, "igrejas", igrejaId, collectionName);
}

/**
 * Retorna a referência do documento dentro do contexto da igreja
 * Estrutura: /igrejas/{igrejaId}/{collectionName}/{docId}
 */
export function getIgrejaDoc(igrejaId: string, collectionName: string, docId: string) {
  if (!db) throw new Error("Firebase não configurado");
  if (!igrejaId) throw new Error("igrejaId é obrigatório");
  return doc(db, "igrejas", igrejaId, collectionName, docId);
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
  MEMBROS: "membros",
  GRUPOS: "grupos",
  ACOMPANHAMENTOS: "acompanhamentos",
  USUARIOS: "usuarios", // Usuários ficam na raiz, com igrejaId no documento
} as const;
