import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const testMarkdown = `| Section | Content |
|---------|---------| 
| **HEADER** | Simplify Your Path to Success |
| **BODY** | Embrace a breakthrough! Simplify your routine and reach your goals faster. Our new approach helps you save time and boost productivity. Focus on what truly matters to you. Take control and make progress. **_Start fresh_** today. |
| **CTA** | Get Started Now |
| **SUBJECT LINE** | Achieve More With Less Effort |
| **PREVIEW TEXT** | Your Potential Awaits Streamline Your Journey to Success |`;

    console.log("=== TEST MARKDOWN INSERT ===");
    console.log("Test markdown length:", testMarkdown.length);
    console.log("Test markdown contains tables:", testMarkdown.includes("|"));
    console.log("Test markdown content:", testMarkdown);

    const testRecord = {
      id: "test-markdown-" + Date.now(),
      store_id: null,
      name: "Test Markdown Record",
      description: testMarkdown,
      updated_at: new Date().toISOString(),
    };

    // Insert the test record
    const { data: insertData, error: insertError } = await supabase
      .from("clickup_tasks")
      .insert(testRecord)
      .select();

    if (insertError) {
      console.error("Insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to insert test record", details: insertError },
        { status: 500 }
      );
    }

    console.log("=== AFTER INSERT ===");
    console.log("Inserted data:", JSON.stringify(insertData, null, 2));

    // Immediately fetch it back
    const { data: fetchData, error: fetchError } = await supabase
      .from("clickup_tasks")
      .select("description")
      .eq("id", testRecord.id)
      .single();

    if (fetchError) {
      console.error("Fetch error:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch test record", details: fetchError },
        { status: 500 }
      );
    }

    console.log("=== FETCHED BACK ===");
    console.log("Fetched description length:", fetchData.description?.length);
    console.log(
      "Fetched contains tables:",
      fetchData.description?.includes("|")
    );
    console.log("Fetched content:", fetchData.description);

    const isMatch = testMarkdown === fetchData.description;
    console.log("Content matches:", isMatch);

    if (!isMatch) {
      console.log("🚨 CONTENT MISMATCH DETECTED!");
      console.log("Original length:", testMarkdown.length);
      console.log("Fetched length:", fetchData.description?.length);
    }

    // Clean up - delete the test record
    await supabase.from("clickup_tasks").delete().eq("id", testRecord.id);

    return NextResponse.json({
      success: true,
      originalLength: testMarkdown.length,
      fetchedLength: fetchData.description?.length,
      contentMatches: isMatch,
      originalContent: testMarkdown,
      fetchedContent: fetchData.description,
      analysis: {
        originalHasTables: testMarkdown.includes("|"),
        fetchedHasTables: fetchData.description?.includes("|"),
        lengthDifference:
          testMarkdown.length - (fetchData.description?.length || 0),
      },
    });
  } catch (error) {
    console.error("Test error:", error);
    return NextResponse.json(
      { error: "Test failed", details: error },
      { status: 500 }
    );
  }
}
