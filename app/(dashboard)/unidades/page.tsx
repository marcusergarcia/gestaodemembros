"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { query, onSnapshot, orderBy, where } from "firebase/firestore";
import { getUnidadesCollection } from "@/lib/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import {
  Building2,
  Search,
  Plus,
  Eye,
  ChevronRight,
  MapPin,
} from "lucide-react";
import {
  Unidade,
  TipoUnidade,
  TIPOS_UNIDADE,
} from "@/lib/types";

const CORES_TIPO_UNIDADE: Record<TipoUnidade, string> = {
  sede: "#16a34a",
  congregacao: "#2563eb",
  subcongregacao: "#9333ea",
};

export default function UnidadesPage() {
  const { usuario, igrejaId, nivelAcesso, unidadesAcessiveis, temAcessoTotal } = useAuth();
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTipo, setFilterTipo] = useState<TipoUnidade | "todos">("todos");

  const canManageUnidades = nivelAcesso === "full" || nivelAcesso === "admin";

  useEffect(() => {
    if (!igrejaId) {
      setLoading(false);
      return;
    }

    const unidadesRef = getUnidadesCollection(igrejaId);
    const q = query(unidadesRef, orderBy("nome", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const unidadesData: Unidade[] = [];
      snapshot.forEach((docSnap) => {
        unidadesData.push({ id: docSnap.id, ...docSnap.data() } as Unidade);
      });
      setUnidades(unidadesData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [igrejaId]);

  // Filtra unidades baseado no acesso do usuário
  const unidadesVisiveis = unidades.filter((unidade) => {
    // Se tem acesso total, vê todas
    if (temAcessoTotal()) return true;
    // Senão, só vê as unidades acessíveis
    return unidadesAcessiveis.includes(unidade.id);
  });

  const filteredUnidades = unidadesVisiveis.filter((unidade) => {
    if (!unidade.ativa) return false;

    const matchesSearch =
      unidade.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      unidade.endereco?.bairro?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      unidade.endereco?.cidade?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTipo = filterTipo === "todos" || unidade.tipo === filterTipo;

    return matchesSearch && matchesTipo;
  });

  // Organiza em hierarquia para exibição
  const getUnidadePai = (unidadeId: string | undefined) => {
    if (!unidadeId) return null;
    return unidades.find(u => u.id === unidadeId);
  };

  const getHierarquia = (unidade: Unidade): string => {
    const parts: string[] = [];
    let current = getUnidadePai(unidade.unidadePaiId);
    while (current) {
      parts.unshift(current.nome);
      current = getUnidadePai(current.unidadePaiId);
    }
    return parts.join(" > ");
  };

  // Estatísticas
  const stats = {
    total: unidadesVisiveis.filter(u => u.ativa).length,
    sedes: unidadesVisiveis.filter(u => u.tipo === "sede" && u.ativa).length,
    congregacoes: unidadesVisiveis.filter(u => u.tipo === "congregacao" && u.ativa).length,
    subcongregacoes: unidadesVisiveis.filter(u => u.tipo === "subcongregacao" && u.ativa).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Unidades</h1>
          <p className="text-muted-foreground">
            Gerencie as sedes, congregações e subcongregações
          </p>
        </div>
        {canManageUnidades && (
          <Button asChild>
            <Link href="/unidades/nova">
              <Plus className="mr-2 h-4 w-4" />
              Nova Unidade
            </Link>
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div 
                className="h-3 w-3 rounded-full" 
                style={{ backgroundColor: CORES_TIPO_UNIDADE.sede }}
              />
              <span className="text-sm text-muted-foreground">Sedes</span>
            </div>
            <div className="text-2xl font-bold">{stats.sedes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div 
                className="h-3 w-3 rounded-full" 
                style={{ backgroundColor: CORES_TIPO_UNIDADE.congregacao }}
              />
              <span className="text-sm text-muted-foreground">Congregações</span>
            </div>
            <div className="text-2xl font-bold">{stats.congregacoes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div 
                className="h-3 w-3 rounded-full" 
                style={{ backgroundColor: CORES_TIPO_UNIDADE.subcongregacao }}
              />
              <span className="text-sm text-muted-foreground">Subcongregações</span>
            </div>
            <div className="text-2xl font-bold">{stats.subcongregacoes}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, bairro ou cidade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={filterTipo}
            onValueChange={(v) => setFilterTipo(v as TipoUnidade | "todos")}
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              {(Object.keys(TIPOS_UNIDADE) as TipoUnidade[]).map((tipo) => (
                <SelectItem key={tipo} value={tipo}>
                  {TIPOS_UNIDADE[tipo]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Table */}
      {loading ? (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : filteredUnidades.length === 0 ? (
        <Card>
          <CardContent className="p-12">
            <Empty>
              <EmptyMedia variant="icon">
                <Building2 className="h-10 w-10" />
              </EmptyMedia>
              <EmptyTitle>
                {unidades.length === 0
                  ? "Nenhuma unidade cadastrada"
                  : "Nenhuma unidade encontrada"}
              </EmptyTitle>
              <EmptyDescription>
                {unidades.length === 0
                  ? "Comece cadastrando a primeira unidade (sede)."
                  : "Tente ajustar os filtros de busca."}
              </EmptyDescription>
              {unidades.length === 0 && canManageUnidades && (
                <Button asChild className="mt-4">
                  <Link href="/unidades/nova">
                    <Plus className="mr-2 h-4 w-4" />
                    Cadastrar Unidade
                  </Link>
                </Button>
              )}
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="hidden md:table-cell">Hierarquia</TableHead>
                  <TableHead className="hidden sm:table-cell">Local</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUnidades.map((unidade) => (
                  <TableRow key={unidade.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div 
                          className="flex h-10 w-10 items-center justify-center rounded-lg text-white"
                          style={{ backgroundColor: CORES_TIPO_UNIDADE[unidade.tipo] }}
                        >
                          <Building2 className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-medium">{unidade.nome}</div>
                          {unidade.dirigente && (
                            <div className="text-xs text-muted-foreground">
                              {unidade.dirigente}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        style={{
                          backgroundColor: CORES_TIPO_UNIDADE[unidade.tipo],
                          color: "white",
                        }}
                      >
                        {TIPOS_UNIDADE[unidade.tipo]}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {unidade.unidadePaiId ? (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          {getHierarquia(unidade)}
                          <ChevronRight className="h-3 w-3" />
                          <span className="font-medium text-foreground">{unidade.nome}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {unidade.endereco?.cidade ? (
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          {unidade.endereco.cidade}
                          {unidade.endereco.bairro && ` - ${unidade.endereco.bairro}`}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/unidades/${unidade.id}`}>
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">Ver detalhes</span>
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
