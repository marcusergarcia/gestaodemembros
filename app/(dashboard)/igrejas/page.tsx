"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getDocs, deleteDoc, doc } from "firebase/firestore";
import { getIgrejasCollection } from "@/lib/firestore";
import { useAuth } from "@/contexts/auth-context";
import { Igreja, TIPOS_IGREJA } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Plus, Pencil, Trash2, Church, Building2, MapPin, Phone, Mail } from "lucide-react";
import Link from "next/link";
import { db } from "@/lib/firebase";

export default function IgrejasPage() {
  const router = useRouter();
  const { usuario } = useAuth();
  const [igrejas, setIgrejas] = useState<Igreja[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Verifica se o usuário tem permissão de acesso total
  const isFull = usuario?.nivelAcesso === "full";

  useEffect(() => {
    if (!isFull) {
      router.push("/");
      return;
    }

    loadIgrejas();
  }, [isFull, router]);

  const loadIgrejas = async () => {
    try {
      setLoading(true);
      const igrejasRef = getIgrejasCollection();
      const snapshot = await getDocs(igrejasRef);
      const igrejasData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Igreja[];
      setIgrejas(igrejasData);
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

  const getTipoBadgeVariant = (tipo: string) => {
    switch (tipo) {
      case "sede":
        return "default";
      case "congregacao":
        return "secondary";
      case "subcongregacao":
        return "outline";
      case "missao":
        return "destructive";
      default:
        return "outline";
    }
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
            Cadastre e gerencie todas as igrejas do sistema
          </p>
        </div>
        <Button asChild>
          <Link href="/igrejas/nova">
            <Plus className="mr-2 h-4 w-4" />
            Nova Igreja
          </Link>
        </Button>
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
        <Card>
          <CardHeader>
            <CardTitle>Igrejas Cadastradas</CardTitle>
            <CardDescription>
              Total de {igrejas.length} igreja{igrejas.length !== 1 ? "s" : ""} no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="hidden md:table-cell">Dirigente</TableHead>
                  <TableHead className="hidden lg:table-cell">Cidade</TableHead>
                  <TableHead className="hidden lg:table-cell">Contato</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {igrejas.map((igreja) => (
                  <TableRow key={igreja.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <Church className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{igreja.nome}</p>
                          {igreja.codIgreja && (
                            <p className="text-xs text-muted-foreground">
                              Código: {igreja.codIgreja}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getTipoBadgeVariant(igreja.tipo || "outro")}>
                        {TIPOS_IGREJA[igreja.tipo as keyof typeof TIPOS_IGREJA] || "Outro"}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {igreja.dirigente || "-"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {igreja.endereco?.cidade ? (
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          {igreja.endereco.cidade}/{igreja.endereco.estado}
                        </div>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex flex-col gap-1 text-sm">
                        {igreja.telefone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            {igreja.telefone}
                          </div>
                        )}
                        {igreja.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            {igreja.email}
                          </div>
                        )}
                        {!igreja.telefone && !igreja.email && "-"}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                        >
                          <Link href={`/igrejas/${igreja.id}`}>
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Editar</span>
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setDeleteId(igreja.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Excluir</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Igreja</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta igreja? Esta ação não pode ser desfeita
              e todos os dados relacionados (membros, grupos, etc.) serão perdidos.
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
