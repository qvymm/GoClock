import { useApp } from '../lib/AppContext';

export function SplashScreen() {
  const { setScreen } = useApp();

  return (
    <div
      className="w-full h-full flex flex-col relative overflow-hidden safe-pt safe-pb"
      style={{ background: 'linear-gradient(160deg, #0d1f12 0%, #173325 50%, #0a1608 100%)' }}
    >
      {/* Background decoration */}
      <div className="absolute inset-0">
        <div className="absolute top-20 right-0 w-64 h-64 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #94d400 0%, transparent 70%)' }} />
        <div className="absolute bottom-32 left-0 w-48 h-48 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #B2A04F 0%, transparent 70%)' }} />
      </div>


      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 relative z-10">
        {/* Logo */}
        <div
          className="w-32 h-32 rounded-3xl overflow-hidden mb-6 shadow-2xl"
          style={{ boxShadow: '0 20px 60px rgba(148, 212, 0, 0.3)' }}
        >
          <img src="/logo-g.png" className="w-full h-full object-cover" />
        </div>

        {/* App name */}
        <h1 className="text-4xl font-bold mb-2" style={{ color: '#94d400', letterSpacing: '-0.5px' }}>
          GõClock
        </h1>

        {/* Slogan */}
        <p className="text-center text-base mb-2" style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 400 }}>
          <span style={{ color: '#B2A04F' }}>Tick</span> thói quen,{' '}
          <span style={{ color: '#B2A04F' }}>Tock</span> năng lượng
        </p>

        <p className="text-center text-sm mb-16 leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
          Xây dựng lối sống lành mạnh
        </p>

        {/* Buttons */}
        <div className="w-full flex flex-col gap-3">
          <button
            onClick={() => setScreen('onboarding')}
            className="w-full py-4 rounded-2xl font-semibold text-base transition-all active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #94d400 0%, #72a800 100%)',
              color: '#0d1f12',
              boxShadow: '0 4px 20px rgba(148, 212, 0, 0.3)',
            }}
          >
            Bắt đầu
          </button>
        </div>

        <p className="text-center mt-6 text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
          Đã có tài khoản?{' '}
          <button
            onClick={() => setScreen('login')}
            className="font-semibold underline underline-offset-2"
            style={{ color: '#94d400' }}
          >
            Đăng nhập
          </button>
        </p>
      </div>

      {/* Wave bottom decoration */}
      <div className="absolute bottom-0 left-0 right-0 h-24 opacity-10"
        style={{ background: 'linear-gradient(to top, #94d400, transparent)' }} />

    </div>
  );
}
