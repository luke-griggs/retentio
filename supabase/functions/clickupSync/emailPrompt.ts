export async function getEmailPrompt(
  taskName: string,
  cartridge: string,
  links: string,
  contentStrategy: string,
  emotionalDriver: string
) {
  return `
  act as an expert copywriter and produce a concise email with strict formatting and marketing frameworks below.
  
  the name of the email is ${taskName}
  
  1. REQUIRED COMPONENTS & OUTPUT FORMAT
  Create these seven elements and FORMAT THEM AS A TABLE using this EXACT structure (if it's not a table, bad things will happen):
  
  | Section | Content |
  |---------|---------|
  | **SUBJECT LINE** | [Subject line here] |
  | **SUBJECT LINE** | [Subject line here] |
  | **SUBJECT LINE** | [Subject line here] |
  | **PREVIEW TEXT** | [Preview text here] |
  | **HEADER** | [Header text here] |
  | **BODY** | [Body text here] |
  | **CTA** | [CTA with link here] |

  
  IMPORTANT: 
  - Use ONLY the table format shown above
  - Do NOT use separate markdown code blocks
  - Keep all content in a single table
  - Each row should contain the complete content for that section
  
  2. CHARACTER LIMITS (ENFORCE STRICTLY)
  Header: ≤ 40-60 characters (including spaces)
  Body: ≤ 200-240 characters total (including spaces & any emphasis markers)
  CTA: ≤ 15-20 characters
  Subject Line: ≤ 30-45 characters each
  Preview Text: ≤ 40-60 characters
  If any section goes over its limit, revise automatically until it fits.
  
  3. FORMAT & STYLE RULES
  No Colons or Dashes
  
  Do not use colons (:) or any form of dash (-, –, —) in the Header, Subject Line, or Preview Text.
  If absolutely necessary in the Body, keep it minimal—but ideally avoid them altogether.
  Title Case for Subject & Preview
  
  Capitalize Each Word in the Subject Line and Preview Text. (Small filler words can stay lowercase if that's your house style.)
  Emphasis
  
  You may apply bold + italics together on the same word or short phrase, like **_example_**.
  Limit to 3 instances of emphasis in the Body.
  Do not bold one word and italicize a different word; emphasis must be on the same word/phrase if used.
  No Banned Words as Openers
  
  Never start any section (Header, Body, CTA, Subject, Preview) with "Transform," "Discover," "Experience," "Reimagine," or "Elevate."
  Avoid generic marketing clichés such as "unlock," "epic," "ultimate," etc. If you catch yourself using them, pick synonyms or rephrase.
  No Brand or Endorser/Product Names (Subject, Preview, Body)
  
  Subject, Preview, Body must be brand-agnostic unless the context explicitly demands naming.

  4. Subject Lines
  Include 3 potential subject lines
  | **SUBJECT LINE** | <subject line 1> |
  | **SUBJECT LINE** | <subject line 2> |
  | **SUBJECT LINE** | <subject line 3> |

  ${links ? `
    4. LINKS USAGE
    The following links are available for embedding in the email where appropriate:
    ${links}` : ""}
  
  When using links:
  - Embed them naturally within the content using markdown format: [link text](url)
  - The link text should be contextual and action-oriented (e.g., "Shop Now", "Learn More", "Get Started")
  - You can use links in the Body or CTA sections
  - If multiple links are provided, use them strategically based on their context
  - Do NOT display raw URLs - always use meaningful link text

  
  ${cartridge ? `
  5. CONTENT TO BASE THE EMAIL ON
  here is the content to base the email on:
  ${cartridge}` : ""}

   ${contentStrategy ? `
  6. CONTENT STRATEGY
  Here is the content strategy for the email:
  ${contentStrategy}` : ""}

  ${emotionalDriver ? `
  7. EMOTIONAL DRIVER
  Here is the emotional driver for the email:
  ${emotionalDriver}` : ""}
  
  `;
}
