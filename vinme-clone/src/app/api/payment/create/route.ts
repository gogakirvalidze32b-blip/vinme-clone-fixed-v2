import { NextRequest, NextResponse } from "next/server";
 
const BOG_CLIENT_ID = process.env.BOG_CLIENT_ID || "1006";
const BOG_SECRET_KEY = process.env.BOG_SECRET_KEY || "581ba5eeadd657c8ccddc74c839bd3ad";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
 
const BOG_AUTH_URL = "https://dev.ipay.ge/opay/api/v1/oauth2/token";
const BOG_ORDER_URL = "https://dev.ipay.ge/opay/api/v1/checkout/orders";
 
const PLANS: Record<string, { price: number; days: number; name: string }> = {
  week:  { price: 47.50,  days: 7,   name: "Shekhvdi Plus - 1 კვირა" },
  month: { price: 95.00,  days: 30,  name: "Shekhvdi Plus - 1 თვე"   },
  year:  { price: 570.00, days: 365, name: "Shekhvdi Plus - 1 წელი"  },
};
 
async function getBOGToken(): Promise<string> {
  const credentials = Buffer.from(`${BOG_CLIENT_ID}:${BOG_SECRET_KEY}`).toString("base64");
 
  const res = await fetch(BOG_AUTH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Basic ${credentials}`,
    },
    body: "grant_type=client_credentials",
  });
 
  if (!res.ok) {
    const err = await res.text();
    console.error("BOG auth error:", err);
    throw new Error("BOG auth failed");
  }
 
  const data = await res.json();
  console.log("BOG token OK");
  return data.access_token;
}
 
export async function POST(req: NextRequest) {
  try {
    const { plan, userId } = await req.json();
 
    if (!plan || !PLANS[plan]) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    if (!userId) return NextResponse.json({ error: "User not found" }, { status: 401 });
 
    const token = await getBOGToken();
    const shopOrderId = `${userId}_${plan}_${Date.now()}`;
    const planData = PLANS[plan];
 
   // app/api/payment/create/route.ts (შემოკლებული)
const body = {
  intent: "CAPTURE",
  purchaseUnit: {
    amount: {
      value: planData.price.toFixed(2),
      currency_code: "GEL",
    },
    shop_order_id: shopOrderId,
  },
  // 🔥 ვეუბნებით BOG-ს, რომ გვინდა ბარათის ტოკენი დაგვიბრუნოს მომავალი ჩამოჭრებისთვის
  save_card: true, 
  redirect_urls: {
    success: `${APP_URL}/premium?status=success`,
    fail: `${APP_URL}/premium?status=fail`,
  },
  callback_url: `${APP_URL}/api/payment/callback`,
};
 
    console.log("BOG order request:", JSON.stringify(body));
 
    const orderRes = await fetch(BOG_ORDER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
 
    const orderData = await orderRes.json();
    console.log("BOG order response:", JSON.stringify(orderData));
 
    if (!orderRes.ok) {
      throw new Error("Failed to create BOG order");
    }
 
    // redirect link - BOG გვიბრუნებს გადახდის გვერდს
    const redirectUrl = orderData._links?.redirect?.href
      || orderData.links?.find((l: { rel: string }) => l.rel === "approve")?.href
      || orderData.redirectUrl;
 
    return NextResponse.json({
      orderId: orderData.id,
      redirectUrl,
      shopOrderId,
    });
 
  } catch (err) {
    console.error("Payment create error:", err);
    return NextResponse.json({ error: "Payment creation failed" }, { status: 500 });
  }
}