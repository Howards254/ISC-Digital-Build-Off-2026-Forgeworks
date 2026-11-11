"use client";

import { SpinnerGap, WarningCircle, X } from "@phosphor-icons/react";
import { useActionState, useState } from "react";

import {
  removeRoleGrantAction,
  type GatekeeperActionState,
} from "@/app/admin/gatekeepers/actions";

const IDLE_STATE: GatekeeperActionState = { status: "idle" };

type RemoveGrantButtonProps = {
  grantId: string;
  email: string;
};

export function RemoveGrantButton({ grantId, email }: RemoveGrantButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [state, formAction, pending] = useActionState<
    GatekeeperActionState,
    FormData
  >(removeRoleGrantAction, IDLE_STATE);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="inline-flex min-h-11 items-center gap-1 rounded-sm px-2 font-mono text-[9px] uppercase tracking-[0.1em] text-ink-muted transition-colors duration-150 hover:text-vermilion"
      >
        <X aria-hidden="true" size={13} weight="regular" />
        Remove
      </button>
    );
  }

  return (
    <form action={formAction} className="flex flex-col items-start gap-1.5">
      <input type="hidden" name="grantId" value={grantId} />
      <span className="max-w-[13rem] break-all font-mono text-[9px] leading-4 text-ink-muted">
        Remove {email}?
      </span>
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-11 items-center gap-1 rounded-sm border border-vermilion bg-vermilion px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.1em] text-paper transition-colors duration-150 hover:border-vermilion-hover hover:bg-vermilion-hover disabled:cursor-wait disabled:opacity-70"
        >
          {pending ? (
            <SpinnerGap aria-hidden="true" size={12} className="animate-spin" />
          ) : null}
          Confirm
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={pending}
          className="inline-flex min-h-11 items-center rounded-sm px-2 font-mono text-[9px] uppercase tracking-[0.1em] text-ink-muted transition-colors duration-150 hover:text-ink disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
      {state.status === "error" && state.message ? (
        <p role="alert" className="flex items-start gap-1 text-[10px] leading-4 text-vermilion">
          <WarningCircle
            aria-hidden="true"
            size={12}
            weight="regular"
            className="mt-0.5 shrink-0"
          />
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
