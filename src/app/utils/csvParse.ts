import Papa from "papaparse";

export interface Campaign {
  date: string;
  campaignName: string;
  campaignType: string;
  promo: string;
  primaryGoal: string;
  emotionalDriver: string;
  contentStrategy: string;
  inclusionSegments: string;
  exclusionSegments: string;
  sendTime: string;
  abTest: string;
  sms: string;
  plainText: string;
  followUp: string;
  notes: string;
}

/**
 * Parses a non-traditional campaign calendar CSV into a structured array of campaign objects.
 * @param csv Raw CSV string
 */
export function parseCampaignCalendarCSV(csv: string): Campaign[] {
  // Parse CSV into rows
  const parsed = Papa.parse<string[]>(csv.trim(), { skipEmptyLines: false });
  const rows = parsed.data;

  // Regex to match date patterns like "2 June", "15 December", etc.
  const dateRegex =
    /\d+\s+(January|February|March|April|May|June|July|August|September|October|November|December)/i;

  // Find all date rows and extract campaigns
  const campaigns: Campaign[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    // Check if this row contains dates
    if (row.some((cell: string) => cell && dateRegex.test(cell.trim()))) {
      // This is a date row - extract the dates and campaign data
      const dateRow = row;

      // The next 14 rows contain the campaign fields
      if (i + 14 >= rows.length) break; // Not enough rows remaining

      const fieldRows = rows.slice(i + 1, i + 15);

      // Check that we have the expected field structure
      if (
        !fieldRows[0] ||
        !fieldRows[0][0]?.toLowerCase().includes("campaign name")
      ) {
        continue; // Skip if this doesn't look like campaign data
      }

      // For each column (day), create a campaign if Campaign Name exists
      for (let col = 1; col < dateRow.length; col++) {
        const date = dateRow[col]?.trim();
        if (!date || !dateRegex.test(date)) continue;

        const campaignName = fieldRows[0]?.[col]?.trim() || "";
        if (!campaignName) continue;

        // Clean up quoted strings (remove extra quotes)
        const cleanString = (str: string) => {
          if (!str) return "";
          return str
            .replace(/^["']+|["']+$/g, "")
            .replace(/"""/g, '"')
            .trim();
        };

        const campaign: Campaign = {
          date,
          campaignName: cleanString(campaignName),
          campaignType: cleanString(fieldRows[1]?.[col] || ""),
          promo: cleanString(fieldRows[2]?.[col] || ""),
          primaryGoal: cleanString(fieldRows[3]?.[col] || ""),
          emotionalDriver: cleanString(fieldRows[4]?.[col] || ""),
          contentStrategy: cleanString(fieldRows[5]?.[col] || ""),
          inclusionSegments: cleanString(fieldRows[6]?.[col] || ""),
          exclusionSegments: cleanString(fieldRows[7]?.[col] || ""),
          sendTime: cleanString(fieldRows[8]?.[col] || ""),
          abTest: cleanString(fieldRows[9]?.[col] || ""),
          sms: cleanString(fieldRows[10]?.[col] || ""),
          plainText: cleanString(fieldRows[11]?.[col] || ""),
          followUp: cleanString(fieldRows[12]?.[col] || ""),
          notes: cleanString(fieldRows[13]?.[col] || ""),
        };

        campaigns.push(campaign);
      }

      // Skip the field rows we just processed
      i += 14;
    }
  }

  return campaigns;
}

/**
 * Converts an array of campaign objects to a standard CSV string
 * @param campaigns Array of campaign objects
 * @returns CSV string with each campaign as a row
 */
export function campaignsToCSV(campaigns: Campaign[]): string {
  const headers = [
    "Date",
    "Campaign Name",
    "Campaign Type",
    "Promo",
    "Primary Goal",
    "Emotional Driver",
    "Content Strategy",
    "Inclusion Segments",
    "Exclusion Segments",
    "Send Time",
    "A/B Test",
    "SMS",
    "Plain Text",
    "Follow Up",
    "Notes",
  ];

  const csvData = [
    headers,
    ...campaigns.map((campaign) => [
      campaign.date,
      campaign.campaignName,
      campaign.campaignType,
      campaign.promo,
      campaign.primaryGoal,
      campaign.emotionalDriver,
      campaign.contentStrategy,
      campaign.inclusionSegments,
      campaign.exclusionSegments,
      campaign.sendTime,
      campaign.abTest,
      campaign.sms,
      campaign.plainText,
      campaign.followUp,
      campaign.notes,
    ]),
  ];

  return Papa.unparse(csvData);
}
