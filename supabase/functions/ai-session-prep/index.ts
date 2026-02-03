import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a golf performance coach preparing for today's training session. Based on the client data provided, suggest ONE specific focus area for today's session in 1-2 sentences.

Consider:
- Recent pain/discomfort flags (prioritize addressing these)
- Clubhead speed trends (if declining, suggest power work; if improving, build on momentum)
- Homework completion (if low, discuss adherence; if high, progress exercises)
- Last session notes (avoid repetition, build on progress)

Be specific and actionable. Example: "Focus on hip mobility to address the reported hip discomfort, then progress to rotational power if pain-free."`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { client_id, coach_id, summary_date } = await req.json();

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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const targetDate = summary_date ? new Date(summary_date) : new Date();
    const sevenDaysAgo = new Date(targetDate);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    console.log(`Generating session prep for client ${client_id}`);

    // 1. Last Session Focus - get most recent workout log with coach_notes
    const { data: lastSession, error: sessionError } = await supabase
      .from("workout_logs")
      .select("workout_date, coach_notes, session_type, key_findings")
      .eq("client_id", client_id)
      .order("workout_date", { ascending: false })
      .limit(1)
      .single();

    if (sessionError && sessionError.code !== "PGRST116") {
      console.error("Error fetching last session:", sessionError);
    }

    let lastSessionFocus = "No recent session";
    if (lastSession) {
      const notes = lastSession.coach_notes || lastSession.key_findings || "";
      lastSessionFocus = notes.length > 100 ? notes.slice(0, 100) + "..." : notes || "Session logged without notes";
      if (lastSession.workout_date) {
        lastSessionFocus = `(${lastSession.workout_date}) ${lastSessionFocus}`;
      }
    }

    // 2. Pain Flags - unreviewed flags from last 7 days with exercise names
    const { data: flags, error: flagsError } = await supabase
      .from("exercise_flags")
      .select(`
        id,
        flag_type,
        description,
        exercise_id,
        exercises(name)
      `)
      .eq("client_id", client_id)
      .is("reviewed_by", null)
      .gte("flagged_date", sevenDaysAgo.toISOString().split('T')[0]);

    if (flagsError) {
      console.error("Error fetching flags:", flagsError);
    }

    let painFlags = "None";
    const flagCount = flags?.length || 0;
    if (flagCount > 0) {
      const exerciseNames = flags
        ?.map(f => (f.exercises as any)?.name || "Unknown exercise")
        .filter((name, index, self) => self.indexOf(name) === index)
        .slice(0, 3);
      painFlags = `${flagCount} flag${flagCount > 1 ? 's' : ''}: ${exerciseNames?.join(", ")}`;
    }

    // 3. Clubhead Speed Trend - last 2 readings
    const { data: speedReadings, error: speedError } = await supabase
      .from("performance_metrics")
      .select("value, recorded_date")
      .eq("client_id", client_id)
      .eq("metric_type", "clubhead_speed")
      .order("recorded_date", { ascending: false })
      .limit(2);

    if (speedError) {
      console.error("Error fetching speed metrics:", speedError);
    }

    let clubheadSpeedTrend = "Not recorded";
    let latestSpeed: number | null = null;
    if (speedReadings && speedReadings.length > 0) {
      latestSpeed = speedReadings[0].value;
      if (speedReadings.length >= 2) {
        const delta = speedReadings[0].value - speedReadings[1].value;
        const arrow = delta >= 0 ? "↑" : "↓";
        const absDelta = Math.abs(delta).toFixed(1);
        clubheadSpeedTrend = `${latestSpeed} mph (${arrow}${absDelta} from ${speedReadings[1].recorded_date})`;
      } else {
        clubheadSpeedTrend = `${latestSpeed} mph (baseline)`;
      }
    }

    // 4. Homework Completion - last 7 days
    const { data: homeworkLogs, error: homeworkError } = await supabase
      .from("workout_logs")
      .select("id, completed_at")
      .eq("client_id", client_id)
      .eq("session_type", "homework")
      .gte("workout_date", sevenDaysAgo.toISOString().split('T')[0])
      .lte("workout_date", targetDate.toISOString().split('T')[0]);

    if (homeworkError) {
      console.error("Error fetching homework logs:", homeworkError);
    }

    // Check if client has an active program with homework
    const { data: activeProgram, error: programError } = await supabase
      .from("client_programs")
      .select("id, program_id")
      .eq("client_id", client_id)
      .eq("is_active", true)
      .limit(1)
      .single();

    if (programError && programError.code !== "PGRST116") {
      console.error("Error fetching active program:", programError);
    }

    let homeworkCompletion = "No homework assigned";
    if (activeProgram || (homeworkLogs && homeworkLogs.length > 0)) {
      const completed = homeworkLogs?.filter(log => log.completed_at !== null).length || 0;
      const expected = 7; // Default weekly expectation
      const percentage = Math.round((completed / expected) * 100);
      homeworkCompletion = `${completed}/${expected} days (${percentage}%)`;
    }

    // 5. Client Profile for context
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, goals, injury_history, handicap")
      .eq("id", client_id)
      .single();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
    }

    // Build structured data for AI
    const clientDataContext = `
CLIENT: ${profile?.full_name || "Unknown"}
GOALS: ${profile?.goals || "Not specified"}
INJURY HISTORY: ${profile?.injury_history || "None noted"}
HANDICAP: ${profile?.handicap || "Not specified"}

LAST SESSION: ${lastSessionFocus}
PAIN FLAGS (last 7 days): ${painFlags}
CLUBHEAD SPEED: ${clubheadSpeedTrend}
HOMEWORK COMPLETION (last 7 days): ${homeworkCompletion}
`;

    console.log("Sending request to Lovable AI gateway for suggested focus");

    // Generate AI suggested focus
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
          { role: "user", content: `Generate a suggested focus for today's session:\n\n${clientDataContext}` },
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

      // Return structured data without AI suggestion on error
      return new Response(
        JSON.stringify({
          lastSessionFocus,
          painFlags,
          clubheadSpeedTrend,
          homeworkCompletion,
          suggestedFocus: "Unable to generate AI suggestion",
          latestClubheadSpeed: latestSpeed,
          flagCount,
          clientName: profile?.full_name,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await response.json();
    const suggestedFocus = aiResponse.choices?.[0]?.message?.content || "Unable to generate suggestion.";

    console.log("Successfully generated session prep summary");

    return new Response(
      JSON.stringify({
        lastSessionFocus,
        painFlags,
        clubheadSpeedTrend,
        homeworkCompletion,
        suggestedFocus,
        latestClubheadSpeed: latestSpeed,
        flagCount,
        clientName: profile?.full_name,
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
