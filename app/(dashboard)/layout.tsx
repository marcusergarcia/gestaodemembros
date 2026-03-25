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
  const { user, usuario, loading, isConfigured } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && isConfigured && !user) {
      router.push("/login");
    }
  }, [user, loading, isConfigured, router]);

  // Show setup page if Firebase is not configured
  if (!isConfigured) {
    return <SetupRequired />;
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Spinner className="h-8 w-8 text-primary" />
          <p className="text-sm text-muted-foreground">Carregando...</p>
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
