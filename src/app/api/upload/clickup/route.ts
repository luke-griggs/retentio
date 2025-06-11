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

    // Custom field mapping - using hardcoded field IDs from ClickUp
    const customFieldMapping: CustomFieldMapping = {
      // campaignType: "9b23ac4f-2efc-4f1a-bca2-deb1d7edbcb0",
      promo: "ca8efe1c-db5e-41bc-9077-a475c59ea893",
      // primaryGoal: "6d98af22-4a83-4ab2-b189-7f91ae70ade1",
      emotionalDriver: "e4785680-a540-40f7-8caa-e8507e733dc4",
      contentStrategy: "24fca732-54a3-41de-8c6f-76248502faab",
      inclusionSegments: "ff7e4ee9-27f5-4fa5-bd74-e6c78471f607",
      exclusionSegments: "ea6f66cd-f163-4727-9ec3-7dcb5217de20",
      sendTime: "ffe94050-321f-40b6-b5bc-16b631ceb744",
      abTest: "45b89329-1fef-4eb7-bc91-3f5f0a721140",
      sms: "3e18b90b-9b07-428b-b9bb-1d525bcb0d15",
      plainText: "3eb999a0-c005-486e-9d37-eb232dab080a",
      followUp: "82687b29-bcaf-42ff-8c35-7bb2bb820908",
      notes: "8c7a2fe0-84e4-44c0-9f2f-c93ee2acb88f",
      // If you came across this repo, these are no longer in use :
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
