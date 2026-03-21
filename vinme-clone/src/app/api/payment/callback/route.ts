import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
 
const PLANS: Record<string, { days: number }> = {
  week:  { days: 7   },
  month: { days: 30  },
  year:  { days: 365 },
};
 
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("BOG Callback:", JSON.stringify(body));
 
    // BOG გვიგზავნის: status, order_id, shop_order_id, payment_hash
    const { status, shop_order_id, order_id } = body;
 
    if (!shop_order_id) {
      return NextResponse.json({ error: "Missing shop_order_id" }, { status: 400 });
    }
 
    // shop_order_id ფორმატი: {userId}_{plan}_{timestamp}
    const parts = shop_order_id.split("_");
    const userId = parts[0];
    const plan = parts[1];
 
    if (!userId || !plan || !PLANS[plan]) {
      console.error("Invalid shop_order_id format:", shop_order_id);
      return NextResponse.json({ error: "Invalid order format" }, { status: 400 });
    }
 
    // მხოლოდ წარმატებული გადახდისას
    if (status !== "success") {
      console.log(`Payment not successful: ${status}`);
      return NextResponse.json({ received: true });
    }
 
    const supabase = getSupabaseAdmin();
    const expireDate = new Date();
    expireDate.setDate(expireDate.getDate() + PLANS[plan].days);
 
    const { error } = await supabase
      .from("profiles")
      .update({
        is_premium: true,
        premium_until: expireDate.toISOString(),
        premium_plan: plan,
        premium_order_id: order_id,
      })
      .eq("user_id", userId);
 
    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json({ error: "DB update failed" }, { status: 500 });
    }
 
    console.log(`✅ Premium activated: user=${userId}, plan=${plan}`);
    return NextResponse.json({ received: true, activated: true });
 
  } catch (err) {
    console.error("Callback error:", err);
    return NextResponse.json({ error: "Callback failed" }, { status: 500 });
  }
}
 
export async function GET() {
  return NextResponse.json({ status: "ok" });
}
 