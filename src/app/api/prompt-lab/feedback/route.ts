import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    const {
      emailPrompt,
      generatedEmail,
      feedbackType,
      negativeReasons = [],
      customFeedback = "",
    } = await req.json();

    if (!emailPrompt || !generatedEmail || !feedbackType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const negativeReason = negativeReasons.length > 0 
      ? negativeReasons.join(",") 
      : null;

    const { data, error } = await supabase
      .from("prompt_lab_feedback")
      .insert({
        email_prompt: emailPrompt,
        generated_email: generatedEmail,
        feedback_type: feedbackType,
        negative_reason: negativeReason,
        custom_feedback: customFeedback || null,
        session_id: req.headers.get("x-session-id") || null,
      });

    if (error) {
      console.error("Error saving feedback:", error);
      return NextResponse.json(
        { error: "Failed to save feedback" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Feedback submission error:", err);
    return NextResponse.json(
      { error: "Failed to submit feedback" },
      { status: 500 }
    );
  }
}