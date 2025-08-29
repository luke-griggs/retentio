export async function getSMSPrompt(
    brandName: string,
    taskName: string,
    cartridge: string,
    links: string,
    contentStrategy: string,
    brandType: string,
    brandTone: string
  ) {
    return `
    create a marketing SMS message for a ${brandType} brand called ${brandName}. the brand uses a ${brandTone} tone. 
    
    This sms has an email component that was will be sent out with it. Use the email's content strategy to guide the sms. This content strategy is to be used as a reference, Don't follow it exactly, just use it as a reference for the content of the sms.

    content strategy: ${contentStrategy}

    here is the link associated with the sms(use the first one if there are multiple): ${links}
    
    keep it under 160 characters. 
    
    2. FORMAT & STYLE RULES
    No Colons or Dashes

    the general format of the sms should be something like [brand name]:[message]:\n\n [CTA]:[link] \n\n[opt out]

    here are some examples of sms that have worked well in the past:

    Example 1: Twelve South: A subtle home upgrade is coming. Charging, reimagined for the spaces you use most. \n\nSign up: https://kvo2.io/XXXXXXXXX \n\nText STOP to opt out |

    Example 2: MONSTERBASS: Topwater fan? Donkey Snacks deliver EXPLOSIVE strikes \n\nGrab it here: https://kvo2.io/XXXXXXXXX \n\nText STOP to opt out |

    Example 3: Frey: LIMITED EDITION Pacific Coast detergent is here! A shoreline escape in every wash. \n\nShop now: https://kvo2.io/XXXXXXXXX \n\nReply STOP to unsubscribe. |

    Example 4: Twelve South: PowerBug is here! Snap, charge & stay hands-free with our new Qi2 wall charger. \n\nShop Now: https://www.twelvesouth.com/products/powerbug \n\nText STOP to opt out |
 
    `;
  }
  