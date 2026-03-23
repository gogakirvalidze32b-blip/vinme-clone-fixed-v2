import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user?.id;
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // ვუთიშავთ ავტომატურ ჩამოჭრას (მაგრამ პრემიუმი რჩება ვადის ამოწურვამდე!)
    const { error } = await supabase
      .from("profiles")
      .update({ subscription_active: false })
      .eq("user_id", uid);

    if (error) throw error;

    return NextResponse.json({ success: true, message: "Subscription canceled" });
  } catch (err) {
    return NextResponse.json({ error: "Failed to cancel" }, { status: 500 });
  }
}