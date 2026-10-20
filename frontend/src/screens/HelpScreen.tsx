import React, { useEffect, useState } from 'react';
import { useApp } from '../lib/AppContext';
import { ArrowLeft, Search, MessageCircle, Mail, Phone, ChevronRight, ChevronDown, HelpCircle, Star } from 'lucide-react';
import { isSupabaseEnabled, supabase } from '../lib/supabase';

const faqs = [
  { q: 'Làm sao để thêm nhiệm vụ mới?', a: 'Vào màn hình Lịch, nhấn nút + ở góc dưới bên phải, điền thông tin nhiệm vụ và lưu.' },
  { q: 'Tính toán TDEE như thế nào?', a: 'TDEE được tính dựa trên chiều cao, cân nặng, tuổi, giới tính và mức độ vận động của bạn theo công thức Mifflin-St Jeor.' },
  { q: 'Nhắc nhở giấc ngủ hoạt động ra sao?', a: 'Bạn chọn giờ thức dậy, ứng dụng sẽ đề xuất giờ đi ngủ tối ưu theo chu kỳ 90 phút và nhắc bạn trước 30 phút.' },
  { q: 'Làm sao để đổi mật khẩu?', a: 'Vào Hồ sơ > Cài đặt > Đổi mật khẩu, hoặc dùng tính năng Quên mật khẩu ở màn đăng nhập.' },
  { q: 'Dữ liệu của tôi có được bảo mật?', a: 'Có, chúng tôi sử dụng mã hóa và không chia sẻ dữ liệu cá nhân của bạn với bên thứ ba.' },
];

export function HelpScreen() {
  const { theme, setScreen, user } = useApp();
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [savingRating, setSavingRating] = useState(false);
  const [ratingMessage, setRatingMessage] = useState('');

  useEffect(() => {
    if (!user || !isSupabaseEnabled) return;
    let active = true;
    void supabase.from('app_ratings').select('rating, review').eq('user_id', user.id).maybeSingle()
      .then(({ data, error }: any) => {
        if (!active || error || !data) return;
        setRating(Number(data.rating) || 0);
        setReview(data.review || '');
      });
    return () => { active = false; };
  }, [user?.id]);

  async function submitRating() {
    if (!user) {
      setScreen('login');
      return;
    }
    if (!rating) {
      setRatingMessage('Vui lòng chọn số sao trước khi gửi.');
      return;
    }
    setSavingRating(true);
    setRatingMessage('');
    const { error } = await supabase.from('app_ratings').upsert({
      user_id: user.id,
      rating,
      review: review.trim() || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
    setSavingRating(false);
    setRatingMessage(error ? 'Chưa gửi được đánh giá. Vui lòng thử lại.' : 'Cảm ơn bạn đã đánh giá GoClock!');
  }

  const filteredFaqs = faqs.filter(f => f.q.toLowerCase().includes(search.toLowerCase()) || f.a.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col h-full" style={{ background: theme === 'dark' ? '#0d1f12' : '#f0f7f2' }}>
      <div className="px-5 pt-4 pb-5" style={{ background: theme === 'dark' ? 'linear-gradient(160deg, #0d1f12 0%, #173325 100%)' : 'linear-gradient(160deg, #0f2a1a 0%, #173325 100%)' }}>
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => setScreen('profile')} className="p-2 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <ArrowLeft size={20} className="text-white/70" />
          </button>
          <h1 className="text-xl font-bold text-white">Trợ giúp</h1>
        </div>
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#94d400' }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm kiếm câu hỏi..."
            className="w-full pl-11 pr-4 py-3 rounded-xl text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.12)', color: 'white' }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scroll-content px-4 pt-4">
        <div className="rounded-2xl overflow-hidden mb-4" style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff', border: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(23,51,37,0.08)' }}>
          {filteredFaqs.map((faq, i) => (
            <div key={i} style={{ borderBottom: i < filteredFaqs.length - 1 ? `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.08)' : '#f0f0f0'}` : 'none' }}>
              <button
                onClick={() => setExpanded(expanded === i ? null : i)}
                className="w-full flex items-center gap-3 p-4 text-left"
              >
                <HelpCircle size={18} style={{ color: theme === 'dark' ? '#94d400' : '#173325', flexShrink: 0 }} />
                <span className="flex-1 text-sm font-medium" style={{ color: theme === 'dark' ? '#fff' : '#202124' }}>{faq.q}</span>
                <ChevronDown size={18} className={`transition-transform ${expanded === i ? 'rotate-180' : ''}`} style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.4)' : '#9aa0a6' }} />
              </button>
              {expanded === i && (
                <div className="px-4 pb-4 pt-0">
                  <p className="text-sm leading-relaxed ml-7" style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.6)' : '#5f6368' }}>{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        <section className="rounded-2xl p-4 mb-4" style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff', border: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(23,51,37,0.08)' }}>
          <h3 className="text-sm font-semibold" style={{ color: theme === 'dark' ? '#94d400' : '#173325' }}>Đánh giá GoClock</h3>
          <p className="mt-1 text-xs" style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.58)' : '#6b7280' }}>Trải nghiệm của bạn thế nào? Chọn số sao và để lại góp ý nếu muốn.</p>
          <div className="mt-3 flex items-center gap-1" role="group" aria-label="Chọn số sao đánh giá">
            {[1, 2, 3, 4, 5].map(value => (
              <button key={value} type="button" onClick={() => setRating(value)} aria-label={`${value} sao`}
                className="rounded-lg p-1.5 transition hover:scale-110 focus:outline-none focus:ring-2 focus:ring-lime-500">
                <Star size={28} fill={value <= rating ? '#f5b301' : 'transparent'} color={value <= rating ? '#f5b301' : '#9ca3af'} />
              </button>
            ))}
            {rating > 0 && <span className="ml-2 text-sm font-semibold" style={{ color: theme === 'dark' ? '#fff' : '#374151' }}>{rating}/5</span>}
          </div>
          <textarea value={review} onChange={event => setReview(event.target.value.slice(0, 500))}
            placeholder="Góp ý của bạn (không bắt buộc)" rows={3} maxLength={500}
            className="mt-3 w-full resize-none rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-emerald-600"
            style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff', borderColor: theme === 'dark' ? 'rgba(255,255,255,0.14)' : '#d1d5db', color: theme === 'dark' ? '#fff' : '#202124' }} />
          <div className="mt-2 flex items-center justify-between gap-3">
            <p aria-live="polite" className="text-xs" style={{ color: ratingMessage.startsWith('Cảm ơn') ? '#15803d' : '#dc2626' }}>{ratingMessage}</p>
            <button type="button" disabled={savingRating} onClick={() => void submitRating()}
              className="shrink-0 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: '#173325' }}>{savingRating ? 'Đang gửi…' : user && rating ? 'Cập nhật đánh giá' : 'Gửi đánh giá'}</button>
          </div>
        </section>

        <div className="rounded-2xl p-4 mb-4" style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff', border: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(23,51,37,0.08)' }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: theme === 'dark' ? '#94d400' : '#173325' }}>Liên hệ hỗ trợ</h3>
          {[
            { icon: Mail, label: 'Email', value: 'support@goclock.app' },
            { icon: MessageCircle, label: 'Zalo', value: 'GõClock Support' },
            { icon: Phone, label: 'Hotline', value: '1900-xxxx' },
          ].map((item, i) => (
            <button key={i} className="w-full flex items-center gap-3 py-3 text-left" style={{ borderBottom: i < 2 ? `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.08)' : '#f0f0f0'}` : 'none' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: theme === 'dark' ? 'rgba(148,212,0,0.15)' : 'rgba(23,51,37,0.08)' }}>
                <item.icon size={16} style={{ color: theme === 'dark' ? '#94d400' : '#173325' }} />
              </div>
              <div className="flex-1">
                <p className="text-xs" style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.5)' : '#9aa0a6' }}>{item.label}</p>
                <p className="text-sm font-medium" style={{ color: theme === 'dark' ? '#fff' : '#202124' }}>{item.value}</p>
              </div>
              <ChevronRight size={16} style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.3)' : '#d1d5db' }} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
