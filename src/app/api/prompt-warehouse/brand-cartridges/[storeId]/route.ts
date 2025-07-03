import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/utils/supabase/supabaseAdmin";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params;

    // Validate storeId
    if (!storeId) {
      return NextResponse.json(
        { error: "Store ID is required" },
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

    // First, get the store's clickup_list_id
    const { data: store, error: storeError } = await supabaseAdmin
      .from("stores")
      .select("clickup_list_id")
      .eq("id", storeId)
      .single();

    if (storeError) {
      console.error("Error fetching store:", storeError);
      return NextResponse.json(
        { error: "Failed to fetch store" },
        { status: 500 }
      );
    }

    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    // Upsert the brand cartridge using the store's clickup_list_id
    const { data, error } = await supabaseAdmin.from("brand_cartridges").upsert(
      {
        store_list_id: store.clickup_list_id,
        content: content,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "store_list_id",
      }
    );

    if (error) {
      console.error("Error saving brand cartridge:", error);
      return NextResponse.json(
        { error: "Failed to save brand cartridge" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, content });
  } catch (error) {
    console.error("Unexpected error saving brand cartridge:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
