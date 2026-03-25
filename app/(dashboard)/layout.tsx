"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { Header } from "@/components/dashboard/header";
import { useAuth } from "@/contexts/auth-context";
import { Spinner } from "@/components/ui/spinner";
import { SetupRequired } from "@/components/setup-required";

const DEFAULT_IGREJA_ID = "igreja-principal";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, usuario, igrejaId, loading, isConfigured } = useAuth();
  const router = useRouter();
  const [fixingIgrejaId, setFixingIgrejaId] = useState(false);

  useEffect(() => {
    if (!loading && isConfigured && !user) {
      router.push("/login");
    }
  }, [user, loading, isConfigured, router]);

  // Auto-fix: Se o usuário existe mas não tem igrejaId, adiciona automaticamente
  useEffect(() => {
    const fixMissingIgrejaId = async () => {
      if (!loading && user && usuario && !igrejaId && db && !fixingIgrejaId) {
        setFixingIgrejaId(true);
        try {
          console.log("[v0] Usuário sem igrejaId detectado, corrigindo...");
          await updateDoc(doc(db, "usuarios", user.uid), {
            igrejaId: DEFAULT_IGREJA_ID,
          });
          console.log("[v0] igrejaId adicionado com sucesso!");
          // O AuthContext vai recarregar automaticamente via onSnapshot
        } catch (error) {
          console.error("[v0] Erro ao adicionar igrejaId:", error);
        }
      }
    };

    fixMissingIgrejaId();
  }, [loading, user, usuario, igrejaId, fixingIgrejaId]);

  // Show setup page if Firebase is not configured
  if (!isConfigured) {
    return <SetupRequired />;
  }

  if (loading || fixingIgrejaId) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Spinner className="h-8 w-8 text-primary" />
          <p className="text-sm text-muted-foreground">
            {fixingIgrejaId ? "Configurando igreja..." : "Carregando..."}
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // If user is authenticated but doesn't have a user document, show warning but allow access
  // This can happen if Firestore permissions are not configured correctly

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
