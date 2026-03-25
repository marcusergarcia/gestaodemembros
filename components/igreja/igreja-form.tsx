"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getDocs, query, where, orderBy } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { Search, MapPin } from "lucide-react";
import { Igreja, Membro } from "@/lib/types";
import { FotoUpload } from "@/components/membros/foto-upload";
import { useIgreja } from "@/contexts/igreja-context";
import { getMembrosRef } from "@/lib/firestore-helpers";

// Lista de convenções comuns
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

const igrejaSchema = z.object({
  nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  tipoOrganizacao: z.enum(["independente", "convencao"]),
  convencaoSelecionada: z.string().optional(),
  convencaoCustom: z.string().optional(),
  sede: z.string().optional(),
  dirigenteMemberId: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  cep: z.string().min(8, "CEP inválido"),
  logradouro: z.string().min(3, "Logradouro inválido"),
  numero: z.string().min(1, "Número é obrigatório"),
  complemento: z.string().optional(),
  bairro: z.string().min(2, "Bairro inválido"),
  cidade: z.string().min(2, "Cidade inválida"),
  estado: z.string().length(2, "Estado inválido"),
});

type IgrejaFormData = z.infer<typeof igrejaSchema>;

interface IgrejaFormProps {
  igreja?: Igreja;
  onSave: (data: Omit<Igreja, "id" | "dataCadastro">) => Promise<void>;
  onCancel?: () => void;
}

export function IgrejaForm({ igreja, onSave, onCancel }: IgrejaFormProps) {
  const { igrejaId } = useIgreja();
  const [loading, setLoading] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [loadingGeo, setLoadingGeo] = useState(false);
  const [loadingMembros, setLoadingMembros] = useState(false);
  const [coordenadas, setCoordenadas] = useState<{ lat: number; lng: number } | null>(
    igreja?.coordenadas || null
  );
  const [fotoBase64, setFotoBase64] = useState<string | null>(igreja?.fotoUrl || null);
  const [membros, setMembros] = useState<Membro[]>([]);

  // Determinar tipo de organização inicial
  const tipoInicial = igreja?.convencao ? "convencao" : "independente";
  const convencaoInicial = igreja?.convencao && CONVENCOES_COMUNS.includes(igreja.convencao) 
    ? igreja.convencao 
    : igreja?.convencao 
      ? "OUTRO" 
      : "";
  const convencaoCustomInicial = igreja?.convencao && !CONVENCOES_COMUNS.includes(igreja.convencao) 
    ? igreja.convencao 
    : "";

  const form = useForm<IgrejaFormData>({
    resolver: zodResolver(igrejaSchema),
    defaultValues: {
      nome: igreja?.nome || "",
      tipoOrganizacao: tipoInicial,
      convencaoSelecionada: convencaoInicial,
      convencaoCustom: convencaoCustomInicial,
      sede: igreja?.sede || "",
      dirigenteMemberId: igreja?.dirigenteMemberId || "",
      telefone: igreja?.telefone || "",
      email: igreja?.email || "",
      cep: igreja?.endereco?.cep || "",
      logradouro: igreja?.endereco?.logradouro || "",
      numero: igreja?.endereco?.numero || "",
      complemento: igreja?.endereco?.complemento || "",
      bairro: igreja?.endereco?.bairro || "",
      cidade: igreja?.endereco?.cidade || "",
      estado: igreja?.endereco?.estado || "",
    },
  });

  const tipoOrganizacao = form.watch("tipoOrganizacao");
  const convencaoSelecionada = form.watch("convencaoSelecionada");

  // Carregar membros para seleção de dirigente
  useEffect(() => {
    const loadMembros = async () => {
      if (!igrejaId) return;
      
      setLoadingMembros(true);
      try {
        const membrosRef = getMembrosRef(igrejaId);
        const q = query(
          membrosRef, 
          where("ativo", "==", true),
          orderBy("nome")
        );
        const snapshot = await getDocs(q);
        const membrosList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Membro[];
        setMembros(membrosList);
      } catch (error) {
        console.error("Erro ao carregar membros:", error);
      } finally {
        setLoadingMembros(false);
      }
    };

    loadMembros();
  }, [igrejaId]);

  // Format phone for display
  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6, 10)}`;
  };

  // Format CEP for display
  const formatCep = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)}-${digits.slice(5, 8)}`;
  };

  // Search address by CEP
  const buscarCep = async () => {
    const cep = form.getValues("cep").replace(/\D/g, "");
    if (cep.length !== 8) {
      toast.error("CEP deve ter 8 dígitos");
      return;
    }

    setLoadingCep(true);
    try {
      const response = await fetch(`/api/cep?cep=${cep}`);
      const data = await response.json();

      if (response.ok) {
        form.setValue("logradouro", data.logradouro);
        form.setValue("bairro", data.bairro);
        form.setValue("cidade", data.cidade);
        form.setValue("estado", data.estado);
        toast.success("Endereço encontrado!");
      } else {
        toast.error(data.error || "CEP não encontrado");
      }
    } catch {
      toast.error("Erro ao buscar CEP");
    } finally {
      setLoadingCep(false);
    }
  };

  // Geocode address
  const geocodarEndereco = async () => {
    const values = form.getValues();
    const endereco = `${values.logradouro}, ${values.numero}, ${values.bairro}, ${values.cidade}, ${values.estado}, Brasil`;

    setLoadingGeo(true);
    try {
      const response = await fetch("/api/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endereco }),
      });

      const data = await response.json();

      if (response.ok) {
        setCoordenadas({ lat: data.lat, lng: data.lng });
        toast.success("Localização encontrada no mapa!");
      } else {
        toast.error(data.error || "Não foi possível localizar o endereço");
      }
    } catch {
      toast.error("Erro ao buscar localização");
    } finally {
      setLoadingGeo(false);
    }
  };

  const onSubmit = async (data: IgrejaFormData) => {
    if (!coordenadas) {
      toast.error("Por favor, clique em 'Localizar no Mapa' antes de salvar");
      return;
    }

    setLoading(true);
    try {
      // Determinar convenção final
      let convencaoFinal: string | null = null;
      if (data.tipoOrganizacao === "convencao") {
        if (data.convencaoSelecionada === "OUTRO") {
          convencaoFinal = data.convencaoCustom?.trim() || null;
        } else {
          convencaoFinal = data.convencaoSelecionada || null;
        }
      }

      // Encontrar nome do dirigente
      const dirigenteMembro = membros.find(m => m.id === data.dirigenteMemberId);

      await onSave({
        nome: data.nome,
        convencao: convencaoFinal,
        sede: data.sede?.trim() || null,
        dirigenteMemberId: data.dirigenteMemberId || null,
        dirigenteNome: dirigenteMembro?.nome || null,
        telefone: data.telefone?.replace(/\D/g, "") || undefined,
        email: data.email || undefined,
        fotoUrl: fotoBase64 || undefined,
        endereco: {
          logradouro: data.logradouro,
          numero: data.numero,
          complemento: data.complemento || undefined,
          bairro: data.bairro,
          cidade: data.cidade,
          estado: data.estado,
          cep: data.cep.replace(/\D/g, ""),
        },
        coordenadas,
        ativo: true,
      });
      toast.success(igreja ? "Igreja atualizada com sucesso!" : "Igreja cadastrada com sucesso!");
    } catch {
      toast.error("Erro ao salvar dados da igreja");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Photo */}
        <Card>
          <CardHeader>
            <CardTitle>Foto da Igreja</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <FotoUpload
              fotoUrl={fotoBase64 || undefined}
              nome={form.watch("nome")}
              onFotoChange={setFotoBase64}
            />
          </CardContent>
        </Card>

        {/* Church Data */}
        <Card>
          <CardHeader>
            <CardTitle>Dados da Igreja</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Nome da Igreja *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Igreja Assembleia de Deus - Centro" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tipoOrganizacao"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Tipo de Organização</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="independente">Igreja Independente</SelectItem>
                      <SelectItem value="convencao">Filiada a uma Convenção</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Selecione se a igreja é independente ou filiada a uma convenção
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {tipoOrganizacao === "convencao" && (
              <>
                <FormField
                  control={form.control}
                  name="convencaoSelecionada"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Convenção</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a convenção" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CONVENCOES_COMUNS.map((conv) => (
                            <SelectItem key={conv} value={conv}>
                              {conv}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {convencaoSelecionada === "OUTRO" && (
                  <FormField
                    control={form.control}
                    name="convencaoCustom"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome da Convenção</FormLabel>
                        <FormControl>
                          <Input placeholder="Digite o nome da convenção" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="sede"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sede/Campo (opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Campo de São Paulo" {...field} />
                      </FormControl>
                      <FormDescription>
                        Se a igreja pertence a um campo ou sede específica
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <FormField
              control={form.control}
              name="dirigenteMemberId"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Dirigente (Pastor)</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={loadingMembros ? "Carregando membros..." : "Selecione o dirigente"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">Nenhum selecionado</SelectItem>
                      {membros.map((membro) => (
                        <SelectItem key={membro.id} value={membro.id}>
                          {membro.nome} {membro.cargo ? `(${membro.cargo})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Selecione um membro cadastrado como dirigente da igreja
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="telefone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="(11) 3333-3333"
                      value={formatPhone(field.value || "")}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                        field.onChange(digits);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="igreja@exemplo.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardHeader>
            <CardTitle>Endereço (Marco Zero)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Este endereço será usado como ponto de referência no mapa para calcular distâncias dos membros.
            </p>

            <div className="flex gap-2">
              <FormField
                control={form.control}
                name="cep"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>CEP *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="00000-000"
                        value={formatCep(field.value)}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, "").slice(0, 8);
                          field.onChange(digits);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="button"
                variant="outline"
                className="mt-8"
                onClick={buscarCep}
                disabled={loadingCep}
              >
                {loadingCep ? <Spinner className="h-4 w-4" /> : <Search className="h-4 w-4" />}
                <span className="ml-2 hidden sm:inline">Buscar</span>
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="logradouro"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Logradouro *</FormLabel>
                    <FormControl>
                      <Input placeholder="Rua, Avenida, etc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="numero"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número *</FormLabel>
                    <FormControl>
                      <Input placeholder="123" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="complemento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Complemento</FormLabel>
                    <FormControl>
                      <Input placeholder="Sala, Bloco, etc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bairro"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bairro *</FormLabel>
                    <FormControl>
                      <Input placeholder="Bairro" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cidade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cidade *</FormLabel>
                    <FormControl>
                      <Input placeholder="Cidade" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="estado"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado *</FormLabel>
                    <FormControl>
                      <Input placeholder="SP" maxLength={2} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Localização no Mapa</p>
                <p className="text-xs text-muted-foreground">
                  {coordenadas
                    ? `Lat: ${coordenadas.lat.toFixed(6)}, Lng: ${coordenadas.lng.toFixed(6)}`
                    : "A igreja será o ponto central do mapa"}
                </p>
              </div>
              <Button
                type="button"
                variant={coordenadas ? "outline" : "default"}
                onClick={geocodarEndereco}
                disabled={loadingGeo}
              >
                {loadingGeo ? (
                  <Spinner className="mr-2 h-4 w-4" />
                ) : (
                  <MapPin className="mr-2 h-4 w-4" />
                )}
                {coordenadas ? "Atualizar Localização" : "Localizar no Mapa"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
          )}
          <Button type="submit" disabled={loading} className="flex-1 sm:flex-none">
            {loading && <Spinner className="mr-2 h-4 w-4" />}
            {igreja ? "Salvar Alterações" : "Cadastrar Igreja"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
