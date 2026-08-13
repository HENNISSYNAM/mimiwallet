import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Resolve the company a signed-in user is acting for.
 *
 * Every edge function needs this and each one grew its own copy, which is how
 * the same bug shipped three times: `.single()`.
 *
 * A user can own more than one row in `companies` — the demo account owns four,
 * and the AFTER INSERT trigger on `profiles` creates one for every new sign-up
 * whether or not the onboarding cards ran. When there is more than one match,
 * PostgREST answers `.single()` with an error rather than a row, so the caller
 * sees no company and reports "No company found". The message is wrong in the
 * most misleading way available: it says the user has no company when in fact
 * they have several.
 *
 * Oldest row wins, so the answer does not change between two requests made a
 * second apart.
 *
 * `columns` is passed through to `.select()` so a caller that needs more than
 * the id does not have to query twice.
 */
export async function resolveCompany<T extends { id: string }>(
  supabase: SupabaseClient,
  userId: string,
  columns = "id",
): Promise<T | null> {
  const { data, error } = await supabase
    .from("companies")
    .select(columns)
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(`resolveCompany failed for user ${userId}:`, error.message);
    return null;
  }
  return (data as T | null) ?? null;
}
