"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  where,
} from "firebase/firestore";
import { getIgrejaCollection, getIgrejaDoc, IGREJA_ID_FIELD } from "@/lib/firestore";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/auth-context";
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import {
  UserPlus,
  Search,
  MoreHorizontal,
  Eye,
  Pencil,
  UserX,
  Users,
  Phone,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import {
  Membro,
  TipoMembro,
  CargoMembro,
  TIPOS_MEMBRO,
  CARGOS_MEMBRO,
} from "@/lib/types";

export default function MembrosPage() {
  const { usuario, igrejaId } = useAuth();
  const [membros, setMembros] = useState<Membro[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTipo, setFilterTipo] = useState<TipoMembro | "todos">("todos");
  const [filterCargo, setFilterCargo] = useState<CargoMembro | "todos">("todos");
  const [memberToDeactivate, setMemberToDeactivate] = useState<Membro | null>(null);

  const isAdmin = usuario?.nivelAcesso === "admin";
  const isLider = usuario?.nivelAcesso === "lider";

  useEffect(() => {
    if (!igrejaId) {
      setLoading(false);
      return;
    }

    const membrosRef = getIgrejaCollection(igrejaId, "membros");
    const q = query(membrosRef, where(IGREJA_ID_FIELD, "==", igrejaId), orderBy("nome", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const membrosData: Membro[] = [];
      snapshot.forEach((docSnap) => {
        membrosData.push({ id: docSnap.id, ...docSnap.data() } as Membro);
      });
      setMembros(membrosData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [igrejaId]);

  const filteredMembros = membros.filter((membro) => {
    // Only show active members
    if (!membro.ativo) return false;

    // If user is a leader, only show members from their group
    if (isLider && usuario?.grupoId) {
      if (membro.grupoId !== usuario.grupoId) return false;
    }

    // Search filter
    const matchesSearch =
      membro.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      membro.telefone.includes(searchTerm) ||
      membro.endereco?.bairro?.toLowerCase().includes(searchTerm.toLowerCase());

    // Type filter
    const matchesTipo = filterTipo === "todos" || membro.tipo === filterTipo;

    // Cargo filter
    const matchesCargo =
      filterCargo === "todos" ||
      (membro.cargo && membro.cargo === filterCargo);

    return matchesSearch && matchesTipo && matchesCargo;
  });

  const handleDeactivate = async () => {
    if (!memberToDeactivate || !igrejaId) return;

    try {
      await updateDoc(getIgrejaDoc(igrejaId, "membros", memberToDeactivate.id), {
        ativo: false,
      });
      toast.success("Membro desativado com sucesso");
      setMemberToDeactivate(null);
    } catch (error) {
      console.error("Erro ao desativar membro:", error);
      toast.error("Erro ao desativar membro");
    }
  };

  const formatPhone = (phone: string) => {
    if (phone.length === 11) {
      return `(${phone.slice(0, 2)}) ${phone.slice(2, 7)}-${phone.slice(7)}`;
    }
    return phone;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Membros</h1>
          <p className="text-muted-foreground">
            {filteredMembros.length} membro{filteredMembros.length !== 1 && "s"}{" "}
            {isLider ? "no seu grupo" : "cadastrado" + (filteredMembros.length !== 1 ? "s" : "")}
          </p>
        </div>
        {(isAdmin || isLider) && (
          <Button asChild>
            <Link href="/membros/novo">
              <UserPlus className="mr-2 h-4 w-4" />
              Novo Membro
            </Link>
          </Button>
        )}
      </div>

      {/* Leader info banner */}
      {isLider && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-center gap-3 p-4">
            <Users className="h-5 w-5 text-primary" />
            <p className="text-sm">
              Como líder, você visualiza apenas os membros do seu grupo.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, telefone ou bairro..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={filterTipo}
            onValueChange={(v) => setFilterTipo(v as TipoMembro | "todos")}
          >
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              {(Object.keys(TIPOS_MEMBRO) as TipoMembro[]).map((tipo) => (
                <SelectItem key={tipo} value={tipo}>
                  {TIPOS_MEMBRO[tipo]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filterCargo}
            onValueChange={(v) => setFilterCargo(v as CargoMembro | "todos")}
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Cargo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os cargos</SelectItem>
              {(Object.keys(CARGOS_MEMBRO) as CargoMembro[]).map((cargo) => (
                <SelectItem key={cargo} value={cargo}>
                  {CARGOS_MEMBRO[cargo]}
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
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : filteredMembros.length === 0 ? (
        <Card>
          <CardContent className="p-12">
            <Empty>
              <EmptyMedia variant="icon">
                <Users className="h-10 w-10" />
              </EmptyMedia>
              <EmptyTitle>
                {membros.length === 0
                  ? "Nenhum membro cadastrado"
                  : "Nenhum membro encontrado"}
              </EmptyTitle>
              <EmptyDescription>
                {membros.length === 0
                  ? "Comece cadastrando o primeiro membro da igreja."
                  : "Tente ajustar os filtros de busca."}
              </EmptyDescription>
              {membros.length === 0 && (
                <Button asChild className="mt-4">
                  <Link href="/membros/novo">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Cadastrar Membro
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
                  <TableHead className="hidden md:table-cell">Telefone</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="hidden lg:table-cell">Cargo</TableHead>
                  <TableHead className="hidden sm:table-cell">Bairro</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembros.map((membro) => (
                  <TableRow key={membro.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={membro.fotoUrl || undefined} alt={membro.nome} />
                          <AvatarFallback className="text-xs">
                            {membro.nome.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{membro.nome}</div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground md:hidden">
                            <Phone className="h-3 w-3" />
                            {formatPhone(membro.telefone)}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {formatPhone(membro.telefone)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        style={{
                          backgroundColor: `var(--type-${membro.tipo})`,
                          color: "white",
                        }}
                      >
                        {TIPOS_MEMBRO[membro.tipo]}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {membro.cargo ? (
                        <span className="text-sm">
                          {membro.cargo === "outro"
                            ? membro.cargoDescricao
                            : CARGOS_MEMBRO[membro.cargo]}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex items-center gap-1 text-sm">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        {membro.endereco?.bairro || "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Ações</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/membros/${membro.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              Visualizar
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/membros/${membro.id}/editar`}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setMemberToDeactivate(membro)}
                          >
                            <UserX className="mr-2 h-4 w-4" />
                            Desativar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Deactivate Confirmation Dialog */}
      <AlertDialog
        open={!!memberToDeactivate}
        onOpenChange={() => setMemberToDeactivate(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar Membro</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja desativar{" "}
              <strong>{memberToDeactivate?.nome}</strong>? O membro não será
              excluído, apenas ficará inativo no sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeactivate}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Desativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
