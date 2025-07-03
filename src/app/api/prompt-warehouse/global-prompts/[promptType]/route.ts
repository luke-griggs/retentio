import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/utils/supabase/supabaseAdmin";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ promptType: string }> }
) {
  try {
    const { promptType } = await params;

    // Validate promptType
    if (!promptType) {
      return NextResponse.json(
        { error: "Prompt type is required" },
        { status: 400 }
      );
    }

    // Fetch global prompt by type
    const { data: globalPrompt, error } = await supabaseAdmin
      .from("global_prompts")
      .select("content")
      .eq("prompt_type", promptType)
      .limit(1)
      .single();

    if (error) {
      // If no prompt found, return empty content rather than error
      if (error.code === "PGRST116") {
        return NextResponse.json({ content: "" });
      }
      console.error("Error fetching global prompt:", error);
      return NextResponse.json(
        { error: "Failed to fetch global prompt" },
        { status: 500 }
      );
    }

    return NextResponse.json({ content: globalPrompt?.content || "" });
  } catch (error) {
    console.error("Unexpected error fetching global prompt:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ promptType: string }> }
) {
  try {
    const { promptType } = await params;

    // Validate promptType
    if (!promptType) {
      return NextResponse.json(
        { error: "Prompt type is required" },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { content } = body;

    if (typeof content !== "string") {
      return NextResponse.json(
        { error: "Content must be a string" },
        { status: 400 }
      );
    }

    // Upsert the global prompt
    const { data, error } = await supabaseAdmin.from("global_prompts").upsert(
      {
        prompt_type: promptType,
        content: content,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "prompt_type",
      }
    );

    if (error) {
      console.error("Error saving global prompt:", error);
      return NextResponse.json(
        { error: "Failed to save global prompt" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, content });
  } catch (error) {
    console.error("Unexpected error saving global prompt:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
