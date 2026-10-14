import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGIN = "https://go-clock-seven.vercel.app";
const cors = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);

  const code = new URL(req.url).searchParams.get("code") ?? "";
  if (!/^GC[0-9]{8}$/.test(code)) return json({ error: "Mã không hợp lệ" }, 400);

  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Chưa đăng nhập" }, 401);
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json({ error: "Thiếu cấu hình Supabase phía server" }, 500);
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) return json({ error: "Phiên đăng nhập không hợp lệ" }, 401);

  const { data: order, error } = await supabase.from("premium_orders")
    .select("status, amount, expires_at")
    .eq("code", code)
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (error) {
    console.error("Could not read premium order", error);
    return json({ error: "Không kiểm tra được đơn thanh toán" }, 500);
  }
  if (!order) return json({ status: "not_found" }, 404);

  let status = order.status;
  if (status === "pending" && Date.now() >= new Date(order.expires_at).getTime()) {
    const { data: expiredOrder, error: expireError } = await supabase.from("premium_orders")
      .update({ status: "expired" })
      .eq("code", code)
      .eq("user_id", userData.user.id)
      .eq("status", "pending")
      .select("status")
      .maybeSingle();
    if (expireError) {
      console.error("Could not expire premium order", expireError);
      return json({ error: "Không cập nhật được đơn hết hạn" }, 500);
    }
    if (expiredOrder) status = expiredOrder.status;
    else {
      const { data: latestOrder } = await supabase.from("premium_orders")
        .select("status").eq("code", code).eq("user_id", userData.user.id).maybeSingle();
      status = latestOrder?.status ?? "expired";
    }
  }

  return json({ status, amount: order.amount, expires_at: order.expires_at });
});
