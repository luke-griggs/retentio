import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/utils/supabase/supabaseAdmin";

export async function GET(
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

    // Fetch brand cartridge using the store's clickup_list_id
    const { data: cartridge, error: cartridgeError } = await supabaseAdmin
      .from("brand_cartridges")
      .select("content")
      .eq("store_list_id", store.clickup_list_id)
      .limit(1)
      .single();

    if (cartridgeError) {
      // If no cartridge found, return empty content rather than error
      if (cartridgeError.code === "PGRST116") {
        return NextResponse.json({ cartridge: { content: "" } });
      }
      console.error("Error fetching brand cartridge:", cartridgeError);
      return NextResponse.json(
        { error: "Failed to fetch brand cartridge" },
        { status: 500 }
      );
    }

    return NextResponse.json({ cartridge: cartridge || { content: "" } });
  } catch (error) {
    console.error("Unexpected error fetching brand cartridge:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
