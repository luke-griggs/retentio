import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const formatInstructions = `
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
Header: ≤ 60 characters (including spaces)
Body: ≤ 240 characters total (including spaces & any emphasis markers)
CTA: ≤ 20 characters
Subject Line: ≤ 45 characters each
Preview Text: ≤ 60 characters
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

Do not put any of the text in quotes.
`;

function parseEmailTable(tableContent: string): {
  subjectLines: string[];
  previewText: string;
  header: string;
  body: string;
  cta: string;
} {
  const lines = tableContent.split('\n').filter(line => line.trim());
  const result = {
    subjectLines: [] as string[],
    previewText: '',
    header: '',
    body: '',
    cta: '',
  };

  for (const line of lines) {
    if (line.includes('|') && !line.includes('------')) {
      const parts = line.split('|').map(p => p.trim()).filter(p => p);
      if (parts.length >= 2) {
        const section = parts[0].replace(/\*\*/g, '').toLowerCase();
        const content = parts[1];

        if (section === 'subject line') {
          result.subjectLines.push(content);
        } else if (section === 'preview text') {
          result.previewText = content;
        } else if (section === 'header') {
          result.header = content;
        } else if (section === 'body') {
          result.body = content;
        } else if (section === 'cta') {
          result.cta = content;
        }
      }
    }
  }

  return result;
}

export async function POST(request: NextRequest) {
  try {
    const { systemPrompt, emailPrompt, model = 'gpt-4o' } = await request.json();

    if (!systemPrompt || !emailPrompt) {
      return NextResponse.json(
        { error: 'Both system prompt and email prompt are required' },
        { status: 400 }
      );
    }

    // Combine user's prompt with formatting instructions
    const fullPrompt = `${systemPrompt}\n\n${formatInstructions}`;

    let response = '';

    if (model === 'claude-4-sonnet') {
      // Use Claude API
      const completion = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: fullPrompt,
        messages: [
          {
            role: 'user',
            content: emailPrompt,
          },
        ],
      });

      response = completion.content[0].type === 'text' ? completion.content[0].text : '';
    } else {
      // Use OpenAI API
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: fullPrompt,
          },
          {
            role: 'user',
            content: emailPrompt,
          },
        ],
      });

      response = completion.choices[0]?.message?.content || '';
    }

    const parsedEmail = parseEmailTable(response);

    return NextResponse.json({ 
      email: parsedEmail,
      rawResponse: response,
      model: model
    });
  } catch (error) {
    console.error('Error generating email:', error);
    return NextResponse.json(
      { error: 'Failed to generate email' },
      { status: 500 }
    );
  }
}