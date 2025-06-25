import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const supabase = await createClient();
    const { storeId } = await params;

    // Validate storeId
    if (!storeId) {
      return NextResponse.json(
        { error: "Store ID is required" },
        { status: 400 }
      );
    }

    // Fetch clickup tasks for the specified store
    const { data: tasks, error } = await supabase
      .from("clickup_tasks")
      .select("id, name, description, updated_at")
      .eq("store_id", storeId)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error fetching clickup tasks:", error);
      return NextResponse.json(
        { error: "Failed to fetch tasks" },
        { status: 500 }
      );
    }

    // Add logging to see the raw descriptions
    console.log("Fetched tasks for store:", storeId);
    console.log("Number of tasks:", tasks?.length);
    if (tasks?.length > 0) {
      (tasks as Array<{ description: string }>).forEach((task, index) => {
        console.log("Raw description:", task.description);
        console.log("Description type:", typeof task.description);
        console.log("Description length:", task.description?.length);
      });
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
