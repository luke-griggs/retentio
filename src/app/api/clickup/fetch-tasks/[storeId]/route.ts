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

    // Fetch clickup tasks for the specified store
    const { data: tasks, error } = await supabaseAdmin
      .from("clickup_tasks")
      .select("id, name, description, updated_at, content_strategy, promo, notes, links, info_complete")
      .eq("store_id", storeId)
      .order("updated_at", { ascending: false }); 

    if (error) {
      console.error("Error fetching clickup tasks:", error);
      return NextResponse.json(
        { error: "Failed to fetch tasks" },
        { status: 500 }
      );
    }

    return NextResponse.json({ tasks: tasks || [] });
  } catch (error) {
    console.error("Unexpected error fetching tasks:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
