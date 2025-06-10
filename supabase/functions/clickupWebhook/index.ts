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
//   4) write to "Draft Email" custom field (ClickUp API)

// @ts-ignore
import { createClient } from "jsr:@supabase/supabase-js@2";
import { emailPrompt } from "./emailPrompt.ts";

// ────────────────────────────────────────────────────────────
// Env vars – fill these in the Supabase dashboard
// ────────────────────────────────────────────────────────────
const CLICKUP_KEY = Deno.env.get("CLICKUP_KEY"); // personal/service token
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

const DRAFT_FIELD_NAME = "First Draft";
const CU_API = "https://api.clickup.com/api/v2";

if (!CLICKUP_KEY || !ANTHROPIC_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
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

async function getCustomFieldId(listId: string) {
  // (b) otherwise list metadata
  const res = await fetch(`${CU_API}/list/${listId}/field`, {
    headers: { Authorization: CLICKUP_KEY ?? "" },
  });
  if (!res.ok) throw new Error(`ClickUp list fields → ${res.status}`);
  const data = await res.json();

  // Handle different possible response structures
  const fields = data.fields || data || [];
  if (!Array.isArray(fields)) {
    console.error("ClickUp API response is not an array:", data);
    throw new Error(`Custom field API returned unexpected format`);
  }

  const found = fields.find((f: any) => f.name === DRAFT_FIELD_NAME);
  if (!found) throw new Error(`Custom field "${DRAFT_FIELD_NAME}" not found`);
  return found.id;
}

async function setDraft(taskId: string, fieldId: string, draft: string) {
  const res = await fetch(`${CU_API}/task/${taskId}/field/${fieldId}`, {
    method: "POST",
    headers: {
      Authorization: CLICKUP_KEY ?? "",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ value: draft }),
  });
  if (!res.ok) throw new Error(`ClickUp setField → ${res.status}`);
}

async function anthropicDraft(prompt: string) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY ?? "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Anthropic API error: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();
  return data.content[0]?.type === "text" ? data.content[0].text : "";
}

async function fetchBrandCartridge(supabase: any, brand: string) {
  const { data, error } = await supabase
    .from("brand_cartridges")
    .select("cartridges")
    .ilike("name", brand)
    .single();
  if (error) throw error;
  return data.cartridges as string;
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
  // // Supabase client per invocation
  // const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // // 1) Task details
  // const task = await getTask(taskId);

  // // 2) Brand name from folder
  // const brand = task.folder?.name ?? "unknown";

  // // 3) Brand-specific instructions
  // // const instructions = await fetchBrandCartrige(supabase, brand);

  // // 4) Draft via Anthropic
  // const prompt = await emailPrompt(task.description); // clickup description contains instructions for the email
  // const draft = await anthropicDraft(prompt);
  // console.log(draft);

  // // 5) Field ID, then write
  // const fieldId = await getCustomFieldId(task.list.id);
  // await setDraft(taskId, fieldId, draft);

  // // (optional) telemetry / logging
  console.log(`Draft saved for task ${taskId}`);
}
