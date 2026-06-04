import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are CloudGuard Autopilot's AI Security Copilot — an expert cybersecurity advisor for SMEs using cloud infrastructure.

Your role:
- Answer security questions in plain, non-technical language
- Explain risks in terms of business impact (data loss, downtime, financial cost)
- Prioritize recommendations by severity and ease of fix
- Reference the user's actual cloud environment when context is provided
- Convert technical findings into actionable advice

Formatting rules:
- Use short paragraphs and bullet points
- Lead with the most important information
- Include estimated financial impact when relevant (use ₹ currency)
- Always end with a clear next step

You have expertise in AWS, Azure, GCP security, compliance (DPDPA, IT Act, RBI guidelines), and cloud architecture.
If you don't have specific data about the user's environment, give general best-practice advice and note that connecting their cloud accounts will enable personalized recommendations.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, context } = await req.json();
    
    // Check for standard API keys
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    let apiUrl = "";
    let authHeader = "";
    let modelName = "";

    if (GEMINI_API_KEY) {
      // Use official Google Gemini API via OpenAI-compatible endpoint
      apiUrl = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
      authHeader = `Bearer ${GEMINI_API_KEY}`;
      modelName = "gemini-1.5-flash";
    } else if (OPENAI_API_KEY) {
      // Use official OpenAI API
      apiUrl = "https://api.openai.com/v1/chat/completions";
      authHeader = `Bearer ${OPENAI_API_KEY}`;
      modelName = "gpt-4o-mini";
    } else if (LOVABLE_API_KEY) {
      // Fallback fallback to Lovable AI Gateway
      apiUrl = "https://ai.gateway.lovable.dev/v1/chat/completions";
      authHeader = `Bearer ${LOVABLE_API_KEY}`;
      modelName = "google/gemini-3-flash-preview";
    } else {
      throw new Error("No LLM API key configured. Please set GEMINI_API_KEY, OPENAI_API_KEY, or LOVABLE_API_KEY in your Supabase environment secrets.");
    }

    // Build context-aware system message
    let systemContent = SYSTEM_PROMPT;
    if (context) {
      systemContent += `\n\nCurrent environment context:\n${JSON.stringify(context, null, 2)}`;
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: "system", content: systemContent },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted or payment required." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI service error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service temporarily unavailable" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("security-copilot error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
