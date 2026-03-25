"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  collection, 
  addDoc, 
  doc, 
  updateDoc, 
  Timestamp, 
  getDocs,
  query,
  where 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
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
import { Church, Plus, Users, ArrowLeft, Building2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Igreja } from "@/lib/types";

type Step = "choice" | "create" | "join";

// Lista de convenções comuns (pode ser expandida)
const CONVENCOES_COMUNS = [
  "CGADB",
  "CONAMAD", 
  "CIBI",
  "CIEADEP",
  "CIDESP",
  "CONVENÇÃO BATISTA",
  "CONVENÇÃO METODISTA",
  "OUTRO",
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, usuario, loading: authLoading } = useAuth();

  const [step, setStep] = useState<Step>("choice");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Campos para criar igreja
  const [nomeIgreja, setNomeIgreja] = useState("");
  const [tipoConvencao, setTipoConvencao] = useState<"independente" | "convencao">("independente");
  const [convencaoSelecionada, setConvencaoSelecionada] = useState("");
  const [convencaoCustom, setConvencaoCustom] = useState("");
  const [sede, setSede] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  
  // Endereço
  const [logradouro, setLogradouro] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [cep, setCep] = useState("");

  // Para entrar em igreja existente
  const [codigoIgreja, setCodigoIgreja] = useState("");
  const [igrejasDisponiveis, setIgrejasDisponiveis] = useState<Igreja[]>([]);
  const [igrejaParaEntrar, setIgrejaParaEntrar] = useState<string>("");

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Redirect if already has church
  useEffect(() => {
    if (!authLoading && usuario?.igrejaId) {
      router.push("/");
    }
  }, [usuario, authLoading, router]);

  // Carregar igrejas disponíveis quando escolher "join"
  useEffect(() => {
    if (step === "join") {
      loadIgrejas();
    }
  }, [step]);

  const loadIgrejas = async () => {
    try {
      const igrejasRef = collection(db, "igrejas");
      const q = query(igrejasRef, where("ativo", "==", true));
      const snapshot = await getDocs(q);
      const igrejas = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Igreja[];
      setIgrejasDisponiveis(igrejas);
    } catch (err) {
      console.error("Erro ao carregar igrejas:", err);
    }
  };

  const formatCEP = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  };

  const formatTelefone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const handleCreateChurch = async () => {
    // Validações
    if (nomeIgreja.trim().length < 3) {
      setError("Nome da igreja deve ter pelo menos 3 caracteres");
      return;
    }
    if (!logradouro || !numero || !bairro || !cidade || !estado) {
      setError("Preencha os campos obrigatórios do endereço");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Determinar convenção
      let convencaoFinal: string | null = null;
      if (tipoConvencao === "convencao") {
        if (convencaoSelecionada === "OUTRO") {
          convencaoFinal = convencaoCustom.trim() || null;
        } else {
          convencaoFinal = convencaoSelecionada || null;
        }
      }

      // Criar documento da igreja
      const igrejaData = {
        nome: nomeIgreja.trim(),
        endereco: {
          logradouro: logradouro.trim(),
          numero: numero.trim(),
          complemento: complemento.trim() || "",
          bairro: bairro.trim(),
          cidade: cidade.trim(),
          estado: estado.trim().toUpperCase(),
          cep: cep.replace(/\D/g, ""),
        },
        coordenadas: { lat: 0, lng: 0 }, // Será atualizado depois
        convencao: convencaoFinal,
        sede: sede.trim() || null,
        dirigenteMemberId: null, // Será definido depois
        dirigenteNome: usuario?.nome || null,
        telefone: telefone.replace(/\D/g, "") || null,
        email: email.trim() || null,
        dataCadastro: Timestamp.now(),
        ativo: true,
      };

      const igrejaRef = await addDoc(collection(db, "igrejas"), igrejaData);

      // Atualizar usuário com igrejaId e torná-lo admin
      if (user) {
        await updateDoc(doc(db, "usuarios", user.uid), {
          igrejaId: igrejaRef.id,
          nivelAcesso: "admin", // Criador da igreja vira admin
        });
      }

      toast.success("Igreja criada com sucesso!");
      router.push("/");
    } catch (err) {
      console.error("Erro ao criar igreja:", err);
      setError("Erro ao criar igreja. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinChurch = async () => {
    if (!igrejaParaEntrar) {
      setError("Selecione uma igreja para entrar");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Atualizar usuário com igrejaId
      if (user) {
        await updateDoc(doc(db, "usuarios", user.uid), {
          igrejaId: igrejaParaEntrar,
        });
      }

      toast.success("Você entrou na igreja!");
      router.push("/");
    } catch (err) {
      console.error("Erro ao entrar na igreja:", err);
      setError("Erro ao entrar na igreja. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
      <div className="mb-8 flex flex-col items-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
          <Church className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Bem-vindo, {usuario?.nome}!</h1>
        <p className="text-muted-foreground">Configure sua igreja para começar</p>
      </div>

      {step === "choice" && (
        <div className="grid w-full max-w-2xl gap-4 md:grid-cols-2">
          <Card 
            className="cursor-pointer transition-all hover:border-primary hover:shadow-lg"
            onClick={() => setStep("create")}
          >
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Plus className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Criar Nova Igreja</CardTitle>
              <CardDescription>
                Cadastre sua igreja no sistema e convide membros
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">Criar Igreja</Button>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer transition-all hover:border-primary hover:shadow-lg"
            onClick={() => setStep("join")}
          >
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                <Users className="h-6 w-6 text-secondary-foreground" />
              </div>
              <CardTitle>Entrar em uma Igreja</CardTitle>
              <CardDescription>
                Junte-se a uma igreja já cadastrada no sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="secondary" className="w-full">Entrar em Igreja</Button>
            </CardContent>
          </Card>
        </div>
      )}

      {step === "create" && (
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <Button
              variant="ghost"
              size="sm"
              className="mb-2 w-fit"
              onClick={() => setStep("choice")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Cadastrar Nova Igreja
            </CardTitle>
            <CardDescription>
              Preencha os dados da sua igreja. Você será o administrador.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <FieldGroup className="space-y-6">
              {/* Dados básicos */}
              <div className="space-y-4">
                <h3 className="font-medium text-foreground">Dados da Igreja</h3>
                
                <Field>
                  <FieldLabel required>Nome da Igreja</FieldLabel>
                  <Input
                    placeholder="Ex: Igreja Assembleia de Deus - Centro"
                    value={nomeIgreja}
                    onChange={(e) => setNomeIgreja(e.target.value)}
                    disabled={loading}
                  />
                </Field>

                <Field>
                  <FieldLabel>Tipo de Organização</FieldLabel>
                  <Select 
                    value={tipoConvencao} 
                    onValueChange={(v) => setTipoConvencao(v as "independente" | "convencao")}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="independente">Igreja Independente</SelectItem>
                      <SelectItem value="convencao">Filiada a uma Convenção</SelectItem>
                    </SelectContent>
                  </Select>
                  <FieldDescription>
                    Selecione se a igreja é independente ou filiada a uma convenção
                  </FieldDescription>
                </Field>

                {tipoConvencao === "convencao" && (
                  <>
                    <Field>
                      <FieldLabel>Convenção</FieldLabel>
                      <Select 
                        value={convencaoSelecionada} 
                        onValueChange={setConvencaoSelecionada}
                        disabled={loading}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a convenção" />
                        </SelectTrigger>
                        <SelectContent>
                          {CONVENCOES_COMUNS.map((conv) => (
                            <SelectItem key={conv} value={conv}>
                              {conv}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>

                    {convencaoSelecionada === "OUTRO" && (
                      <Field>
                        <FieldLabel>Nome da Convenção</FieldLabel>
                        <Input
                          placeholder="Digite o nome da convenção"
                          value={convencaoCustom}
                          onChange={(e) => setConvencaoCustom(e.target.value)}
                          disabled={loading}
                        />
                      </Field>
                    )}

                    <Field>
                      <FieldLabel>Sede/Campo (opcional)</FieldLabel>
                      <Input
                        placeholder="Ex: Campo de São Paulo"
                        value={sede}
                        onChange={(e) => setSede(e.target.value)}
                        disabled={loading}
                      />
                      <FieldDescription>
                        Se a igreja pertence a um campo ou sede específica
                      </FieldDescription>
                    </Field>
                  </>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel>Telefone</FieldLabel>
                    <Input
                      type="tel"
                      placeholder="(11) 99999-9999"
                      value={formatTelefone(telefone)}
                      onChange={(e) => setTelefone(e.target.value.replace(/\D/g, ""))}
                      disabled={loading}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>E-mail</FieldLabel>
                    <Input
                      type="email"
                      placeholder="igreja@exemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                    />
                  </Field>
                </div>
              </div>

              {/* Endereço */}
              <div className="space-y-4">
                <h3 className="flex items-center gap-2 font-medium text-foreground">
                  <MapPin className="h-4 w-4" />
                  Endereço (Marco Zero)
                </h3>
                <p className="text-sm text-muted-foreground">
                  Este endereço será usado como ponto de referência no mapa para calcular distâncias.
                </p>
                
                <Field>
                  <FieldLabel required>CEP</FieldLabel>
                  <Input
                    placeholder="00000-000"
                    value={formatCEP(cep)}
                    onChange={(e) => setCep(e.target.value.replace(/\D/g, ""))}
                    disabled={loading}
                    className="max-w-[150px]"
                  />
                </Field>

                <Field>
                  <FieldLabel required>Logradouro</FieldLabel>
                  <Input
                    placeholder="Rua, Avenida, etc."
                    value={logradouro}
                    onChange={(e) => setLogradouro(e.target.value)}
                    disabled={loading}
                  />
                </Field>

                <div className="grid gap-4 sm:grid-cols-3">
                  <Field>
                    <FieldLabel required>Número</FieldLabel>
                    <Input
                      placeholder="123"
                      value={numero}
                      onChange={(e) => setNumero(e.target.value)}
                      disabled={loading}
                    />
                  </Field>
                  <Field className="sm:col-span-2">
                    <FieldLabel>Complemento</FieldLabel>
                    <Input
                      placeholder="Sala, Bloco, etc."
                      value={complemento}
                      onChange={(e) => setComplemento(e.target.value)}
                      disabled={loading}
                    />
                  </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <Field>
                    <FieldLabel required>Bairro</FieldLabel>
                    <Input
                      placeholder="Centro"
                      value={bairro}
                      onChange={(e) => setBairro(e.target.value)}
                      disabled={loading}
                    />
                  </Field>
                  <Field>
                    <FieldLabel required>Cidade</FieldLabel>
                    <Input
                      placeholder="São Paulo"
                      value={cidade}
                      onChange={(e) => setCidade(e.target.value)}
                      disabled={loading}
                    />
                  </Field>
                  <Field>
                    <FieldLabel required>Estado</FieldLabel>
                    <Input
                      placeholder="SP"
                      value={estado}
                      onChange={(e) => setEstado(e.target.value.toUpperCase().slice(0, 2))}
                      disabled={loading}
                      maxLength={2}
                    />
                  </Field>
                </div>
              </div>

              {error && <FieldError>{error}</FieldError>}

              <Button
                className="w-full"
                onClick={handleCreateChurch}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Criando igreja...
                  </>
                ) : (
                  "Criar Igreja"
                )}
              </Button>
            </FieldGroup>
          </CardContent>
        </Card>
      )}

      {step === "join" && (
        <Card className="w-full max-w-md">
          <CardHeader>
            <Button
              variant="ghost"
              size="sm"
              className="mb-2 w-fit"
              onClick={() => setStep("choice")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Entrar em uma Igreja
            </CardTitle>
            <CardDescription>
              Selecione a igreja da qual você faz parte
            </CardDescription>
          </CardHeader>

          <CardContent>
            <FieldGroup className="space-y-4">
              <Field>
                <FieldLabel>Selecione a Igreja</FieldLabel>
                <Select 
                  value={igrejaParaEntrar} 
                  onValueChange={setIgrejaParaEntrar}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha uma igreja" />
                  </SelectTrigger>
                  <SelectContent>
                    {igrejasDisponiveis.length === 0 ? (
                      <SelectItem value="" disabled>
                        Nenhuma igreja encontrada
                      </SelectItem>
                    ) : (
                      igrejasDisponiveis.map((igreja) => (
                        <SelectItem key={igreja.id} value={igreja.id}>
                          <div className="flex flex-col">
                            <span>{igreja.nome}</span>
                            {igreja.convencao && (
                              <span className="text-xs text-muted-foreground">
                                {igreja.convencao}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FieldDescription>
                  Após entrar, o administrador da igreja poderá ajustar suas permissões.
                </FieldDescription>
              </Field>

              {error && <FieldError>{error}</FieldError>}

              <Button
                className="w-full"
                onClick={handleJoinChurch}
                disabled={loading || !igrejaParaEntrar}
              >
                {loading ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Entrando...
                  </>
                ) : (
                  "Entrar na Igreja"
                )}
              </Button>

              {igrejasDisponiveis.length === 0 && (
                <p className="text-center text-sm text-muted-foreground">
                  Não encontrou sua igreja?{" "}
                  <Button
                    variant="link"
                    className="h-auto p-0"
                    onClick={() => setStep("create")}
                  >
                    Crie uma nova
                  </Button>
                </p>
              )}
            </FieldGroup>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
