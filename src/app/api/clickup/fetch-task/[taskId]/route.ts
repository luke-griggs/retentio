import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/utils/supabase/supabaseAdmin";


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;

    // Validate taskId
    if (!taskId) {
      return NextResponse.json(
        { error: "Task ID is required" },
        { status: 400 }
      );
    }

    // Fetch the specific task
    const { data: task, error } = await supabaseAdmin
      .from("clickup_tasks")
      .select("id, store_id, name, description, updated_at")
      .eq("id", taskId)
      .single();

    if (error) {
      console.error("Error fetching task:", error);
      return NextResponse.json(
        { error: "Failed to fetch task" },
        { status: 500 }
      );
    }

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    console.log("task description", task.description);
    return NextResponse.json({ task });
  } catch (error) {
    console.error("Unexpected error fetching task:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

