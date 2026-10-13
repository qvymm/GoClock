import { adminSupabase, matchesSePayKey, sendJson } from '../server/payment';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return sendJson(res, 405, { success: false, message: 'Method not allowed' });
  if (!matchesSePayKey(req.headers.authorization)) {
    return sendJson(res, 401, { success: false, message: 'Unauthorized' });
  }

  const payload = req.body ?? {};
  if (payload.transferType !== 'in') return sendJson(res, 200, { success: true });

  const expectedAccount = (process.env.VITE_PREMIUM_BANK_ACCOUNT ?? '').replace(/\s/g, '');
  const receivedAccount = String(payload.accountNumber ?? '').replace(/\s/g, '');
  if (!expectedAccount || receivedAccount !== expectedAccount) {
    return sendJson(res, 200, { success: true });
  }

  const code = String(payload.code ?? payload.content?.match(/\bGC\d{8}\b/i)?.[0] ?? '').toUpperCase();
  const amount = Number(payload.transferAmount);
  const transactionId = String(payload.id ?? payload.referenceCode ?? '');
  if (!/^GC\d{8}$/.test(code) || !Number.isInteger(amount) || !transactionId) {
    return sendJson(res, 200, { success: true });
  }

  try {
    const supabase = adminSupabase();
    const { data, error } = await supabase.rpc('process_premium_payment', {
      p_code: code,
      p_amount: amount,
      p_transaction_id: transactionId,
      p_account_number: receivedAccount,
    });
    if (error) throw error;
    // Ignore unmatched, wrong-amount, duplicate, or expired orders. They cannot activate Premium.
    console.info('SePay premium webhook processed:', { code, result: data });
    return sendJson(res, 200, { success: true });
  } catch (error) {
    console.error('SePay webhook processing failed:', error);
    return sendJson(res, 500, { success: false, message: 'Could not process payment notification' });
  }
}
