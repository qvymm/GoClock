import React, { useState, useEffect } from 'react';
import { useApp } from '../lib/AppContext';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Eye, EyeOff, Mail, Lock, User, ArrowRight, RotateCw, CheckCircle2 } from 'lucide-react';
import { OtpInput } from '../components/OtpInput';

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

export function RegisterScreen() {
  const { setScreen } = useApp();

  // Step 1: Form | Step 2: OTP
  const [step, setStep] = useState<'form' | 'otp'>('form');

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  // OTP states
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // Status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Countdown timer for OTP
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

  async function handleGoogleLogin() {
    setError('');
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (err) setError('Không thể kết nối với Google: ' + err.message);
  }

  async function handleRegister(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!fullName.trim()) {
      setError('Vui lòng nhập họ và tên');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Vui lòng nhập email hợp lệ');
      return;
    }
    if (password.length < 6) {
      setError('Mật khẩu cần tối thiểu 6 ký tự');
      return;
    }
    if (password !== confirmPw) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    setLoading(true);

    const { data, error: signUpErr } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          nickname: fullName.trim().split(' ')[0] || 'Bạn',
        },
      },
    });

    setLoading(false);

    if (signUpErr) {
      setError(signUpErr.message || 'Đăng ký thất bại. Vui lòng thử lại');
      return;
    }

    // Nếu email confirmation bị tắt trên Supabase và user đăng nhập ngay
    if (data.session) {
      // onAuthStateChange sẽ tự động điều hướng sang dashboard hoặc onboarding
      return;
    }

    // Nếu cần xác thực OTP
    setStep('otp');
    setCountdown(60);
    setCanResend(false);
    setSuccessMsg(`Mã xác thực 6 số đã được gửi tới ${email.trim()}`);
  }

  async function handleVerifyOtp() {
    if (otp.length < 6) {
      setError('Vui lòng nhập đủ 6 chữ số mã xác thực');
      return;
    }
    setLoading(true);
    setError('');

    // Xác thực OTP
    const { data, error: verifyErr } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: otp,
      type: 'signup',
    });

    setLoading(false);

    if (verifyErr) {
      // Thử fallback kiểu email nếu signup token khác format
      const { data: retryData, error: retryErr } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otp,
        type: 'email',
      });

      if (retryErr) {
        setError(verifyErr.message || 'Mã xác thực không chính xác hoặc đã hết hạn');
        return;
      }
    }

    // Thành công -> Lưu nickname và chuyển sang onboarding hoặc dashboard
    localStorage.setItem('pending_onboarding', JSON.stringify({
      nickname: fullName.trim().split(' ')[0] || fullName.trim(),
    }));
  }

  async function handleResendOtp() {
    if (!canResend || loading) return;
    setLoading(true);
    setError('');
    setSuccessMsg('');

    const { error: resendErr } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
    });

    setLoading(false);
    if (resendErr) {
      setError(resendErr.message || 'Không thể gửi lại mã, vui lòng đợi');
    } else {
      setCountdown(60);
      setCanResend(false);
      setSuccessMsg('Đã gửi lại mã OTP mới vào hòm thư!');
    }
  }

  return (
    <div
      className="w-full h-full flex flex-col overflow-hidden safe-pt safe-pb"
      style={{ background: 'linear-gradient(160deg, #0d1f12 0%, #173325 60%, #0a1608 100%)' }}
    >
      {/* Header back */}
      <button
        onClick={() => {
          if (step === 'otp') {
            setStep('form');
            setOtp('');
            setError('');
          } else {
            setScreen('login');
          }
        }}
        className="mx-4 mt-2 p-2.5 self-start rounded-full transition-transform active:scale-95"
        style={{ background: 'rgba(255,255,255,0.08)' }}
      >
        <ArrowLeft size={20} className="text-white/80" />
      </button>

      <div className="flex-1 overflow-y-auto scroll-content px-6 pt-2 pb-8">
        {step === 'form' ? (
          <div className="fade-in-up">
            {/* Header */}
            <div className="flex flex-col items-center mb-6 text-center">
              <div className="w-14 h-14 rounded-2xl overflow-hidden mb-3 shadow-xl">
                <img src="/logo-g.png" alt="GoClock" className="w-full h-full object-cover" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-1">Tạo tài khoản mới</h2>
              <p className="text-sm text-white/50">Bắt đầu hành trình cân bằng thói quen cùng GoClock</p>
            </div>

            {/* Google Signup */}
            <button
              onClick={handleGoogleLogin}
              type="button"
              className="w-full py-3.5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-3 transition-all active:scale-95 bg-white text-[#1a1a1a] shadow-lg mb-4"
            >
              <GoogleIcon /> Đăng ký nhanh với Google
            </button>

            <div className="flex items-center my-3 gap-4">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-xs text-white/30">hoặc dùng Email</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Register form */}
            <form onSubmit={handleRegister} className="flex flex-col gap-3.5">
              {/* Họ tên */}
              <div>
                <label className="text-xs font-medium mb-1.5 block text-white/70">
                  Họ và tên
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94d400]">
                    <User size={18} />
                  </div>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="w-full pl-11 pr-4 py-3 rounded-xl text-sm outline-none transition-all text-white bg-white/5 border border-white/10 focus:border-[#94d400]/60 focus:bg-[#94d400]/5"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="text-xs font-medium mb-1.5 block text-white/70">
                  Địa chỉ Email
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
                    className="w-full pl-11 pr-4 py-3 rounded-xl text-sm outline-none transition-all text-white bg-white/5 border border-white/10 focus:border-[#94d400]/60 focus:bg-[#94d400]/5"
                  />
                </div>
              </div>

              {/* Mật khẩu */}
              <div>
                <label className="text-xs font-medium mb-1.5 block text-white/70">
                  Mật khẩu
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94d400]">
                    <Lock size={18} />
                  </div>
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Tối thiểu 6 ký tự"
                    className="w-full pl-11 pr-11 py-3 rounded-xl text-sm outline-none text-white bg-white/5 border border-white/10 focus:border-[#94d400]/60 focus:bg-[#94d400]/5"
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

              {/* Xác nhận mật khẩu */}
              <div>
                <label className="text-xs font-medium mb-1.5 block text-white/70">
                  Xác nhận mật khẩu
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94d400]">
                    <Lock size={18} />
                  </div>
                  <input
                    type={showConfirmPw ? 'text' : 'password'}
                    value={confirmPw}
                    onChange={(e) => setConfirmPw(e.target.value)}
                    placeholder="Nhập lại mật khẩu trên"
                    className="w-full pl-11 pr-11 py-3 rounded-xl text-sm outline-none text-white bg-white/5 border border-white/10 focus:border-[#94d400]/60 focus:bg-[#94d400]/5"
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
                <div className="rounded-xl p-3 text-xs bg-red-950/40 text-red-400 border border-red-800/50 mt-1">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2 mt-2 shadow-[0_4px_20px_rgba(148,212,0,0.3)]"
                style={{ background: 'linear-gradient(135deg, #94d400 0%, #72a800 100%)', color: '#0d1f12' }}
              >
                {loading ? 'Đang khởi tạo tài khoản...' : 'Tiếp tục & Nhận mã OTP'}
                {!loading && <ArrowRight size={18} />}
              </button>
            </form>

            <p className="text-center mt-6 text-sm text-white/50">
              Đã có tài khoản?{' '}
              <button
                onClick={() => setScreen('login')}
                className="font-bold text-[#94d400] hover:underline"
              >
                Đăng nhập ngay
              </button>
            </p>
          </div>
        ) : (
          /* Step 2: OTP Verification */
          <div className="fade-in-up flex flex-col items-center pt-2">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-[#94d400]/15 border border-[#94d400]/30 shadow-[0_0_20px_rgba(148,212,0,0.2)]">
              <Mail size={32} className="text-[#94d400]" />
            </div>

            <h2 className="text-2xl font-bold text-white mb-2 text-center">Xác thực Email</h2>
            <p className="text-sm text-center text-white/60 mb-2 leading-relaxed">
              Mã xác nhận 6 chữ số đã được gửi đến:
            </p>
            <div className="bg-white/10 px-3 py-1.5 rounded-full text-xs font-semibold text-[#94d400] mb-6">
              {email}
            </div>

            {/* 6 Digit OTP input */}
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

            {/* Countdown & Resend button */}
            <div className="mt-6 flex flex-col items-center gap-2">
              {canResend ? (
                <button
                  onClick={handleResendOtp}
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

            {/* Confirm button */}
            <button
              onClick={handleVerifyOtp}
              disabled={loading || otp.length < 6}
              className="w-full py-4 rounded-2xl font-bold text-base transition-all active:scale-95 disabled:opacity-50 mt-8 shadow-[0_4px_24px_rgba(148,212,0,0.35)]"
              style={{ background: 'linear-gradient(135deg, #94d400 0%, #72a800 100%)', color: '#0d1f12' }}
            >
              {loading ? 'Đang xác thực mã...' : 'Xác nhận & Hoàn tất'}
            </button>

            <button
              onClick={() => {
                setStep('form');
                setError('');
              }}
              className="mt-4 text-xs text-white/40 hover:text-white/70"
            >
              Đổi email khác
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
