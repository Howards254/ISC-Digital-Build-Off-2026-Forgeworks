"use client";

import { Plus, SpinnerGap, WarningCircle } from "@phosphor-icons/react";
import { useActionState, useEffect, useRef } from "react";

import {
  addGatekeeperAction,
  type GatekeeperActionState,
} from "@/app/admin/gatekeepers/actions";

const IDLE_STATE: GatekeeperActionState = { status: "idle" };

export function GatekeeperForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<
    GatekeeperActionState,
    FormData
  >(addGatekeeperAction, IDLE_STATE);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="mt-4">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_10rem_11rem_auto] md:items-end">
        <div>
          <label htmlFor="gatekeeper-email" className="field-label">
            Email
          </label>
          <input
            id="gatekeeper-email"
            name="email"
            type="email"
            required
            maxLength={254}
            autoComplete="off"
            placeholder="name@school.edu"
            className="field-input mt-1.5"
          />
        </div>

        <div>
          <label htmlFor="gatekeeper-role" className="field-label">
            Role
          </label>
          <select
            id="gatekeeper-role"
            name="role"
            defaultValue="gatekeeper"
            className="field-input mt-1.5"
          >
            <option value="gatekeeper">Gatekeeper</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div>
          <label htmlFor="gatekeeper-ends" className="field-label">
            Ends (optional)
          </label>
          <input
            id="gatekeeper-ends"
            name="endsAt"
            type="date"
            className="field-input mt-1.5"
          />
        </div>

        <button type="submit" disabled={pending} className="button-primary">
          {pending ? (
            <SpinnerGap aria-hidden="true" size={17} className="animate-spin" />
          ) : (
            <Plus aria-hidden="true" size={17} weight="regular" />
          )}
          Add grant
        </button>
      </div>

      {state.status === "error" && state.message ? (
        <p
          role="alert"
          className="mt-3 flex items-start gap-2 text-sm leading-6 text-vermilion"
        >
          <WarningCircle
            aria-hidden="true"
            size={15}
            weight="regular"
            className="mt-1 shrink-0"
          />
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
