"use client";

import * as React from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { usePathname } from "next/navigation";

const pathNames: Record<string, string> = {
  dashboard: "Dashboard",
  membros: "Membros",
  novo: "Novo Cadastro",
  mapa: "Mapa",
  grupos: "Grupos",
  configuracoes: "Configurações",
};

export function Header() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  // Criar array flat de elementos para evitar li aninhado
  const breadcrumbItems: React.ReactNode[] = [];
  segments.forEach((segment, index) => {
    const isLast = index === segments.length - 1;
    const href = "/" + segments.slice(0, index + 1).join("/");
    const name = pathNames[segment] || segment;

    if (index > 0) {
      breadcrumbItems.push(<BreadcrumbSeparator key={`sep-${segment}`} />);
    }
    
    breadcrumbItems.push(
      <BreadcrumbItem key={segment}>
        {isLast ? (
          <BreadcrumbPage>{name}</BreadcrumbPage>
        ) : (
          <BreadcrumbLink href={href}>{name}</BreadcrumbLink>
        )}
      </BreadcrumbItem>
    );
  });

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          {breadcrumbItems}
        </BreadcrumbList>
      </Breadcrumb>
    </header>
  );
}
