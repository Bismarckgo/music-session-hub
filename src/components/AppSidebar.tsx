import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Music,
  LayoutDashboard,
  Library,
  Percent,
  ClipboardList,
  Activity,
  Settings,
  LogOut,
  Users,
  Radio,
  BookOpen,
  Sparkles,
  Network,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
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
  useSidebar,
} from "@/components/ui/sidebar";

const items = [
  { title: "Panel", url: "/dashboard", icon: LayoutDashboard },
  { title: "Catálogo", url: "/catalogo", icon: Library },
  { title: "Colaboradores", url: "/colaboradores", icon: Users },
  { title: "Splits", url: "/splits", icon: Percent },
  { title: "Distribución", url: "/distribucion", icon: Radio },
  { title: "Publishing", url: "/publishing", icon: BookOpen },
  { title: "Registros", url: "/registros", icon: ClipboardList },
  { title: "Asistente", url: "/asistente", icon: Sparkles },
  { title: "Conocimiento", url: "/conocimiento", icon: Network },
  { title: "Actividad", url: "/actividad", icon: Activity },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentPath = useRouterState({ select: (s) => s.location.pathname });

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <Music className="h-5 w-5 shrink-0 text-primary" />
          {!collapsed && <span className="font-display text-base font-bold">CST</span>}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Estudio</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={currentPath.startsWith(item.url)}>
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={currentPath.startsWith("/configuracion")}>
              <Link to="/configuracion" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                {!collapsed && <span>Configuración</span>}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut}>
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>Cerrar sesión</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}