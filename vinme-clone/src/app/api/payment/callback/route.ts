import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const PLANS: Record<string, { days: number }> = {
  week:  { days: 7 },
  month: { days: 30 },
  year:  { days: 365 },
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { order_id, external_order_id, status } = body;

    if (!external_order_id) return NextResponse.json({ error: "Missing order id" }, { status: 400 });

    const parts = external_order_id.split("_");
    const userId = parts[0];
    const plan = parts[1];

    if (!userId || !plan || !PLANS[plan]) return NextResponse.json({ error: "Invalid order format" }, { status: 400 });

    if (status !== "success") return NextResponse.json({ received: true });

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

    if (error) return NextResponse.json({ error: "DB update failed" }, { status: 500 });

    return NextResponse.json({ received: true, activated: true });
  } catch (err) {
    console.error("Callback error:", err);
    return NextResponse.json({ error: "Callback failed" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: "ok" });
}