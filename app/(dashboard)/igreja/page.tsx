"use client";

import { useState } from "react";
import { doc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
import { useIgreja } from "@/contexts/igreja-context";
import { IgrejaForm } from "@/components/igreja/igreja-form";
import { IgrejaView } from "@/components/igreja/igreja-view";
import { Skeleton } from "@/components/ui/skeleton";
import { Igreja } from "@/lib/types";
import { getIgrejaDocRef, isAdminOrHigher } from "@/lib/firestore-helpers";

export default function IgrejaPage() {
  const { usuario } = useAuth();
  const { igreja, igrejaId, loading } = useIgreja();
  const [editing, setEditing] = useState(false);

  const handleSave = async (data: Omit<Igreja, "id" | "dataCadastro">) => {
    if (!igrejaId) return;
    
    try {
      const igrejaData = {
        ...data,
        dataAtualizacao: Timestamp.now(),
        atualizadoPor: usuario?.uid,
      };

      await updateDoc(getIgrejaDocRef(igrejaId), igrejaData);
      setEditing(false);
    } catch (error) {
      console.error("Erro ao salvar dados da igreja:", error);
      throw error;
    }
  };

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

  if (!igreja) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Nenhuma igreja vinculada à sua conta.</p>
      </div>
    );
  }

  const isAdmin = isAdminOrHigher(usuario?.nivelAcesso);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dados da Igreja</h1>
        <p className="text-muted-foreground">
          Informações cadastradas da igreja
        </p>
      </div>

      {editing ? (
        <IgrejaForm
          igreja={igreja}
          onSave={handleSave}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <IgrejaView
          igreja={igreja}
          onEdit={isAdmin ? () => setEditing(true) : undefined}
        />
      )}
    </div>
  );
}
