"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

import { signIn, signOut } from "@/auth";
import { safeInternalPath } from "@/lib/navigation";

export async function signInWithSchoolAccount(formData?: FormData) {
  const returnTo =
    safeInternalPath(formData?.get("returnTo"), "/me") ?? "/me";

  try {
    await signIn("google", { redirectTo: returnTo });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect(`/auth/error?error=${encodeURIComponent(error.type)}`);
    }

    throw error;
  }
}

export async function signOutOfVulcan() {
  await signOut({ redirectTo: "/" });
}
