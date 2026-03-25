import { 
  collection, 
  doc, 
  CollectionReference,
  DocumentReference,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Membro, Grupo, Acompanhamento, Igreja, Usuario } from "@/lib/types";

/**
 * Retorna a referência para a collection de igrejas
 */
export function getIgrejasRef(): CollectionReference<Igreja> {
  return collection(db, "igrejas") as CollectionReference<Igreja>;
}

/**
 * Retorna a referência para um documento específico de igreja
 */
export function getIgrejaDocRef(igrejaId: string): DocumentReference<Igreja> {
  return doc(db, "igrejas", igrejaId) as DocumentReference<Igreja>;
}

/**
 * Retorna a referência para a subcollection de membros de uma igreja
 */
export function getMembrosRef(igrejaId: string): CollectionReference<Membro> {
  if (!igrejaId) {
    throw new Error("igrejaId é obrigatório para acessar membros");
  }
  return collection(db, "igrejas", igrejaId, "membros") as CollectionReference<Membro>;
}

/**
 * Retorna a referência para um documento específico de membro
 */
export function getMembroDocRef(igrejaId: string, membroId: string): DocumentReference<Membro> {
  if (!igrejaId) {
    throw new Error("igrejaId é obrigatório para acessar membro");
  }
  return doc(db, "igrejas", igrejaId, "membros", membroId) as DocumentReference<Membro>;
}

/**
 * Retorna a referência para a subcollection de grupos de uma igreja
 */
export function getGruposRef(igrejaId: string): CollectionReference<Grupo> {
  if (!igrejaId) {
    throw new Error("igrejaId é obrigatório para acessar grupos");
  }
  return collection(db, "igrejas", igrejaId, "grupos") as CollectionReference<Grupo>;
}

/**
 * Retorna a referência para um documento específico de grupo
 */
export function getGrupoDocRef(igrejaId: string, grupoId: string): DocumentReference<Grupo> {
  if (!igrejaId) {
    throw new Error("igrejaId é obrigatório para acessar grupo");
  }
  return doc(db, "igrejas", igrejaId, "grupos", grupoId) as DocumentReference<Grupo>;
}

/**
 * Retorna a referência para a subcollection de acompanhamentos de uma igreja
 */
export function getAcompanhamentosRef(igrejaId: string): CollectionReference<Acompanhamento> {
  if (!igrejaId) {
    throw new Error("igrejaId é obrigatório para acessar acompanhamentos");
  }
  return collection(db, "igrejas", igrejaId, "acompanhamentos") as CollectionReference<Acompanhamento>;
}

/**
 * Retorna a referência para um documento específico de acompanhamento
 */
export function getAcompanhamentoDocRef(igrejaId: string, acompanhamentoId: string): DocumentReference<Acompanhamento> {
  if (!igrejaId) {
    throw new Error("igrejaId é obrigatório para acessar acompanhamento");
  }
  return doc(db, "igrejas", igrejaId, "acompanhamentos", acompanhamentoId) as DocumentReference<Acompanhamento>;
}

/**
 * Retorna a referência para a collection de usuários (global, não por igreja)
 */
export function getUsuariosRef(): CollectionReference<Usuario> {
  return collection(db, "usuarios") as CollectionReference<Usuario>;
}

/**
 * Retorna a referência para um documento específico de usuário
 */
export function getUsuarioDocRef(uid: string): DocumentReference<Usuario> {
  return doc(db, "usuarios", uid) as DocumentReference<Usuario>;
}

/**
 * Verifica se o usuário tem permissão de admin ou superior
 */
export function isAdminOrHigher(nivelAcesso: string | undefined): boolean {
  return nivelAcesso === "admin" || nivelAcesso === "superadmin";
}

/**
 * Verifica se o usuário é superadmin
 */
export function isSuperAdmin(nivelAcesso: string | undefined): boolean {
  return nivelAcesso === "superadmin";
}

/**
 * Verifica se o usuário pode gerenciar membros (admin, superadmin, ou líder)
 */
export function canManageMembers(nivelAcesso: string | undefined): boolean {
  return nivelAcesso === "admin" || nivelAcesso === "superadmin" || nivelAcesso === "lider";
}
