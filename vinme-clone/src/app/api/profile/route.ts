import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type ProfilePayload = {
  id: string; // user id
  name: string;
  city: string;
  age: number;
  bio: string;
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const supabaseAdmin = getSupabaseAdmin();

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("user_id", id)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ProfilePayload;

    if (!body?.id || !body?.name || !body?.city) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const age = Number.isFinite(body.age) ? body.age : 18;

    const supabaseAdmin = getSupabaseAdmin();

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          user_id: body.id,
          name: body.name,
          city: body.city,
          age,
          bio: body.bio ?? "",
        },
        { onConflict: "user_id" }
      )
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, profile: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
