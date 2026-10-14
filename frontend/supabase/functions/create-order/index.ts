import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGIN = "https://go-clock-seven.vercel.app";
const cors = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const PRICES: Record<string, number> = { monthly: 49_000, yearly: 399_000 };
const EXPIRY_MS = 2 * 60 * 1000;

function newCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return `GC${Array.from(bytes, byte => (byte % 10).toString()).join("")}`;
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Chưa đăng nhập" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json({ error: "Thiếu cấu hình Supabase phía server" }, 500);
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) return json({ error: "Phiên đăng nhập không hợp lệ" }, 401);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Dữ liệu không hợp lệ" }, 400);
  }
  const plan = String(body.plan ?? "");
  if (!Object.hasOwn(PRICES, plan)) return json({ error: "Gói không hợp lệ" }, 400);

  const userId = userData.user.id;
  const { error: expireError } = await supabase.from("premium_orders")
    .update({ status: "expired" })
    .eq("user_id", userId)
    .eq("status", "pending");
  if (expireError) {
    console.error("Could not expire previous orders", expireError);
    return json({ error: "Không thể đóng đơn thanh toán cũ" }, 500);
  }

  const expiresAt = new Date(Date.now() + EXPIRY_MS).toISOString();
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newCode();
    const { error } = await supabase.from("premium_orders").insert({
      user_id: userId,
      code,
      plan,
      amount: PRICES[plan],
      status: "pending",
      expires_at: expiresAt,
    });
    if (!error) return json({ code, plan, amount: PRICES[plan], expires_at: expiresAt }, 201);
    if (error.code !== "23505") {
      console.error("Could not create premium order", error);
      return json({ error: "Không tạo được đơn thanh toán" }, 500);
    }
  }
  return json({ error: "Không tạo được mã đơn, vui lòng thử lại" }, 500);
});
