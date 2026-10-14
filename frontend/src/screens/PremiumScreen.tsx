import React, { useEffect, useState } from 'react';
import { useApp } from '../lib/AppContext';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Check, Crown, Zap, Star, Shield } from 'lucide-react';

const features = [
  'Quản lý không giới hạn nhiệm vụ và lịch trình',
  'Phân tích giấc ngủ chi tiết với biểu đồ',
  'Theo dõi dinh dưỡng nâng cao với AI',
  'Xuất báo cáo định kỳ (PDF/Excel)',
  'Không hiển thị quảng cáo',
  'Ưu tiên hỗ trợ kỹ thuật 24/7',
];

const plans = [
  { id: 'monthly', name: 'Hàng tháng', price: '49.000đ', amount: 49000, period: '/tháng', popular: false },
  { id: 'yearly', name: 'Hàng năm', price: '399.000đ', amount: 399000, period: '/năm', popular: true, savings: 'Tiết kiệm 33%' },
];

const paymentEnv = (import.meta as any).env;
const bank = {
  account: paymentEnv.VITE_PREMIUM_BANK_ACCOUNT as string | undefined,
  code: paymentEnv.VITE_PREMIUM_BANK_CODE as string | undefined,
  name: paymentEnv.VITE_PREMIUM_BANK_NAME as string | undefined,
  holder: paymentEnv.VITE_PREMIUM_BANK_HOLDER as string | undefined,
};

async function readApiResponse(response: Response) {
  const body = await response.text();
  if (!body) return {};
  try {
    return JSON.parse(body);
  } catch {
    const detail = body.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 220);
    throw new Error(
      `API thanh toán trả phản hồi không hợp lệ (${response.status}). ${detail || 'Kiểm tra Vercel Function Logs.'}`,
    );
  }
}

async function getFunctionErrorMessage(error: any) {
  if (error?.context instanceof Response) {
    try {
      const body = await readApiResponse(error.context);
      return body.error || body.message || error.message || 'Không gọi được Edge Function.';
    } catch (responseError) {
      if (responseError instanceof Error) return responseError.message;
    }
  }
  return error?.message || 'Không gọi được Edge Function.';
}

export function PremiumScreen() {
  const { theme, setScreen, profile, setProfile } = useApp();
  const [selectedPlan, setSelectedPlan] = useState('yearly');
  const [showPayment, setShowPayment] = useState(false);
  const [transferCode, setTransferCode] = useState('');
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(180);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState<'creating' | 'pending' | 'paid' | 'expired' | 'error'>('creating');
  const [paymentError, setPaymentError] = useState('');
  const expired = paymentStatus === 'expired' || secondsLeft <= 0;
  const selectedPlanDetails = plans.find(plan => plan.id === selectedPlan) ?? plans[1];
  const qrUrl = paymentStatus === 'pending' && transferCode && bank.account && bank.code
    ? `https://qr.sepay.vn/img?acc=${encodeURIComponent(bank.account)}&bank=${encodeURIComponent(bank.code)}&amount=${encodeURIComponent(paymentAmount)}&des=${encodeURIComponent(transferCode)}&holder=${encodeURIComponent(bank.holder ?? '')}`
    : '';

  async function createPaymentOrder() {
    setPaymentStatus('creating');
    setPaymentError('');
    setShowPayment(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Vui lòng đăng nhập lại để thanh toán.');
      const { data: result, error } = await supabase.functions.invoke('create-order', {
        body: { plan: selectedPlan },
      });
      if (error) throw new Error(await getFunctionErrorMessage(error));
      const orderExpiresAt = result?.expiresAt ?? result?.expires_at;
      if (!result?.code || !orderExpiresAt) throw new Error('Edge Function không trả đủ thông tin đơn thanh toán.');
      setTransferCode(result.code);
      setPaymentAmount(Number(result.amount));
      setExpiresAt(new Date(orderExpiresAt).getTime());
      setSecondsLeft(180);
      setPaymentStatus('pending');
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : 'Không tạo được đơn thanh toán.');
      setPaymentStatus('error');
    }
  }

  useEffect(() => {
    if (!showPayment || paymentStatus !== 'pending' || expiresAt === null) return;
    const updateCountdown = () => {
      const remaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) setPaymentStatus('expired');
    };
    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(timer);
  }, [showPayment, expiresAt, paymentStatus]);

  useEffect(() => {
    if (!showPayment || !transferCode || paymentStatus !== 'pending') return;
    let active = true;
    const checkOrder = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;
        const { data: result, error } = await supabase.functions.invoke(
          `order-status?code=${encodeURIComponent(transferCode)}`,
          { method: 'GET' },
        );
        if (error || !active || !result) return;
        if (result.status === 'paid') {
          setTransferCode('');
          setPaymentError('');
          setPaymentStatus('paid');
          setProfile(profile ? { ...profile, is_premium: true } : profile);
        } else if (result.status === 'expired') {
          setPaymentStatus('expired');
          setSecondsLeft(0);
        }
      } catch {
        // Continue showing the QR; the next poll can pick up the webhook update.
      }
    };
    const timer = window.setInterval(() => { void checkOrder(); }, 2500);
    void checkOrder();
    return () => { active = false; window.clearInterval(timer); };
  }, [showPayment, transferCode, paymentStatus]);

  const countdown = `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`;

  return (
    <div className="flex flex-col h-full" style={{ background: theme === 'dark' ? '#0d1f12' : '#f0f7f2' }}>
      {/* Header */}
      <div className="px-5 pt-4 pb-6" style={{ background: 'linear-gradient(160deg, #0f2a1a 0%, #173325 100%)' }}>
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => setScreen('profile')} className="p-2 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <ArrowLeft size={20} className="text-white/70" />
          </button>
          <h1 className="text-xl font-bold text-white">GõClock Premium</h1>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3" style={{ background: 'linear-gradient(135deg, #94d400 0%, #72a800 100%)' }}>
            <Crown size={32} style={{ color: '#0d1f12' }} />
          </div>
          <p className="text-sm text-center" style={{ color: 'rgba(255,255,255,0.6)' }}>Mở khóa toàn bộ tính năng cao cấp</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scroll-content px-4 pt-4">
        {/* Features */}
        <div className="rounded-2xl p-4 mb-4" style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff', border: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(23,51,37,0.08)' }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: theme === 'dark' ? '#94d400' : '#173325' }}>Tính năng Premium</h3>
          <div className="flex flex-col gap-3">
            {features.map((f, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'rgba(148,212,0,0.2)' }}>
                  <Check size={12} style={{ color: '#94d400' }} />
                </div>
                <span className="text-sm" style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.8)' : '#202124' }}>{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Plans */}
        <div className="flex flex-col gap-3 mb-4">
          {plans.map(plan => (
            <button
              key={plan.id}
              onClick={() => setSelectedPlan(plan.id)}
              className="relative rounded-2xl p-4 text-left transition-all"
              style={selectedPlan === plan.id
                ? { background: theme === 'dark' ? 'rgba(148,212,0,0.15)' : 'rgba(23,51,37,0.08)', border: `1.5px solid ${theme === 'dark' ? '#94d400' : '#173325'}` }
                : { background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff', border: '1.5px solid transparent' }}
            >
              {plan.popular && (
                <div className="absolute -top-2 right-4 px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: '#94d400', color: '#0d1f12' }}>
                  {plan.savings}
                </div>
              )}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-base" style={{ color: theme === 'dark' ? '#fff' : '#202124' }}>{plan.name}</p>
                  <p className="text-xs" style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.5)' : '#9aa0a6' }}>{plan.popular ? 'Phổ biến nhất' : 'Linh hoạt'}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-xl" style={{ color: theme === 'dark' ? '#94d400' : '#173325' }}>{plan.price}</p>
                  <p className="text-xs" style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.5)' : '#9aa0a6' }}>{plan.period}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Benefits badges */}
        <div className="flex justify-center gap-4 mb-4">
          <div className="flex items-center gap-1.5 text-xs" style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.5)' : '#9aa0a6' }}>
            <Shield size={14} style={{ color: '#94d400' }} />
            <span>An toàn</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.5)' : '#9aa0a6' }}>
            <Zap size={14} style={{ color: '#94d400' }} />
            <span>Hủy bất cứ lúc nào</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.5)' : '#9aa0a6' }}>
            <Star size={14} style={{ color: '#94d400' }} />
            <span>7 ngày dùng thử</span>
          </div>
        </div>

        <button
          onClick={createPaymentOrder}
          className="w-full py-4 rounded-2xl font-semibold text-base transition-all active:scale-95 mb-3"
          style={{ background: 'linear-gradient(135deg, #94d400 0%, #72a800 100%)', color: '#0d1f12' }}
        >
          Nâng cấp Premium
        </button>

        <p className="text-xs text-center text-gray-400 mb-6">
          Thanh toán qua App Store hoặc Google Play. Hủy bất cứ lúc nào.
        </p>
      </div>

      {showPayment && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="premium-payment-title">
          <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-3xl p-5" style={{ background: theme === 'dark' ? '#14251b' : '#fff' }}>
            <div className="mb-4 flex items-center justify-between">
              <h2 id="premium-payment-title" className="text-lg font-bold" style={{ color: theme === 'dark' ? '#fff' : '#173325' }}>
                Thanh toán Premium
              </h2>
              <button onClick={() => setShowPayment(false)} className="rounded-full px-3 py-1 text-sm text-white/60 hover:text-white" aria-label="Đóng">Đóng</button>
            </div>

            {paymentStatus === 'creating' ? (
              <p className="py-8 text-center text-sm text-gray-400">Đang tạo đơn thanh toán…</p>
            ) : paymentStatus === 'paid' ? (
              <div className="py-8 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#94d400]/15">
                  <Check size={28} className="text-[#94d400]" />
                </div>
                <p className="text-2xl font-bold text-[#94d400]">Thanh toán thành công</p>
                <p className="mt-2 text-sm text-gray-400">Bạn đã mua gói {selectedPlanDetails.name}. Premium đã được kích hoạt.</p>
              </div>
            ) : expired ? (
              <div className="py-5 text-center">
                <p className="font-semibold text-red-400">Mã QR đã hết hạn.</p>
                <p className="mt-2 text-sm text-gray-400">Tạo mã mới để tiếp tục thanh toán.</p>
                <button onClick={createPaymentOrder} className="mt-5 w-full rounded-2xl py-3.5 font-semibold text-[#0d1f12]" style={{ background: 'linear-gradient(135deg, #94d400 0%, #72a800 100%)' }}>
                  Tạo mã QR mới
                </button>
              </div>
            ) : paymentStatus === 'pending' && !qrUrl ? (
              <p role="alert" className="rounded-xl bg-amber-950/30 p-3 text-sm text-amber-400">
                Đơn thanh toán đã được tạo nhưng chưa cấu hình tài khoản ngân hàng để tạo QR. Hãy thêm VITE_PREMIUM_BANK_ACCOUNT và VITE_PREMIUM_BANK_CODE trong Vercel rồi deploy lại.
              </p>
            ) : qrUrl ? (
              <div className="text-center">
                <img src={qrUrl} alt="Mã QR thanh toán SePay" className="mx-auto mb-4 w-56 rounded-xl bg-white p-2" />
                <p className="font-bold" style={{ color: theme === 'dark' ? '#fff' : '#173325' }}>{selectedPlanDetails.name} · {paymentAmount.toLocaleString('vi-VN')}đ</p>
                {bank.name && <p className="mt-2 text-sm text-gray-400">Ngân hàng: {bank.name}</p>}
                {bank.account && <p className="text-sm text-gray-400">Số tài khoản: {bank.account}</p>}
                {bank.holder && <p className="text-sm text-gray-400">Chủ tài khoản: {bank.holder}</p>}
                <p className="mt-3 text-sm text-gray-400">Nội dung chuyển khoản</p>
                <code className="mt-1 inline-block rounded-lg bg-black/20 px-3 py-2 font-bold text-[#94d400]">{transferCode}</code>
                <p className="mt-4 text-sm font-semibold text-amber-400">Mã hết hạn sau {countdown}</p>
                <p className="mt-1 text-xs text-gray-500">Quét mã bằng ứng dụng ngân hàng để thanh toán.</p>
              </div>
            ) : (
              <div>
                {paymentError && <p role="alert" className="rounded-xl bg-red-950/40 p-3 text-sm text-red-400">{paymentError}</p>}
                <button onClick={createPaymentOrder} className="mt-4 w-full rounded-2xl py-3.5 font-semibold text-[#0d1f12]" style={{ background: 'linear-gradient(135deg, #94d400 0%, #72a800 100%)' }}>Thử tạo đơn lại</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
