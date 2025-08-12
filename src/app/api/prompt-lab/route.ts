import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/* ---------- static helpers ---------- */

const formatInstructions = `
1. REQUIRED COMPONENTS & OUTPUT FORMAT
Create these seven elements and FORMAT THEM AS A TABLE using this EXACT structure (if it's not a table, bad things will happen):

| Section | Content |
|---------|---------|
| **SUBJECT LINE** | [Subject line here] |
| **PREVIEW TEXT** | [Preview text here] |
| **HEADER** | [Header text here] |
| **BODY** | [Body text here] |
| **CTA** | [CTA with link here] |


IMPORTANT: 
- Use ONLY the table format shown above
- Do NOT use separate markdown code blocks
- Keep all content in a single table
- Each row should contain the complete content for that section

 2. CHARACTER COUNTS
  Header: 40-60 characters (including spaces)
  Body: 200-300 characters total (including spaces & any emphasis markers)
  CTA: 15-20 characters
  Subject Line: <= 35 characters
  Preview Text: 40-60 characters

3. FORMAT & STYLE RULES

Do not use colons (:) or any form of dash (-, –, —) in the Header, Subject Line, or Preview Text. Only use in the body when absolutely necessary

Capitalize Each Word in the Subject Line and Preview Text. (Small filler words can stay lowercase)

You may apply bold + italics together on the same word or short phrase, like **_example_**.
Limit to 3 instances of emphasis in the Body.
Do not bold one word and italicize a different word; emphasis must be on the same word/phrase if used.
No Banned Words as Openers

Never start any section (Header, Body, CTA, Subject, Preview) with "Transform," "Discover," "Experience," "Reimagine," or "Elevate."
Avoid generic marketing clichés such as "unlock," "epic," "ultimate,"
No Brand or Endorser/Product Names (Subject, Preview, Body)

Subject, Preview, Body must be brand-agnostic unless the context explicitly demands naming.

Do not put any of the text in quotes.
`;

/** Parse the 7-row table into an object */
function parseEmailTable(tableContent: string) {
  const lines = tableContent.split("\n").filter((l) => l.trim());
  const out = {
    subjectLines: [] as string[],
    previewText: "",
    header: "",
    body: "",
    cta: "",
  };
  for (const l of lines) {
    if (!l.includes("|") || l.includes("------")) continue;
    const [, rawSection, rawContent] = l.split("|").map((x) => x.trim());
    const section = rawSection?.replace(/\*\*/g, "").toLowerCase();
    if (section === "subject line") out.subjectLines.push(rawContent);
    else if (section === "preview text") out.previewText = rawContent;
    else if (section === "header") out.header = rawContent;
    else if (section === "body") out.body = rawContent;
    else if (section === "cta") out.cta = rawContent;
  }
  return out;
}

/** Choose which client to hit, keep call signature identical */
async function callLLM(
  model:
    | "gpt-4o"
    | "claude-4-sonnet"
    | "claude-4-sonnet-thinking"
    | "gpt-5"
    | "gpt-5-mini",
  payload: {
    system: string;
    user: string;
    temperature?: number;
    maxTokens?: number;
  }
) {
  const { system, user, temperature = 0.8, maxTokens = 2048 } = payload;

  if (model === "claude-4-sonnet") {
    const r = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      temperature,
      system,
      messages: [{ role: "user", content: user }],
    });
    return r.content[0].type === "text" ? r.content[0].text : "";
  } else if (model === "claude-4-sonnet-thinking") {
    console.log("Calling Claude API with thinking mode...");
    console.log("System prompt length:", system.length);
    console.log("User prompt length:", user.length);

    try {
      const r = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        system,
        max_tokens: 4132,
        thinking: {
          type: "enabled",
          budget_tokens: 2048,
        },
        messages: [{ role: "user", content: user }],
      });
      console.log("Claude API raw response:", JSON.stringify(r, null, 2));
      const text = r.content[1].type === "text" ? r.content[1].text : "";

      return text;
    } catch (error) {
      console.error("Error in Claude API call:", error);
      throw error;
    }
  } else if (model === "gpt-5-mini") {
    try {
      console.log("Calling GPT-5 API with reasoning effort 'low'...");
      const r = await openai.responses.create({
        model: "gpt-5-mini",
        input: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      });

      return (r as any).output_text ?? "";
    } catch (error) {
      console.error("Error in OpenAI GPT-5 thinking call:", error);
      throw error;
    }
  }

  const r = await openai.chat.completions.create({
    model: "gpt-4o",
    temperature,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  return r.choices[0]?.message?.content ?? "";
}

/* ---------- route ---------- */

export async function POST(req: NextRequest) {
  try {
    const { systemPrompt = "", emailPrompt = "" } = await req.json();
    if (!systemPrompt || !emailPrompt) {
      return NextResponse.json(
        { error: "Both system prompt and email prompt are required" },
        { status: 400 }
      );
    }

    /* === 1) DRAFT ===================================================== */
    const ideationSystem = `
    You are the senior copywriter of our retention agency. You write the best goddamn copy we've ever seen kid. You've just received the content strategy for the brand's next marketing email 
    **Task:** Deeply analyze the content strategy and use your expertise to provide a clear set of instructions for the content of the email based on the content strategy
    
    Sidenotes:
    - The instructions you provide don't need to be verbose, we're just trying to provide a solid direction for the email
    - you don't need to provide any word count suggestions
    - the final email(not this outline) will consist of 5 sections: subject line, preview text, header, body, and cta.

    Your instructions are going to be used by the other copywriter to write the email. The final body will be 200-300 characters, so ensure your instructions aren't information overload and don't include too much information that would be hard to fit into that count.
    `;

    const outline = await callLLM("gpt-5-mini", {
      system: ideationSystem,
      user: `Template:\n${emailPrompt}`,
    });

    /* === 2) EMAIL ===================================================== */
    const writeSystem = `
    What's up! you're the senior copywriter of a retention agency and you're the best goddamn copywriter this agency's ever seen kid! I mean really, I've never seen someone sling subject lines like you do. You're about to receive the draft outline and writing instructions for the upcoming marketing email.
    Based on your expertise, carefully craft one of your signature marketing email based on the following outline and writing instructions. The email needs the following sections: subject line, preview text, header, body, and cta.
    
    ${outline}

    Here are some examples of quality emails you've written in the past.

    ## Example 1
    SUBJECT LINE: Refresh Your Self Care Routine
    PLAIN TEXT: With Our Rejuvenate & Restore Bundle
    HEADER: Refresh Your Self Care Routine With Our Rejuvenate & Restore Bundle
    BODY: We've partnered with our sister company Mett Wellness to bring you the ultimate skin restoration bundle. This harmonious trio makes the perfect Valentine's gift for someone special (including yourself!), working together to protect, rejuvenate, and balance skin naturally.
    CTA: SHOP THE BUNDLE

    ## Example 2
    SUBJECT LINE: Final Hours For Valentine's Delivery
    PLAIN TEXT: Gift Bundles For Every Self-Care Style
    HEADER: Final Hours For Valentine's Delivery
    BODY: Today is the final day to order the Rejuvenate & Restore Bundle for Valentine's Day delivery. Give them the gift of natural balance with our pure hemp extract collection.
    CTA: GIVE THE GIFT OF WELLNESS

    ## Example 3
    SUBJECT LINE: Your Skin Craves Balance
    PLAIN TEXT: Save 15% On All Skincare Products
    HEADER: Save 15% on Skincare Products
    BODY: Your skin craves balance and nourishment during these harsh winter months. Our pure hemp extract-infused topicals work in harmony with your body's natural processes to promote radiant, healthy-looking skin.
    CTA: SHOP ALL SKINCARE

    ## Example 4
    SUBJECT LINE: Balance Your Day Naturally
    PLAIN TEXT: Tackle The Week With Calm Energy And Focus
    HEADER: Natural Mood Support For Your Busy Day
    BODY: Life's demands don't have to feel overwhelming. Our Sweet Orange Hemp Extract Tinctures helps regulate your nervous system to reduce stress, combat fatigue, and promote a sense of calm when you need it most.* Keep your mood support consistent and save 20% by subscribing today!
    CTA: SHOP DAILY HEMP EXTRACT

    ## Example 5
    SUBJECT LINE: Two Limited-Time Mother's Day Bundles
    PLAIN TEXT: Save 15% On Thoughtful Gifts
    HEADER: Gifts That Support Her Wellness
    BODY: Mother's Day is almost here, and we've curated two special bundles that make it easy to give a gift with lasting impact. Order by Wednesday to ensure on-time delivery!
    CTA: SHOP THE MOTHER'S DAY COLLECTION
    
    
`;

// Additionally, here are a few formatting guidelines you should use while writing. Don't let these guidelines get in the way of your creativity, but do ensure they're followed. You may override the guidelines if the instructions explicity ask for it
//     ${formatInstructions}

    const email = await callLLM("gpt-5-mini", {
      system: writeSystem,
      user: `Template:\n${emailPrompt}`,
    });

    return NextResponse.json({
      outline: outline,
      email: email,
      parsedEmail: parseEmailTable(email),
    });
  } catch (err) {
    console.error("Email generation error", err);
    return NextResponse.json(
      { error: "Failed to generate email" },
      { status: 500 }
    );
  }
}
