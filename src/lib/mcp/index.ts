import { auth, defineMcp } from "@lovable.dev/mcp-js";
import { listCompanies, listInvoices, listTransactions } from "./tools/doc-bang";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "kapiva-capital-flow",
  title: "KAPIVA Capital Flow",
  version: "0.1.0",
  instructions:
    "Read-only access to the signed-in user's MIMI Wallet data: companies, invoices and bank transactions.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listCompanies, listInvoices, listTransactions],
});
