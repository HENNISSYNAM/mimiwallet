import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Verify JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error('Unauthorized');

    const body = await req.json();
    const { action } = body;

    // Verify company ownership
    const verifyCompany = async (companyId: string) => {
      const { data } = await supabase
        .from('companies')
        .select('id')
        .eq('id', companyId)
        .eq('user_id', user.id)
        .single();
      if (!data) throw new Error('Company not found or unauthorized');
      return data;
    };

    switch (action) {
      case 'register_device': {
        const { company_id, device_name, device_type, initial_balance, loan_id } = body;
        await verifyCompany(company_id);

        // Generate DID
        const did = `did:kapiva:${crypto.randomUUID().slice(0, 12)}`;

        const { data: device, error } = await supabase
          .from('device_wallets')
          .insert({
            company_id,
            device_did: did,
            device_name,
            device_type: device_type || 'other',
            balance: initial_balance || 0,
            initial_balance: initial_balance || 0,
            loan_id: loan_id || null,
          })
          .select()
          .single();

        if (error) throw error;

        // Record top-up transaction if initial balance > 0
        if (initial_balance > 0) {
          await supabase.from('m2m_transactions').insert({
            device_id: device.id,
            tx_type: 'top_up',
            amount: initial_balance,
            status: 'completed',
            recipient_name: 'Initial deposit',
            metadata: { source: 'registration' },
          });
        }

        return new Response(JSON.stringify({ device }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'topup': {
        const { device_id, amount } = body;

        // Verify device ownership
        const { data: device } = await supabase
          .from('device_wallets')
          .select('id, company_id, balance')
          .eq('id', device_id)
          .single();

        if (!device) throw new Error('Device not found');
        await verifyCompany(device.company_id);

        // Update balance
        const { error: updateErr } = await supabase
          .from('device_wallets')
          .update({ balance: (device.balance || 0) + amount })
          .eq('id', device_id);

        if (updateErr) throw updateErr;

        // Record transaction
        await supabase.from('m2m_transactions').insert({
          device_id,
          tx_type: 'top_up',
          amount,
          status: 'completed',
          recipient_name: 'Top-up',
          metadata: { source: 'manual' },
        });

        return new Response(JSON.stringify({ success: true, new_balance: (device.balance || 0) + amount }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'execute_payment': {
        const { device_did, event_data, override_amount } = body;

        // Find device
        const { data: device } = await supabase
          .from('device_wallets')
          .select('*')
          .eq('device_did', device_did)
          .eq('status', 'active')
          .single();

        if (!device) throw new Error('Device not found or inactive');

        // Get active rules
        const { data: rules } = await supabase
          .from('device_rules')
          .select('*')
          .eq('device_id', device.id)
          .eq('is_active', true);

        const executedTxs: any[] = [];
        const startTime = Date.now();

        for (const rule of (rules || [])) {
          const conditions = Array.isArray(rule.trigger_condition) ? rule.trigger_condition : [];
          let conditionsMet = rule.trigger_logic === 'AND';

          for (const cond of conditions) {
            const eventValue = event_data?.[cond.field];
            if (eventValue === undefined) continue;

            let met = false;
            switch (cond.operator) {
              case '<': met = eventValue < cond.value; break;
              case '>': met = eventValue > cond.value; break;
              case '==': met = eventValue == cond.value; break;
            }

            if (rule.trigger_logic === 'AND') {
              conditionsMet = conditionsMet && met;
            } else {
              conditionsMet = conditionsMet || met;
            }
          }

          if (!conditionsMet) continue;

          // Determine amount
          const amount = override_amount || rule.action_params?.amount || rule.limit_per_tx || 0;

          // Check limits
          if (rule.limit_per_tx && amount > rule.limit_per_tx) continue;
          if (amount > (device.balance || 0)) continue;

          if (rule.action_type === 'AUTO_PAY' || rule.action_type === 'TRANSFER') {
            // Deduct balance
            await supabase
              .from('device_wallets')
              .update({ balance: (device.balance || 0) - amount })
              .eq('id', device.id);

            // Record transaction
            const { data: tx } = await supabase
              .from('m2m_transactions')
              .insert({
                device_id: device.id,
                rule_id: rule.id,
                tx_type: 'auto_pay',
                amount,
                status: 'completed',
                recipient_name: rule.action_params?.recipient_name || 'Unknown',
                settlement_ms: Date.now() - startTime,
                metadata: { event_data, rule_name: rule.rule_name },
              })
              .select()
              .single();

            // Increment execution count
            await supabase
              .from('device_rules')
              .update({ execution_count: (rule.execution_count || 0) + 1 })
              .eq('id', rule.id);

            executedTxs.push(tx);
          } else if (rule.action_type === 'ALERT') {
            // Just record alert
            await supabase.from('m2m_transactions').insert({
              device_id: device.id,
              rule_id: rule.id,
              tx_type: 'fee',
              amount: 0,
              status: 'completed',
              recipient_name: `ALERT: ${rule.rule_name}`,
              metadata: { event_data, alert: true },
            });
          }
        }

        return new Response(JSON.stringify({ executed: executedTxs.length, transactions: executedTxs }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
