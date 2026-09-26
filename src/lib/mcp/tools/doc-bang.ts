import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

const fail = (text: string) => ({ content: [{ type: "text" as const, text }], isError: true });

async function docBang(ctx: ToolContext, table: string, limit: number, order?: string) {
  if (!ctx.isAuthenticated()) return fail("Not authenticated");
  let q = supabaseForUser(ctx).from(table).select("*").limit(limit);
  if (order) q = q.order(order, { ascending: false });
  const { data, error } = await q;
  if (error) return fail(error.message);
  return { content: [{ type: "text" as const, text: JSON.stringify(data ?? []) }] };
}

const limit = { limit: z.number().int().min(1).max(100).default(20).describe("Max rows to return.") };
const ro = { readOnlyHint: true, idempotentHint: true, openWorldHint: false };

export const listCompanies = defineTool({
  name: "list_companies",
  title: "List companies",
  description: "List the businesses owned by the signed-in user.",
  inputSchema: limit,
  annotations: ro,
  handler: ({ limit }, ctx) => docBang(ctx, "companies", limit),
});

export const listInvoices = defineTool({
  name: "list_invoices",
  title: "List invoices",
  description: "List the signed-in user's most recent invoices.",
  inputSchema: limit,
  annotations: ro,
  handler: ({ limit }, ctx) => docBang(ctx, "invoices", limit, "created_at"),
});

export const listTransactions = defineTool({
  name: "list_transactions",
  title: "List transactions",
  description: "List the signed-in user's most recent bank transactions.",
  inputSchema: limit,
  annotations: ro,
  handler: ({ limit }, ctx) => docBang(ctx, "transactions", limit, "created_at"),
});
