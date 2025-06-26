import { NextRequest, NextResponse } from "next/server";

export async function PUT(
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

    // Parse request body
    const body = await request.json();
    const description = body.description || "";
    const status = body.status || "";

    if (!description) {
      return NextResponse.json(
        { error: "Description is required" },
        { status: 400 }
      );
    }

    if (typeof description !== "string") {
      return NextResponse.json(
        { error: "Description must be a string" },
        { status: 400 }
      );
    }

    let updateBody: { markdown_content: string; status?: string } = {
      markdown_content: description,
    };

    if (status === "READY FOR DESIGN") {
      updateBody.status = status;
    }
    const options = {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `${process.env.CLICKUP_KEY}`,
      },
      body: JSON.stringify(updateBody),
    };

    const response = await fetch(
      `https://api.clickup.com/api/v2/task/${taskId}`,
      options
    );
    if (!response.ok) {
      throw new Error("Failed to update task");
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unexpected error updating task:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
