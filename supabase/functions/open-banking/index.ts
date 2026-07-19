import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Mock bank data for simulation
const MOCK_BANKS: Record<string, { accounts: Array<{ type: string; balance: number; number: string; currency: string }> }> = {
  VCB: {
    accounts: [
      { type: "Thanh toán", balance: 1245000000, number: "***4521", currency: "VND" },
      { type: "Tiết kiệm", balance: 850000000, number: "***7892", currency: "VND" },
    ],
  },
  BIDV: {
    accounts: [
      { type: "Thanh toán", balance: 752500000, number: "***3344", currency: "VND" },
    ],
  },
  TCB: {
    accounts: [
      { type: "Thanh toán", balance: 520000000, number: "***1234", currency: "VND" },
    ],
  },
  VPB: {
    accounts: [
      { type: "Thanh toán", balance: 380000000, number: "***5678", currency: "VND" },
    ],
  },
  MBB: {
    accounts: [
      { type: "Thanh toán", balance: 290000000, number: "***9012", currency: "VND" },
    ],
  },
  ACB: {
    accounts: [
      { type: "Thanh toán", balance: 615000000, number: "***3456", currency: "VND" },
      { type: "Tiết kiệm", balance: 1200000000, number: "***7890", currency: "VND" },
    ],
  },
};

// Mock transactions generator
function generateMockTransactions(bankCode: string, count: number = 20) {
  const categories = ["Thu nhập", "Chi phí vận hành", "Thanh toán nhà cung cấp", "Lương", "Thuế", "Tiện ích"];
  const merchants = ["Công ty ABC", "NCC Vật tư XYZ", "Điện lực EVN", "BHXH", "VNPay", "FPT Telecom"];
  const transactions = [];
  
  for (let i = 0; i < count; i++) {
    const isCredit = Math.random() > 0.4;
    const amount = Math.floor(Math.random() * 500000000) + 1000000;
    const daysAgo = Math.floor(Math.random() * 90);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    
    transactions.push({
      id: crypto.randomUUID(),
      // Must match the transactions table's CHECK constraint (income|expense|loan)
      // so this data is usable by real feature engineering (credit-scoring function).
      type: isCredit ? "income" : "expense",
      amount: isCredit ? amount : -amount,
      category: categories[Math.floor(Math.random() * categories.length)],
      merchant_name: merchants[Math.floor(Math.random() * merchants.length)],
      transaction_date: date.toISOString().split("T")[0],
      reference_id: `TXN${bankCode}${Date.now()}${i}`,
      source_bank: bankCode,
    });
  }
  
  return transactions.sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const body = req.method === "POST" ? await req.json() : {};

    // Get user's company
    const { data: company } = await supabase
      .from("companies")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!company) {
      return new Response(JSON.stringify({ error: "No company found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let result: unknown;

    switch (action) {
      case "connect": {
        const { bank_code, bank_name } = body;
        if (!bank_code || !bank_name) {
          return new Response(JSON.stringify({ error: "bank_code and bank_name required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const mockData = MOCK_BANKS[bank_code];
        if (!mockData) {
          return new Response(JSON.stringify({ error: "Unsupported bank" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Upsert bank connection
        const { data: conn, error: connError } = await supabase
          .from("bank_connections")
          .upsert({
            company_id: company.id,
            bank_code,
            bank_name,
            status: "connected",
            consent_granted: true,
            consent_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            last_synced_at: new Date().toISOString(),
            accounts: mockData.accounts,
          }, { onConflict: "company_id,bank_code" })
          .select()
          .single();

        if (connError) {
          // If upsert fails due to no unique constraint, try insert then update
          const { data: existing } = await supabase
            .from("bank_connections")
            .select("id")
            .eq("company_id", company.id)
            .eq("bank_code", bank_code)
            .single();

          if (existing) {
            const { data: updated } = await supabase
              .from("bank_connections")
              .update({
                status: "connected",
                consent_granted: true,
                consent_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                last_synced_at: new Date().toISOString(),
                accounts: mockData.accounts,
              })
              .eq("id", existing.id)
              .select()
              .single();
            result = updated;
          } else {
            const { data: inserted } = await supabase
              .from("bank_connections")
              .insert({
                company_id: company.id,
                bank_code,
                bank_name,
                status: "connected",
                consent_granted: true,
                consent_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                last_synced_at: new Date().toISOString(),
                accounts: mockData.accounts,
              })
              .select()
              .single();
            result = inserted;
          }
        } else {
          result = conn;
        }

        // Also insert mock transactions
        const transactions = generateMockTransactions(bank_code, 15).map((t) => ({
          ...t,
          company_id: company.id,
        }));
        await supabase.from("transactions").insert(transactions);

        break;
      }

      case "sync": {
        const { bank_code } = body;
        const mockData = MOCK_BANKS[bank_code];
        if (!mockData) {
          return new Response(JSON.stringify({ error: "Unsupported bank" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Update last synced
        await supabase
          .from("bank_connections")
          .update({
            last_synced_at: new Date().toISOString(),
            accounts: mockData.accounts,
          })
          .eq("company_id", company.id)
          .eq("bank_code", bank_code);

        // Add a few new mock transactions
        const newTxns = generateMockTransactions(bank_code, 3).map((t) => ({
          ...t,
          company_id: company.id,
        }));
        await supabase.from("transactions").insert(newTxns);

        result = { synced: true, new_transactions: newTxns.length };
        break;
      }

      case "list": {
        const { data: connections } = await supabase
          .from("bank_connections")
          .select("*")
          .eq("company_id", company.id);

        result = connections || [];
        break;
      }

      case "disconnect": {
        const { bank_code } = body;
        await supabase
          .from("bank_connections")
          .update({ status: "disconnected", consent_granted: false, accounts: [] })
          .eq("company_id", company.id)
          .eq("bank_code", bank_code);

        result = { disconnected: true };
        break;
      }

      default:
        return new Response(JSON.stringify({ error: "Invalid action. Use: connect, sync, list, disconnect" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify({ data: result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Open Banking error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
