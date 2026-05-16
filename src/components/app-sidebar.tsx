"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Building2,
  BookOpen,
  Wrench,
  Phone,
  Link as LinkIcon,
  Users,
  Bot,
  AlertTriangle,
  DollarSign,
  ToggleLeft,
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
    label: "Operations",
    items: [
      { title: "Maintenance", href: "/maintenance", icon: Wrench },
      { title: "Calls", href: "/calls", icon: Phone },
      { title: "Booking Links", href: "/booking-links", icon: LinkIcon },
    ],
  },
  {
    label: "Settings",
    items: [
      { title: "Users", href: "/settings/users", icon: Users },
      { title: "Agent", href: "/settings/agent", icon: Bot },
      { title: "Urgency Rules", href: "/settings/urgency-rules", icon: AlertTriangle },
      { title: "Cost Rates", href: "/settings/cost-rates", icon: DollarSign },
      { title: "Feature Flags", href: "/settings/feature-flags", icon: ToggleLeft },
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
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-base font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
            Molo Residence
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
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
