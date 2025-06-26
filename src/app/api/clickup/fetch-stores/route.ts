import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Fetch all stores from the database
    const { data: stores, error } = await supabase
      .from("stores")
      .select("id, name, clickup_list_id")
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching stores:", error);
      return NextResponse.json(
        { error: "Failed to fetch stores" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, stores: stores });
  } catch (error) {
    console.error("Unexpected error fetching stores:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}