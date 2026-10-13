import { adminSupabase, authenticatedUserId, newPaymentCode, PREMIUM_PLANS, sendJson, type PlanId } from '../server/payment';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });
  const userId = await authenticatedUserId(req.headers.authorization);
  if (!userId) return sendJson(res, 401, { error: 'Vui lòng đăng nhập để tạo đơn thanh toán.' });

  const plan = req.body?.plan as PlanId;
  if (typeof plan !== 'string' || !Object.prototype.hasOwnProperty.call(PREMIUM_PLANS, plan)) {
    return sendJson(res, 400, { error: 'Gói Premium không hợp lệ.' });
  }

  try {
    const supabase = adminSupabase();
    const planDetails = PREMIUM_PLANS[plan];
    const expiresAt = new Date(Date.now() + 3 * 60 * 1000).toISOString();
    let code = '';
    let insertError: { code?: string; message: string } | null = null;

    for (let attempt = 0; attempt < 3; attempt++) {
      code = newPaymentCode();
      const { error } = await supabase.from('premium_orders').insert({
        user_id: userId,
        code,
        plan,
        amount: planDetails.amount,
        status: 'pending',
        expires_at: expiresAt,
      });
      if (!error) {
        insertError = null;
        break;
      }
      insertError = error;
      if (error.code !== '23505') break;
    }
    if (insertError) throw insertError;

    return sendJson(res, 201, { code, amount: planDetails.amount, expiresAt });
  } catch (error) {
    console.error('Create premium order failed:', error);
    return sendJson(res, 500, { error: 'Không thể tạo đơn thanh toán.' });
  }
}
