import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/utils/supabase/supabaseAdmin";

export async function GET(request: NextRequest) {
  try {
    const { data: stores, error } = await supabaseAdmin
      .from("stores")
      .select("id, name, clickup_list_id, brand_type, brand_tone")
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching stores:", error);
      return NextResponse.json(
        { error: "Failed to fetch stores", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, stores: stores || [] });
  } catch (error) {
    console.error("Unexpected error fetching stores:", error);
    return NextResponse.json(
      {
        error: "An unexpected error occurred",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, clickup_list_id, brand_type, brand_tone } =
      await request.json();

    const trimmedName = typeof name === "string" ? name.trim() : "";
    const trimmedListId =
      typeof clickup_list_id === "string" ? clickup_list_id.trim() : "";
    const trimmedBrandType =
      typeof brand_type === "string" ? brand_type.trim() : null;
    const trimmedBrandTone =
      typeof brand_tone === "string" ? brand_tone.trim() : null;

    if (!trimmedName || !trimmedListId) {
      return NextResponse.json(
        { error: "Name and ClickUp list ID are required" },
        { status: 400 }
      );
    }

    const [storeByName, storeByListId] = await Promise.all([
      supabaseAdmin
        .from("stores")
        .select("id")
        .eq("name", trimmedName)
        .maybeSingle(),
      supabaseAdmin
        .from("stores")
        .select("id")
        .eq("clickup_list_id", trimmedListId)
        .maybeSingle(),
    ]);

    if (storeByName.error || storeByListId.error) {
      console.error("Error checking existing store:", {
        nameError: storeByName.error,
        listIdError: storeByListId.error,
      });
      return NextResponse.json(
        { error: "Failed to verify store uniqueness" },
        { status: 500 }
      );
    }

    if (storeByName.data || storeByListId.data) {
      return NextResponse.json(
        { error: "A store with this name or ClickUp list ID already exists" },
        { status: 409 }
      );
    }

    const { data: store, error } = await supabaseAdmin
      .from("stores")
      .insert({
        name: trimmedName,
        clickup_list_id: trimmedListId,
        brand_type: trimmedBrandType,
        brand_tone: trimmedBrandTone,
      })
      .select("id, name, clickup_list_id, brand_type, brand_tone")
      .single();

    if (error) {
      console.error("Error creating store:", error);
      return NextResponse.json(
        { error: "Failed to create store", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, store },
      { status: 201 }
    );
  } catch (error) {
    console.error("Unexpected error creating store:", error);
    return NextResponse.json(
      {
        error: "An unexpected error occurred",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
