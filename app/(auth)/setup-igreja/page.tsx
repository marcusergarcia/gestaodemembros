"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, setDoc, collection, addDoc, Timestamp, getDocs, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldGroup, FieldLabel, FieldError, FieldDescription } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Church, MapPin, Building2, ArrowRight, Plus } from "lucide-react";
import { toast } from "sonner";
import { TipoIgreja, Igreja } from "@/lib/types";

type TipoSelecionado = "sede" | "congregacao" | "subcongregacao";

interface IgrejaExistente {
  id: string;
  nome: string;
  tipo: TipoIgreja;
  convencao?: string;
  sedeId?: string;
  igrejaPaiId?: string;
}

export default function SetupIgrejaPage() {
  const router = useRouter();
  const { user, loading: authLoading, igrejaId } = useAuth();

  const [loading, setLoading] = useState(false);
  const [loadingIgrejas, setLoadingIgrejas] = useState(true);
  const [error, setError] = useState("");
  
  // Dados da igreja
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<TipoSelecionado>("sede");
  const [dirigente, setDirigente] = useState("");
  const [convencao, setConvencao] = useState("");
  const [ministerio, setMinisterio] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [cnpj, setCnpj] = useState("");
  
  // Endereço
  const [cep, setCep] = useState("");
  const [logradouro, setLogradouro] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  
  // Hierarquia - seleção existente ou criar nova
  const [sedeId, setSedeId] = useState("");
  const [congregacaoId, setCongregacaoId] = useState("");
  
  // Modo de criação inline (quando não existe sede/congregação)
  const [criarNovaSede, setCriarNovaSede] = useState(false);
  const [criarNovaCongregacao, setCriarNovaCongregacao] = useState(false);
  
  // Dados para nova sede inline
  const [novaSedeNome, setNovaSedeNome] = useState("");
  const [novaSedeConvencao, setNovaSedeConvencao] = useState("");
  const [novaSedeDirigente, setNovaSedeDirigente] = useState("");
  
  // Dados para nova congregação inline
  const [novaCongregacaoNome, setNovaCongregacaoNome] = useState("");
  const [novaCongregacaoDirigente, setNovaCongregacaoDirigente] = useState("");
  
  // Igrejas existentes para seleção
  const [sedesExistentes, setSedesExistentes] = useState<IgrejaExistente[]>([]);
  const [congregacoesExistentes, setCongregacoesExistentes] = useState<IgrejaExistente[]>([]);

  // Redireciona se já tem igreja
  useEffect(() => {
    if (!authLoading && igrejaId) {
      router.push("/");
    }
  }, [authLoading, igrejaId, router]);

  // Redireciona se não está logado
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Carrega igrejas existentes (sedes e congregações)
  useEffect(() => {
    async function carregarIgrejas() {
      try {
        const igrejasRef = collection(db, "igrejas");
        const snapshot = await getDocs(igrejasRef);
        
        const sedes: IgrejaExistente[] = [];
        const congregacoes: IgrejaExistente[] = [];
        
        snapshot.docs.forEach(docSnap => {
          const data = docSnap.data();
          const igreja: IgrejaExistente = {
            id: docSnap.id,
            nome: data.nome || "Sem nome",
            tipo: data.tipo || "sede",
            convencao: data.convencao,
            sedeId: data.sedeId,
            igrejaPaiId: data.igrejaPaiId
          };
          
          if (data.tipo === "sede" || !data.tipo) {
            sedes.push(igreja);
          } else if (data.tipo === "congregacao") {
            congregacoes.push(igreja);
          }
        });
        
        setSedesExistentes(sedes);
        setCongregacoesExistentes(congregacoes);
      } catch (err) {
        console.error("Erro ao carregar igrejas:", err);
      } finally {
        setLoadingIgrejas(false);
      }
    }
    
    if (user) {
      carregarIgrejas();
    }
  }, [user]);

  // Filtra congregações pela sede selecionada
  const congregacoesDaSede = congregacoesExistentes.filter(c => {
    if (!sedeId) return false;
    return c.sedeId === sedeId || c.igrejaPaiId === sedeId;
  });

  // Pega a convenção da sede selecionada
  const sedeSelecionada = sedesExistentes.find(s => s.id === sedeId);
  const convencaoHerdada = sedeSelecionada?.convencao || "";

  const buscarCep = async () => {
    if (cep.length !== 8) return;
    
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        setLogradouro(data.logradouro || "");
        setBairro(data.bairro || "");
        setCidade(data.localidade || "");
        setEstado(data.uf || "");
      }
    } catch (err) {
      console.error("Erro ao buscar CEP:", err);
    }
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 8);
    setCep(digits);
  };

  const formatCep = (value: string) => {
    if (value.length <= 5) return value;
    return `${value.slice(0, 5)}-${value.slice(5)}`;
  };

  // Cria uma sede inline (quando usuário seleciona "Adicionar nova sede")
  const criarSedeInline = async (): Promise<string> => {
    if (!novaSedeNome.trim()) {
      throw new Error("Nome da sede é obrigatório");
    }
    if (!novaSedeConvencao.trim()) {
      throw new Error("Convenção da sede é obrigatória");
    }

    const sedeData: Partial<Igreja> = {
      nome: novaSedeNome.trim(),
      tipo: "sede",
      convencao: novaSedeConvencao.trim(),
      dirigente: novaSedeDirigente.trim() || undefined,
      dataCadastro: Timestamp.now(),
      ativa: true,
    };

    const igrejasRef = collection(db, "igrejas");
    const novaSedeRef = await addDoc(igrejasRef, sedeData);
    
    // Cria unidade padrão para a sede
    const unidadesRef = collection(db, "igrejas", novaSedeRef.id, "unidades");
    await addDoc(unidadesRef, {
      nome: novaSedeNome.trim(),
      tipo: "sede",
      dataCriacao: Timestamp.now(),
      ativa: true,
    });

    return novaSedeRef.id;
  };

  // Cria uma congregação inline (quando usuário seleciona "Adicionar nova congregação")
  const criarCongregacaoInline = async (sedeIdParam: string, convencaoParam: string): Promise<string> => {
    if (!novaCongregacaoNome.trim()) {
      throw new Error("Nome da congregação é obrigatório");
    }

    const congregacaoData: Partial<Igreja> = {
      nome: novaCongregacaoNome.trim(),
      tipo: "congregacao",
      convencao: convencaoParam,
      sedeId: sedeIdParam,
      igrejaPaiId: sedeIdParam,
      dirigente: novaCongregacaoDirigente.trim() || undefined,
      dataCadastro: Timestamp.now(),
      ativa: true,
    };

    const igrejasRef = collection(db, "igrejas");
    const novaCongregacaoRef = await addDoc(igrejasRef, congregacaoData);
    
    // Cria unidade padrão para a congregação
    const unidadesRef = collection(db, "igrejas", novaCongregacaoRef.id, "unidades");
    await addDoc(unidadesRef, {
      nome: novaCongregacaoNome.trim(),
      tipo: "congregacao",
      unidadePaiId: sedeIdParam,
      dataCriacao: Timestamp.now(),
      ativa: true,
    });

    return novaCongregacaoRef.id;
  };

  const handleSubmit = async () => {
    if (!nome.trim()) {
      setError("Digite o nome da igreja");
      return;
    }

    // Validações específicas por tipo
    if (tipo === "sede" && !convencao.trim()) {
      setError("Digite a convenção/denominação da sede");
      return;
    }

    if (tipo === "congregacao") {
      if (!sedeId && !criarNovaSede) {
        setError("Selecione a sede ou crie uma nova");
        return;
      }
      if (criarNovaSede && (!novaSedeNome.trim() || !novaSedeConvencao.trim())) {
        setError("Preencha os dados da nova sede (nome e convenção)");
        return;
      }
    }

    if (tipo === "subcongregacao") {
      if (!sedeId && !criarNovaSede) {
        setError("Selecione a sede ou crie uma nova");
        return;
      }
      if (criarNovaSede && (!novaSedeNome.trim() || !novaSedeConvencao.trim())) {
        setError("Preencha os dados da nova sede");
        return;
      }
      if (!criarNovaSede && !congregacaoId && !criarNovaCongregacao) {
        setError("Selecione a congregação ou crie uma nova");
        return;
      }
      if (criarNovaCongregacao && !novaCongregacaoNome.trim()) {
        setError("Preencha o nome da nova congregação");
        return;
      }
    }

    setLoading(true);
    setError("");

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("Usuário não autenticado");

      let sedeIdFinal = sedeId;
      let congregacaoIdFinal = congregacaoId;
      let convencaoFinal = convencao.trim();
      let igrejaPaiIdFinal: string | undefined;

      // Se é SEDE, cria diretamente
      if (tipo === "sede") {
        // Convenção já está definida
      }

      // Se é CONGREGAÇÃO
      if (tipo === "congregacao") {
        if (criarNovaSede) {
          // Cria a sede primeiro
          sedeIdFinal = await criarSedeInline();
          convencaoFinal = novaSedeConvencao.trim();
        } else {
          // Usa convenção da sede selecionada
          convencaoFinal = convencaoHerdada;
        }
        igrejaPaiIdFinal = sedeIdFinal;
      }

      // Se é SUBCONGREGAÇÃO
      if (tipo === "subcongregacao") {
        if (criarNovaSede) {
          // Cria a sede primeiro
          sedeIdFinal = await criarSedeInline();
          convencaoFinal = novaSedeConvencao.trim();
          
          // Agora cria a congregação
          if (criarNovaCongregacao || !congregacaoId) {
            congregacaoIdFinal = await criarCongregacaoInline(sedeIdFinal, convencaoFinal);
          }
        } else {
          // Usa convenção da sede selecionada
          convencaoFinal = convencaoHerdada;
          
          if (criarNovaCongregacao) {
            // Cria a congregação
            congregacaoIdFinal = await criarCongregacaoInline(sedeIdFinal, convencaoFinal);
          }
        }
        igrejaPaiIdFinal = congregacaoIdFinal;
      }

      // Cria o documento da igreja principal
      const igrejaData: Partial<Igreja> = {
        nome: nome.trim(),
        tipo: tipo,
        dirigente: dirigente.trim() || undefined,
        convencao: convencaoFinal || undefined,
        ministerio: ministerio.trim() || undefined,
        telefone: telefone.trim() || undefined,
        email: email.trim() || undefined,
        cnpj: cnpj.trim() || undefined,
        igrejaPaiId: igrejaPaiIdFinal,
        sedeId: tipo !== "sede" ? sedeIdFinal : undefined,
        endereco: {
          cep: cep || undefined,
          logradouro: logradouro.trim() || undefined,
          numero: numero.trim() || undefined,
          complemento: complemento.trim() || undefined,
          bairro: bairro.trim() || undefined,
          cidade: cidade.trim() || undefined,
          estado: estado.trim() || undefined,
        },
        dataCadastro: Timestamp.now(),
        ativa: true,
      };

      // Cria a igreja na coleção igrejas
      const igrejasRef = collection(db, "igrejas");
      const novaIgrejaRef = await addDoc(igrejasRef, igrejaData);
      const novaIgrejaId = novaIgrejaRef.id;

      // Determina o tipo da unidade
      let tipoUnidade: "sede" | "congregacao" | "subcongregacao" = "sede";
      if (tipo === "congregacao") tipoUnidade = "congregacao";
      else if (tipo === "subcongregacao") tipoUnidade = "subcongregacao";

      // Cria uma unidade padrão para a igreja
      const unidadesRef = collection(db, "igrejas", novaIgrejaId, "unidades");
      const unidadeData = {
        nome: nome.trim(),
        tipo: tipoUnidade,
        unidadePaiId: igrejaPaiIdFinal || null,
        endereco: igrejaData.endereco,
        dataCriacao: Timestamp.now(),
        ativa: true,
      };
      const novaUnidadeRef = await addDoc(unidadesRef, unidadeData);

      // Atualiza o usuário com a nova igreja e unidade
      const userRef = doc(db, "usuarios", currentUser.uid);
      await setDoc(userRef, {
        igrejaId: novaIgrejaId,
        unidadeId: novaUnidadeRef.id,
        nivelAcesso: "full", // Quem cria a igreja tem acesso total
        dataAtualizacao: Timestamp.now(),
      }, { merge: true });

      toast.success("Igreja cadastrada com sucesso!");
      
      // Força refresh para carregar os novos dados
      window.location.href = "/";
    } catch (err: unknown) {
      console.error("Erro ao criar igreja:", err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Erro ao cadastrar igreja. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Reset dos campos inline quando muda seleção
  useEffect(() => {
    if (sedeId && sedeId !== "__nova__") {
      setCriarNovaSede(false);
      setNovaSedeNome("");
      setNovaSedeConvencao("");
      setNovaSedeDirigente("");
    }
  }, [sedeId]);

  useEffect(() => {
    if (congregacaoId && congregacaoId !== "__nova__") {
      setCriarNovaCongregacao(false);
      setNovaCongregacaoNome("");
      setNovaCongregacaoDirigente("");
    }
  }, [congregacaoId]);

  // Handler para seleção de sede
  const handleSedeChange = (value: string) => {
    if (value === "__nova__") {
      setCriarNovaSede(true);
      setSedeId("");
      setCongregacaoId("");
    } else {
      setCriarNovaSede(false);
      setSedeId(value);
      setCongregacaoId("");
    }
  };

  // Handler para seleção de congregação
  const handleCongregacaoChange = (value: string) => {
    if (value === "__nova__") {
      setCriarNovaCongregacao(true);
      setCongregacaoId("");
    } else {
      setCriarNovaCongregacao(false);
      setCongregacaoId(value);
    }
  };

  if (authLoading || loadingIgrejas) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Spinner className="h-8 w-8 text-primary" />
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-start bg-gradient-to-b from-background to-muted/30 p-4 py-8">
      <div className="mb-8 flex flex-col items-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
          <Church className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Cadastrar Igreja</h1>
        <p className="text-muted-foreground">Configure os dados da sua igreja</p>
      </div>

      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Dados da Igreja
          </CardTitle>
          <CardDescription>
            Preencha as informações abaixo para cadastrar sua igreja no sistema.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Tipo da Igreja */}
          <FieldGroup>
            <Field>
              <FieldLabel>Tipo da Igreja *</FieldLabel>
              <Select value={tipo} onValueChange={(v) => {
                setTipo(v as TipoSelecionado);
                setSedeId("");
                setCongregacaoId("");
                setCriarNovaSede(false);
                setCriarNovaCongregacao(false);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sede">Igreja Sede</SelectItem>
                  <SelectItem value="congregacao">Congregacao</SelectItem>
                  <SelectItem value="subcongregacao">Subcongregacao</SelectItem>
                </SelectContent>
              </Select>
              <FieldDescription>
                {tipo === "sede" && "Igreja principal, matriz ou sede ministerial. Voce definira a convencao."}
                {tipo === "congregacao" && "Igreja vinculada a uma sede. A convencao sera herdada da sede."}
                {tipo === "subcongregacao" && "Ponto de pregacao vinculado a uma congregacao."}
              </FieldDescription>
            </Field>

            {/* Campo Convenção (apenas para SEDE) */}
            {tipo === "sede" && (
              <Field>
                <FieldLabel>Convencao/Denominacao *</FieldLabel>
                <Input
                  placeholder="Ex: Assembleia de Deus, Igreja Batista, etc."
                  value={convencao}
                  onChange={(e) => setConvencao(e.target.value)}
                />
                <FieldDescription>
                  Esta convencao sera herdada por todas as congregacoes e subcongregacoes.
                </FieldDescription>
              </Field>
            )}

            {/* Seleção de Sede (para congregação e subcongregação) */}
            {(tipo === "congregacao" || tipo === "subcongregacao") && (
              <Field>
                <FieldLabel>Igreja Sede *</FieldLabel>
                <Select 
                  value={criarNovaSede ? "__nova__" : sedeId} 
                  onValueChange={handleSedeChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a sede" />
                  </SelectTrigger>
                  <SelectContent>
                    {sedesExistentes.map(igreja => (
                      <SelectItem key={igreja.id} value={igreja.id}>
                        {igreja.nome} {igreja.convencao && `(${igreja.convencao})`}
                      </SelectItem>
                    ))}
                    <SelectItem value="__nova__">
                      <span className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Adicionar nova sede
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {sedeId && !criarNovaSede && convencaoHerdada && (
                  <FieldDescription>
                    Convencao: {convencaoHerdada}
                  </FieldDescription>
                )}
              </Field>
            )}

            {/* Campos para criar nova sede inline */}
            {criarNovaSede && (tipo === "congregacao" || tipo === "subcongregacao") && (
              <div className="rounded-lg border border-dashed border-primary/50 bg-primary/5 p-4 space-y-4">
                <p className="text-sm font-medium text-primary">Nova Sede</p>
                <Field>
                  <FieldLabel>Nome da Sede *</FieldLabel>
                  <Input
                    placeholder="Ex: Igreja Sede Central"
                    value={novaSedeNome}
                    onChange={(e) => setNovaSedeNome(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel>Convencao da Sede *</FieldLabel>
                  <Input
                    placeholder="Ex: Assembleia de Deus"
                    value={novaSedeConvencao}
                    onChange={(e) => setNovaSedeConvencao(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel>Dirigente da Sede</FieldLabel>
                  <Input
                    placeholder="Nome do pastor da sede"
                    value={novaSedeDirigente}
                    onChange={(e) => setNovaSedeDirigente(e.target.value)}
                  />
                </Field>
              </div>
            )}

            {/* Seleção de Congregação (para subcongregação) */}
            {tipo === "subcongregacao" && (sedeId || criarNovaSede) && !criarNovaSede && (
              <Field>
                <FieldLabel>Congregacao *</FieldLabel>
                <Select 
                  value={criarNovaCongregacao ? "__nova__" : congregacaoId} 
                  onValueChange={handleCongregacaoChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a congregacao" />
                  </SelectTrigger>
                  <SelectContent>
                    {congregacoesDaSede.length === 0 && (
                      <SelectItem value="" disabled>
                        Nenhuma congregacao desta sede
                      </SelectItem>
                    )}
                    {congregacoesDaSede.map(igreja => (
                      <SelectItem key={igreja.id} value={igreja.id}>
                        {igreja.nome}
                      </SelectItem>
                    ))}
                    <SelectItem value="__nova__">
                      <span className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Adicionar nova congregacao
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            )}

            {/* Se criou nova sede para subcongregação, precisa criar congregação também */}
            {tipo === "subcongregacao" && criarNovaSede && (
              <div className="rounded-lg border border-dashed border-amber-500/50 bg-amber-500/5 p-4 space-y-4">
                <p className="text-sm font-medium text-amber-700">Nova Congregacao (vinculada a sede acima)</p>
                <Field>
                  <FieldLabel>Nome da Congregacao *</FieldLabel>
                  <Input
                    placeholder="Ex: Congregacao Vila Nova"
                    value={novaCongregacaoNome}
                    onChange={(e) => setNovaCongregacaoNome(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel>Dirigente da Congregacao</FieldLabel>
                  <Input
                    placeholder="Nome do dirigente"
                    value={novaCongregacaoDirigente}
                    onChange={(e) => setNovaCongregacaoDirigente(e.target.value)}
                  />
                </Field>
              </div>
            )}

            {/* Campos para criar nova congregação inline (quando não está criando sede nova) */}
            {tipo === "subcongregacao" && criarNovaCongregacao && !criarNovaSede && (
              <div className="rounded-lg border border-dashed border-amber-500/50 bg-amber-500/5 p-4 space-y-4">
                <p className="text-sm font-medium text-amber-700">Nova Congregacao</p>
                <Field>
                  <FieldLabel>Nome da Congregacao *</FieldLabel>
                  <Input
                    placeholder="Ex: Congregacao Vila Nova"
                    value={novaCongregacaoNome}
                    onChange={(e) => setNovaCongregacaoNome(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel>Dirigente da Congregacao</FieldLabel>
                  <Input
                    placeholder="Nome do dirigente"
                    value={novaCongregacaoDirigente}
                    onChange={(e) => setNovaCongregacaoDirigente(e.target.value)}
                  />
                </Field>
              </div>
            )}
          </FieldGroup>

          {/* Dados Principais */}
          <FieldGroup>
            <Field>
              <FieldLabel>Nome da Igreja *</FieldLabel>
              <Input
                placeholder="Ex: Igreja Missao Restaurar"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>Dirigente/Pastor</FieldLabel>
                <Input
                  placeholder="Nome do pastor ou dirigente"
                  value={dirigente}
                  onChange={(e) => setDirigente(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel>Ministerio</FieldLabel>
                <Input
                  placeholder="Ex: Ministerio Missao"
                  value={ministerio}
                  onChange={(e) => setMinisterio(e.target.value)}
                />
              </Field>
            </div>
          </FieldGroup>

          {/* Contato */}
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>Telefone</FieldLabel>
                <Input
                  placeholder="(11) 99999-9999"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel>E-mail</FieldLabel>
                <Input
                  type="email"
                  placeholder="contato@igreja.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
            </div>
            <Field>
              <FieldLabel>CNPJ</FieldLabel>
              <Input
                placeholder="00.000.000/0000-00"
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
              />
            </Field>
          </FieldGroup>

          {/* Endereço */}
          <FieldGroup>
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Endereco</span>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-3">
              <Field>
                <FieldLabel>CEP</FieldLabel>
                <div className="flex gap-2">
                  <Input
                    placeholder="00000-000"
                    value={formatCep(cep)}
                    onChange={handleCepChange}
                    onBlur={buscarCep}
                  />
                  <Button type="button" variant="outline" onClick={buscarCep} disabled={cep.length !== 8}>
                    Buscar
                  </Button>
                </div>
              </Field>
            </div>

            <Field>
              <FieldLabel>Logradouro</FieldLabel>
              <Input
                placeholder="Rua, Avenida, etc."
                value={logradouro}
                onChange={(e) => setLogradouro(e.target.value)}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field>
                <FieldLabel>Numero</FieldLabel>
                <Input
                  placeholder="123"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                />
              </Field>
              <Field className="sm:col-span-2">
                <FieldLabel>Complemento</FieldLabel>
                <Input
                  placeholder="Apto, Bloco, etc."
                  value={complemento}
                  onChange={(e) => setComplemento(e.target.value)}
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field>
                <FieldLabel>Bairro</FieldLabel>
                <Input
                  placeholder="Bairro"
                  value={bairro}
                  onChange={(e) => setBairro(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel>Cidade</FieldLabel>
                <Input
                  placeholder="Cidade"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel>Estado</FieldLabel>
                <Input
                  placeholder="SP"
                  maxLength={2}
                  value={estado}
                  onChange={(e) => setEstado(e.target.value.toUpperCase())}
                />
              </Field>
            </div>
          </FieldGroup>

          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <Button
            className="w-full"
            size="lg"
            onClick={handleSubmit}
            disabled={loading || !nome.trim()}
          >
            {loading ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                Cadastrando...
              </>
            ) : (
              <>
                Cadastrar Igreja e Continuar
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
