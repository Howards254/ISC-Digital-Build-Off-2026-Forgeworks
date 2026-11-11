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
  { href: "/admin", label: "Inside", shortLabel: "Inside", icon: UsersThree },
  {
    href: "/admin/history",
    label: "History",
    shortLabel: "History",
    icon: ClockCounterClockwise,
  },
  {
    href: "/admin/laptops",
    label: "Laptops",
    shortLabel: "Laptops",
    icon: Laptop,
  },
  {
    href: "/admin/gatekeepers",
    label: "Gatekeepers",
    shortLabel: "Grants",
    icon: IdentificationBadge,
  },
  {
    href: "/admin/audit",
    label: "Audit",
    shortLabel: "Audit",
    icon: Scroll,
  },
] as const;

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Librarian sections"
      className="grid grid-cols-5 border-b border-rule px-2 pb-2 lg:flex lg:flex-col lg:gap-1 lg:border-b-0 lg:px-2 lg:pb-3"
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
            aria-label={item.label}
            className={`relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-sm px-1 py-2 text-[0.6875rem] font-medium leading-none transition-colors duration-150 lg:min-h-11 lg:flex-row lg:justify-start lg:gap-3 lg:rounded-l-none lg:rounded-r-sm lg:border-l-2 lg:px-3 lg:text-sm lg:leading-normal ${
              active
                ? "bg-paper text-forest lg:border-brass lg:bg-wash"
                : "text-ink-muted hover:bg-wash hover:text-ink lg:border-transparent"
            }`}
          >
            {active ? (
              <span
                aria-hidden="true"
                className="absolute inset-x-3 top-0 h-0.5 bg-brass lg:hidden"
              />
            ) : null}
            <Icon
              aria-hidden="true"
              size={18}
              weight={active ? "duotone" : "regular"}
            />
            <span className="lg:hidden">{item.shortLabel}</span>
            <span className="hidden lg:inline">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
