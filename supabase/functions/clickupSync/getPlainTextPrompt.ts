export async function getPlainTextPrompt(
    brandName: string,
    taskName: string,
    cartridge: string,
    links: string,
    contentStrategy: string,
    brandType: string,
    brandTone: string
  ) {
    return `
    create a marketing plain text email for a ${brandType} brand called ${brandName}. the brand uses a ${brandTone} tone. 
    
    This plain text email has a normal email component that will be sent out with it. Use the email's content strategy to guide the plain text email. This content strategy is to be used as a reference, Don't follow it exactly, just use it as a reference for the content of the plain text email.

    content strategy:
    ${contentStrategy}

    ${links ? `
   When using links:
    - Embed them naturally within the content using markdown format: [link text](url)
    - The link text should be contextual and action-oriented (e.g., "Shop Now", "Learn More", "Get Started")
    - You can use links in the Body or CTA sections
    - If multiple links are provided, use them strategically based on their context
    - Do NOT display raw URLs - always use meaningful link text

    here is the link associated with the email(use the first one if there are multiple): ${links}
    ` : ""}
    
    FORMAT & STYLE RULES
    No Colons or Dashes
    Do not use colons (:) or any form of dash (-, –, —) in the Plain Text.    
    Plain Text must be brand-agnostic
  
    Here are some examples of a plain text email that have worked well in the past:

    Subject Line: Still Need A Gift For Dad?
    Plain Text: Father's Day is almost here, and today is the LAST CHANCE to order for on-time shipping. \n\nIf you are [still looking for a gift for Dad](link), we've got you covered. \n\nOur gear is built for dads who bring everyone together around the grill. \n\nFrom prep to plate, we have the tools and bundles that help make the food memorable and the day run smoother. \n\n[Click here to get Dad the perfect Father's Day gift](link) \n\nNeed more ideas? Start here: \n\n- [Check out Secondz®](link) \n- [Shop Best Sellers](link) \n- [Shop BBQ Tools & Grilling Accessories](link) \n- [Gift Cards](link) \n\nNote: We recommend placing your order by Sunday evening. We are committed to shipping those orders by Wednesday. We cannot guarantee carrier times, so please choose the shipping method that works best for you. \n\nBest, \nThe Drip EZ Team \n\nNo longer want to receive these emails? {% unsubscribe %} |

    Subject Line: NEW! Limited Edition: Pacific Coast Detergent 
    Plain Text: Hi there, \n\n Meet [Pacific Coast](link), our newest limited-edition scent that captures a modern coastal escape in every wash. Sea salt and ocean lavender meet notes of warm amber, smoky vetiver, cardamom, and pink peppercorn. \n\n The result is fresh, sultry, and unforgettable. \n\n The formula is made to be safe for sensitive skin, free of dyes, parabens, and phthalates. \n\n Only available while supplies last. \n\n [Click here to try it before it's gone!](link) \n\n Looking for more? Explore our full lineup: \n - [Shop All](link) \n - [Shop Detergent Sheets](link) \n - [Shop Liquid Detergent](link) \n - [Shop Bundles](link) \n\n No longer want to receive these emails? {% unsubscribe %} |

    Subject Line: Free Next-Day Shipping Ends Tonight 
    Plain Text: Mother's Day is almost here. This is your [last chance to find the perfect last-minute gift](link). \n\n Thanks to our incredible team of jewelers, we've been able to extend FREE next-day shipping so your gift can arrive in time. \n\n This offer ends TONIGHT at Midnight PST. \n\n And to make it even easier, enjoy our 20% off sitewide Mother's Day sale. No code needed. \n\n - [Shop for New Moms](link) \n - [Shop for Moms of 2+](link) \n - [Shop for Grandmother](link) \n - [Shop for a Mother Figure in your life](link) \n\n If you want an even better deal, our [Warren Collection](link) is 25% off for a very limited time. No code needed. \n\n Each piece is thoughtfully crafted to honor her family, and designed to be worn and cherished for years to come. \n\n Please note that we guarantee shipping by this date, not final delivery timing. \n\n No longer want to receive these emails? {% unsubscribe %}|
     
    `;
  }
  