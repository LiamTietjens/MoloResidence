"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Building2,
  BookOpen,
  AlertTriangle,
} from "lucide-react";

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
    <aside className="w-[220px] shrink-0 border-r bg-muted/30 flex flex-col">
      <div className="h-14 flex items-center justify-center border-b font-semibold tracking-tight">
        Molo Residence
      </div>
      <nav className="flex-1 p-3 space-y-6 mt-2">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                      isActive(item.href)
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
