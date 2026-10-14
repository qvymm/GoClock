import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const reply = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async req => {
  if (req.method !== "POST") return reply({ success: false, message: "Method not allowed" }, 405);

  const expectedKey = Deno.env.get("SEPAY_API_KEY");
  if (!expectedKey || req.headers.get("authorization") !== `Apikey ${expectedKey}`) {
    return reply({ success: false, message: "Unauthorized" }, 401);
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return reply({ success: false, message: "Bad JSON" }, 400);
  }
  if (payload.transferType !== "in") return reply({ success: true, ignored: "not incoming" });

  const text = `${payload.code ?? ""} ${payload.content ?? ""} ${payload.description ?? ""}`.toUpperCase();
  const code = text.match(/\bGC[0-9]{8}\b/)?.[0];
  const amount = Number(payload.transferAmount);
  const transactionId = String(payload.id ?? payload.referenceCode ?? "");
  if (!code || !Number.isSafeInteger(amount) || amount <= 0 || !transactionId) {
    return reply({ success: true, ignored: "invalid payment details" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return reply({ success: false, message: "Missing server configuration" }, 500);
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: result, error } = await supabase.rpc("process_premium_payment", {
    p_code: code,
    p_amount: amount,
    p_transaction_id: transactionId,
    p_account_number: String(payload.subAccount ?? payload.accountNumber ?? ""),
  });
  if (error) {
    console.error("Could not process SePay notification", error);
    return reply({ success: false, message: "Database error" }, 500);
  }

  console.info("Processed SePay payment", { code, result });
  return reply({ success: true, code, result });
});
