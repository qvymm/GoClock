import { adminSupabase, authenticatedUserId, sendJson } from '../server/payment';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'Method not allowed' });
  const userId = await authenticatedUserId(req.headers.authorization);
  if (!userId) return sendJson(res, 401, { error: 'Phiên đăng nhập không hợp lệ.' });
  const code = String(req.query.code ?? '');
  if (!/^GC\d{8}$/.test(code)) return sendJson(res, 400, { error: 'Mã đơn không hợp lệ.' });

  try {
    const supabase = adminSupabase();
    const { data: order, error } = await supabase
      .from('premium_orders')
      .select('status, amount, expires_at')
      .eq('code', code)
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    if (!order) return sendJson(res, 404, { error: 'Không tìm thấy đơn thanh toán.' });

    let status = order.status;
    if (status === 'pending' && Date.now() >= new Date(order.expires_at).getTime()) {
      const { error: expireError } = await supabase.from('premium_orders')
        .update({ status: 'expired' }).eq('code', code).eq('status', 'pending');
      if (expireError) throw expireError;
      status = 'expired';
    }
    return sendJson(res, 200, { status, amount: order.amount, expiresAt: order.expires_at });
  } catch (error) {
    console.error('Read premium order status failed:', error);
    return sendJson(res, 500, { error: 'Không thể kiểm tra trạng thái thanh toán.' });
  }
}
