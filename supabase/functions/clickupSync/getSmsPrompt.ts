export async function getSMSPrompt(
    brandName: string,
    taskName: string,
    cartridge: string,
    links: string,
    contentStrategy: string,
    emotionalDriver: string
  ) {
    return `
    act as an expert copywriter and produce a concise email with strict formatting and marketing frameworks below.
    
    the brand name is ${brandName}

    the name of the sms is ${taskName}

    here is link associated with the sms(use the first one if there are multiple): ${links}
    
    1. REQUIRED COMPONENTS & OUTPUT FORMAT
    Create the sms text and FORMAT it AS A TABLE using this EXACT structure (if it's not a table, bad things will happen):
    
    | Section | Content |
    |---------|---------|
    | **SMS** | [SMS text here] |
  
    
    IMPORTANT: 
    - Use ONLY the table format shown above
    - Do NOT use separate markdown code blocks
    - Keep all content in a single table
    
    RESTRICTIONS:
    - SMS: ≤ 160 characters (including spaces)
    - No emojis or em dashes
    - brand name, message, link, and opt out are all included in the character count 
    - when preview is made, the link will be shortened to between 25-35 characters depending on the length of the link

    
    2. FORMAT & STYLE RULES
    No Colons or Dashes


    The sms should follow this format:

    | SMS | [brand name]:[message]:\n\n [CTA]:[link] \n\n[opt out] |

    here are some examples of an sms:

    | SMS | Twelve South: A subtle home upgrade is coming. Charging, reimagined for the spaces you use most. \n\nSign up: https://kvo2.io/XXXXXXXXX \n\nText STOP to opt out |

    | SMS | MONSTERBASS: Topwater fan? Donkey Snacks deliver EXPLOSIVE strikes \n\nGrab it here: https://kvo2.io/XXXXXXXXX \n\nText STOP to opt out |

    | SMS | Frey: LIMITED EDITION Pacific Coast detergent is here! A shoreline escape in every wash. \n\nShop now: https://kvo2.io/XXXXXXXXX \n\nReply STOP to unsubscribe. |

    | SMS | Twelve South: PowerBug is here! Snap, charge & stay hands-free with our new Qi2 wall charger. \n\nShop Now: https://www.twelvesouth.com/products/powerbug \n\nText STOP to opt out |
 

    ${cartridge ? `
    5. CONTENT TO BASE THE SMS ON
    here is the content to base the sms on:
    ${cartridge}` : ""}
  
     ${contentStrategy ? `
    6. CONTENT STRATEGY
    Here is the content strategy for the sms:
    ${contentStrategy}` : ""}
  
    ${emotionalDriver ? `
    7. EMOTIONAL DRIVER
    Here is the emotional driver for the sms:
    ${emotionalDriver}` : ""}
    
    `;
  }
  