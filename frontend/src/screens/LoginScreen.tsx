import React, { useState } from 'react';
import { useApp } from '../lib/AppContext';
import { isSupabaseEnabled, supabase } from '../lib/supabase';
import { ArrowLeft, Eye, EyeOff, Mail, Phone, Lock } from 'lucide-react';

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

export function LoginScreen() {
  const { setScreen, loginAdmin } = useApp();
  const [credential, setCredential] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleGoogleLogin() {
    if (!isSupabaseEnabled) {
      setError('Chưa cấu hình dịch vụ đăng nhập. Vui lòng thiết lập Supabase cho ứng dụng trước.');
      return;
    }
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (err) setError('Không thể kết nối với Google');
  }

  async function handleLogin() {
    if (!credential || !password) { setError('Vui lòng nhập đầy đủ thông tin'); return; }
    if (!isSupabaseEnabled && !(credential === 'admin@goclock.com' && password === 'admin')) {
      setError('Chưa cấu hình dịch vụ đăng nhập. Vui lòng thiết lập Supabase cho ứng dụng trước.');
      return;
    }
    setLoading(true);
    setError('');
    const email = credential.includes('@') ? credential : credential + '@goclock.com';

    if (email === 'admin@goclock.com' && password === 'admin') {
      const success = loginAdmin(email, password);
      setLoading(false);
      if (!success) setError('Sai tài khoản hoặc mật khẩu');
      return;
    }

    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) setError('Sai tài khoản hoặc mật khẩu');
  }

  return (
    <div
      className="w-full h-full flex flex-col overflow-hidden safe-pt safe-pb"
      style={{ background: 'linear-gradient(160deg, #0d1f12 0%, #173325 60%, #0a1608 100%)' }}
    >

      <button onClick={() => setScreen('splash')} className="mx-4 mt-2 p-2 self-start rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
        <ArrowLeft size={20} className="text-white/70" />
      </button>

      <div className="flex-1 overflow-y-auto scroll-content px-6 pt-4">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl overflow-hidden mb-4 shadow-xl">
            <img src="/logo-g.png" className="w-full h-full object-cover" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">Chào mừng trở lại!</h2>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>Đăng nhập để tiếp tục hành trình</p>
        </div>

        <div className="flex flex-col gap-4">
          {/* Google login */}
          <button
            onClick={handleGoogleLogin}
            className="w-full py-4 rounded-2xl font-semibold text-base flex items-center justify-center gap-3 transition-all active:scale-95"
            style={{ background: 'white', color: '#1a1a1a' }}
          >
            <GoogleIcon /> Tiếp tục với Google
          </button>

          <div className="flex items-center my-2 gap-4">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>hoặc</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
          </div>

          {/* Email/Phone */}
          <div>
            <label className="text-sm font-medium mb-2 block" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Gmail hoặc số điện thoại
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2">
                {credential.includes('@') || credential === ''
                  ? <Mail size={18} style={{ color: '#94d400' }} />
                  : <Phone size={18} style={{ color: '#94d400' }} />}
              </div>
              <input
                type="text"
                value={credential}
                onChange={e => setCredential(e.target.value)}
                placeholder="example@gmail.com hoặc 0901234567"
                className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1.5px solid rgba(255,255,255,0.12)',
                  color: 'white',
                }}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="text-sm font-medium mb-2 block" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Mật khẩu
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2">
                <Lock size={18} style={{ color: '#94d400' }} />
              </div>
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu"
                className="w-full pl-11 pr-12 py-3.5 rounded-xl text-sm outline-none"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1.5px solid rgba(255,255,255,0.12)',
                  color: 'white',
                }}
              />
              <button className="absolute right-4 top-1/2 -translate-y-1/2" onClick={() => setShowPw(!showPw)}>
                {showPw ? <EyeOff size={18} className="text-white/40" /> : <Eye size={18} className="text-white/40" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-xl p-3 text-sm" style={{ background: 'rgba(142, 49, 20, 0.3)', color: '#f87171', border: '1px solid rgba(142,49,20,0.5)' }}>
              {error}
            </div>
          )}

          <div className="flex justify-end">
            <button onClick={() => setScreen('forgotPassword')} className="text-sm" style={{ color: '#94d400' }}>Quên mật khẩu?</button>
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-4 rounded-2xl font-semibold text-base transition-all active:scale-95 disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #94d400 0%, #72a800 100%)', color: '#0d1f12' }}
          >
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </div>

        <p className="text-center mt-6 text-sm pb-8" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Chưa có tài khoản?{' '}
          <button onClick={() => setScreen('register')} style={{ color: '#94d400' }} className="font-semibold hover:underline">
            Đăng ký ngay
          </button>
        </p>
      </div>
    </div>
  );
}
