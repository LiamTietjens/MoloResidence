"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Building2,
  BookOpen,
  AlertTriangle,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";

const navGroups = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", href: "/", icon: Home },
    ],
  },
  {
    label: "Content",
    items: [
      { title: "Properties", href: "/properties", icon: Building2 },
      { title: "Knowledge Bases", href: "/knowledge-bases", icon: BookOpen },
    ],
  },
  {
    label: "Settings",
    items: [
      { title: "Urgency Rules", href: "/settings/urgency-rules", icon: AlertTriangle },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <Sidebar collapsible="none" className="border-r w-56">
      <SidebarHeader className="h-14 flex items-center justify-center border-b">
        <Link href="/" className="text-base font-semibold tracking-tight">
          Molo Residence
        </Link>
      </SidebarHeader>
      <SidebarContent className="px-2 pt-2">
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={isActive(item.href)}
                    tooltip={item.title}
                    render={<Link href={item.href} />}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
