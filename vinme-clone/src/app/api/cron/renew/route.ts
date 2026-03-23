import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  // უსაფრთხოებისთვის: შეამოწმე საიდუმლო გასაღები (რომ სხვამ არ გამოიძახოს ეს ლინკი)
  if (req.headers.get("Authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const today = new Date().toISOString();

  // 1. მოგვაქვს იუზერები, ვისაც გაუვიდა ვადა და გამოწერა აქტიური აქვთ
  const { data: expiringUsers } = await supabase
    .from("profiles")
    .select("user_id, premium_plan, bog_card_token")
    .eq("subscription_active", true)
    .lte("premium_until", today); // ვისაც ვადა გაუვიდა დღეს ან გუშინ

  if (!expiringUsers || expiringUsers.length === 0) {
    return NextResponse.json({ message: "No renewals needed today" });
  }

  for (const user of expiringUsers) {
    try {
      // 2. მივმართავთ BOG API-ს ავტომატური ჩამოჭრისთვის (MIT)
      // (აქ გამოიყენებ BOG-ის განმეორებადი გადახდის ენდპოინტს)
      const success = await chargeCardAutomatically(user.bog_card_token, user.premium_plan);

      if (success) {
        // 3. თუ წარმატებით ჩამოიჭრა, ვუმატებთ კიდევ 1 თვეს
        const newExpire = new Date();
        newExpire.setDate(newExpire.getDate() + 30); // ან პლანის მიხედვით

        await supabase.from("profiles")
          .update({ premium_until: newExpire.toISOString() })
          .eq("user_id", user.user_id);
      } else {
        // თუ ბარათზე ფული არ იყო, ვუთიშავთ პრემიუმს
        await supabase.from("profiles")
          .update({ is_premium: false, subscription_active: false })
          .eq("user_id", user.user_id);
      }
    } catch (e) {
      console.error(`Failed to renew for user ${user.user_id}`, e);
    }
  }

  return NextResponse.json({ success: true, renewed: expiringUsers.length });
}

// დამხმარე ფუნქცია BOG-დან ფულის ჩამოსაჭრელად ძველი ტოკენით
async function chargeCardAutomatically(token: string, plan: string) {
  // აქ გააგზავნი მოთხოვნას BOG iPay-სთან.
  // ზუსტი ლოგიკა დამოკიდებულია BOG API-ის ვერსიაზე.
  // ძირითადად აგზავნი: amount, token (ან saved_card_id) და intent: "CAPTURE".
  return true; // თუ წარმატებულია აბრუნებს true-ს.
}