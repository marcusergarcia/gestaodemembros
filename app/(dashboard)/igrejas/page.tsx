"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getDocs, deleteDoc, doc, onSnapshot, collection } from "firebase/firestore";
import { getIgrejasCollection, getUnidadesCollection } from "@/lib/firestore";
import { useAuth } from "@/contexts/auth-context";
import { Igreja, Unidade, TIPOS_IGREJA, TIPOS_UNIDADE, TipoUnidade } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Church, 
  Building2, 
  MapPin, 
  Phone, 
  ChevronDown,
  ChevronRight,
  Users,
  GitBranch,
} from "lucide-react";
import Link from "next/link";
import { db } from "@/lib/firebase";

const CORES_TIPO_UNIDADE: Record<TipoUnidade, string> = {
  sede: "#16a34a",
  congregacao: "#2563eb",
  subcongregacao: "#9333ea",
};

interface UnidadeComContagem extends Unidade {
  totalMembros?: number;
  filhas?: UnidadeComContagem[];
}

interface IgrejaComHierarquia extends Igreja {
  unidades: UnidadeComContagem[];
  totalMembros: number;
  totalUnidades: number;
}

export default function IgrejasPage() {
  const router = useRouter();
  const { usuario } = useAuth();
  const [igrejas, setIgrejas] = useState<IgrejaComHierarquia[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [expandedIgrejas, setExpandedIgrejas] = useState<Set<string>>(new Set());
  const [expandedUnidades, setExpandedUnidades] = useState<Set<string>>(new Set());

  // Verifica se o usuário tem permissão de acesso total
  const isFull = usuario?.nivelAcesso === "full";

  useEffect(() => {
    if (!isFull) {
      router.push("/");
      return;
    }

    loadIgrejasComHierarquia();
  }, [isFull, router]);

  const loadIgrejasComHierarquia = async () => {
    try {
      setLoading(true);
      const igrejasRef = getIgrejasCollection();
      const snapshot = await getDocs(igrejasRef);
      
      const igrejasComHierarquia: IgrejaComHierarquia[] = [];
      
      for (const docSnap of snapshot.docs) {
        const igrejaData = { id: docSnap.id, ...docSnap.data() } as Igreja;
        
        // Carrega as unidades desta igreja
        const unidadesRef = getUnidadesCollection(igrejaData.id);
        const unidadesSnapshot = await getDocs(unidadesRef);
        
        const unidades = unidadesSnapshot.docs.map(uDoc => ({
          id: uDoc.id,
          ...uDoc.data(),
          filhas: []
        })) as UnidadeComContagem[];

        // Conta membros por unidade
        let totalMembros = 0;
        for (const unidade of unidades) {
          try {
            const membrosRef = collection(db!, "igrejas", igrejaData.id, "unidades", unidade.id, "membros");
            const membrosSnapshot = await getDocs(membrosRef);
            unidade.totalMembros = membrosSnapshot.docs.filter(m => m.data().ativo !== false).length;
            totalMembros += unidade.totalMembros;
          } catch {
            unidade.totalMembros = 0;
          }
        }

        // Organiza hierarquia
        const sedes = unidades.filter(u => u.tipo === "sede");
        const congregacoes = unidades.filter(u => u.tipo === "congregacao");
        const subcongregacoes = unidades.filter(u => u.tipo === "subcongregacao");

        // Associa subcongregações às congregações
        congregacoes.forEach(cong => {
          cong.filhas = subcongregacoes.filter(sub => sub.unidadePaiId === cong.id);
        });

        // Associa congregações às sedes
        sedes.forEach(sede => {
          sede.filhas = congregacoes.filter(cong => cong.unidadePaiId === sede.id);
        });

        igrejasComHierarquia.push({
          ...igrejaData,
          unidades: sedes.length > 0 ? sedes : unidades,
          totalMembros,
          totalUnidades: unidades.length,
        });
      }
      
      setIgrejas(igrejasComHierarquia);
      
      // Expande todas as igrejas por padrão
      setExpandedIgrejas(new Set(igrejasComHierarquia.map(i => i.id)));
    } catch (error) {
      console.error("Erro ao carregar igrejas:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId || !db) return;

    try {
      setDeleting(true);
      await deleteDoc(doc(db, "igrejas", deleteId));
      setIgrejas(prev => prev.filter(i => i.id !== deleteId));
      setDeleteId(null);
    } catch (error) {
      console.error("Erro ao excluir igreja:", error);
    } finally {
      setDeleting(false);
    }
  };

  const toggleIgreja = (id: string) => {
    setExpandedIgrejas(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleUnidade = (id: string) => {
    setExpandedUnidades(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const renderUnidade = (unidade: UnidadeComContagem, igrejaId: string, depth: number = 0) => {
    const hasFilhas = unidade.filhas && unidade.filhas.length > 0;
    const isExpanded = expandedUnidades.has(unidade.id);

    return (
      <div key={unidade.id} style={{ marginLeft: depth * 24 }}>
        <div className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-muted/50 group">
          {hasFilhas ? (
            <button onClick={() => toggleUnidade(unidade.id)} className="p-0.5">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          ) : (
            <div className="w-5" />
          )}
          
          <div 
            className="h-3 w-3 rounded-full shrink-0"
            style={{ backgroundColor: CORES_TIPO_UNIDADE[unidade.tipo] }}
          />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">{unidade.nome}</span>
              <Badge 
                variant="secondary" 
                className="text-xs"
                style={{ 
                  backgroundColor: `${CORES_TIPO_UNIDADE[unidade.tipo]}20`,
                  color: CORES_TIPO_UNIDADE[unidade.tipo],
                }}
              >
                {TIPOS_UNIDADE[unidade.tipo]}
              </Badge>
            </div>
            {unidade.dirigente && (
              <p className="text-xs text-muted-foreground truncate">{unidade.dirigente}</p>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{unidade.totalMembros || 0}</span>
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
              <Link href={`/unidades/${unidade.id}?igreja=${igrejaId}`}>
                <Pencil className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>

        {hasFilhas && isExpanded && (
          <div className="border-l-2 border-muted ml-2.5">
            {unidade.filhas!.map(filha => renderUnidade(filha, igrejaId, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (!isFull) {
    return null;
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="mt-2 h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gerenciar Igrejas</h1>
          <p className="text-muted-foreground">
            Gerencie igrejas, sedes, congregações e subcongregações
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild>
            <Link href="/igrejas/nova">
              <Plus className="mr-2 h-4 w-4" />
              Nova Igreja
            </Link>
          </Button>
        </div>
      </div>

      {/* Estatísticas Gerais */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Church className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Igrejas</p>
                <p className="text-2xl font-bold">{igrejas.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: `${CORES_TIPO_UNIDADE.sede}20` }}>
                <Building2 className="h-5 w-5" style={{ color: CORES_TIPO_UNIDADE.sede }} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Unidades</p>
                <p className="text-2xl font-bold">{igrejas.reduce((acc, i) => acc + i.totalUnidades, 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Membros</p>
                <p className="text-2xl font-bold">{igrejas.reduce((acc, i) => acc + i.totalMembros, 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                <GitBranch className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Hierarquia</p>
                <p className="text-2xl font-bold">3 níveis</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {igrejas.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Church className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">Nenhuma igreja cadastrada</h3>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Comece cadastrando a primeira igreja do sistema.
            </p>
            <Button asChild className="mt-6">
              <Link href="/igrejas/nova">
                <Plus className="mr-2 h-4 w-4" />
                Cadastrar Igreja
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {igrejas.map((igreja) => (
            <Card key={igreja.id}>
              <Collapsible open={expandedIgrejas.has(igreja.id)} onOpenChange={() => toggleIgreja(igreja.id)}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                          {expandedIgrejas.has(igreja.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                        <Church className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{igreja.nome}</CardTitle>
                        <CardDescription className="flex items-center gap-4 mt-1">
                          {igreja.endereco?.cidade && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {igreja.endereco.cidade}/{igreja.endereco.estado}
                            </span>
                          )}
                          {igreja.telefone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {igreja.telefone}
                            </span>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right mr-2">
                        <p className="text-sm font-medium">{igreja.totalMembros} membros</p>
                        <p className="text-xs text-muted-foreground">{igreja.totalUnidades} unidades</p>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/igrejas/${igreja.id}`}>
                          <Pencil className="mr-2 h-3.5 w-3.5" />
                          Editar
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteId(igreja.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-muted-foreground">Estrutura Hierárquica</h4>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/unidades/nova?igreja=${igreja.id}`}>
                            <Plus className="mr-2 h-3.5 w-3.5" />
                            Nova Unidade
                          </Link>
                        </Button>
                      </div>

                      {igreja.unidades.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Nenhuma unidade cadastrada</p>
                          <p className="text-xs">Adicione a sede principal desta igreja</p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {igreja.unidades.map(unidade => renderUnidade(unidade, igreja.id))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Igreja</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta igreja? Esta ação não pode ser desfeita
              e todos os dados relacionados (membros, unidades, etc.) serão perdidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
