export async function getMMSPrompt(
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


    here are some examples of sms that have worked well in the past:

    Frey: The NEW Limited Edition Pacific Coast detergent is here 🌊 This fresh scent blends sea salt, ocean lavender, smoky vetiver, and a hint of spice, like a breezy drive along the cliffs with the windows down.\n\n Safe for sensitive skin and free of dyes, parabens, and phthalates.\n\n Only available while supplies last. \n\n Try it before it's gone: https://kvo2.io/XXXXXXXXX \n\nText STOP to opt out |

    Legendary Foods: All of our NEW Protein Donuts are back in stock!\n\n Each flavor packs 20g protein, 0g sugar, 4-5g net carbs, and only 160 calories. Unbeatable macros with unbelievable taste. Plus, they’re Gluten-Free, Keto-Friendly, and GLP-1 Friendly 👊 \n\n Shop the Donut lineup: https://www.eatlegendary.com/collections/protein-donuts \n\n Text STOP to opt out |

    Haverhill: Our 6-hour flash sale starts now! \n\n Save 30% on the Greenwich Flower Earrings Collection.\n\n A radiant cluster of five birthstones surrounding a brilliant diamond, hand-set in 14k gold. Choose gems that reflect your spirit or celebrates your loved ones.\n\n Personal, luminous, and only on sale through 11:59pm EST. Act fast before this offer is gone! \n\n Use Code: [leave this blank, don't use fake code]\n\n Shop Now: https://haverhill.com/products/5-birthstone-diamond-greenwich-earrings?_pos=1&_psq=greenwich+flower&_ss=e&_v=1.0\n\n Text STOP to opt out.|

    Drip EZ: Flip, turn, and serve like a pro with our new heavy-duty Grill Tool Set! Rust-proof, ergonomic, dishwasher-safe.\n\n Grab Yours: https://bbqdripez.com/products/new-heavy-duty-grill-tool-set-spatula-fork-tongs \n\nText STOP to opt out |
 
`
  }