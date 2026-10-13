import React, { FormEvent, KeyboardEvent, useMemo, useState } from 'react';
import { ArrowLeft, Mic, Send } from 'lucide-react';
import { useApp } from '../lib/AppContext';

type Suggestion = {
  id: string;
  label: string;
};

type Message = {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
};

const suggestions: Suggestion[] = [
  { id: 'schedule', label: 'Lên lịch học cho tôi' },
  { id: 'calories', label: 'Phân tích calo hôm nay' },
  { id: 'documents', label: 'Tìm kiếm tài liệu cho EXE101' },
];

const initialMessages: Message[] = [
  {
    id: 'user-1',
    sender: 'user',
    text: 'Bạn lên lịch học cho tôi',
  },
  {
    id: 'assistant-1',
    sender: 'assistant',
    text: 'Mình có thể giúp bạn lập lịch học, chia deadline hoặc thêm ghi chú bữa ăn. Bạn muốn bắt đầu từ đâu?',
  },
  {
    id: 'user-2',
    sender: 'user',
    text: 'Lên lịch học cho tôi và tìm tài liệu EXE101',
  },
  {
    id: 'assistant-2',
    sender: 'assistant',
    text: 'Mình sẽ ưu tiên lịch học ngắn, có thời gian nghỉ và chèn một khung ôn EXE101 ở cuối buổi.',
  },
];

export function AIChatScreen(): JSX.Element {
  const { setScreen } = useApp();
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<Message[]>(initialMessages);

  const canSend = useMemo(() => inputValue.trim().length > 0, [inputValue]);

  const handleSubmit = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    const trimmedValue = inputValue.trim();
    if (!trimmedValue) return;

    setMessages((prev) => [
      ...prev,
      {
        id: `user-${prev.length + 1}`,
        sender: 'user',
        text: trimmedValue,
      },
      {
        id: `assistant-${prev.length + 2}`,
        sender: 'assistant',
        text: 'Mình đã nhận yêu cầu. Nếu cần, mình có thể chia lịch theo buổi sáng, chiều và tối để bám deadline tốt hơn.',
      },
    ]);
    setInputValue('');
  };

  const handleSuggestionClick = (label: string) => {
    setInputValue(label);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <main className="flex h-full min-h-0 flex-col items-start relative bg-[#1a3020]">
      <header className="flex items-center pt-4 pb-5 px-4 relative self-stretch w-full flex-[0_0_auto] bg-transparent text-white">
        <button
          type="button"
          aria-label="Quay lại"
          onClick={() => setScreen('dashboard')}
          className="inline-flex items-center justify-center p-2 relative flex-[0_0_auto] rounded-full"
          style={{ background: 'rgba(255,255,255,0.08)' }}
        >
          <ArrowLeft size={24} />
        </button>
        <div className="items-start pl-0 pr-8 py-0 flex-1 grow flex flex-col relative">
          <div className="items-center self-stretch w-full flex-[0_0_auto] flex flex-col relative">
            <h1 className="relative flex items-center justify-center w-fit mt-[-1.00px] font-semibold text-white text-lg text-center tracking-[0] leading-7 whitespace-nowrap">
              Hỏi AI GõClock
            </h1>
          </div>
        </div>
      </header>

      <section className="flex flex-col items-start pt-0 pb-6 px-6 relative self-stretch w-full flex-[0_0_auto] text-white">
        <div className="items-start self-stretch w-full flex-[0_0_auto] flex flex-col relative">
          <h2 className="relative self-stretch mt-[-1.00px] font-bold text-white text-2xl tracking-[0] leading-[30px]">
            Chào buổi sáng, tôi có thể
            <br />
            giúp gì cho bạn?
          </h2>
        </div>
      </section>

      <section className="flex flex-col items-start relative flex-1 min-h-0 self-stretch w-full grow bg-[#e9efec] rounded-[40px_40px_0px_0px] overflow-hidden">
        <div className="flex items-start pt-6 pb-2 px-4 relative self-stretch w-full flex-[0_0_auto] overflow-x-auto overflow-y-hidden gap-2">
          {suggestions.slice(0, 2).map((suggestion) => (
            <button
              key={suggestion.id}
              type="button"
              onClick={() => handleSuggestionClick(suggestion.label)}
              className="inline-flex items-center justify-center px-4 py-2 relative flex-[0_0_auto] rounded-full border-2 border-solid border-[#1a3020] whitespace-nowrap"
            >
              <span className="relative flex items-center justify-center w-fit font-semibold text-[#1a3020] text-sm text-center tracking-[0] leading-5 whitespace-nowrap">
                {suggestion.label}
              </span>
            </button>
          ))}
        </div>

        <div className="flex flex-col items-start pt-0 pb-4 px-4 relative self-stretch w-full flex-[0_0_auto] overflow-x-auto overflow-y-hidden">
          <button
            type="button"
            onClick={() => handleSuggestionClick(suggestions[2].label)}
            className="inline-flex items-center justify-center px-4 py-2 relative flex-[0_0_auto] rounded-full border-2 border-solid border-[#1a3020] whitespace-nowrap"
          >
            <span className="relative flex items-center justify-center w-fit font-semibold text-[#1a3020] text-sm text-center tracking-[0] leading-5 whitespace-nowrap">
              {suggestions[2].label}
            </span>
          </button>
        </div>

        <section
          aria-label="Đoạn hội thoại"
          className="flex flex-col items-start gap-4 p-4 relative flex-1 min-h-0 self-stretch w-full grow overflow-y-auto"
        >
          {messages.map((message) =>
            message.sender === 'user' ? (
              <div
                key={message.id}
                className="flex items-start justify-end relative self-stretch w-full flex-[0_0_auto]"
              >
                <div className="inline-flex flex-col max-w-[286px] items-start p-4 relative flex-[0_0_auto] self-stretch bg-[#d4f03d] rounded-[16px_0px_16px_16px] shadow-[0px_1px_2px_#0000000d]">
                  <p className="relative flex items-center w-fit mt-[-1.00px] font-medium text-black text-sm tracking-[0] leading-5">
                    {message.text}
                  </p>
                </div>
              </div>
            ) : (
              <div
                key={message.id}
                className="flex items-start relative self-stretch w-full flex-[0_0_auto]"
              >
                <div
                  aria-label="Phản hồi từ AI"
                  className="relative max-w-[304px] w-auto self-stretch bg-[#263d2e] rounded-[0px_16px_16px_16px] shadow-[0px_1px_2px_#0000000d] min-h-9 px-4 py-3"
                >
                  <p className="text-sm leading-5 text-white/95">{message.text}</p>
                </div>
              </div>
            ),
          )}
          <div className="relative self-stretch w-full h-2" />
        </section>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col items-start p-4 relative self-stretch w-full flex-[0_0_auto] bg-[#e9efec]"
        >
          <div className="items-center flex relative self-stretch w-full flex-[0_0_auto]">
            <label className="flex flex-1 items-center px-4 py-2 relative bg-white rounded-full border border-solid border-black/10 shadow-[0px_1px_2px_#0000000d]">
              <div className="inline-flex flex-col items-start p-1 relative flex-[0_0_auto]">
                <div className="relative w-6 h-6 rounded-full flex items-center justify-center bg-[#e9efec] text-[#1a3020]">
                  <Mic size={18} />
                </div>
              </div>
              <div className="flex flex-col items-start px-2 py-2.5 relative flex-1 grow min-w-0">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(event) => setInputValue(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Hỏi AI..."
                  aria-label="Nhập câu hỏi cho AI"
                  className="relative flex items-center self-stretch mt-[-1.00px] w-full bg-transparent font-normal text-[#1a3020] placeholder:text-gray-400 text-base tracking-[0] leading-[normal] outline-none"
                />
              </div>
            </label>

            <div className="flex-col w-[72px] items-start pl-3 pr-0 py-0 flex h-14 relative">
              <button
                type="submit"
                aria-label="Gửi tin nhắn"
                disabled={!canSend}
                className="w-[60px] items-center justify-center bg-[#d4f03d] rounded-full flex h-14 relative disabled:opacity-100"
              >
                <Send size={22} color="#1a3020" />
              </button>
            </div>
          </div>
        </form>
      </section>
    </main>
  );
}