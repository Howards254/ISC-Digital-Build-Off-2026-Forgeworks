"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClockCounterClockwise,
  IdentificationBadge,
  Laptop,
  Scroll,
  UsersThree,
} from "@phosphor-icons/react";

const NAV_ITEMS = [
  { href: "/admin", label: "Inside", icon: UsersThree },
  { href: "/admin/history", label: "History", icon: ClockCounterClockwise },
  { href: "/admin/laptops", label: "Laptops", icon: Laptop },
  { href: "/admin/gatekeepers", label: "Gatekeepers", icon: IdentificationBadge },
  { href: "/admin/audit", label: "Audit", icon: Scroll },
] as const;

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Librarian sections"
      className="flex gap-1 overflow-x-auto border-b border-rule px-3 pb-3 lg:flex-col lg:overflow-visible lg:border-b-0 lg:px-2"
    >
      {NAV_ITEMS.map((item) => {
        const active =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(item.href);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-11 shrink-0 items-center gap-3 rounded-sm px-3 text-sm font-medium transition-colors duration-150 lg:rounded-r-sm lg:rounded-l-none lg:border-l-2 ${
              active
                ? "border-brass bg-paper text-forest lg:bg-wash"
                : "border-transparent text-ink-muted hover:bg-wash hover:text-ink"
            }`}
          >
            <Icon
              aria-hidden="true"
              size={18}
              weight={active ? "duotone" : "regular"}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
