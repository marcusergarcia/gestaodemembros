"use client";

import { useEffect, useState } from "react";
import { getDoc, setDoc, Timestamp } from "firebase/firestore";
import { getIgrejaDoc2 } from "@/lib/firestore";
import { useAuth } from "@/contexts/auth-context";
import { IgrejaForm } from "@/components/igreja/igreja-form";
import { IgrejaView } from "@/components/igreja/igreja-view";
import { Skeleton } from "@/components/ui/skeleton";
import { Igreja } from "@/lib/types";

export default function IgrejaPage() {
  const { usuario, igrejaId } = useAuth();
  const [igreja, setIgreja] = useState<Igreja | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!igrejaId) {
      setLoading(false);
      return;
    }

    const loadIgreja = async () => {
      try {
        const igrejaDoc = await getDoc(getIgrejaDoc2(igrejaId));
        if (igrejaDoc.exists()) {
          setIgreja({ id: igrejaDoc.id, ...igrejaDoc.data() } as Igreja);
        }
      } catch (error) {
        console.error("Erro ao carregar dados da igreja:", error);
      } finally {
        setLoading(false);
      }
    };

    loadIgreja();
  }, [igrejaId]);

  const handleSave = async (data: Omit<Igreja, "id" | "dataCadastro">) => {
    if (!igrejaId) return;

    try {
      const igrejaData = {
        ...data,
        dataCadastro: igreja?.dataCadastro || Timestamp.now(),
        dataAtualizacao: Timestamp.now(),
        atualizadoPor: usuario?.uid,
      };

      await setDoc(getIgrejaDoc2(igrejaId), igrejaData);
      setIgreja({ id: igrejaId, ...igrejaData } as Igreja);
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

  const isAdmin = usuario?.nivelAcesso === "admin";
  const showForm = editing || !igreja;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dados da Igreja</h1>
        <p className="text-muted-foreground">
          {igreja ? "Informações cadastradas da igreja" : "Cadastre as informações da sua igreja"}
        </p>
      </div>

      {showForm ? (
        <IgrejaForm
          igreja={igreja || undefined}
          onSave={handleSave}
          onCancel={igreja ? () => setEditing(false) : undefined}
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
