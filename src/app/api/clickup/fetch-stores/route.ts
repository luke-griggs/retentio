import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: NextRequest) {
  try {
    // Log environment variables (be careful with this in production)
    console.log("SUPABASE_URL exists:", !!process.env.SUPABASE_URL);
    console.log(
      "SUPABASE_SERVICE_ROLE_KEY exists:",
      !!process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const supabase = await createClient();

    // Fetch all stores from the database
    const { data: stores, error } = await supabase
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

    console.log("Stores fetched successfully:", stores?.length || 0, "stores");
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
