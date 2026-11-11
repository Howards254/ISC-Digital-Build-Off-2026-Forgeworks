"use client";

import { CircleNotch, GoogleLogo } from "@phosphor-icons/react";
import { useFormStatus } from "react-dom";

type SchoolSignInButtonProps = {
  label?: string;
};

export function SchoolSignInButton({
  label = "Sign in with your school account",
}: SchoolSignInButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} className="button-primary w-full sm:w-auto">
      {pending ? (
        <CircleNotch
          aria-hidden="true"
          size={19}
          weight="regular"
          className="motion-safe:animate-spin"
        />
      ) : (
        <GoogleLogo aria-hidden="true" size={19} weight="regular" />
      )}
      {pending ? "Opening Google" : label}
    </button>
  );
}
