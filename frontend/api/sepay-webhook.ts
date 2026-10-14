import { adminSupabase, matchesSePayKey, sendJson } from '../server/payment.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return sendJson(res, 405, { success: false, message: 'Method not allowed' });
  if (!matchesSePayKey(req.headers.authorization)) {
    return sendJson(res, 401, { success: false, message: 'Unauthorized' });
  }

  const payload = req.body ?? {};
  if (payload.transferType !== 'in') return sendJson(res, 200, { success: true });

  const expectedAccount = (process.env.VITE_PREMIUM_BANK_ACCOUNT ?? '').replace(/\s/g, '');
  const receivedAccount = String(payload.accountNumber ?? '').replace(/\s/g, '');
  const receivedSubAccount = String(payload.subAccount ?? '').replace(/\s/g, '');
  const matchedAccount = [receivedAccount, receivedSubAccount].find(account => account && account === expectedAccount);
  if (!expectedAccount || !matchedAccount) {
    return sendJson(res, 200, { success: true });
  }

  const transferCode = [payload.code, payload.content, payload.description]
    .map(value => String(value ?? '').match(/\bGC\d{8}\b/i)?.[0])
    .find(Boolean);
  const code = String(transferCode ?? '').toUpperCase();
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
      p_account_number: matchedAccount,
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
