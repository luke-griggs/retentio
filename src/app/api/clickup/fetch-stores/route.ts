import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/utils/supabase/supabaseAdmin";

export async function GET(request: NextRequest) {
  try {
    const { data: stores, error } = await supabaseAdmin
      .from("stores")
      .select("id, name, clickup_list_id")
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
