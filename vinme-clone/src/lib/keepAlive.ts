import { supabase } from "./supabase";

export function startKeepAlive() {
  setInterval(async () => {
    await supabase.from("profiles").select("user_id").limit(1);
  }, 4 * 60 * 1000); // ყოველ 4 წუთში
}