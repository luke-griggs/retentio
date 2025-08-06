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
  Body: 200-240 characters total (including spaces & any emphasis markers)
  CTA: 15-20 characters
  Subject Line: 30-45 characters each
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
  model: "gpt-4o" | "claude-4-sonnet" | "claude-4-sonnet-thinking",
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
    You are the senior copywriter of our retention agency. You write the best goddamn copy we've ever seen kid. You've just received the initial template for the brand's next marketing email 
    **Task:** Deeply analyze the content strategy and use your expertise to provide a clear set of instructions for the content of the email based on the instructions from the content strategy
    
    Sidenotes:
    - the subject line should be based on the name of the campaign (not fully but use it as inspiration)
    - you don't need to provide any word count suggestions
    - the final email will consist of 5 sections: subject line, preview text, header, body, and cta.
    `

    
    const outline = await callLLM("claude-4-sonnet-thinking", {
      system: ideationSystem,
      user: `Template:\n${emailPrompt}`,
    });

    /* === 2) EMAIL ===================================================== */
    const writeSystem = `
    What's up! you're the senior copywriter of a retention agency and you're the best goddamn copywriter this agency's ever seen kid! I mean really, I've never seen someone sling subject lines like you do. You're about to receive the draft outline and writing instructions for the upcoming marketing email.
    Based on your expertise, carefully craft one of your signature marketing email based on the following outline and writing instructions. The email needs the following sections: subject line, preview text, header, body, and cta.
    
    ${outline}
      
    Additionally, here are a few formatting guidelines you should use while writing. Don't let these guidelines get in the way of your creativity, but do ensure they're followed. You may override the guidelines if the instructions explicity ask for it
    ${formatInstructions}

`;
    const email = await callLLM("claude-4-sonnet-thinking", {
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
