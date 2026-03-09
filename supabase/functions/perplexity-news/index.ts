const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { industry } = await req.json();
    const apiKey = Deno.env.get('PERPLEXITY_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Perplexity not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: 'Bạn là chuyên gia phân tích tin tức kinh tế Việt Nam. Trả lời bằng JSON array với mỗi item gồm: title, summary (2 câu), impact (positive/negative/neutral), source. Tối đa 5 tin.',
          },
          {
            role: 'user',
            content: `Tin tức mới nhất ảnh hưởng đến dòng tiền doanh nghiệp ngành ${industry || 'SME'} tại Việt Nam hôm nay. Focus vào: lãi suất, tín dụng, chính sách SBV, tỷ giá.`,
          },
        ],
        search_recency_filter: 'week',
      }),
    });

    const data = await response.json();
    
    return new Response(JSON.stringify({
      content: data.choices?.[0]?.message?.content || '',
      citations: data.citations || [],
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Perplexity error:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch news' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
