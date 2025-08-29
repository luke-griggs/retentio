declare const Deno: {
  env: { get: (key: string) => string | undefined };
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

export async function formatDraft({
  draft,
  type,
}: {
  draft: string;
  type: "email" | "sms" | "mms" | "plainText";
}) {
  console.log("FORMAT DRAFT CALLED");
  async function modelResponse(prompt: string) {
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
    return data.output[0].content[0].text;
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
    `
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
    `
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
    `
    const formattedDraft = await modelResponse(prompt);
    return formattedDraft;
  }

  return draft;
}

export default formatDraft;
