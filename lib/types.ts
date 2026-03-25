import { Timestamp } from "firebase/firestore";

export type TipoMembro = "visitante" | "congregado" | "membro" | "obreiro" | "lider";

export type CargoMembro =
  | "pastor"
  | "evangelista"
  | "presbitero"
  | "diacono"
  | "auxiliar_escala"
  | "outro";

export type NivelAcesso = "admin" | "lider" | "obreiro";

export type TipoGrupo = "estudo" | "visita" | "acompanhamento";

export type TipoAcompanhamento = 
  | "visita_residencial"
  | "visita_hospitalar"
  | "culto_no_lar"
  | "aconselhamento";

export interface DadosHospital {
  nomeHospital: string;
  enderecoHospital: string;
  telefoneHospital?: string;
  quartoLeito?: string;
  horarioVisita?: string;
  previsaoAlta?: Timestamp;
}

export interface Endereco {
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
}

export interface Coordenadas {
  lat: number;
  lng: number;
}

export interface Igreja {
  id: string;
  nome: string;
  endereco: Endereco;
  coordenadas: Coordenadas;
  convencao: string;
  sede: string;
  dirigente: string;
  fotoUrl?: string;
  telefone?: string;
  email?: string;
  dataCadastro: Timestamp;
  atualizadoPor?: string;
  dataAtualizacao?: Timestamp;
}



export interface Usuario {
  uid: string;
  telefone: string;
  nome: string;
  nivelAcesso: NivelAcesso;
  membroId?: string;
  grupoId?: string; // ID do grupo que o líder gerencia
  igrejaId: string; // ID da igreja (multi-tenant)
  ativo: boolean;
  dataCriacao: Timestamp;
}

export interface Grupo {
  id: string;
  nome: string;
  tipo: TipoGrupo;
  liderUid: string;
  liderNome?: string;
  membrosIds: string[];
  linkWhatsApp?: string;
  dataCriacao: Timestamp;
  ativo: boolean;
}

export interface Membro {
  id: string;
  nome: string;
  telefone: string;
  email?: string;
  fotoUrl?: string;
  endereco: Endereco;
  coordenadas: Coordenadas;
  tipo: TipoMembro;
  cargo?: CargoMembro;
  cargoDescricao?: string;
  grupoId?: string; // Grupo ao qual o membro pertence
  dataCadastro: Timestamp;
  dataNascimento?: Timestamp;
  dataConversao?: Timestamp;
  dataBatismo?: Timestamp;
  observacoes?: string;
  ativo: boolean;
  criadoPor: string;
}

export interface Acompanhamento {
  id: string;
  membroId: string;
  membroNome: string;
  membroFotoUrl?: string;
  tipo: TipoAcompanhamento;
  data: Timestamp;
  responsavelUid: string;
  responsavelNome: string;
  descricao: string;
  dadosHospital?: DadosHospital;
  proximoContato?: Timestamp;
  observacoes?: string;
  dataCriacao: Timestamp;
}

// Labels for display
export const TIPOS_MEMBRO: Record<TipoMembro, string> = {
  visitante: "Visitante",
  congregado: "Congregado",
  membro: "Membro",
  obreiro: "Obreiro",
  lider: "Líder",
};

export const CARGOS_MEMBRO: Record<CargoMembro, string> = {
  pastor: "Pastor",
  evangelista: "Evangelista",
  presbitero: "Presbítero",
  diacono: "Diácono(iza)",
  auxiliar_escala: "Auxiliar de Escala",
  outro: "Outro",
};

export const NIVEIS_ACESSO: Record<NivelAcesso, string> = {
  admin: "Administrador",
  lider: "Líder",
  obreiro: "Obreiro",
};

export const TIPOS_GRUPO: Record<TipoGrupo, string> = {
  estudo: "Estudo Bíblico",
  visita: "Visitas",
  acompanhamento: "Acompanhamento",
};

export const TIPOS_ACOMPANHAMENTO: Record<TipoAcompanhamento, string> = {
  visita_residencial: "Visita Residencial",
  visita_hospitalar: "Visita Hospitalar",
  culto_no_lar: "Culto no Lar",
  aconselhamento: "Aconselhamento",
};

export const CORES_ACOMPANHAMENTO: Record<TipoAcompanhamento, string> = {
  visita_residencial: "#22c55e", // green
  visita_hospitalar: "#ef4444", // red
  culto_no_lar: "#8b5cf6", // violet
  aconselhamento: "#f59e0b", // amber
};

// Colors for map markers
export const CORES_TIPO: Record<TipoMembro, string> = {
  visitante: "#94a3b8", // slate
  congregado: "#60a5fa", // blue
  membro: "#34d399", // green
  obreiro: "#fbbf24", // amber
  lider: "#f472b6", // pink
};

export const CORES_CARGO: Record<CargoMembro, string> = {
  pastor: "#ef4444", // red
  evangelista: "#f97316", // orange
  presbitero: "#8b5cf6", // violet
  diacono: "#06b6d4", // cyan
  auxiliar_escala: "#84cc16", // lime
  outro: "#6b7280", // gray
};
