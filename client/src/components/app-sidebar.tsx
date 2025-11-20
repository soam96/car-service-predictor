import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { LayoutDashboard, Users, Wrench, Package, BarChart3, ClipboardList } from "lucide-react";

const menuItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Service Request",
    url: "/request",
    icon: ClipboardList,
  },
  {
    title: "Workers",
    url: "/workers",
    icon: Users,
  },
  {
    title: "Active Services",
    url: "/services",
    icon: Wrench,
  },
  {
    title: "Inventory",
    url: "/inventory",
    icon: Package,
  },
  {
    title: "Analytics",
    url: "/analytics",
    icon: BarChart3,
  },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar className="bg-transparent">
      <SidebarHeader className="p-6 backdrop-blur-md bg-white/5 dark:bg-white/10 border border-white/10 rounded-xl mx-3 mt-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-md bg-primary flex items-center justify-center">
            <Wrench className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <div className="text-base font-semibold tracking-wide">Car Service</div>
            <div className="text-xs text-muted-foreground">Intelligence System</div>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workshop Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location === item.url}
                    className={location === item.url ? 'relative before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-6 before:w-1.5 before:rounded-full before:bg-blue-500 before:shadow-[0_0_12px_#3b82f6]' : ''}
                  >
                    <Link href={item.url} data-testid={`link-${item.url.slice(1) || 'dashboard'}`}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}