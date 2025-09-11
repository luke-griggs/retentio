declare const Deno: {
  env: { get: (key: string) => string | undefined };
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
};

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

export async function formatDraft({
  draft,
  type,
}: {
  draft: string;
  type: "email" | "sms" | "mms" | "plainText";
}) {
  console.log("FORMAT DRAFT CALLED WITH DRAFT:", draft);
  console.log("Input draft length:", draft.length);
  console.log("Draft type:", type);

  async function modelResponse(prompt: string) {
    console.log("Format prompt length:", prompt.length);
    console.log("Format prompt preview:", prompt.substring(0, 200) + "...");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.log("Full format error response:", errorBody);
      throw new Error(
        `Anthropic API error: ${response.status} ${response.statusText} - ${errorBody}`
      );
    }

    const data = await response.json();
    console.log("Full format response data:", JSON.stringify(data, null, 2));
    const result = data.content[0].text;
    console.log("Format result length:", result.length);
    return result;
  }

  if (type === "email") {
    const prompt = `
    you are going to receive a marketing email with the following fields. Subject Line, Preview Text, Header, body, CTA. Format the email into a markdown table using this exact form:

    | Section | Content |
    |---------|---------|
    | **SUBJECT LINE** | [Subject line here] |
    | **PREVIEW TEXT** | [Preview text here] |
    | **HEADER** | [Header text here] |
    | **BODY** | [Body text here] |
    | **CTA** | [CTA here] |

    Do not modify the content of the original email, just format it into the table format above and return only the table in your response.

    Here is the email: 
    ${draft}
    `;
    const formattedDraft = await modelResponse(prompt);
    return formattedDraft;
  }

  if (type === "sms") {
    const prompt = `    
    you are going to receive a marketing sms with the following fields. Format it into a markdown table using this exact form:

    | Section | Content |
    |---------|---------|
    | **SMS** | [SMS text here] |

    Do not modify the content of the original sms, just format it into the table format above and return only the table in your response.

    here is the sms:
    ${draft}
    `;
    const formattedDraft = await modelResponse(prompt);
    return formattedDraft;
  }

  if (type === "mms") {
    const prompt = `
    you are going to receive a marketing sms with the following fields. Format it into a markdown table using this exact form:

    | Section | Content |
    |---------|---------|
    | **PIC** | always leave this blank(we will add the pic later) |
    | **SMS** | [SMS text here] |

    Do not modify the content of the original sms, just format it into the table format above and return only the table in your response.

    here is the sms:
    ${draft}
    `;
    const formattedDraft = await modelResponse(prompt);
    return formattedDraft;
  }

  if (type === "plainText") {
    const prompt = `
    you are going to receive a marketing plain text email with the following fields. Format it into a markdown table using this exact form:

    | Section | Content |
    |---------|---------|
    | **SUBJECT LINE** | [Subject line here] |
    | **PLAIN TEXT** | [Plain text here] |

    Do not modify the content of the original email, just format it into the table format above and return only the table in your response.

    here is the email:
    ${draft}
    `;
    const formattedDraft = await modelResponse(prompt);
    return formattedDraft;
  }

  return draft;
}

export default formatDraft;
