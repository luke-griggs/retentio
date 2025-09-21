type MmsPromptParams = {
  brandName: string;
  taskName: string;
  cartridge: string;
  links: string;
  contentStrategy: string;
  brandType: string;
  brandTone: string;
  examples?: string;
};

export async function getMMSPrompt({
  brandName,
  taskName,
  cartridge,
  links,
  contentStrategy,
  brandType,
  brandTone,
  examples,
}: MmsPromptParams) {
  return `
    create a marketing MMS message for a ${brandType} brand called ${brandName}. the brand uses a ${brandTone} tone.
    ${taskName ? `\n    Task reference (do not follow literally): ${taskName}\n` : ""}

    This mms has an email component that will be sent out with it. Use the email's content strategy to guide the mms. This content strategy is to be used as a reference, Don't follow it exactly, just use it as a reference for the content of the mms.
    content strategy:
    ${contentStrategy}

    ${links ? `here is the link associated with the mms(use the first one if there are multiple): ${links}\n` : ""}
    
    keep it under 160 characters. 
    
    FORMAT & STYLE RULES
    No Colons or Dashes

    ${examples ? `\n    Mimic the tone, cadence, and structure of these successful MMS examples:\n    ${examples}\n    ` : ""}

    ${cartridge ? `Use the cartridge context if it provides brand nuances:\n    ${cartridge}\n` : ""}

    Think carefully through these instructions and write a compelling MMS draft.
  `;
}
