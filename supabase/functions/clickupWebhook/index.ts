import "jsr:@supabase/functions-js/edge-runtime.d.ts";

declare const Deno: {
  env: {
    get: (key: string) => string | undefined;
  };
};

// ClickUp webhook → fast 200 → background:
//   1) fetch task   (ClickUp API)
//   2) fetch brand instructions (Supabase DB)
//   3) generate draft (Anthropic)
//   4) update task description with draft (ClickUp API)

// @ts-ignore
import { createClient } from "jsr:@supabase/supabase-js@2";
import { emailPrompt } from "./emailPrompt.ts";

// ────────────────────────────────────────────────────────────
// Env vars – fill these in the Supabase dashboard
// ────────────────────────────────────────────────────────────
const CLICKUP_KEY = Deno.env.get("CLICKUP_KEY"); // personal/service token
const GOOGLE_API_KEY = Deno.env.get("GOOGLE_GENERATIVE_AI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

const CU_API = "https://api.clickup.com/api/v2";

if (!CLICKUP_KEY || !GOOGLE_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Missing one or more required environment variables");
}

// ────────────────────────────────────────────────────────────
// Helper functions
// ────────────────────────────────────────────────────────────
async function getTask(taskId: string) {
  const res = await fetch(`${CU_API}/task/${taskId}`, {
    headers: { Authorization: CLICKUP_KEY ?? "" },
  });
  if (!res.ok) throw new Error(`ClickUp getTask → ${res.status}`);
  return res.json();
}

async function updateTaskDescription(taskId: string, markdownContent: string) {
  const res = await fetch(`${CU_API}/task/${taskId}`, {
    method: "PUT",
    headers: {
      Authorization: CLICKUP_KEY ?? "",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      markdown_content: markdownContent,
    }),
  });
  if (!res.ok) throw new Error(`ClickUp updateTask → ${res.status}`);
  return res.json();
}

async function googleDraft(prompt: string) {
  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=" +
      GOOGLE_API_KEY,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    }
  );

  if (!response.ok) {
    throw new Error(
      `GEMINI API error: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  return text;
}

async function fetchBrandCartridge(supabase: any, brand: string) {
  const { data, error } = await supabase
    .from("brand_cartridges")
    .select("content")
    .eq("store", brand)
    .limit(1);
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error(`No brand cartridge found for brand: ${brand}`);
  }
  return data[0].content as string;
}

// ────────────────────────────────────────────────────────────
// Edge handler
// ────────────────────────────────────────────────────────────
// @ts-ignore
Deno.serve(async (req) => {
  if (req.method !== "POST")
    return new Response("Method Not Allowed", { status: 405 });

  // 1. Parse ClickUp webhook
  const payload = await req.json();
  const taskId = payload?.task_id;
  if (!taskId) return new Response("task_id missing", { status: 400 });

  // 2. Immediate 200 back to ClickUp, then process in background
  handleAsync(taskId).catch((e) =>
    console.error("Background processing error:", e)
  );
  return new Response("ok");
});

// ────────────────────────────────────────────────────────────
// Background worker
// ────────────────────────────────────────────────────────────
async function handleAsync(taskId: string) {
  // Supabase client per invocation
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // 1) Task details
  const task = await getTask(taskId);

  // 2) Brand name from folder
  const brand = task.folder?.name ?? "unknown";

  // 3) Brand-specific instructions
  const cartridge = await fetchBrandCartridge(supabase, brand);

  // 4) Extract links from custom fields
  const linksField = task.custom_fields?.find(
    (field: any) => field.name === "links"
  );
  const links = linksField?.value || "";

  // 5) Draft via Google
  const prompt = await emailPrompt(task.description, cartridge, links); // pass links to prompt
  const draft = await googleDraft(prompt);
  console.log(draft);

  // 6) Update task description with markdown content
  await updateTaskDescription(taskId, draft);

  // (optional) telemetry / logging
  console.log(`Draft saved to task description for task ${taskId}`);
}
