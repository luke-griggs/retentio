// TODO: separate this into separate routes (single campaign upload and a calendar upload)

import { NextRequest, NextResponse } from "next/server";
import { parseCampaignCalendarCSV, Campaign } from "@/app/utils/csvParse";

enum CampaignType {
  "Bundle / Collection Highlight" = 0,
  "Community / UGC" = 1,
  "Gift Guide" = 2,
  "Launch Announcement" = 3,
  "Lifestyle / Use-Case Story" = 4,
  "Product Comparison / Guide" = 5,
  "Value-Product Education" = 6,
  "Promotion / Sale" = 7,
  "Seasonal" = 8,
  "Tips / Recipe / How-To" = 9,
}

enum PrimaryGoal {
  "Awareness" = 0,
  "Education" = 1,
  "Engagement" = 2,
  "Conversion" = 3,
  "Retention" = 4,
  "UGC/Social Proof" = 5,
  "AOV Lift" = 6,
}

enum Flexibility {
  "Fluid" = 0,
  "Fixed" = 1,
}

// Custom field mapping interface
interface CustomFieldMapping {
  client?: string;
  campaignType?: string;
  promo?: string;
  primaryGoal?: string;
  emotionalDriver?: string;
  contentStrategy?: string;
  inclusionSegments?: string;
  exclusionSegments?: string;
  sendTime?: string;
  abTest?: string;
  sms?: string;
  mms?: string;
  plainText?: string;
  followUp?: string;
  notes?: string;
  links?: string;
  flexibility?: string;
}

// Helper function to sanitize client name for environment variable lookup
function sanitizeClientName(clientName: string): string {
  return clientName
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

// Helper function to get ClickUp list ID for a client
function getClickUpListId(clientName: string): string | null {
  const sanitizedName = sanitizeClientName(clientName);
  const envVarName = `CLICKUP_LIST_ID_${sanitizedName}`;
  return process.env[envVarName] || null;
}

// Helper function to get Space-level custom field mapping from environment variables
function getCustomFieldMapping(): CustomFieldMapping {
  return {
    client: process.env.CLICKUP_FIELD_CLIENT,
    campaignType: process.env.CLICKUP_FIELD_CAMPAIGN_TYPE,
    promo: process.env.CLICKUP_FIELD_PROMO,
    primaryGoal: process.env.CLICKUP_FIELD_PRIMARY_GOAL,
    emotionalDriver: process.env.CLICKUP_FIELD_EMOTIONAL_DRIVER,
    contentStrategy: process.env.CLICKUP_FIELD_CONTENT_STRATEGY,
    inclusionSegments: process.env.CLICKUP_FIELD_INCLUSION_SEGMENTS,
    exclusionSegments: process.env.CLICKUP_FIELD_EXCLUSION_SEGMENTS,
    sendTime: process.env.CLICKUP_FIELD_SEND_TIME,
    abTest: process.env.CLICKUP_FIELD_AB_TEST,
    sms: process.env.CLICKUP_FIELD_SMS,
    mms: process.env.CLICKUP_FIELD_MMS,
    plainText: process.env.CLICKUP_FIELD_PLAIN_TEXT,
    followUp: process.env.CLICKUP_FIELD_FOLLOW_UP,
    notes: process.env.CLICKUP_FIELD_NOTES,
    links: process.env.CLICKUP_FIELD_LINKS,
    flexibility: process.env.CLICKUP_FIELD_FLEXIBILITY,
  };
}

// Helper function to build custom fields array
function buildCustomFields(
  campaign: Campaign,
  customFieldMapping: CustomFieldMapping
) {
  const customFields = [];

  // Define field mappings with their corresponding enum/value extractors
  const fieldMappings = [
    {
      mappingKey: "Client" as keyof CustomFieldMapping,
      campaignValue: campaign.client,
      getValue: (value: string) => value,
    },
    {
      mappingKey: "campaignType" as keyof CustomFieldMapping,
      campaignValue: campaign.campaignType,
      getValue: (value: string) =>
        CampaignType[value as keyof typeof CampaignType],
    },
    {
      mappingKey: "promo" as keyof CustomFieldMapping,
      campaignValue: campaign.promo,
      getValue: (value: string) => value,
    },
    {
      mappingKey: "primaryGoal" as keyof CustomFieldMapping,
      campaignValue: campaign.primaryGoal,
      getValue: (value: string) =>
        PrimaryGoal[value as keyof typeof PrimaryGoal],
    },
    {
      mappingKey: "emotionalDriver" as keyof CustomFieldMapping,
      campaignValue: campaign.emotionalDriver,
      getValue: (value: string) => value,
    },
    {
      mappingKey: "contentStrategy" as keyof CustomFieldMapping,
      campaignValue: campaign.contentStrategy,
      getValue: (value: string) => value,
    },
    {
      mappingKey: "inclusionSegments" as keyof CustomFieldMapping,
      campaignValue: campaign.inclusionSegments,
      getValue: (value: string) => value,
    },
    {
      mappingKey: "exclusionSegments" as keyof CustomFieldMapping,
      campaignValue: campaign.exclusionSegments,
      getValue: (value: string) => value,
    },
    {
      mappingKey: "sendTime" as keyof CustomFieldMapping,
      campaignValue: campaign.sendTime,
      getValue: (value: string) => value,
    },
    {
      mappingKey: "abTest" as keyof CustomFieldMapping,
      campaignValue: campaign.abTest,
      getValue: (value: string) => value,
    },
    {
      mappingKey: "sms" as keyof CustomFieldMapping,
      campaignValue: campaign.sms,
      getValue: (value: string) => value,
    },
    {
      mappingKey: "mms" as keyof CustomFieldMapping,
      campaignValue: campaign.mms,
      getValue: (value: string) => value,
    },
    {
      mappingKey: "plainText" as keyof CustomFieldMapping,
      campaignValue: campaign.plainText,
      getValue: (value: string) => value,
    },
    {
      mappingKey: "followUp" as keyof CustomFieldMapping,
      campaignValue: campaign.followUp,
      getValue: (value: string) => value,
    },
    {
      mappingKey: "notes" as keyof CustomFieldMapping,
      campaignValue: campaign.notes,
      getValue: (value: string) => value,
    },
    {
      mappingKey: "links" as keyof CustomFieldMapping,
      campaignValue: campaign.links,
      getValue: (value: string) => value,
    },
    {
      mappingKey: "flexibility" as keyof CustomFieldMapping,
      campaignValue: campaign.flexibility,
      getValue: (value: string) =>
        Flexibility[value as keyof typeof Flexibility],
    },    
  ];

  // Build custom fields array using the mappings
  for (const mapping of fieldMappings) {
    const fieldId = customFieldMapping[mapping.mappingKey];
    if (fieldId && mapping.campaignValue) {
      customFields.push({
        id: fieldId,
        value: mapping.getValue(mapping.campaignValue),
      });
    }
  }

  return customFields;
}

// Helper function to create a ClickUp task for a campaign
async function createClickUpTask(
  campaign: Campaign,
  listId: string,
  apiToken: string,
  customFieldMapping: CustomFieldMapping
) {
  const clickUpUrl = `https://api.clickup.com/api/v2/list/${listId}/task`;

  // Parse the date to convert to Unix timestamp (ClickUp expects due_date in Unix milliseconds)
  const parseDateToUnix = (dateStr: string): number | null => {
    try {
      // Assuming date format like "2 June" - we'll need to add current year
      const currentYear = new Date().getFullYear();
      const fullDateStr = `${dateStr} ${currentYear} 12:00:00 GMT`;
      const date = new Date(fullDateStr);
      return date.getTime();
    } catch {
      return null;
    }
  };

  const taskData = {
    name: campaign.campaignName,
    due_date: parseDateToUnix(campaign.date),
    custom_fields: buildCustomFields(campaign, customFieldMapping),
  };

  try {
    const response = await fetch(clickUpUrl, {
      method: "POST",
      headers: {
        Authorization: apiToken,
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
    console.error(
      `Failed to create task for campaign "${campaign.campaignName}":`,
      error
    );
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const fileUrl = formData.get("fileUrl") as string; // From Vercel Blob

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.type !== "text/csv") {
      return NextResponse.json(
        { error: "File must be a CSV" },
        { status: 400 }
      );
    }

    // Parse CSV on server
    const content = await file.text();
    const campaigns = parseCampaignCalendarCSV(content);

    if (campaigns.length === 0) {
      return NextResponse.json(
        {
          error: "No valid campaigns found in CSV. Please check the format.",
        },
        { status: 400 }
      );
    }

    const client = campaigns[0].client;
    if (!client) {
      return NextResponse.json(
        {
          error:
            "No client found in CSV. Please ensure the client is in the first cell.",
        },
        { status: 400 }
      );
    }

    // Get configuration from environment variables
    const CLICKUP_KEY = process.env.CLICKUP_KEY;
    const CLICKUP_LIST_ID = getClickUpListId(client);

    if (!CLICKUP_KEY) {
      return NextResponse.json(
        {
          error:
            "ClickUp API key not configured. Please set environment variable.",
        },
        { status: 500 }
      );
    }

    if (!CLICKUP_LIST_ID) {
      return NextResponse.json(
        {
          error: `ClickUp List ID not configured for client`,
        },
        { status: 500 }
      );
    }

    // Get Space-level custom field mapping from environment variables
    const customFieldMapping = getCustomFieldMapping();
    const configuredFields =
      Object.values(customFieldMapping).filter(Boolean).length;

    if (configuredFields === 0) {
      return NextResponse.json(
        {
          error:
            "No custom fields configured. Please set CLICKUP_FIELD_* environment variables.",
        },
        { status: 500 }
      );
    }

    console.log(
      `Using ${configuredFields} configured custom fields for client: ${client}`
    );

    const createdTasks = [];
    const failedTasks = [];

    // Create tasks for each campaign
    for (const campaign of campaigns) {
      try {
        console.log(
          `Creating ClickUp task for campaign: ${campaign.campaignName} (Client: ${client})`
        );
        const task = await createClickUpTask(
          campaign,
          CLICKUP_LIST_ID,
          CLICKUP_KEY,
          customFieldMapping
        );
        createdTasks.push({
          campaignName: campaign.campaignName,
          taskId: task.id,
          taskUrl: task.url,
        });
      } catch (error) {
        console.error(
          `Failed to create task for campaign "${campaign.campaignName}":`,
          error
        );
        failedTasks.push({
          campaignName: campaign.campaignName,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    console.log(
      `Successfully created ${createdTasks.length} tasks, ${failedTasks.length} failed for client: ${client}`
    );

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${campaigns.length} campaigns for ${client}. Created ${createdTasks.length} tasks using Space-level custom fields.`,
      client,
      campaignCount: campaigns.length,
      createdTasks: createdTasks.length,
      failedTasks: failedTasks.length,
      createdTasksList: createdTasks,
      failedTasksList: failedTasks,
      customFieldsUsed: configuredFields,
      fileUrl, // Include the blob URL for reference
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      {
        error: "Failed to process CSV file",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
