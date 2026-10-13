import React, { useState, useEffect } from 'react';
import { useApp } from '../lib/AppContext';
import { supabase } from '../lib/supabase';
import {
  ArrowLeft,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  RotateCw,
} from 'lucide-react';
import { OtpInput } from '../components/OtpInput';

export function ForgotPasswordScreen() {
  const { screen, setScreen } = useApp();

  // 3-step state: 'email' -> 'otp' -> 'new_password' -> 'done'
  const [step, setStep] = useState<'email' | 'otp' | 'new_password' | 'done'>(
    screen === 'resetPassword' ? 'new_password' : 'email'
  );

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  // Countdown for OTP
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    let timer: any;
    if (step === 'otp' && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  // Bước 1: Gửi mã OTP khôi phục
  async function handleSendResetOtp(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setError('Vui lòng nhập địa chỉ email hợp lệ');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim());

    setLoading(false);
    if (err) {
      setError(err.message || 'Không thể gửi email. Vui lòng thử lại sau.');
    } else {
      setStep('otp');
      setCountdown(60);
      setCanResend(false);
      setSuccessMsg(`Mã khôi phục 6 số đã được gửi tới ${email.trim()}`);
    }
  }

  // Bước 2: Xác thực mã OTP
  async function handleVerifyRecoveryOtp() {
    if (otp.length < 6) {
      setError('Vui lòng nhập đủ 6 chữ số mã xác thực');
      return;
    }

    setLoading(true);
    setError('');

    const { error: err } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: otp,
      type: 'recovery',
    });

    setLoading(false);

    if (err) {
      setError(err.message || 'Mã xác thực không hợp lệ hoặc đã hết hạn.');
    } else {
      // Xác thực thành công -> Supabase đã thiết lập phiên tạm thời để đổi password
      setStep('new_password');
      setError('');
    }
  }

  // Gửi lại mã OTP
  async function handleResendRecoveryOtp() {
    if (!canResend || loading) return;
    setLoading(true);
    setError('');
    setSuccessMsg('');

    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim());
    setLoading(false);

    if (err) {
      setError(err.message || 'Không thể gửi lại mã, vui lòng đợi');
    } else {
      setCountdown(60);
      setCanResend(false);
      setSuccessMsg('Đã gửi lại mã khôi phục mới tới email!');
    }
  }

  // Bước 3: Cập nhật mật khẩu mới
  async function handleUpdatePassword(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Mật khẩu mới phải có tối thiểu 6 ký tự');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    setLoading(true);

    const { error: err } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setLoading(false);

    if (err) {
      setError(err.message || 'Không thể cập nhật mật khẩu. Vui lòng thử lại.');
    } else {
      setStep('done');
    }
  }

  return (
    <div
      className="w-full h-full flex flex-col overflow-hidden safe-pt safe-pb"
      style={{ background: 'linear-gradient(160deg, #0d1f12 0%, #173325 60%, #0a1608 100%)' }}
    >
      {/* Header Back Button */}
      <button
        onClick={() => {
          if (step === 'otp') setStep('email');
          else if (step === 'new_password') setStep('otp');
          else setScreen('login');
        }}
        className="mx-4 mt-2 p-2.5 self-start rounded-full transition-transform active:scale-95"
        style={{ background: 'rgba(255,255,255,0.08)' }}
      >
        <ArrowLeft size={20} className="text-white/80" />
      </button>

      <div className="flex-1 overflow-y-auto scroll-content px-6 pt-3 pb-8">
        {/* ================= STEP 1: NHẬP EMAIL ================= */}
        {step === 'email' && (
          <div className="fade-in-up">
            <div className="flex flex-col items-center mb-6 text-center">
              <div className="w-16 h-16 rounded-2xl overflow-hidden mb-3 shadow-xl">
                <img src="/logo-g.png" alt="GoClock" className="w-full h-full object-cover" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-1">Quên mật khẩu?</h2>
              <p className="text-sm text-white/50 max-w-xs">
                Nhập email của bạn để nhận mã OTP 6 số thiết lập lại mật khẩu
              </p>
            </div>

            <form onSubmit={handleSendResetOtp} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-medium mb-1.5 block text-white/70">
                  Email đăng ký tài khoản
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94d400]">
                    <Mail size={18} />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@gmail.com"
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm outline-none text-white bg-white/5 border border-white/10 focus:border-[#94d400]/60 focus:bg-[#94d400]/5"
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-xl p-3 text-xs bg-red-950/40 text-red-400 border border-red-800/50">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2 mt-2 shadow-[0_4px_20px_rgba(148,212,0,0.3)]"
                style={{ background: 'linear-gradient(135deg, #94d400 0%, #72a800 100%)', color: '#0d1f12' }}
              >
                {loading ? 'Đang gửi mã...' : 'Gửi mã xác thực'}
                {!loading && <ArrowRight size={18} />}
              </button>
            </form>

            <p className="text-center mt-6 text-sm text-white/50">
              Nhớ mật khẩu rồi?{' '}
              <button
                onClick={() => setScreen('login')}
                className="font-bold text-[#94d400] hover:underline"
              >
                Đăng nhập
              </button>
            </p>
          </div>
        )}

        {/* ================= STEP 2: NHẬP OTP 6 SỐ ================= */}
        {step === 'otp' && (
          <div className="fade-in-up flex flex-col items-center pt-2">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-[#94d400]/15 border border-[#94d400]/30 shadow-[0_0_20px_rgba(148,212,0,0.2)]">
              <KeyRound size={32} className="text-[#94d400]" />
            </div>

            <h2 className="text-2xl font-bold text-white mb-2 text-center">Xác thực mã OTP</h2>
            <p className="text-sm text-center text-white/60 mb-2 leading-relaxed">
              Mã khôi phục 6 số đã được gửi tới:
            </p>
            <div className="bg-white/10 px-3 py-1.5 rounded-full text-xs font-semibold text-[#94d400] mb-6">
              {email}
            </div>

            <OtpInput
              value={otp}
              onChange={(val) => {
                setOtp(val);
                if (error) setError('');
              }}
              hasError={Boolean(error)}
              disabled={loading}
            />

            {error && (
              <div className="w-full rounded-xl p-3 text-xs bg-red-950/40 text-red-400 border border-red-800/50 mt-3 text-center">
                {error}
              </div>
            )}

            {successMsg && !error && (
              <div className="w-full rounded-xl p-3 text-xs bg-[#94d400]/15 text-[#94d400] border border-[#94d400]/30 mt-3 flex items-center justify-center gap-2">
                <CheckCircle2 size={16} />
                <span>{successMsg}</span>
              </div>
            )}

            <div className="mt-6 flex flex-col items-center gap-2">
              {canResend ? (
                <button
                  onClick={handleResendRecoveryOtp}
                  disabled={loading}
                  className="flex items-center gap-2 text-sm font-semibold text-[#94d400] hover:underline transition-all"
                >
                  <RotateCw size={16} className={loading ? 'animate-spin' : ''} />
                  Gửi lại mã OTP
                </button>
              ) : (
                <p className="text-xs text-white/40">
                  Gửi lại mã sau <span className="font-bold text-white/80">{countdown}s</span>
                </p>
              )}
            </div>

            <button
              onClick={handleVerifyRecoveryOtp}
              disabled={loading || otp.length < 6}
              className="w-full py-4 rounded-2xl font-bold text-base transition-all active:scale-95 disabled:opacity-50 mt-8 shadow-[0_4px_24px_rgba(148,212,0,0.35)]"
              style={{ background: 'linear-gradient(135deg, #94d400 0%, #72a800 100%)', color: '#0d1f12' }}
            >
              {loading ? 'Đang kiểm tra...' : 'Xác nhận mã OTP'}
            </button>
          </div>
        )}

        {/* ================= STEP 3: TẠO MẬT KHẨU MỚI ================= */}
        {step === 'new_password' && (
          <div className="fade-in-up">
            <div className="flex flex-col items-center mb-6 text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-3 bg-[#94d400]/15 border border-[#94d400]/30 shadow-[0_0_20px_rgba(148,212,0,0.2)]">
                <Lock size={30} className="text-[#94d400]" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-1">Tạo mật khẩu mới</h2>
              <p className="text-sm text-white/50 max-w-xs">
                Mật khẩu mới cần có độ dài tối thiểu 6 ký tự
              </p>
            </div>

            <form onSubmit={handleUpdatePassword} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-medium mb-1.5 block text-white/70">
                  Mật khẩu mới
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94d400]">
                    <Lock size={18} />
                  </div>
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nhập mật khẩu mới"
                    className="w-full pl-11 pr-11 py-3.5 rounded-xl text-sm outline-none text-white bg-white/5 border border-white/10 focus:border-[#94d400]/60 focus:bg-[#94d400]/5"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                  >
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium mb-1.5 block text-white/70">
                  Xác nhận mật khẩu mới
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94d400]">
                    <Lock size={18} />
                  </div>
                  <input
                    type={showConfirmPw ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu mới"
                    className="w-full pl-11 pr-11 py-3.5 rounded-xl text-sm outline-none text-white bg-white/5 border border-white/10 focus:border-[#94d400]/60 focus:bg-[#94d400]/5"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPw(!showConfirmPw)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                  >
                    {showConfirmPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-xl p-3 text-xs bg-red-950/40 text-red-400 border border-red-800/50">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-2xl font-bold text-base transition-all active:scale-95 disabled:opacity-60 mt-2 shadow-[0_4px_24px_rgba(148,212,0,0.35)]"
                style={{ background: 'linear-gradient(135deg, #94d400 0%, #72a800 100%)', color: '#0d1f12' }}
              >
                {loading ? 'Đang lưu mật khẩu...' : 'Lưu mật khẩu mới'}
              </button>
            </form>
          </div>
        )}

        {/* ================= STEP 4: HOÀN TẤT THÀNH CÔNG ================= */}
        {step === 'done' && (
          <div className="fade-in-up flex flex-col items-center justify-center pt-8 text-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6 bg-[#94d400]/15 border border-[#94d400]/30 shadow-[0_0_30px_rgba(148,212,0,0.3)]">
              <CheckCircle2 size={44} className="text-[#94d400]" />
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">Đổi mật khẩu thành công!</h2>
            <p className="text-sm text-white/60 mb-8 max-w-xs leading-relaxed">
              Mật khẩu mới của bạn đã được cập nhật an toàn. Bây giờ bạn có thể đăng nhập ngay.
            </p>

            <button
              onClick={() => setScreen('login')}
              className="w-full py-4 rounded-2xl font-bold text-base transition-all active:scale-95 shadow-[0_4px_24px_rgba(148,212,0,0.35)]"
              style={{ background: 'linear-gradient(135deg, #94d400 0%, #72a800 100%)', color: '#0d1f12' }}
            >
              Đăng nhập ngay
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
