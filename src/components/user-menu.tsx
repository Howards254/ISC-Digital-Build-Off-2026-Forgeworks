"use client";

import Link from "next/link";
import { CaretDown, SignOut } from "@phosphor-icons/react";
import { useEffect, useId, useRef, useState } from "react";

import { signOutOfVulcan } from "@/app/actions";
import { canOpenDoor, getInitials, ROLE_LABELS } from "@/lib/roles";
import type { UserRole } from "@/db/schema";

type UserMenuProps = {
  name?: string | null;
  email?: string | null;
  role: UserRole;
};

export function UserMenu({ name, email, role }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const displayName = name?.trim() || email || "School account";

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label="Open account menu"
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-11 items-center gap-2 rounded-md px-1.5 py-1 text-left transition-colors duration-150 hover:bg-wash"
      >
        <span
          aria-hidden="true"
          className="grid size-8 shrink-0 place-items-center rounded-sm border border-rule bg-surface font-display text-sm leading-none text-ink"
        >
          {getInitials(displayName)}
        </span>
        <span className="hidden max-w-36 truncate text-sm font-medium text-ink sm:block">
          {displayName}
        </span>
        <CaretDown
          aria-hidden="true"
          size={13}
          weight="regular"
          className={`shrink-0 text-ink-muted transition-transform duration-150 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open ? (
        <div
          id={menuId}
          role="group"
          aria-label="Account menu"
          className="account-menu absolute right-0 top-[calc(100%+0.5rem)] z-40 w-[min(19rem,calc(100vw-2.5rem))] rounded-md border border-rule bg-surface"
        >
          <div className="border-b border-rule px-4 py-3.5">
            <p className="truncate text-sm font-semibold text-ink">{displayName}</p>
            {email ? (
              <p className="mt-0.5 truncate font-mono text-[11px] text-ink-muted">{email}</p>
            ) : null}
            <span className="stamp mt-3 text-forest">{ROLE_LABELS[role]}</span>
          </div>

          <div className="p-1.5">
            <Link
              href="/me"
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center rounded-sm px-3 text-sm font-medium text-ink transition-colors duration-150 hover:bg-wash"
            >
              Your page
            </Link>
            {role === "admin" ? (
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center rounded-sm px-3 text-sm font-medium text-forest transition-colors duration-150 hover:bg-wash"
              >
                Librarian desk
              </Link>
            ) : null}
            {canOpenDoor(role) ? (
              <Link
                href="/door/in"
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center rounded-sm px-3 text-sm font-medium text-ink transition-colors duration-150 hover:bg-wash"
              >
                Door screen
              </Link>
            ) : null}
            <form action={signOutOfVulcan}>
              <button
                type="submit"
                className="flex min-h-11 w-full items-center gap-2.5 rounded-sm px-3 text-left text-sm font-medium text-ink-muted transition-colors duration-150 hover:bg-wash hover:text-ink"
              >
                <SignOut aria-hidden="true" size={17} weight="regular" />
                Sign out
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
