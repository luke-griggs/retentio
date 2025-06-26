import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: NextRequest) {
  try {
    // Log environment info (safely)
    console.log("Environment Info:", {
      supabaseUrlPrefix: process.env.SUPABASE_URL?.substring(0, 30),
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      deploymentUrl: request.nextUrl.host,
      timestamp: new Date().toISOString(),
    });

    const supabase = await createClient();

    // Test basic connectivity first
    const { data: testData, error: testError } = await supabase
      .from("stores")
      .select("count")
      .limit(1);

    console.log("Basic connectivity test:", { testData, testError });

    // Try to get ANY data from stores table
    const { data: allData, error: allError } = await supabase
      .from("stores")
      .select("*");

    console.log("All stores query:", {
      count: allData?.length || 0,
      error: allError,
      firstRow: allData?.[0] || null,
    });

    // Original query
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

    console.log("Final result:", {
      storeCount: stores?.length || 0,
      stores: stores?.slice(0, 2), // Log first 2 stores for debugging
    });

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
