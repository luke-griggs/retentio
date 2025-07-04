import { supabaseAdmin } from "@/utils/supabase/supabaseAdmin";

const getEmailEditPrompt = async () => {
  const { data, error } = await supabaseAdmin
    .from("prompts")
    .select("*")
    .eq("name", "emailEditPrompt");

  if (error) {
    console.error("Error fetching email edit prompt:", error);
    return null;
  }

  return data[0].prompt;
};

export default getEmailEditPrompt;