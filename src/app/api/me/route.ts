import { eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import { users } from "@/db/schema";
import { apiError, getApiUser, unauthorized } from "@/lib/api";
import {
  MAX_ADMISSION_NUMBER_LENGTH,
  normalizeAdmissionNumber,
} from "@/lib/member-rules";

const admissionSchema = z.object({
  admissionNumber: z
    .string()
    .trim()
    .min(1, "Enter your admission number.")
    .max(
      MAX_ADMISSION_NUMBER_LENGTH,
      `Keep the admission number under ${MAX_ADMISSION_NUMBER_LENGTH} characters.`,
    ),
});

export async function PATCH(request: Request) {
  const user = await getApiUser();

  if (!user) {
    return unauthorized();
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return apiError("The form didn't arrive. Try again.");
  }

  const parsed = admissionSchema.safeParse(body);

  if (!parsed.success) {
    return apiError(
      parsed.error.issues[0]?.message ?? "Enter your admission number.",
      422,
    );
  }

  const admissionNumber = normalizeAdmissionNumber(parsed.data.admissionNumber);

  try {
    const [updated] = await getDb()
      .update(users)
      .set({ admissionNumber })
      .where(eq(users.id, user.id))
      .returning({ admissionNumber: users.admissionNumber });

    if (!updated) {
      return apiError("Your member record could not be found.", 404);
    }

    return Response.json({ admissionNumber: updated.admissionNumber });
  } catch (error) {
    console.error("Admission number update failed", error);
    return apiError("Your admission number couldn't be saved. Try again.", 500);
  }
}
