import { NextRequest, NextResponse } from "next/server";

const BOG_CLIENT_ID = process.env.BOG_CLIENT_ID || "1006";
const BOG_SECRET_KEY = process.env.BOG_SECRET_KEY || "581ba5eeadd657c8ccddc74c839bd3ad";
const BOG_BASE_URL = process.env.BOG_BASE_URL || "https://dev.ipay.ge";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const PLANS: Record<string, { price: number; days: number; name: string }> = {
  week:  { price: 47.50, days: 7,   name: "Shekhvdi Plus - 1 კვირა" },
  month: { price: 95.00, days: 30,  name: "Shekhvdi Plus - 1 თვე" },
  year:  { price: 570.00, days: 365, name: "Shekhvdi Plus - 1 წელი" },
};

async function getBOGToken(): Promise<string> {
  const credentials = Buffer.from(`${BOG_CLIENT_ID}:${BOG_SECRET_KEY}`).toString("base64");
  const res = await fetch(`${BOG_BASE_URL}/auth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error("BOG auth failed");
  const data = await res.json();
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

    const orderRes = await fetch(`${BOG_BASE_URL}/orders/payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        callback_url: `${APP_URL}/api/payment/callback`,
        external_order_id: shopOrderId,
        purchase_units: {
          currency: "GEL",
          total_amount: planData.price,
          basket: [{ quantity: 1, unit_price: planData.price, product_id: plan, description: planData.name }],
        },
        redirect_urls: {
          fail: `${APP_URL}/premium?status=fail`,
          success: `${APP_URL}/premium?status=success`,
        },
      }),
    });

    if (!orderRes.ok) throw new Error("Failed to create BOG order");
    const orderData = await orderRes.json();

    return NextResponse.json({
      orderId: orderData.id,
      redirectUrl: orderData._links?.redirect?.href,
      shopOrderId,
    });
  } catch (err) {
    console.error("Payment create error:", err);
    return NextResponse.json({ error: "Payment creation failed" }, { status: 500 });
  }
}