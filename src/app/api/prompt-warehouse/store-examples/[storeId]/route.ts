import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/utils/supabase/supabaseAdmin";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params;

    if (!storeId) {
      return NextResponse.json(
        { error: "Store ID is required" },
        { status: 400 }
      );
    }

    const { data: store, error: fetchError } = await supabaseAdmin
      .from("stores")
      .select("email_examples")
      .eq("id", storeId)
      .single();

    if (fetchError) {
      console.error("Error fetching store email examples:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch email examples" },
        { status: 500 }
      );
    }

    return NextResponse.json({ emailExamples: store?.email_examples ?? "" });
  } catch (error) {
    console.error("Unexpected error fetching email examples:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params;

    if (!storeId) {
      return NextResponse.json(
        { error: "Store ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { content } = body;

    if (typeof content !== "string") {
      return NextResponse.json(
        { error: "Content must be a string" },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from("stores")
      .update({ email_examples: content })
      .eq("id", storeId);

    if (updateError) {
      console.error("Error saving email examples:", updateError);
      return NextResponse.json(
        { error: "Failed to save email examples" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, content });
  } catch (error) {
    console.error("Unexpected error saving email examples:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
