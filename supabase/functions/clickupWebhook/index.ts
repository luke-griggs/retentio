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
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const CU_API = "https://api.clickup.com/api/v2";

if (
  !CLICKUP_KEY ||
  !GOOGLE_API_KEY ||
  !SUPABASE_URL ||
  !SUPABASE_SERVICE_ROLE_KEY
) {
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

async function fetchBrandCartridge(supabase: any, store: string) {
  const { data, error } = await supabase
    .from("brand_cartridges")
    .select("content")
    .eq("store", store)
    .limit(1);
  if (error) throw error;
  return data[0]?.content as string;
}

// ────────────────────────────────────────────────────────────
// NEW: persist task into clickup_tasks table
// ────────────────────────────────────────────────────────────
async function upsertClickupTaskRecord(
  supabase: any,
  task: any,
  draft: string
) {
  let storeId: string | null = null;

  if (task.list?.id) {
    const { data: storeByList } = await supabase
      .from("stores")
      .select("id")
      .eq("clickup_list_id", task.list.id)
      .maybeSingle();
    storeId = storeByList?.id ?? null;
  } else {
    console.error("No store found for task", task);
  }
  try {
    await supabase.from("clickup_tasks").upsert(
      {
        id: task.id,
        store_id: storeId,
        name: task.name,
        description: draft,
        updated_at: task.date_updated
          ? new Date(Number(task.date_updated)).toISOString()
          : new Date().toISOString(),
      },
      { onConflict: "id" }
    );
  } catch (e) {
    console.error("Error upserting clickup_tasks", e);
  }
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
  handleAsync(taskId, payload).catch((e) =>
    console.error("Background processing error:", e)
  );
  return new Response("ok");
});

// ────────────────────────────────────────────────────────────
// Background worker
// ────────────────────────────────────────────────────────────
async function handleAsync(taskId: string, payload: any) {
  // Supabase client per invocation
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // 1) Task details
  const task = await getTask(taskId);

  // 2) Check if status changed to "READY FOR WRITING"
  const currentStatus = task.status?.status?.toLowerCase();

  // Only proceed if status is "ready for writing"
  if (currentStatus !== "ready for writing") {
    console.log(
      `Task ${taskId} status is "${currentStatus}", not "ready for writing". Skipping processing.`
    );
    return;
  }

  console.log(`Task ${taskId} status is "ready for writing". Processing...`);

  // 3) Store name from folder
  const store = task.folder?.name ?? "unknown";

  // 4) Store-specific instructions
  const cartridge = await fetchBrandCartridge(supabase, store);

  // 5) Extract links from custom fields
  const linksField = task.custom_fields?.find(
    (field: any) => field.name === "Links"
  );

  // 6) Extract content strategy from custom fields
  const contentStrategyField = task.custom_fields?.find(
    (field: any) => field.name === "Content Strategy"
  );
  const links = linksField?.value || "";
  const contentStrategy = contentStrategyField?.value || "";

  // 7) Draft via Google
  const prompt = await emailPrompt(cartridge ?? "", links, contentStrategy);
  const draft = await googleDraft(prompt);
  console.log(draft);

  // 8) Update task description with markdown content
  await updateTaskDescription(taskId, draft);

  console.log("upserting task with description", draft);
  // 9) Persist task record in DB (create/update)
  await upsertClickupTaskRecord(supabase, task, draft);

  // (optional) telemetry / logging
  console.log(
    `Draft generated and saved for task ${taskId} with "ready for writing" status`
  );
}
