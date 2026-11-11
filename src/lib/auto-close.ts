import { sql } from "drizzle-orm";

import { getDb } from "@/db";
import { auditLog, users, visits } from "@/db/schema";

/**
 * Audit entries need a user row. The cron has no signed-in librarian, so it
 * uses a reserved system account. The `.invalid` domain can never pass the
 * school-domain sign-in gate.
 */
const AUTO_CLOSE_ACTOR_EMAIL = "auto-close@vulcan.invalid";

export type AutoCloseResult = {
  closed: number;
  checkedAt: string;
};

/**
 * Close every open visit in one statement. A writable CTE updates the visits
 * and inserts one audit row per closed visit, so a burst of open visits cannot
 * leave the ledger and the audit trail out of step.
 */
export async function closeOpenVisits(
  now = new Date(),
): Promise<AutoCloseResult> {
  const db = getDb();

  const [actor] = await db
    .insert(users)
    .values({
      email: AUTO_CLOSE_ACTOR_EMAIL,
      name: "Vulcan auto-close",
      role: "member",
    })
    .onConflictDoUpdate({
      target: users.email,
      set: { name: "Vulcan auto-close" },
    })
    .returning({ id: users.id });

  if (!actor) {
    throw new Error("The auto-close system account could not be resolved.");
  }

  const result = await db.execute(sql`
    with closed as (
      update ${visits}
      set
        exit_at = ${now},
        exit_method = 'auto',
        flags = array(
          select distinct flag
          from unnest(array_append(${visits.flags}, 'no_tap_out'::text)) as flag
        ),
        closed_by = ${actor.id}
      where ${visits.exitAt} is null
      returning
        ${visits.id} as id,
        ${visits.userId} as user_id,
        ${visits.flags} as flags
    ),
    audited as (
      insert into ${auditLog} (actor_id, action, entity, entity_id, meta)
      select
        ${actor.id},
        'visit.auto_check_out',
        'visit',
        closed.id,
        jsonb_build_object(
          'by', 'cron',
          'direction', 'out',
          'method', 'auto',
          'targetUserId', closed.user_id,
          'flags', closed.flags
        )
      from closed
      returning entity_id
    )
    select count(*)::int as closed from audited
  `);

  const rows = (result as unknown as { rows?: Array<{ closed?: number }> }).rows;
  const closed = Number(rows?.[0]?.closed ?? 0);

  return { closed, checkedAt: now.toISOString() };
}
