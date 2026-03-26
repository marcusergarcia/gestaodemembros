"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, setDoc, collection, addDoc, Timestamp, getDocs, query, where } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Church, MapPin, User, Building2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { TipoIgreja, Igreja } from "@/lib/types";

type TipoSelecionado = "sede" | "congregacao" | "subcongregacao" | "nao_definido";

interface IgrejaExistente {
  id: string;
  nome: string;
  tipo: TipoIgreja;
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
  
  // Hierarquia
  const [sedeId, setSedeId] = useState("");
  const [congregacaoId, setCongregacaoId] = useState("");
  
  // Igrejas existentes para seleção
  const [igrejasExistentes, setIgrejasExistentes] = useState<IgrejaExistente[]>([]);
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
        
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          const igreja: IgrejaExistente = {
            id: doc.id,
            nome: data.nome || "Sem nome",
            tipo: data.tipo || "sede"
          };
          
          if (data.tipo === "sede" || !data.tipo) {
            sedes.push(igreja);
          } else if (data.tipo === "congregacao") {
            congregacoes.push(igreja);
          }
        });
        
        setIgrejasExistentes(sedes);
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
    // Precisaria verificar o igrejaPaiId, mas por enquanto mostra todas
    return true;
  });

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

  const handleSubmit = async () => {
    if (!nome.trim()) {
      setError("Digite o nome da igreja");
      return;
    }

    if (tipo === "congregacao" && !sedeId) {
      setError("Selecione a igreja sede");
      return;
    }

    if (tipo === "subcongregacao" && (!sedeId || !congregacaoId)) {
      setError("Selecione a sede e a congregação");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("Usuário não autenticado");

      // Determina o tipo para salvar
      let tipoFinal: TipoIgreja = "sede";
      if (tipo === "congregacao") tipoFinal = "congregacao";
      else if (tipo === "subcongregacao") tipoFinal = "subcongregacao";
      else if (tipo === "nao_definido") tipoFinal = "outro";

      // Cria o documento da igreja
      const igrejaData: Partial<Igreja> = {
        nome: nome.trim(),
        tipo: tipoFinal,
        dirigente: dirigente.trim() || undefined,
        convencao: convencao.trim() || undefined,
        ministerio: ministerio.trim() || undefined,
        telefone: telefone.trim() || undefined,
        email: email.trim() || undefined,
        cnpj: cnpj.trim() || undefined,
        igrejaPaiId: tipo === "congregacao" ? sedeId : (tipo === "subcongregacao" ? congregacaoId : undefined),
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

      // Cria uma unidade padrão (sede) para a igreja
      const unidadesRef = collection(db, "igrejas", novaIgrejaId, "unidades");
      const unidadeData = {
        nome: nome.trim(),
        tipo: "sede",
        endereco: igrejaData.endereco,
        dataCriacao: Timestamp.now(),
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
              <Select value={tipo} onValueChange={(v) => setTipo(v as TipoSelecionado)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sede">Igreja Sede</SelectItem>
                  <SelectItem value="congregacao">Congregação</SelectItem>
                  <SelectItem value="subcongregacao">Subcongregação</SelectItem>
                  <SelectItem value="nao_definido">Não definido</SelectItem>
                </SelectContent>
              </Select>
              <FieldDescription>
                {tipo === "sede" && "Igreja principal, matriz ou sede ministerial"}
                {tipo === "congregacao" && "Igreja vinculada a uma sede"}
                {tipo === "subcongregacao" && "Ponto de pregação vinculado a uma congregação"}
                {tipo === "nao_definido" && "Tipo não especificado"}
              </FieldDescription>
            </Field>

            {/* Seleção de Sede (para congregação e subcongregação) */}
            {(tipo === "congregacao" || tipo === "subcongregacao") && (
              <Field>
                <FieldLabel>Igreja Sede *</FieldLabel>
                <Select value={sedeId} onValueChange={setSedeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a sede" />
                  </SelectTrigger>
                  <SelectContent>
                    {igrejasExistentes.length === 0 ? (
                      <SelectItem value="" disabled>Nenhuma sede cadastrada</SelectItem>
                    ) : (
                      igrejasExistentes.map(igreja => (
                        <SelectItem key={igreja.id} value={igreja.id}>
                          {igreja.nome}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {igrejasExistentes.length === 0 && (
                  <FieldDescription className="text-destructive">
                    Cadastre primeiro uma igreja sede para depois criar congregações.
                  </FieldDescription>
                )}
              </Field>
            )}

            {/* Seleção de Congregação (para subcongregação) */}
            {tipo === "subcongregacao" && (
              <Field>
                <FieldLabel>Congregação *</FieldLabel>
                <Select value={congregacaoId} onValueChange={setCongregacaoId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a congregação" />
                  </SelectTrigger>
                  <SelectContent>
                    {congregacoesDaSede.length === 0 ? (
                      <SelectItem value="" disabled>Nenhuma congregação cadastrada</SelectItem>
                    ) : (
                      congregacoesDaSede.map(igreja => (
                        <SelectItem key={igreja.id} value={igreja.id}>
                          {igreja.nome}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </Field>
            )}
          </FieldGroup>

          {/* Dados Principais */}
          <FieldGroup>
            <Field>
              <FieldLabel>Nome da Igreja *</FieldLabel>
              <Input
                placeholder="Ex: Igreja Missão Restaurar"
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
                <FieldLabel>Convenção/Denominação</FieldLabel>
                <Input
                  placeholder="Ex: Assembleia de Deus"
                  value={convencao}
                  onChange={(e) => setConvencao(e.target.value)}
                />
              </Field>
            </div>

            <Field>
              <FieldLabel>Ministério</FieldLabel>
              <Input
                placeholder="Ex: Ministério Missão"
                value={ministerio}
                onChange={(e) => setMinisterio(e.target.value)}
              />
            </Field>
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
              <span className="text-sm font-medium">Endereço</span>
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
                <FieldLabel>Número</FieldLabel>
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
