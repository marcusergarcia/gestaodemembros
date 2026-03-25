"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
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
import {
  UsersRound,
  Plus,
  MoreHorizontal,
  Users,
  MapPin,
  MessageCircle,
  Trash2,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { Grupo, Membro, TIPOS_GRUPO } from "@/lib/types";

interface GrupoComDetalhes extends Grupo {
  liderNome?: string;
  membrosNomes?: string[];
}

export default function GruposPage() {
  const [grupos, setGrupos] = useState<GrupoComDetalhes[]>([]);
  const [loading, setLoading] = useState(true);
  const [grupoToDelete, setGrupoToDelete] = useState<GrupoComDetalhes | null>(
    null
  );

  useEffect(() => {
    const gruposRef = collection(db, "grupos");
    const q = query(
      gruposRef,
      where("ativo", "==", true),
      orderBy("dataCriacao", "desc")
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const gruposData: GrupoComDetalhes[] = [];

      for (const docSnap of snapshot.docs) {
        const grupo = { id: docSnap.id, ...docSnap.data() } as GrupoComDetalhes;

        // Fetch leader name
        if (grupo.liderMembroId) {
          const liderDoc = await getDoc(doc(db, "members", grupo.liderMembroId));
          if (liderDoc.exists()) {
            grupo.liderNome = liderDoc.data().nome;
          }
        }

        // Fetch first few member names
        const memberNames: string[] = [];
        for (const memberId of grupo.membrosIds.slice(0, 3)) {
          const memberDoc = await getDoc(doc(db, "members", memberId));
          if (memberDoc.exists()) {
            memberNames.push(memberDoc.data().nome);
          }
        }
        grupo.membrosNomes = memberNames;

        gruposData.push(grupo);
      }

      setGrupos(gruposData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleDelete = async () => {
    if (!grupoToDelete) return;

    try {
      await updateDoc(doc(db, "grupos", grupoToDelete.id), {
        ativo: false,
      });
      toast.success("Grupo excluído com sucesso");
      setGrupoToDelete(null);
    } catch (error) {
      console.error("Erro ao excluir grupo:", error);
      toast.error("Erro ao excluir grupo");
    }
  };

  const formatDate = (timestamp: { toDate: () => Date } | undefined) => {
    if (!timestamp) return "-";
    return timestamp.toDate().toLocaleDateString("pt-BR");
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case "estudo":
        return "bg-blue-500";
      case "visita":
        return "bg-green-500";
      case "acompanhamento":
        return "bg-amber-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Grupos</h1>
          <p className="text-muted-foreground">
            {grupos.length} grupo{grupos.length !== 1 && "s"} ativo
            {grupos.length !== 1 && "s"}
          </p>
        </div>
        <Button asChild>
          <Link href="/grupos/novo">
            <Plus className="mr-2 h-4 w-4" />
            Criar Grupo
          </Link>
        </Button>
      </div>

      {/* Groups List */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="mb-4 h-6 w-32" />
                <Skeleton className="mb-2 h-4 w-48" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : grupos.length === 0 ? (
        <Card>
          <CardContent className="p-12">
            <Empty>
              <EmptyMedia variant="icon">
                <UsersRound className="h-10 w-10" />
              </EmptyMedia>
              <EmptyTitle>Nenhum grupo criado</EmptyTitle>
              <EmptyDescription>
                Crie grupos de WhatsApp baseados na proximidade dos membros para
                facilitar estudos, visitas e acompanhamento.
              </EmptyDescription>
              <Button asChild className="mt-4">
                <Link href="/grupos/novo">
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Primeiro Grupo
                </Link>
              </Button>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {grupos.map((grupo) => (
            <Card key={grupo.id} className="relative">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{grupo.nome}</CardTitle>
                    <Badge
                      className={`${getTipoColor(grupo.tipo)} text-white`}
                    >
                      {TIPOS_GRUPO[grupo.tipo]}
                    </Badge>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Ações</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {grupo.linkWhatsApp && (
                        <DropdownMenuItem asChild>
                          <a
                            href={grupo.linkWhatsApp}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <MessageCircle className="mr-2 h-4 w-4" />
                            Abrir WhatsApp
                          </a>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setGrupoToDelete(grupo)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Leader */}
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Líder:</span>
                  <span className="font-medium">
                    {grupo.liderNome || "N/A"}
                  </span>
                </div>

                {/* Members count */}
                <div className="flex items-center gap-2 text-sm">
                  <UsersRound className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Membros:</span>
                  <span className="font-medium">{grupo.membrosIds.length}</span>
                </div>

                {/* Radius */}
                {grupo.raioKm && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Raio:</span>
                    <span className="font-medium">{grupo.raioKm} km</span>
                  </div>
                )}

                {/* Date */}
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Criado em:</span>
                  <span className="font-medium">
                    {formatDate(grupo.dataCriacao)}
                  </span>
                </div>

                {/* Member names preview */}
                {grupo.membrosNomes && grupo.membrosNomes.length > 0 && (
                  <div className="pt-2">
                    <p className="text-xs text-muted-foreground">
                      {grupo.membrosNomes.join(", ")}
                      {grupo.membrosIds.length > 3 &&
                        ` e mais ${grupo.membrosIds.length - 3}`}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!grupoToDelete}
        onOpenChange={() => setGrupoToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Grupo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o grupo{" "}
              <strong>{grupoToDelete?.nome}</strong>? Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
