import React, { useState } from 'react';
import { useApp } from '../lib/AppContext';
import { ArrowLeft, Search, MessageCircle, Mail, Phone, ChevronRight, ChevronDown, HelpCircle } from 'lucide-react';

const faqs = [
  { q: 'Làm sao để thêm nhiệm vụ mới?', a: 'Vào màn hình Lịch, nhấn nút + ở góc dưới bên phải, điền thông tin nhiệm vụ và lưu.' },
  { q: 'Tính toán TDEE như thế nào?', a: 'TDEE được tính dựa trên chiều cao, cân nặng, tuổi, giới tính và mức độ vận động của bạn theo công thức Mifflin-St Jeor.' },
  { q: 'Nhắc nhở giấc ngủ hoạt động ra sao?', a: 'Bạn chọn giờ thức dậy, ứng dụng sẽ đề xuất giờ đi ngủ tối ưu theo chu kỳ 90 phút và nhắc bạn trước 30 phút.' },
  { q: 'Làm sao để đổi mật khẩu?', a: 'Vào Hồ sơ > Cài đặt > Đổi mật khẩu, hoặc dùng tính năng Quên mật khẩu ở màn đăng nhập.' },
  { q: 'Dữ liệu của tôi có được bảo mật?', a: 'Có, chúng tôi sử dụng mã hóa và không chia sẻ dữ liệu cá nhân của bạn với bên thứ ba.' },
];

export function HelpScreen() {
  const { theme, setScreen } = useApp();
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);

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
