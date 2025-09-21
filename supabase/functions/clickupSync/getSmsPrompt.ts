type SmsPromptParams = {
  brandName: string;
  taskName: string;
  cartridge: string;
  links: string;
  contentStrategy: string;
  brandType: string;
  brandTone: string;
  examples?: string;
};

export async function getSMSPrompt({
  brandName,
  taskName,
  cartridge,
  links,
  contentStrategy,
  brandType,
  brandTone,
  examples,
}: SmsPromptParams) {
  return `
    create a marketing SMS message for a ${brandType} brand called ${brandName}. the brand uses a ${brandTone} tone.
    ${taskName ? `\n    Task reference (do not follow literally): ${taskName}\n` : ""}

    This sms has an email component that will be sent out with it. Use the email's content strategy to guide the sms. This content strategy is to be used as a reference, Don't follow it exactly, just use it as a reference for the content of the sms.

    content strategy:
    ${contentStrategy}

    ${links ? `here is the link associated with the sms(use the first one if there are multiple): ${links}\n` : ""}
    
    keep it under 160 characters. 
    
    FORMAT & STYLE RULES
    No Colons or Dashes

    the general format of the sms should be something like [brand name]:[message]:\n\n [CTA]:[link] \n\n[opt out]

    ${examples ? `\n    Mimic the tone, cadence, and structure of these successful SMS examples:\n    ${examples}\n    ` : ""}

    ${cartridge ? `Use the cartridge context if it provides brand nuances:\n    ${cartridge}\n` : ""}

    Think carefully through these instructions and write a compelling SMS draft.
  `;
}
