type PlainTextPromptParams = {
  brandName: string;
  taskName: string;
  cartridge: string;
  links: string;
  contentStrategy: string;
  brandType: string;
  brandTone: string;
  examples?: string;
};

export async function getPlainTextPrompt({
  brandName,
  taskName,
  cartridge,
  links,
  contentStrategy,
  brandType,
  brandTone,
  examples,
}: PlainTextPromptParams) {
  return `
    create a marketing plain text email for a ${brandType} brand called ${brandName}. the brand uses a ${brandTone} tone.
    ${taskName ? `\n    Task reference (do not follow literally): ${taskName}\n` : ""}

    This plain text email has a normal email component that will be sent out with it. Use the email's content strategy to guide the plain text email. This content strategy is to be used as a reference, Don't follow it exactly, just use it as a reference for the content of the plain text email.

    content strategy:
    ${contentStrategy}

    ${links ? `\n    When using links:\n    - Embed them naturally within the content using markdown format: [link text](url)\n    - The link text should be contextual and action-oriented (e.g., "Shop Now", "Learn More", "Get Started")\n    - You can use links in the Body or CTA sections\n    - If multiple links are provided, use them strategically based on their context\n    - Do NOT display raw URLs - always use meaningful link text\n\n    here is the link associated with the email(use the first one if there are multiple): ${links}\n    ` : ""}

    FORMAT & STYLE RULES
    No Colons or Dashes
    Do not use colons (:) or any form of dash (-, –, —) in the Plain Text.    
    Plain Text must be brand-agnostic

    ${examples ? `\n    Mimic the tone, cadence, and structure of these successful plain text examples:\n    ${examples}\n    ` : ""}

    ${cartridge ? `Use the cartridge context if it provides brand nuances:\n    ${cartridge}\n` : ""}

    Think carefully through these instructions and write a compelling plain text email.
  `;
}
