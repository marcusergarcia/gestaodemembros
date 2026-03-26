"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { Header } from "@/components/dashboard/header";
import { useAuth } from "@/contexts/auth-context";
import { Spinner } from "@/components/ui/spinner";
import { SetupRequired } from "@/components/setup-required";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, usuario, igrejaId, loading, isConfigured } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && isConfigured) {
      if (!user) {
        router.push("/login");
      } else if (!igrejaId) {
        // Usuário logado mas sem igreja configurada (ou sem documento de usuario)
        // Redireciona para setup da igreja
        router.push("/setup-igreja");
      }
    }
  }, [user, igrejaId, loading, isConfigured, router]);

  // Show setup page if Firebase is not configured
  if (!isConfigured) {
    return <SetupRequired />;
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Spinner className="h-8 w-8 text-primary" />
          <p className="text-sm text-muted-foreground">
            Carregando...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Se usuário logado mas sem igreja, mostra loading enquanto redireciona
  if (user && !igrejaId) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Spinner className="h-8 w-8 text-primary" />
          <p className="text-sm text-muted-foreground">
            Redirecionando para configuração...
          </p>
        </div>
      </div>
    );
  }

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
