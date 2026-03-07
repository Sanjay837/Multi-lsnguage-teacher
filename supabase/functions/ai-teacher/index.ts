import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text, mode, targetLanguage, history, languageName } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Text is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (text.length > 2000) {
      return new Response(JSON.stringify({ error: "Text too long (max 2000 characters)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lang = languageName || "the selected language";

    const systemPrompts: Record<string, string> = {
      correct: `You are Polyverse AI Teacher, an expert grammar correction assistant for ${lang}.

When the user writes a sentence:
1. Check for grammar, spelling, and usage errors
2. Provide the corrected version in the target language script
3. Explain each correction in English (and optionally in the target language)
4. Mention the grammar rule being applied
5. Suggest better vocabulary alternatives if applicable

Format your response as:
**Original:** (user's text)
**Corrected:** (corrected version)
**Corrections:**
- [Each correction with explanation]
**Grammar Rule:** (rule explanation)
**Vocabulary Tip:** (better word suggestions if any)

Be encouraging and supportive. Keep explanations simple and clear.`,

      practice: `You are Polyverse AI Teacher generating practice exercises for ${lang}.

Based on the user's current level and mistakes, generate:
1. 3 fill-in-the-blank sentences
2. 2 translation exercises (English → target language)
3. 1 sentence construction exercise

Include answers at the bottom. Use target language script with romanized pronunciation.
Adapt difficulty based on what the user has been practicing.
Keep it mobile-friendly with clear formatting.`,

      explain: `You are Polyverse AI Teacher explaining grammar concepts in ${lang}.

When the user asks about a grammar concept:
1. Explain it simply in English
2. Provide examples in the target language script with romanized pronunciation
3. Give 3-4 examples with translations
4. Show common mistakes to avoid
5. Provide a memory tip or mnemonic

Keep explanations concise and beginner-friendly.`,
    };

    const selectedPrompt = systemPrompts[mode] || systemPrompts.correct;

    const messages = [
      { role: "system", content: selectedPrompt },
      ...(history || []),
      { role: "user", content: text },
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Usage limit reached. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("teacher error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
