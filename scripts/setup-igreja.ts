/**
 * Script para configurar a estrutura inicial do multi-tenant
 * 
 * INSTRUÇÕES:
 * 1. Execute este script uma única vez para criar a igreja e o admin inicial
 * 2. Substitua os valores abaixo pelos dados reais da sua igreja
 * 3. O IGREJA_ID será usado para identificar sua igreja no sistema
 */

import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, Timestamp } from "firebase/firestore";

// Configuração do Firebase (mesmas credenciais do seu .env)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// ============================================
// CONFIGURE AQUI OS DADOS DA SUA IGREJA
// ============================================

const IGREJA_ID = "igreja-principal"; // ID único da igreja (sem espaços, use hífen)

const DADOS_IGREJA = {
  nome: "Nome da Sua Igreja",
  endereco: "Rua Exemplo, 123",
  cidade: "São Paulo",
  estado: "SP",
  cep: "01234-567",
  telefone: "(11) 99999-9999",
  email: "contato@suaigreja.com",
  // Coordenadas para o mapa (opcional - use Google Maps para encontrar)
  latitude: -23.5505,
  longitude: -46.6333,
};

// UID do usuário que será o admin (pegue do Firebase Authentication)
const ADMIN_UID = "COLOQUE_O_UID_DO_ADMIN_AQUI";
const ADMIN_TELEFONE = "(11) 99999-9999";
const ADMIN_NOME = "Administrador";

// ============================================
// NÃO MODIFIQUE ABAIXO DESTA LINHA
// ============================================

async function setup() {
  console.log("Iniciando configuração...\n");

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  try {
    // 1. Criar documento da igreja
    console.log("1. Criando documento da igreja...");
    await setDoc(doc(db, "igrejas", IGREJA_ID), {
      ...DADOS_IGREJA,
      dataCadastro: Timestamp.now(),
      ativo: true,
    });
    console.log(`   Igreja criada com ID: ${IGREJA_ID}`);

    // 2. Criar/Atualizar usuário admin
    console.log("\n2. Configurando usuário admin...");
    await setDoc(doc(db, "usuarios", ADMIN_UID), {
      telefone: ADMIN_TELEFONE,
      nome: ADMIN_NOME,
      nivelAcesso: "admin",
      igrejaId: IGREJA_ID, // Vincula o admin à igreja
      ativo: true,
      dataCriacao: Timestamp.now(),
    });
    console.log(`   Admin criado/atualizado com UID: ${ADMIN_UID}`);

    console.log("\n✅ Configuração concluída com sucesso!");
    console.log("\nPróximos passos:");
    console.log("1. Faça login no sistema com o número do admin");
    console.log("2. Todos os membros, grupos e acompanhamentos serão salvos em:");
    console.log(`   /igrejas/${IGREJA_ID}/membros`);
    console.log(`   /igrejas/${IGREJA_ID}/grupos`);
    console.log(`   /igrejas/${IGREJA_ID}/acompanhamentos`);

  } catch (error) {
    console.error("Erro durante a configuração:", error);
  }

  process.exit(0);
}

setup();
