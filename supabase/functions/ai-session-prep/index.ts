import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a golf performance coach preparing for today's session. Based on the client data provided, create a concise prep summary.

Summarize:
- Last session date and focus
- Recent exercises and progressions
- Current clubhead speed trend (include numbers if available)
- Mobility limitations or injuries noted
- Suggested focus for today's session

Keep summary under 150 words, use bullet points. Be specific and actionable.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { client_id, days_back = 30 } = await req.json();

    if (!client_id) {
      return new Response(
        JSON.stringify({ error: "client_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role for data access
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Calculate date ranges
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - days_back);
    const ninetyDaysAgo = new Date(today);
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    console.log(`Fetching data for client ${client_id} from last ${days_back} days`);

    // Fetch workout logs with exercise details
    const { data: workoutLogs, error: logsError } = await supabase
      .from("workout_logs")
      .select(`
        id,
        workout_date,
        duration_minutes,
        overall_rpe,
        session_type,
        coach_notes,
        key_findings,
        notes
      `)
      .eq("client_id", client_id)
      .gte("workout_date", thirtyDaysAgo.toISOString().split('T')[0])
      .order("workout_date", { ascending: false })
      .limit(10);

    if (logsError) {
      console.error("Error fetching workout logs:", logsError);
    }

    // Fetch performance metrics (last 90 days for trends)
    const { data: metrics, error: metricsError } = await supabase
      .from("performance_metrics")
      .select("metric_type, value, unit, recorded_date, notes")
      .eq("client_id", client_id)
      .gte("recorded_date", ninetyDaysAgo.toISOString().split('T')[0])
      .order("recorded_date", { ascending: false });

    if (metricsError) {
      console.error("Error fetching metrics:", metricsError);
    }

    // Fetch client profile for context
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, goals, injury_history, fitness_level, handicap")
      .eq("id", client_id)
      .single();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
    }

    // Build context for AI
    const sessionSummaries = workoutLogs?.map(log => ({
      date: log.workout_date,
      type: log.session_type || 'in-person',
      duration: log.duration_minutes,
      rpe: log.overall_rpe,
      notes: log.coach_notes || log.notes || log.key_findings,
    })) || [];

    const clubheadSpeedData = metrics?.filter(m => m.metric_type === 'clubhead_speed') || [];
    const mobilityData = metrics?.filter(m => 
      m.metric_type.includes('mobility') || 
      m.metric_type.includes('flexibility') ||
      m.metric_type.includes('range')
    ) || [];

    const dataContext = `
CLIENT PROFILE:
- Name: ${profile?.full_name || 'Unknown'}
- Goals: ${profile?.goals || 'Not specified'}
- Injury History: ${profile?.injury_history || 'None noted'}
- Fitness Level: ${profile?.fitness_level || 'Not specified'}
- Handicap: ${profile?.handicap || 'Not specified'}

RECENT SESSIONS (Last ${days_back} days):
${sessionSummaries.length > 0 ? sessionSummaries.map(s => 
  `- ${s.date}: ${s.type} session${s.duration ? `, ${s.duration} min` : ''}${s.rpe ? `, RPE ${s.rpe}` : ''}${s.notes ? ` | Notes: ${s.notes.slice(0, 200)}` : ''}`
).join('\n') : 'No recent sessions'}

CLUBHEAD SPEED HISTORY (Last 90 days):
${clubheadSpeedData.length > 0 ? clubheadSpeedData.map(m => 
  `- ${m.recorded_date}: ${m.value} ${m.unit || 'mph'}`
).join('\n') : 'No clubhead speed data recorded'}

MOBILITY/FLEXIBILITY METRICS:
${mobilityData.length > 0 ? mobilityData.map(m => 
  `- ${m.recorded_date}: ${m.metric_type}: ${m.value}${m.unit ? ` ${m.unit}` : ''}${m.notes ? ` (${m.notes})` : ''}`
).join('\n') : 'No mobility data recorded'}
`;

    console.log("Sending request to Lovable AI gateway");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Prepare a session prep summary for today's training session:\n\n${dataContext}` },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service quota exceeded. Please contact support." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Failed to get AI response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await response.json();
    const summary = aiResponse.choices?.[0]?.message?.content || "Unable to generate summary.";

    console.log("Successfully generated session prep summary");

    return new Response(
      JSON.stringify({ 
        summary,
        data: {
          sessionsCount: sessionSummaries.length,
          latestClubheadSpeed: clubheadSpeedData[0]?.value || null,
          clientName: profile?.full_name,
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("AI session prep error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
