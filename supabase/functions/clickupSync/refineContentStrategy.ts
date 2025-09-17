declare const Deno: {
  env: { get: (key: string) => string | undefined };
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

export async function refineContentStrategy({
  contentStrategy,
}: {
  contentStrategy: string;
}) {
  const systemPrompt = `Inputs you will receive:
Vision:  <short description or a paragraph dump>
Return 2-3 sentences of email-writing instructions that are strictly derived from the inputs. Lean on the inputs, we essentially just need you to reword it. The idea is that currently, the content strategies for our emails are vague and lack actionable instruction. You're going to help us solve that issue. It's important to note that the email written based on your instructions needs to be somewhat concise(don't say this in the instruction just keep it in mind)
Output rules
Strip ops/time words from the Subject: launch, sale, promo, campaign, overview, email, newsletter, drop, today, new, holiday, seasonal.

-don't include visual instructions, the email will be purely text based.

-don't use em dashes in your response

-keep your instructions at a 9th grade reading level

-if the input will already result in a concise email and is actionable, you can pretty much just copy it

-return only the instructions, no other text

Subject anchoring
- Anchor to the provided Subject only; do not switch to other products/themes mentioned in the Vision.

Silent priorities (before writing)
1) Prefer a detail unique to the Subject (SKU/collection-specific vs category-generic).
2) Prefer a detail that maps to ONE clear user-visible outcome.
3) Prefer headline-worthy ideas; avoid body-type or compliance-sensitive claims.
- Ignore any gift/occasion/sales language that you see in the vision input

Composition
-If the inputs contain more requirements than will fit in 2-3 sentences, don't try to stuff them in, simply exclude what doesn't seem necessary. 

Here are some examples of clear, actionable instructions(notice how they're clear and actionable):
            
Example 1:Highlight the energizing, creative, and productive qualities of these morning strains. Emphasize the unique flavor profiles (cinnamon swirl, caramel-y goodness, zesty lemon). Connect to starting your day with inspiration and motivation

Example 2: Showcase the breadth of Mett Natural's Daily line products and how they cater to different preferences and needs. Reinforce that there's "something for everyone" in the Daily line, which is all about daily stress relief and wellness

Example 3: email focused on why Legendary is more than just snacks, highlight brand initiatives and what sets us apart. Include a clear 10% off banner to drive conversion.

Example 4: This is the final reminder of the month. Keep the copy urgent and direct: “Your last chance to take 15% off our Sleep collection with code SLEEP15. After tonight, pricing returns to normal.” Mention flagship items like the Sleep Soft Gels and Sleep Gummies, and suggest pairing them with Magnesium or the Night & Day Bundle for complete rest support. Keep body short and urgent with one clear CTA: Shop Sleep Before Midnight.

Here is the vision:
${contentStrategy}
`;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY!}`,
    },
    body: JSON.stringify({
      model: "gpt-5",
      input: systemPrompt,
      reasoning: {
        effort: "minimal",
      },
      text: {
        verbosity: "low",
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.log("Full error response:", errorBody);
    throw new Error(
      `OpenAI API error: ${response.status} ${response.statusText} - ${errorBody}`
    );
  }

  const data = await response.json();
  const refinedContentStrategy = data.output[1].content[0].text;
  console.log("REFINED CONTENT STRATEGY:", refinedContentStrategy);
  return refinedContentStrategy;
}

export default refineContentStrategy;
