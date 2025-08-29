// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// @ts-ignore – Supabase client for edge functions
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getEmailPrompt } from "./emailPrompt.ts";
import { getSMSPrompt } from "./getSmsPrompt.ts";
import { getMMSPrompt } from "./getMMSPrompt.ts";
import { getPlainTextPrompt } from "./getPlainTextPrompt.ts";
import { formatDraft } from "./formatDraft.ts";

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
type FieldType = "isSMS" | "isMMS" | "isPlainText";

// Client enum matching ClickUp dropdown values
enum Client {
  "Haverhill" = 0,
  "Legendary Foods" = 1,
  "Womaness" = 2,
  "BioPower Pet" = 3,
  "Drip EZ" = 4,
  "Threadbeast" = 5,
  "Life Harmony Energies" = 6,
  "Frey" = 7,
  "Turn" = 8,
  "Luke Test" = 9,
  "Mett Naturals" = 10,
  "Monsterbass" = 11,
  "Seatopia" = 12,
  "Procare" = 13,
  "Twelve South" = 14,
  "EMF Harmony" = 15,
  "Portal Sphere" = 16,
  "IV His Glory" = 17,
  "Retentio Internal" = 18,
  "Barebones" = 19,
  "Dilettoso" = 20,
  "DrinkinBuds" = 21,
  "Lucent" = 22,
  "Velora" = 23,
  "BPP/EMFH/LHE" = 24,
}

// Helper function to get client name from ClickUp value (reverse mapping)
function getClientNameFromValue(value: number): string | null {
  const clientEntries = Object.entries(Client);
  const entry = clientEntries.find(([, enumValue]) => enumValue === value);
  return entry ? entry[0] : null;
}

function getFieldIds() {
  return {
    isSMS: Deno.env.get("CLICKUP_FIELD_IS_SMS"),
    isMMS: Deno.env.get("CLICKUP_FIELD_IS_MMS"),
    isPlainText: Deno.env.get("CLICKUP_FIELD_IS_PLAIN_TEXT"),
  };
}

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

async function getAdditionalClientInfo(supabase: any, client: string) {
  const { data, error } = await supabase
    .from("stores")
    .select("brand_type, brand_tone, email_examples")
    .eq("name", client);
  if (error) throw error;
  return data[0];
}

async function upsertClickupTaskRecord(supabase: any, task: any) {
  let storeId: string | null = null;

  try {
    if (task.list?.id) {
      const { data, error } = await supabase
        .from("stores")
        .select("id")
        .eq("clickup_list_id", task.list.id)
        .maybeSingle();

      if (error) {
        console.error(
          `Error fetching store for list id ${task.list.id}:`,
          error
        );
        // Optionally, you could throw here or just continue with storeId as null
      }
      storeId = data?.id ?? null;
    }

    const { error: upsertError } = await supabase.from("clickup_tasks").upsert(
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
        links:
          task.custom_fields?.find((field: any) => field.name === "Links")
            ?.value ?? "",
        info_complete:
          task.custom_fields?.find(
            (field: any) => field.name === "Info Complete"
          )?.value ?? "",
        updated_at: task.date_updated
          ? new Date(Number(task.date_updated)).toISOString()
          : new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    if (upsertError) {
      console.error(
        `Error upserting clickup_task record for task id ${task.id}:`,
        upsertError
      );
      throw upsertError;
    }
  } catch (err) {
    console.error(
      `upsertClickupTaskRecord failed for task id ${task.id}:`,
      err
    );
    throw err;
  }
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

async function generateDraft(task: any, prompt: string) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-2024-08-06",
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

async function createSupplementalTask(
  taskName: string,
  listId: string,
  dueDate: string,
  links: string,
  type: FieldType,
  client?: number | string
) {
  const clickUpUrl = `https://api.clickup.com/api/v2/list/${listId}/task`;

  const fieldIds = getFieldIds();

  const taskType =
    type === "isSMS"
      ? "SMS"
      : type === "isMMS"
      ? "MMS"
      : type === "isPlainText"
      ? "Plain Text"
      : "";

  const customFields: Array<{ id: string; value: string | number }> = [
    { id: fieldIds[type]!, value: "yes" },
    { id: Deno.env.get("CLICKUP_FIELD_LINKS")!, value: links },
  ];

  // Add client field if provided
  if (client !== undefined && Deno.env.get("CLICKUP_FIELD_CLIENT")) {
    customFields.push({
      id: Deno.env.get("CLICKUP_FIELD_CLIENT")!,
      value: Client[client as keyof typeof Client], // add the dropdown index value
    });
  }

  const taskData = {
    name: taskName + " " + taskType,
    due_date: dueDate,
    custom_fields: customFields,
  };

  try {
    const response = await fetch(clickUpUrl, {
      method: "POST",
      headers: {
        Authorization: CLICKUP_KEY ?? "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(taskData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ClickUp API Error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error(`Failed to create task "${taskName}":`, error);
    throw error;
  }
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
  handleAsync(event as string, taskId as string, supabase).catch((e) =>
    console.error("clickupSync error:", e)
  );

  return new Response("ok");
});

// ────────────────────────────────────────────────────────────
// Background worker
// ────────────────────────────────────────────────────────────
async function handleAsync(event: string, taskId: string, supabase: any) {
  const task = await getTask(taskId);

  const currentStatus = task.status?.status?.toLowerCase();

  const cartridge = await fetchBrandCartridge(supabase, task.list.id);
  console.log(`Fetched cartridge for task ${task.id}`);

  const clientValue = task.custom_fields?.find(
    (field: any) => field.name === "Client"
  )?.value;

  const client =
    typeof clientValue === "number"
      ? getClientNameFromValue(clientValue)
      : clientValue;

  console.log("client value from ClickUp:", clientValue);
  console.log("client name for additional client info:", client);

  const clientInfo = await getAdditionalClientInfo(supabase, client);
  const {
    brand_type: brandType,
    brand_tone: brandTone,
    email_examples: emailExamples,
  } = clientInfo || {};

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
        const linksField = task.custom_fields?.find(
          (field: any) => field.name === "Links"
        );

        const contentStrategyField = task.custom_fields?.find(
          (field: any) => field.name === "Content Strategy"
        );

        const isSMSField = task.custom_fields?.find(
          (field: any) => field.name === "isSMS"
        );
        const isMMSField = task.custom_fields?.find(
          (field: any) => field.name === "isMMS"
        );
        const isPlainTextField = task.custom_fields?.find(
          (field: any) => field.name === "isPlainText"
        );

        const contentStrategy = contentStrategyField?.value || "";
        const links = linksField?.value || "";
        const isSMS = isSMSField?.value === "yes";
        const isMMS = isMMSField?.value === "yes";
        const isPlainText = isPlainTextField?.value === "yes";

        try {
          // Check if task is SMS, MMS, or Plain Text else generate normal email draft
          // Note: We check both field naming conventions (e.g., "isSMS" and "SMS") for compatibility
          if (isSMS) {
            const smsPrompt = await getSMSPrompt(
              client,
              cartridge ?? "",
              task.name,
              links,
              contentStrategy,
              brandType,
              brandTone
            );
            console.log("SMS PROMPT:", smsPrompt);
            console.log("GENERATING SMS DRAFT");

            const smsDraft = await generateDraft(task, smsPrompt);
            const formattedSmsDraft = await formatDraft({
              draft: smsDraft,
              type: "sms",
            });
            await updateTaskDescription(taskId, formattedSmsDraft);
            console.log(`Updated SMS task ${taskId} with draft`);
            return;
          }

          if (isMMS) {
            const mmsPrompt = await getMMSPrompt(
              client,
              cartridge ?? "",
              task.name,
              links,
              contentStrategy,
              brandType,
              brandTone
            );

            const mmsDraft = await generateDraft(task, mmsPrompt);
            const formattedMmsDraft = await formatDraft({
              draft: mmsDraft,
              type: "mms",
            });
            await updateTaskDescription(taskId, formattedMmsDraft);
            console.log(`Updated MMS task ${taskId} with draft`);
            return;
          }

          if (isPlainText) {
            const plainTextPrompt = await getPlainTextPrompt(
              client,
              cartridge ?? "",
              task.name,
              links,
              contentStrategy,
              brandType,
              brandTone
            );

            const plainTextDraft = await generateDraft(task, plainTextPrompt);
            const formattedPlainTextDraft = await formatDraft({
              draft: plainTextDraft,
              type: "plainText",
            });
            await updateTaskDescription(taskId, formattedPlainTextDraft);
            console.log(`Updated Plain Text task ${taskId} with draft`);
            return;
          }

          const emailPrompt = await getEmailPrompt(
            client,
            task.name,
            cartridge ?? "",
            task.links,
            contentStrategy,
            brandType,
            brandTone,
            emailExamples
          );

          const isSupplementalTask =
            task.name.includes(" isSMS") ||
            task.name.includes(" isMMS") ||
            task.name.includes(" isPlainText");

          if (isSupplementalTask) {
            console.log(
              `Task ${taskId} is a supplemental task, skipping supplemental task creation`
            );
            return;
          }

          console.log(`Generating Google draft for task ${taskId}`);
          const emailDraft = await generateDraft(task, emailPrompt);
          const formattedEmailDraft = await formatDraft({
            draft: emailDraft,
            type: "email",
          });
          await updateTaskDescription(taskId, formattedEmailDraft);
          console.log(`Updated task ${taskId} with Google draft`);

          const dueDate = task.due_date;
          const listId = task.list.id;

          // Create supplemental tasks only for email tasks (not for tasks that are already SMS/MMS/PlainText)
          if (
            task.custom_fields?.find(
              (field: any) => field.name === "SMS" && field.value === "yes"
            )
          ) {
            const type = "isSMS";
            await createSupplementalTask(
              task.name,
              listId,
              dueDate,
              task.links,
              type,
              client
            );
            console.log(`Created supplemental SMS task for ${taskId}`);
          }

          if (
            task.custom_fields?.find(
              (field: any) => field.name === "MMS" && field.value === "yes"
            )
          ) {
            const type = "isMMS";
            await createSupplementalTask(
              task.name,
              listId,
              dueDate,
              task.links,
              type,
              client
            );
            console.log(`Created supplemental MMS task for ${taskId}`);
          }

          if (
            task.custom_fields?.find(
              (field: any) =>
                field.name === "Plain Text" && field.value === "yes"
            )
          ) {
            const type = "isPlainText";
            await createSupplementalTask(
              task.name,
              listId,
              dueDate,
              task.links,
              type,
              client
            );
            console.log(`Created supplemental Plain Text task for ${taskId}`);
          }
        } catch (error) {
          console.error(`Error generating draft for task ${taskId}:`, error);
        }
      } else {
        console.log(`Task ${taskId} already has a description, skipping`);
      }
    } else if (event === "taskUpdated") {
      console.log(`Processing taskUpdated for taskId: ${taskId}`);

      console.log("EMAIL OF TASK UPDATED:", task.markdown_description);

      await upsertClickupTaskRecord(supabase, task);
    } else {
      console.warn(`Unhandled ClickUp event: ${event}`);
    }
  } catch (error) {
    console.error(`Error handling event ${event} for taskId ${taskId}:`, error);
  }
}
