import { NextRequest, NextResponse } from "next/server";
import { parseCampaignCalendarCSV, Campaign } from "@/app/utils/csvParse";

// Custom field mapping interface
interface CustomFieldMapping {
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
  plainText?: string;
  followUp?: string;
  notes?: string;
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
      const fullDateStr = `${dateStr} ${currentYear}`;
      const date = new Date(fullDateStr);
      return date.getTime();
    } catch {
      return null;
    }
  };

  // Build custom fields array based on mapping and campaign data
  const customFields = [];

  if (customFieldMapping.campaignType && campaign.campaignType) {
    customFields.push({
      id: customFieldMapping.campaignType,
      value: campaign.campaignType,
    });
  }

  if (customFieldMapping.promo && campaign.promo) {
    customFields.push({
      id: customFieldMapping.promo,
      value: campaign.promo,
    });
  }

  if (customFieldMapping.primaryGoal && campaign.primaryGoal) {
    customFields.push({
      id: customFieldMapping.primaryGoal,
      value: campaign.primaryGoal,
    });
  }

  if (customFieldMapping.emotionalDriver && campaign.emotionalDriver) {
    customFields.push({
      id: customFieldMapping.emotionalDriver,
      value: campaign.emotionalDriver,
    });
  }

  if (customFieldMapping.contentStrategy && campaign.contentStrategy) {
    customFields.push({
      id: customFieldMapping.contentStrategy,
      value: campaign.contentStrategy,
    });
  }

  if (customFieldMapping.inclusionSegments && campaign.inclusionSegments) {
    customFields.push({
      id: customFieldMapping.inclusionSegments,
      value: campaign.inclusionSegments,
    });
  }

  if (customFieldMapping.exclusionSegments && campaign.exclusionSegments) {
    customFields.push({
      id: customFieldMapping.exclusionSegments,
      value: campaign.exclusionSegments,
    });
  }

  if (customFieldMapping.sendTime && campaign.sendTime) {
    customFields.push({
      id: customFieldMapping.sendTime,
      value: campaign.sendTime,
    });
  }

  if (customFieldMapping.abTest && campaign.abTest) {
    customFields.push({
      id: customFieldMapping.abTest,
      value: campaign.abTest,
    });
  }

  if (customFieldMapping.sms && campaign.sms) {
    customFields.push({
      id: customFieldMapping.sms,
      value: campaign.sms,
    });
  }

  if (customFieldMapping.plainText && campaign.plainText) {
    customFields.push({
      id: customFieldMapping.plainText,
      value: campaign.plainText,
    });
  }

  if (customFieldMapping.followUp && campaign.followUp) {
    customFields.push({
      id: customFieldMapping.followUp,
      value: campaign.followUp,
    });
  }

  if (customFieldMapping.notes && campaign.notes) {
    customFields.push({
      id: customFieldMapping.notes,
      value: campaign.notes,
    });
  }

  const taskData = {
    name: campaign.campaignName,
    due_date: parseDateToUnix(campaign.date),
    custom_fields: customFields,
    tags: [
      campaign.campaignType && campaign.campaignType !== ""
        ? campaign.campaignType
        : null,
      campaign.promo && campaign.promo !== "" ? campaign.promo : null,
    ].filter((tag) => tag !== null),
    // You can add other fields here as needed:
    // assignees: [], // Array of user IDs - to be configured by user
    // status: "to do", // Task status - to be configured by user
    // time_estimate: null, // Time in milliseconds
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

    // Get configuration from environment variables
    const CLICKUP_KEY = process.env.CLICKUP_KEY;
    const CLICKUP_LIST_ID = "901704863057";

    if (!CLICKUP_KEY) {
      return NextResponse.json(
        {
          error:
            "ClickUp API key not configured. Please set CLICKUP_KEY environment variable.",
        },
        { status: 500 }
      );
    }

    if (!CLICKUP_LIST_ID) {
      return NextResponse.json(
        {
          error:
            "ClickUp List ID not configured. Please set CLICKUP_LIST_ID environment variable.",
        },
        { status: 500 }
      );
    }

    // Custom field mapping - you'll need to set these environment variables with your actual field IDs
    const customFieldMapping: CustomFieldMapping = {
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
      plainText: process.env.CLICKUP_FIELD_PLAIN_TEXT,
      followUp: process.env.CLICKUP_FIELD_FOLLOW_UP,
      notes: process.env.CLICKUP_FIELD_NOTES,
    };

    const createdTasks = [];
    const failedTasks = [];

    // Create tasks for each campaign
    for (const campaign of campaigns) {
      try {
        console.log(
          `Creating ClickUp task for campaign: ${campaign.campaignName}`
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
      `Successfully created ${createdTasks.length} tasks, ${failedTasks.length} failed`
    );

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${campaigns.length} campaigns. Created ${createdTasks.length} tasks.`,
      campaignCount: campaigns.length,
      createdTasks: createdTasks.length,
      failedTasks: failedTasks.length,
      createdTasksList: createdTasks,
      failedTasksList: failedTasks,
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
