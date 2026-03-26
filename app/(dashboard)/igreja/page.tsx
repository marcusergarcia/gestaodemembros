"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc, Timestamp, collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Church, 
  MapPin, 
  Phone, 
  User, 
  Edit, 
  Save, 
  X, 
  Building2,
  Users,
  ChevronRight
} from "lucide-react";
import { Unidade, TIPOS_UNIDADE, Usuario } from "@/lib/types";
import Link from "next/link";

export default function IgrejaPage() {
  const { usuario, igrejaId, unidadeAtual, todasUnidades } = useAuth();
  const [unidade, setUnidade] = useState<Unidade | null>(null);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Estados do formulário
  const [nome, setNome] = useState("");
  const [dirigente, setDirigente] = useState("");
  const [telefone, setTelefone] = useState("");

  useEffect(() => {
    if (unidadeAtual) {
      setUnidade(unidadeAtual);
      setNome(unidadeAtual.nome || "");
      setDirigente(unidadeAtual.dirigente || "");
      setTelefone(unidadeAtual.telefone || "");
    }
  }, [unidadeAtual]);

  useEffect(() => {
    async function carregarUsuarios() {
      if (!igrejaId) {
        setLoading(false);
        return;
      }

      try {
        // Carrega usuários da igreja
        const usuariosRef = collection(db, "usuarios");
        const snapshot = await getDocs(usuariosRef);
        
        const usuariosData: Usuario[] = [];
        snapshot.docs.forEach(docSnap => {
          const data = docSnap.data();
          // Filtra apenas usuários desta igreja
          if (data.igrejaId === igrejaId) {
            usuariosData.push({
              uid: docSnap.id,
              ...data,
            } as Usuario);
          }
        });
        
        setUsuarios(usuariosData);
      } catch (error) {
        console.error("Erro ao carregar usuários:", error);
      } finally {
        setLoading(false);
      }
    }

    carregarUsuarios();
  }, [igrejaId]);

  const handleSave = async () => {
    if (!igrejaId || !unidadeAtual) return;

    setSaving(true);
    try {
      const unidadeRef = doc(db, "igrejas", igrejaId, "unidades", unidadeAtual.id);
      await updateDoc(unidadeRef, {
        nome: nome.trim(),
        dirigente: dirigente.trim() || null,
        telefone: telefone.trim() || null,
      });

      setUnidade(prev => prev ? {
        ...prev,
        nome: nome.trim(),
        dirigente: dirigente.trim() || undefined,
        telefone: telefone.trim() || undefined,
      } : null);

      setEditing(false);
      toast.success("Dados atualizados com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar dados");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setNome(unidade?.nome || "");
    setDirigente(unidade?.dirigente || "");
    setTelefone(unidade?.telefone || "");
    setEditing(false);
  };

  // Encontra unidades filhas
  const unidadesFilhas = todasUnidades.filter(u => u.unidadePaiId === unidadeAtual?.id);

  // Filtra usuários da unidade atual
  const usuariosUnidade = usuarios.filter(u => u.unidadeId === unidadeAtual?.id);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!unidade) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Church className="h-12 w-12 text-muted-foreground" />
        <h2 className="mt-4 text-lg font-semibold">Nenhuma unidade selecionada</h2>
        <p className="text-muted-foreground">Você precisa estar vinculado a uma unidade para ver seus dados.</p>
      </div>
    );
  }

  const isAdmin = usuario?.nivelAcesso === "admin" || usuario?.nivelAcesso === "full";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Minha Igreja</h1>
          <p className="text-muted-foreground">
            Informações da {TIPOS_UNIDADE[unidade.tipo].toLowerCase()} onde você está vinculado
          </p>
        </div>
        {isAdmin && !editing && (
          <Button onClick={() => setEditing(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </Button>
        )}
        {editing && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel} disabled={saving}>
              <X className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Dados da Unidade */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Church className="h-5 w-5" />
              Dados da Igreja
            </CardTitle>
            <CardDescription>
              Informações básicas da unidade
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Nome da Igreja</Label>
              {editing ? (
                <Input 
                  value={nome} 
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Nome da igreja"
                />
              ) : (
                <p className="mt-1 text-lg font-medium">{unidade.nome}</p>
              )}
            </div>

            <div>
              <Label>Tipo</Label>
              <div className="mt-1">
                <Badge variant={unidade.tipo === "sede" ? "default" : "secondary"}>
                  {TIPOS_UNIDADE[unidade.tipo]}
                </Badge>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <User className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <Label>Dirigente/Pastor</Label>
                {editing ? (
                  <Input 
                    value={dirigente} 
                    onChange={(e) => setDirigente(e.target.value)}
                    placeholder="Nome do dirigente"
                  />
                ) : (
                  <p className="mt-1">{unidade.dirigente || "Não informado"}</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Phone className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <Label>Telefone</Label>
                {editing ? (
                  <Input 
                    value={telefone} 
                    onChange={(e) => setTelefone(e.target.value)}
                    placeholder="(00) 00000-0000"
                  />
                ) : (
                  <p className="mt-1">{unidade.telefone || "Não informado"}</p>
                )}
              </div>
            </div>

            {unidade.endereco && (
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <Label>Endereço</Label>
                  <p className="mt-1">
                    {[
                      unidade.endereco.logradouro,
                      unidade.endereco.numero,
                      unidade.endereco.bairro,
                      unidade.endereco.cidade,
                      unidade.endereco.estado,
                    ].filter(Boolean).join(", ")}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Usuários da Unidade */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Usuários
                </CardTitle>
                <CardDescription>
                  Usuários vinculados a esta unidade
                </CardDescription>
              </div>
              {isAdmin && (
                <Button variant="outline" size="sm" asChild>
                  <Link href="/usuarios">
                    Gerenciar
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {usuariosUnidade.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Users className="h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Nenhum usuário cadastrado nesta unidade
                </p>
                {isAdmin && (
                  <Button variant="link" asChild className="mt-2">
                    <Link href="/usuarios/novo">Adicionar usuário</Link>
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {usuariosUnidade.map(usr => (
                  <div 
                    key={usr.uid} 
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">{usr.nome}</p>
                      <p className="text-sm text-muted-foreground">{usr.telefone}</p>
                    </div>
                    <Badge variant="outline">
                      {usr.nivelAcesso === "full" ? "Acesso Total" : 
                       usr.nivelAcesso === "admin" ? "Admin" : "Líder"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Unidades Filhas */}
        {unidadesFilhas.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Unidades Vinculadas
              </CardTitle>
              <CardDescription>
                {unidade.tipo === "sede" ? "Congregações" : "Subcongregações"} vinculadas a esta unidade
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {unidadesFilhas.map(filha => (
                  <div 
                    key={filha.id} 
                    className="flex items-center gap-3 rounded-lg border p-4"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Church className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{filha.nome}</p>
                      <p className="text-sm text-muted-foreground">
                        {filha.dirigente || TIPOS_UNIDADE[filha.tipo]}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
