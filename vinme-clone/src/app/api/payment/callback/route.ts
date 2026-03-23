import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
 
const PLANS: Record<string, { days: number }> = {
  week:  { days: 7   },
  month: { days: 30  },
  year:  { days: 365 },
};
 
// app/api/payment/callback/route.ts
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { status, shop_order_id, order_id, saved_card_token } = body; 

    if (status !== "success") return NextResponse.json({ received: true });

    const parts = shop_order_id.split("_");
    const userId = parts[0];
    const plan = parts[1];

    const supabase = getSupabaseAdmin();
    const expireDate = new Date();
    expireDate.setDate(expireDate.getDate() + PLANS[plan].days);

    // 🔥 ვინახავთ პრემიუმს + ტოკენს + ვრთავთ subscription-ს
    const updateData: any = {
      is_premium: true,
      premium_until: expireDate.toISOString(),
      premium_plan: plan,
      premium_order_id: order_id,
      subscription_active: true, // ჩაირთო ავტომატური გამოწერა
    };

    // თუ ბანკმა ტოკენი დაგვიბრუნა, ვინახავთ მომავალი ჩამოჭრებისთვის
    if (saved_card_token) {
      updateData.bog_card_token = saved_card_token;
    }

    await supabase.from("profiles").update(updateData).eq("user_id", userId);

    return NextResponse.json({ received: true, activated: true });
  } catch (err) {
    return NextResponse.json({ error: "Callback failed" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: "ok" });
}
 