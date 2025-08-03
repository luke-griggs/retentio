export async function getMMSPrompt(
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
    | **PIC** | always leave this blank(we will add the pic later) |
    | **SMS** | [SMS text here] |
  
    
    IMPORTANT: 
    - Use ONLY the table format shown above
    - Do NOT use separate markdown code blocks
    - Keep all content in a single table
    
    RESTRICTIONS:
    - Emojis allowed
    - No em dashes

    
    2. FORMAT & STYLE RULES
    No Colons or Dashes


    The mms should follow this format:

    | PIC | |
    | SMS | [brand name]:[message]:\n\n [CTA]:[link] \n\n[opt out] |

    here are some examples of an mms:

    | PIC | |
    | SMS | Frey: The NEW Limited Edition Pacific Coast detergent is here 🌊 This fresh scent blends sea salt, ocean lavender, smoky vetiver, and a hint of spice, like a breezy drive along the cliffs with the windows down.\n\n Safe for sensitive skin and free of dyes, parabens, and phthalates.\n\n Only available while supplies last. \n\n Try it before it's gone: https://kvo2.io/XXXXXXXXX \n\nText STOP to opt out |

    | PIC | |
    | SMS | Legendary Foods: All of our NEW Protein Donuts are back in stock!\n\n Each flavor packs 20g protein, 0g sugar, 4-5g net carbs, and only 160 calories. Unbeatable macros with unbelievable taste. Plus, they’re Gluten-Free, Keto-Friendly, and GLP-1 Friendly 👊 \n\n Shop the Donut lineup: https://www.eatlegendary.com/collections/protein-donuts \n\n Text STOP to opt out |

    | PIC | |
    | SMS | Haverhill: Our 6-hour flash sale starts now! \n\n Save 30% on the Greenwich Flower Earrings Collection.\n\n A radiant cluster of five birthstones surrounding a brilliant diamond, hand-set in 14k gold. Choose gems that reflect your spirit or celebrates your loved ones.\n\n Personal, luminous, and only on sale through 11:59pm EST. Act fast before this offer is gone! \n\n Use Code: [leave this blank, don't use fake code]\n\n Shop Now: https://haverhill.com/products/5-birthstone-diamond-greenwich-earrings?_pos=1&_psq=greenwich+flower&_ss=e&_v=1.0\n\n Text STOP to opt out.|

    | PIC | |
    | SMS | Drip EZ: Flip, turn, and serve like a pro with our new heavy-duty Grill Tool Set! Rust-proof, ergonomic, dishwasher-safe.\n\n Grab Yours: https://bbqdripez.com/products/new-heavy-duty-grill-tool-set-spatula-fork-tongs \n\nText STOP to opt out |
 

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