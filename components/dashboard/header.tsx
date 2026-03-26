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
import { useAuth } from "@/contexts/auth-context";
import { Church } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TIPOS_UNIDADE } from "@/lib/types";

const pathNames: Record<string, string> = {
  dashboard: "Dashboard",
  membros: "Membros",
  visitantes: "Visitantes",
  novo: "Novo Cadastro",
  nova: "Nova",
  mapa: "Mapa",
  grupos: "Grupos",
  configuracoes: "Configurações",
  igrejas: "Igrejas",
  igreja: "Dados da Igreja",
  unidades: "Unidades",
  aniversariantes: "Aniversariantes",
  acompanhamento: "Acompanhamento",
  relatorios: "Relatórios",
  editar: "Editar",
  usuarios: "Usuários",
  converter: "Converter para Membro",
};

export function Header() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const { unidadeAtual } = useAuth();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b bg-background px-4">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            {segments.map((segment, index) => {
              const isLast = index === segments.length - 1;
              const href = "/" + segments.slice(0, index + 1).join("/");
              const name = pathNames[segment] || segment;

              return (
                <React.Fragment key={segment}>
                  {index > 0 && <BreadcrumbSeparator />}
                  <BreadcrumbItem>
                    {isLast ? (
                      <BreadcrumbPage>{name}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink href={href}>{name}</BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </React.Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      
      {/* Nome da Igreja/Unidade atual */}
      {unidadeAtual && (
        <div className="flex items-center gap-2">
          <Church className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{unidadeAtual.nome}</span>
          <Badge variant="outline" className="text-xs">
            {TIPOS_UNIDADE[unidadeAtual.tipo]}
          </Badge>
        </div>
      )}
    </header>
  );
}
