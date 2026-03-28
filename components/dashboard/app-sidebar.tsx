"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users,
  UserPlus,
  Map,
  UsersRound,
  LayoutDashboard,
  Settings,
  LogOut,
  Church,
  Cake,
  HeartHandshake,
  BarChart3,
  Building2,
  Home,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { NIVEIS_ACESSO } from "@/lib/types";

const menuItems = [
  {
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Membros",
    href: "/membros",
    icon: Users,
  },
  {
    title: "Visitantes",
    href: "/visitantes",
    icon: UserPlus,
  },
  {
    title: "Mapa",
    href: "/mapa",
    icon: Map,
  },
  {
    title: "Famílias",
    href: "/familias",
    icon: Home,
  },
  {
    title: "Grupos",
    href: "/grupos",
    icon: UsersRound,
  },
  {
    title: "Aniversariantes",
    href: "/aniversariantes",
    icon: Cake,
  },
  {
    title: "Acompanhamento",
    href: "/acompanhamento",
    icon: HeartHandshake,
  },
  {
    title: "Relatórios",
    href: "/relatorios",
    icon: BarChart3,
  },
];

const adminItems = [
  {
    title: "Unidades",
    href: "/unidades",
    icon: Building2,
  },
  {
    title: "Igreja",
    href: "/igreja",
    icon: Church,
  },
  {
    title: "Usuários",
    href: "/usuarios",
    icon: Users,
  },
  {
    title: "Configurações",
    href: "/configuracoes",
    icon: Settings,
  },
];

// Itens exclusivos para usuários com acesso full (gerenciamento de múltiplas igrejas)
const fullAccessItems = [
  {
    title: "Gerenciar Igrejas",
    href: "/igrejas",
    icon: Church,
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { usuario, signOut } = useAuth();

  const isAdmin = usuario?.nivelAcesso === "admin" || usuario?.nivelAcesso === "full";
  const isFull = usuario?.nivelAcesso === "full";

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Church className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-sidebar-foreground">
              Gestão de Membros
            </span>
            <span className="text-xs text-sidebar-foreground/60">
              Sistema da Igreja
            </span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)}
                    tooltip={item.title}
                  >
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Administração</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)}
                      tooltip={item.title}
                    >
                      <Link href={item.href}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {isFull && (
          <SidebarGroup>
            <SidebarGroupLabel>Sistema</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {fullAccessItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname.startsWith(item.href)}
                      tooltip={item.title}
                    >
                      <Link href={item.href}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-sm">
              {usuario?.nome?.charAt(0)?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-1 flex-col overflow-hidden">
            <span className="truncate text-sm font-medium text-sidebar-foreground">
              {usuario?.nome || "Usuário"}
            </span>
            <span className="truncate text-xs text-sidebar-foreground/60">
              {usuario?.nivelAcesso
                ? NIVEIS_ACESSO[usuario.nivelAcesso]
                : "Carregando..."}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={signOut}
            className="h-8 w-8 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <LogOut className="h-4 w-4" />
            <span className="sr-only">Sair</span>
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
