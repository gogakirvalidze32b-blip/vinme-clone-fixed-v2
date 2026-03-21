import { NextRequest, NextResponse } from "next/server";
 
const BOG_CLIENT_ID = process.env.BOG_CLIENT_ID || "1006";
const BOG_SECRET_KEY = process.env.BOG_SECRET_KEY || "581ba5eeadd657c8ccddc74c839bd3ad";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
 
// dev.ipay.ge - სწორი endpoint-ები ძველი SDK-ს მიხედვით
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
      Authorization: `Basic ${credentials}`,
    },
    body: "grant_type=client_credentials",
  });
 
  if (!res.ok) {
    const err = await res.text();
    console.error("BOG auth error:", err);
    throw new Error("BOG auth failed");
  }
 
  const data = await res.json();
  return data.access_token;
}
 
export async function POST(req: NextRequest) {
  try {
    const { plan, userId } = await req.json();
 
    if (!plan || !PLANS[plan]) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }
    if (!userId) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }
 
    const token = await getBOGToken();
    const shopOrderId = `${userId}_${plan}_${Date.now()}`;
    const planData = PLANS[plan];
 
    const orderRes = await fetch(BOG_ORDER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        intent: "AUTHORIZE",
        redirect_url: `${APP_URL}/premium?status=success`,
        shop_order_id: shopOrderId,
        locale: "ka",
        industry_type: "ECOMMERCE",
        currency_code: "GEL",
        callback_url: `${APP_URL}/api/payment/callback`,
        purchase_units: [
          {
            product_id: plan,
            quantity: 1,
            amount: planData.price,
            description: planData.name,
          },
        ],
      }),
    });
 
    if (!orderRes.ok) {
      const err = await orderRes.text();
      console.error("BOG order error:", err);
      throw new Error("Failed to create BOG order");
    }
 
    const orderData = await orderRes.json();
    console.log("BOG order response:", JSON.stringify(orderData));
 
    // approve link = გადახდის გვერდი
    const approveLink = orderData.links?.find((l: { rel: string }) => l.rel === "approve")?.href;
 
    return NextResponse.json({
      orderId: orderData.order_id,
      redirectUrl: approveLink,
      shopOrderId,
    });
 
  } catch (err) {
    console.error("Payment create error:", err);
    return NextResponse.json({ error: "Payment creation failed" }, { status: 500 });
  }
}
 