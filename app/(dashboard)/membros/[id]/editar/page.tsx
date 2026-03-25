"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { MembroForm } from "@/components/membros/membro-form";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Membro } from "@/lib/types";

export default function EditarMembroPage() {
  const params = useParams();
  const router = useRouter();
  const [membro, setMembro] = useState<Membro | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMembro() {
      try {
        const docRef = doc(db, "members", params.id as string);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setMembro({ id: docSnap.id, ...docSnap.data() } as Membro);
        } else {
          router.push("/dashboard/membros");
        }
      } catch (error) {
        console.error("Erro ao carregar membro:", error);
      } finally {
        setLoading(false);
      }
    }

    loadMembro();
  }, [params.id, router]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardContent className="space-y-4 p-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!membro) {
    return null;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Editar Membro</h1>
        <p className="text-muted-foreground">
          Atualize os dados de {membro.nome}
        </p>
      </div>

      <MembroForm membro={membro} />
    </div>
  );
}
