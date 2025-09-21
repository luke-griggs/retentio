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

    const typeParam = request.nextUrl.searchParams.get("type") ?? "email";
    const columnMap = {
      email: "email_examples",
      plain_text: "plain_text_examples",
      sms: "sms_examples",
      mms: "mms_examples",
    } as const;

    if (!Object.prototype.hasOwnProperty.call(columnMap, typeParam)) {
      return NextResponse.json(
        { error: "Invalid examples type" },
        { status: 400 }
      );
    }

    const column = columnMap[typeParam as keyof typeof columnMap];

    const { data: store, error: fetchError } = await supabaseAdmin
      .from("stores")
      .select(column)
      .eq("id", storeId)
      .single();

    if (fetchError) {
      console.error(`Error fetching store ${column}:`, fetchError);
      return NextResponse.json(
        { error: "Failed to fetch examples" },
        { status: 500 }
      );
    }

    const content = store?.[column as keyof typeof store] ?? "";

    return NextResponse.json({ content: content ?? "" });
  } catch (error) {
    console.error("Unexpected error fetching examples:", error);
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

    const typeParam = request.nextUrl.searchParams.get("type") ?? "email";
    const columnMap = {
      email: "email_examples",
      plain_text: "plain_text_examples",
      sms: "sms_examples",
      mms: "mms_examples",
    } as const;

    if (!Object.prototype.hasOwnProperty.call(columnMap, typeParam)) {
      return NextResponse.json(
        { error: "Invalid examples type" },
        { status: 400 }
      );
    }

    const column = columnMap[typeParam as keyof typeof columnMap];

    const { error: updateError } = await supabaseAdmin
      .from("stores")
      .update({ [column]: content })
      .eq("id", storeId);

    if (updateError) {
      console.error(`Error saving store ${column}:`, updateError);
      return NextResponse.json(
        { error: "Failed to save examples" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, content });
  } catch (error) {
    console.error("Unexpected error saving examples:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
