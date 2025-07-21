// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// @ts-ignore – Supabase client for edge functions
import { createClient } from "jsr:@supabase/supabase-js@2";
import { emailPrompt } from "./emailPrompt.ts";

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
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const GOOGLE_GENERATIVE_AI_API_KEY = Deno.env.get(
  "GOOGLE_GENERATIVE_AI_API_KEY"
);
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const CU_API = "https://api.clickup.com/api/v2";

if (
  !CLICKUP_KEY ||
  !OPENAI_API_KEY ||
  !GOOGLE_GENERATIVE_AI_API_KEY ||
  !SUPABASE_URL ||
  !SUPABASE_SERVICE_ROLE_KEY
) {
  throw new Error("Missing one or more required environment variables");
}

// ────────────────────────────────────────────────────────────
// Helper functions
// ────────────────────────────────────────────────────────────
async function getTask(taskId: string) {
  try {
    const res = await fetch(
      `${CU_API}/task/${taskId}/?include_markdown_description=true`,
      {
        headers: { Authorization: CLICKUP_KEY ?? "" },
      }
    );
    if (!res.ok) throw new Error(`ClickUp getTask → ${res.statusText}`);
    return res.json();
  } catch (error) {
    console.error(`Error fetching task ${taskId}:`, error);
    throw new Error(`ClickUp getTask → ${error}`);
  }
}

async function upsertClickupTaskRecord(supabase: any, task: any) {
  let storeId: string | null = null;

  if (task.list?.id) {
    const { data } = await supabase
      .from("stores")
      .select("id")
      .eq("clickup_list_id", task.list.id)
      .maybeSingle();
    storeId = data?.id ?? null;
  }

  await supabase.from("clickup_tasks").upsert(
    {
      id: task.id,
      store_id: storeId,
      store_list_id: task.list.id,
      name: task.name,
      description: task.markdown_description ?? "",
      content_strategy:
        task.custom_fields?.find(
          (field: any) => field.name === "Content Strategy"
        )?.value ?? "",
      promo:
        task.custom_fields?.find((field: any) => field.name === "Promo")
          ?.value ?? "",
      notes:
        task.custom_fields?.find((field: any) => field.name === "Notes")
          ?.value ?? "",
      updated_at: task.date_updated
        ? new Date(Number(task.date_updated)).toISOString()
        : new Date().toISOString(),
    },
    { onConflict: "id" }
  );
}

async function deleteClickupTaskRecord(supabase: any, taskId: string) {
  await supabase.from("clickup_tasks").delete().eq("id", taskId);
}

async function updateTaskDescription(taskId: string, markdownContent: string) {
  const res = await fetch(`${CU_API}/task/${taskId}`, {
    method: "PUT",
    headers: {
      Authorization: CLICKUP_KEY ?? "",
      accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      markdown_content: markdownContent,
    }),
  });
  if (!res.ok) throw new Error(`ClickUp updateTask → ${res.status}`);
  return res.json();
}

async function fetchBrandCartridge(supabase: any, storeListId: string) {
  const { data, error } = await supabase
    .from("brand_cartridges")
    .select("content")
    .eq("store_list_id", storeListId)
    .limit(1);
  if (error) throw error;
  return data[0]?.content as string;
}

async function generateGoogleDraft(supabase: any, task: any) {
  const cartridge = await fetchBrandCartridge(supabase, task.list.id);
  console.log(`Fetched cartridge for task ${task.id}`);

  const taskName = task.name;
  const emotionalDriver = task.custom_fields?.find(
    (field: any) => field.name === "Emotional Driver"
  )?.value;

  const linksField = task.custom_fields?.find(
    (field: any) => field.name === "Links"
  );

  const contentStrategyField = task.custom_fields?.find(
    (field: any) => field.name === "Content Strategy"
  );

  const notesField = task.custom_fields?.find(
    (field: any) => field.name === "Notes"
  );

  const links = linksField?.value || "";
  const contentStrategy = contentStrategyField?.value || "";
  const notes = (notesField?.value || "").toString().trim().toLowerCase();

  const prompt = await emailPrompt(
    taskName,
    cartridge ?? "",
    links,
    contentStrategy,
    emotionalDriver
  );

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4.1-2025-04-14",
      input: [{ role: "developer", content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(
      `OpenAI API error: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();
  const draft = data.output[0].content[0].text;
  console.log("DRAFT:", draft);

  return draft;
}

// ────────────────────────────────────────────────────────────
// Edge handler – receives ClickUp webhook for updates/deletes
// ────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

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

  if (event === "taskDeleted") {
    console.log(`Processing taskDeleted for taskId: ${taskId}`);
    await supabase.from("clickup_tasks").delete().eq("id", taskId);
    console.log(`Deleted task ${taskId}`);
    return new Response("ok");
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

  const task = await getTask(taskId);

  const currentStatus = task.status?.status?.toLowerCase();

  // Only proceed if task status is "ready for writing" and remove task from database because it's status is no longer "ready for writing"
  if (currentStatus !== "ready for writing") {
    const { data: taskData } = await supabase
      .from("clickup_tasks")
      .select("*")
      .eq("id", taskId)
      .single();

    if (taskData) {
      try {
        console.log(
          `task ${taskId} is no longer "ready for writing", removing from database`
        );
        await deleteClickupTaskRecord(supabase, taskId);
      } catch (error) {
        console.error(`Error deleting task ${taskId} from database:`, error);
      }
    } else {
      console.log(
        `arbitrary task status change for ${taskId}, no action taken`
      );
    }
    return;
  }

  if (task.parent) {
    console.log(`Task ${taskId} is a subtask, skipping`);
    return;
  }

  try {
    if (event === "taskStatusUpdated") {
      console.log(`Processing taskStatusUpdated for taskId: ${taskId}`);

      if (!task.markdown_description) {
        console.log(`Generating Google draft for task ${taskId}`);
        const draft = await generateGoogleDraft(supabase, task);
        if (draft) {
          await updateTaskDescription(taskId, draft);
          console.log(`Updated task ${taskId} with Google draft`);
        } else {
          console.log(`No draft generated for task ${taskId}`);
        }
      } else {
        console.log(`Task ${taskId} already has a description, skipping`);
      }

      return;
    } else if (event === "taskUpdated") {
      console.log(`Processing taskUpdated for taskId: ${taskId}`);

      console.log("EMAIL OF TASK UPDATED:", task.markdown_description);

      await upsertClickupTaskRecord(supabase, task);
      console.log(`Upserted task ${taskId}`);
      return;
    } else {
      console.warn(`Unhandled ClickUp event: ${event}`);
    }
  } catch (error) {
    console.error(`Error handling event ${event} for taskId ${taskId}:`, error);
  }
}
