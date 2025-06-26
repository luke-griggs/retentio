// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// @ts-ignore – Supabase client for edge functions
import { createClient } from "jsr:@supabase/supabase-js@2";

// Make sure Deno env types are available
// deno-lint-ignore no-explicit-any
declare const Deno: {
  env: { get: (key: string) => string | undefined };
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
};

// ────────────────────────────────────────────────────────────
// Env vars
// ────────────────────────────────────────────────────────────
const CLICKUP_KEY = Deno.env.get("CLICKUP_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const CU_API = "https://api.clickup.com/api/v2";

if (!CLICKUP_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing one or more required environment variables");
}

// ────────────────────────────────────────────────────────────
// Helper functions
// ────────────────────────────────────────────────────────────
async function getTask(taskId: string) {
  const res = await fetch(
    `${CU_API}/task/${taskId}/?include_markdown_description=true`,
    {
      headers: { Authorization: CLICKUP_KEY ?? "" },
    }
  );
  if (!res.ok) throw new Error(`ClickUp getTask → ${res.status}`);
  return res.json();
}

async function upsertClickupTaskRecord(
  supabase: any,
  task: any,
  brand: string
) {
  // Resolve brand id by list → name fallback
  let brandId: string | null = null;

  if (task.list?.id) {
    const { data } = await supabase
      .from("stores")
      .select("id")
      .eq("clickup_list_id", task.list.id)
      .maybeSingle();
    brandId = data?.id ?? null;
  }

  console.log(
    `Upserting ClickUp task record for taskId: ${task.id}, brandId: ${brandId}`
  );

  await supabase.from("clickup_tasks").upsert(
    {
      id: task.id,
      store_id: brandId,
      name: task.name,
      description: task.markdown_description ?? "",
      updated_at: task.date_updated
        ? new Date(Number(task.date_updated)).toISOString()
        : new Date().toISOString(),
    },
    { onConflict: "id" }
  );
}

// ────────────────────────────────────────────────────────────
// Edge handler – receives ClickUp webhook for updates/deletes
// ────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    console.log("Received non-POST request");
    return new Response("Method Not Allowed", { status: 405 });
  }

  const payload = await req.json();

  const event = payload?.event;
  const taskId = payload?.task_id;

  console.log("Received ClickUp webhook", { event, taskId });

  if (!event || !taskId) {
    console.error("Missing event or task_id", { event, taskId });
    return new Response("Missing event or task_id", { status: 400 });
  }

  // Fire-and-forget background processing for fast 200 to ClickUp
  handleAsync(event as string, taskId as string).catch((e) =>
    console.error("clickupSync error:", e)
  );

  return new Response("ok");
});

// ────────────────────────────────────────────────────────────
// Background worker
// ────────────────────────────────────────────────────────────
async function handleAsync(event: string, taskId: string) {
  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

  try {
    if (event === "taskUpdated") {
      console.log(`Processing taskUpdated for taskId: ${taskId}`);
      const task = await getTask(taskId);
      const store = task.folder?.name ?? "unknown";
      await upsertClickupTaskRecord(supabase, task, store);
      console.log(`Upserted task ${taskId}`);
    } else if (event === "taskDeleted") {
      console.log(`Processing taskDeleted for taskId: ${taskId}`);
      await supabase.from("clickup_tasks").delete().eq("id", taskId);
      console.log(`Deleted task ${taskId}`);
    } else {
      console.warn(`Unhandled ClickUp event: ${event}`);
    }
  } catch (error) {
    console.error(`Error handling event ${event} for taskId ${taskId}:`, error);
  }
}
