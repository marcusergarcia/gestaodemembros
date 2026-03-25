"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { collection, addDoc, doc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { Search, MapPin, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  Membro,
  TipoMembro,
  CargoMembro,
  TIPOS_MEMBRO,
  CARGOS_MEMBRO,
} from "@/lib/types";
import { FotoUpload } from "./foto-upload";

const membroSchema = z.object({
  nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  telefone: z.string().min(10, "Telefone inválido"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  dataNascimento: z.date().optional(),
  tipo: z.enum(["visitante", "congregado", "membro", "obreiro", "lider"]),
  cargo: z
    .enum(["pastor", "evangelista", "presbitero", "diacono", "auxiliar_escala", "outro"])
    .optional(),
  cargoDescricao: z.string().optional(),
  cep: z.string().min(8, "CEP inválido"),
  logradouro: z.string().min(3, "Logradouro inválido"),
  numero: z.string().min(1, "Número é obrigatório"),
  complemento: z.string().optional(),
  bairro: z.string().min(2, "Bairro inválido"),
  cidade: z.string().min(2, "Cidade inválida"),
  estado: z.string().length(2, "Estado inválido"),
  observacoes: z.string().optional(),
});

type MembroFormData = z.infer<typeof membroSchema>;

interface MembroFormProps {
  membro?: Membro;
}

export function MembroForm({ membro }: MembroFormProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [loadingGeo, setLoadingGeo] = useState(false);
  const [coordenadas, setCoordenadas] = useState<{ lat: number; lng: number } | null>(
    membro?.coordenadas || null
  );
  const [fotoBase64, setFotoBase64] = useState<string | null>(membro?.fotoUrl || null);

  const form = useForm<MembroFormData>({
    resolver: zodResolver(membroSchema),
    defaultValues: {
      nome: membro?.nome || "",
      telefone: membro?.telefone || "",
      email: membro?.email || "",
      dataNascimento: membro?.dataNascimento?.toDate(),
      tipo: membro?.tipo || "visitante",
      cargo: membro?.cargo,
      cargoDescricao: membro?.cargoDescricao || "",
      cep: membro?.endereco?.cep || "",
      logradouro: membro?.endereco?.logradouro || "",
      numero: membro?.endereco?.numero || "",
      complemento: membro?.endereco?.complemento || "",
      bairro: membro?.endereco?.bairro || "",
      cidade: membro?.endereco?.cidade || "",
      estado: membro?.endereco?.estado || "",
      observacoes: membro?.observacoes || "",
    },
  });

  const watchTipo = form.watch("tipo");
  const showCargo = ["obreiro", "lider"].includes(watchTipo);
  const watchCargo = form.watch("cargo");

  // Format phone for display
  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
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

  const onSubmit = async (data: MembroFormData) => {
    if (!coordenadas) {
      toast.error("Por favor, clique em 'Localizar no Mapa' antes de salvar");
      return;
    }

    if (!user) {
      toast.error("Você precisa estar logado");
      return;
    }

    setLoading(true);
    try {
      const membroData = {
        nome: data.nome,
        telefone: data.telefone.replace(/\D/g, ""),
        email: data.email || null,
        fotoUrl: fotoBase64 || null,
        dataNascimento: data.dataNascimento ? Timestamp.fromDate(data.dataNascimento) : null,
        tipo: data.tipo as TipoMembro,
        cargo: showCargo ? (data.cargo as CargoMembro) : null,
        cargoDescricao: data.cargo === "outro" ? data.cargoDescricao : null,
        endereco: {
          logradouro: data.logradouro,
          numero: data.numero,
          complemento: data.complemento || null,
          bairro: data.bairro,
          cidade: data.cidade,
          estado: data.estado,
          cep: data.cep.replace(/\D/g, ""),
        },
        coordenadas,
        observacoes: data.observacoes || null,
        ativo: true,
      };

      if (membro) {
        // Update existing member
        await updateDoc(doc(db, "members", membro.id), membroData);
        toast.success("Membro atualizado com sucesso!");
      } else {
        // Create new member
        await addDoc(collection(db, "members"), {
          ...membroData,
          dataCadastro: Timestamp.now(),
          criadoPor: user.uid,
        });
        toast.success("Membro cadastrado com sucesso!");
      }

      router.push("/membros");
    } catch (error) {
      console.error("Erro ao salvar membro:", error);
      toast.error("Erro ao salvar membro");
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
            <CardTitle>Foto</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <FotoUpload
              fotoUrl={fotoBase64 || undefined}
              nome={form.watch("nome")}
              onFotoChange={setFotoBase64}
            />
          </CardContent>
        </Card>

        {/* Personal Data */}
        <Card>
          <CardHeader>
            <CardTitle>Dados Pessoais</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Nome Completo *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome do membro" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="telefone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="(11) 99999-9999"
                      value={formatPhone(field.value)}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
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
                    <Input type="email" placeholder="email@exemplo.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dataNascimento"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data de Nascimento</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                          ) : (
                            <span>Selecione a data</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        defaultMonth={field.value || new Date(1990, 0)}
                        captionLayout="dropdown"
                        fromYear={1920}
                        toYear={new Date().getFullYear()}
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Classification */}
        <Card>
          <CardHeader>
            <CardTitle>Classificação</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="tipo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Membro *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(Object.keys(TIPOS_MEMBRO) as TipoMembro[]).map((tipo) => (
                        <SelectItem key={tipo} value={tipo}>
                          {TIPOS_MEMBRO[tipo]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {showCargo && (
              <>
                <FormField
                  control={form.control}
                  name="cargo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cargo</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o cargo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(Object.keys(CARGOS_MEMBRO) as CargoMembro[]).map((cargo) => (
                            <SelectItem key={cargo} value={cargo}>
                              {CARGOS_MEMBRO[cargo]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {watchCargo === "outro" && (
                  <FormField
                    control={form.control}
                    name="cargoDescricao"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Descrição do Cargo</FormLabel>
                        <FormControl>
                          <Input placeholder="Descreva o cargo" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardHeader>
            <CardTitle>Endereço</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
                      <Input placeholder="Apto, Bloco, etc." {...field} />
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
                    : "Clique para localizar o endereço no mapa"}
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

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      placeholder="Observações adicionais sobre o membro..."
                      className="min-h-24"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={loading || !coordenadas}>
            {loading && <Spinner className="mr-2 h-4 w-4" />}
            {membro ? "Salvar Alterações" : "Cadastrar Membro"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
