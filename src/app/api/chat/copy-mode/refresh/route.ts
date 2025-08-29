import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/utils/supabase/supabaseAdmin";
import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function getEmailPromptHtml(
  clientName: string,
  taskName: string,
  cartridge: string,
  links: string,
  contentStrategy: string,
  brandType: string,
  brandTone: string,
  exampleEmails: string,
  promo: string
) {
  return `
You are a copywriter for a ${brandType} brand called ${clientName}. As you will see in the examples, the brand uses a ${brandTone} tone. Do not use colons or em dashes in the email under any circumstances.

${cartridge ? `
Here is a "brand cartridge" containing the brand's mission, values, and unique rules:
  ____CARTRIDGE_START____
  ${cartridge}
  ____CARTRIDGE_END____
` : ""}

You are going to be provided the content strategy for an email. You will also be provided with a list of example emails that have worked well in the past. Notice the following patterns among these emails:
- The subject line and preview text are connected. One of which is straightforward, the other is creative
- The header and body are connected. One of which is straightforward, the other is thematic/creative
- The CTA is short, creative, and actionable (all caps). Avoid "shop the...", "level up", "subscribe today", etc.

Notice these patterns in the examples and use them to guide your email.

Don't repeat content from the subject line in the body.

The content strategy may mention that the email needs to include something like a customer review, product example, promo code, etc. If and only if this is the case, place an <ACTION NEEDED>{brief explanation of what's needed (as if you're telling the copywriter what to do)}</ACTION NEEDED> in the email, and we will insert it ourselves.

Additional notes:
- em-dashes, colons, and semicolons are NOT allowed in the email (-, :, ;, etc.)
- no bulleted lists in the body unless the content strategy explicitly asks for it

Use the following content strategy to create the email:
${contentStrategy}

${exampleEmails ? `
Match the tone, cadence, and sentence length of these examples:
Additionally, ensure the length of the components are similar to the examples.
${exampleEmails}
` : ""}

${promo ? `
Include this promotional offer in the email:
${promo}
` : ""}

${links ? `
LINKS USAGE
When using links:
- Embed them naturally within the content using HTML format: <a href="url">link text</a>
- The link text should be contextual and action-oriented (e.g., "Shop Now", "Learn More", "Get Started")
- You can use links in the Body or CTA sections
- If multiple links are provided, use them strategically based on their context
- Do NOT display raw URLs - always use meaningful link text

The following links are available for embedding in the email where appropriate:
${links}
` : ""}

OUTPUT FORMAT:
Create these components and format them as an HTML TABLE using this EXACT structure:

<table>
  <tr>
    <td><strong>SUBJECT LINE</strong></td>
    <td>[Subject line here - max 45 characters]</td>
  </tr>
  <tr>
    <td><strong>SUBJECT LINE</strong></td>
    <td>[Alternative subject line here - max 45 characters]</td>
  </tr>
  <tr>
    <td><strong>SUBJECT LINE</strong></td>
    <td>[Third subject line here - max 45 characters]</td>
  </tr>
  <tr>
    <td><strong>PREVIEW TEXT</strong></td>
    <td>[Preview text here - max 60 characters]</td>
  </tr>
  <tr>
    <td><strong>HEADER</strong></td>
    <td>[Header text here - max 60 characters]</td>
  </tr>
  <tr>
    <td><strong>BODY</strong></td>
    <td>[Body text here - max 240 characters]</td>
  </tr>
  <tr>
    <td><strong>CTA</strong></td>
    <td>[CTA with link here - max 20 characters, ALL CAPS]</td>
  </tr>
</table>

IMPORTANT:
- Use ONLY the HTML table format shown above
- Return ONLY the table HTML, no additional text or markdown
- Keep all content in a single table
- Each row should contain the complete content for that section
- Use HTML tags for formatting: <strong> for bold, <em> for italics, <strong><em> for both
- Use HTML links: <a href="url">link text</a>
- Respect the character limits strictly
`;
}

export async function POST(request: NextRequest) {
  try {
    const { taskId, taskName, storeId, contentStrategy, promo, links } = await request.json();

    // Validate required fields
    if (!taskId || !taskName || !storeId) {
      return NextResponse.json(
        { error: "Task ID, Task Name, and Store ID are required" },
        { status: 400 }
      );
    }

    // Fetch store information including brand type, tone, and email examples
    const { data: store, error: storeError } = await supabaseAdmin
      .from("stores")
      .select("name, clickup_list_id, brand_type, brand_tone, email_examples")
      .eq("id", storeId)
      .single();

    if (storeError || !store) {
      console.error("Error fetching store:", storeError);
      return NextResponse.json(
        { error: "Failed to fetch store information" },
        { status: 500 }
      );
    }

    // Fetch brand cartridge content
    const { data: cartridge, error: cartridgeError } = await supabaseAdmin
      .from("brand_cartridges")
      .select("content")
      .eq("store_list_id", store.clickup_list_id)
      .limit(1)
      .single();

    let brandCartridgeContent = "";
    if (!cartridgeError && cartridge) {
      brandCartridgeContent = cartridge.content || "";
    }

    // Use store brand information with fallbacks
    const clientName = store.name || "the brand";
    const brandType = store.brand_type || "modern";
    const brandTone = store.brand_tone || "professional yet approachable";
    const emailExamples = store.email_examples || "";

    // Generate new email content using OpenAI with the updated prompt
    const prompt = getEmailPromptHtml(
      clientName,
      taskName,
      brandCartridgeContent,
      links || "",
      contentStrategy || "",
      brandType,
      brandTone,
      emailExamples,
      promo || ""
    );

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-2024-08-06",
      messages: [
        {
          role: "developer",
          content: prompt
        }
      ],
    });

    const generatedContent = completion.choices[0]?.message?.content || "";

    // Clean up the content to ensure it's just the HTML table
    const tableMatch = generatedContent.match(/<table>[\s\S]*<\/table>/);
    const htmlTable = tableMatch ? tableMatch[0] : generatedContent;

    return NextResponse.json({
      content: htmlTable,
      success: true
    });

  } catch (error) {
    console.error("Error generating new campaign content:", error);
    return NextResponse.json(
      { error: "Failed to generate new campaign content" },
      { status: 500 }
    );
  }
}