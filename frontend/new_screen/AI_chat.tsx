import { FormEvent, KeyboardEvent, useMemo, useState } from "react";
import image from "./image.svg";
import vector from "./vector.svg";
import vector2 from "./vector-2.svg";

type Suggestion = {
  id: string;
  label: string;
};

type Message = {
  id: string;
  sender: "user" | "assistant";
  text: string;
};

const suggestions: Suggestion[] = [
  { id: "schedule", label: "Lên lịch học cho tôi" },
  { id: "calories", label: "Phân tích calo hôm nay" },
  { id: "documents", label: "Tìm kiếm tài liệu cho EXE101" },
];

const initialMessages: Message[] = [
  {
    id: "user-1",
    sender: "user",
    text: "Bạn lên lịch học cho tôi",
  },
  {
    id: "assistant-1",
    sender: "assistant",
    text: "",
  },
];

export const HtmlBody = (): JSX.Element => {
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<Message[]>(initialMessages);

  const canSend = useMemo(() => inputValue.trim().length > 0, [inputValue]);

  const handleSubmit = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    const trimmedValue = inputValue.trim();

    if (!trimmedValue) {
      return;
    }

    setMessages((prev) => [
      ...prev,
      {
        id: `user-${prev.length + 1}`,
        sender: "user",
        text: trimmedValue,
      },
    ]);
    setInputValue("");
  };

  const handleSuggestionClick = (label: string) => {
    setInputValue(label);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      handleSubmit();
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-start relative bg-[linear-gradient(0deg,rgba(26,48,32,1)_0%,rgba(26,48,32,1)_100%),linear-gradient(0deg,rgba(255,255,255,1)_0%,rgba(255,255,255,1)_100%)]">
      <header className="flex items-center pt-4 pb-6 px-4 relative self-stretch w-full flex-[0_0_auto] bg-transparent">
        <button
          type="button"
          aria-label="Quay lại"
          className="inline-flex flex-col items-start p-2 relative flex-[0_0_auto]"
        >
          <div className="relative w-6 h-6">
            <img
              className="absolute w-[91.67%] h-[83.33%] top-[16.67%] left-[8.33%]"
              alt=""
              src={vector}
            />
          </div>
        </button>
        <div className="items-start pl-0 pr-8 py-0 flex-1 grow flex flex-col relative">
          <div className="items-center self-stretch w-full flex-[0_0_auto] flex flex-col relative">
            <h1 className="relative flex items-center justify-center w-fit mt-[-1.00px] [font-family:'Inter-SemiBold',Helvetica] font-semibold text-white text-lg text-center tracking-[0] leading-7 whitespace-nowrap">
              Hỏi AI GõClock
            </h1>
          </div>
        </div>
      </header>
      <section className="flex flex-col items-start pt-0 pb-6 px-6 relative self-stretch w-full flex-[0_0_auto]">
        <div className="items-start self-stretch w-full flex-[0_0_auto] flex flex-col relative">
          <h2 className="relative self-stretch mt-[-1.00px] [font-family:'Inter-Bold',Helvetica] font-bold text-white text-2xl tracking-[0] leading-[30px]">
            Chào buổi sáng, tôi có thể
            <br />
            giúp gì cho bạn?
          </h2>
        </div>
      </section>
      <section className="flex flex-col items-start relative flex-1 self-stretch w-full grow bg-[#e9efec] rounded-[40px_40px_0px_0px] overflow-hidden">
        <div className="flex items-start pt-6 pb-2 px-4 relative self-stretch w-full flex-[0_0_auto] overflow-x-auto overflow-y-hidden">
          {suggestions.slice(0, 2).map((suggestion, index) => (
            <div
              key={suggestion.id}
              className={
                index === 0
                  ? "inline-flex flex-col items-center justify-center px-4 py-2 relative flex-[0_0_auto] rounded-full border-2 border-solid border-[#1a3020]"
                  : "inline-flex flex-col items-start pl-2 pr-0 py-0 relative flex-[0_0_auto]"
              }
            >
              <button
                type="button"
                onClick={() => handleSuggestionClick(suggestion.label)}
                className={
                  index === 0
                    ? "inline-flex flex-col items-center justify-center px-0 py-0 relative flex-[0_0_auto]"
                    : "inline-flex flex-col items-center justify-center px-4 py-2 relative flex-[0_0_auto] rounded-full border-2 border-solid border-[#1a3020]"
                }
              >
                <span className="relative flex items-center justify-center w-fit [font-family:'Inter-SemiBold',Helvetica] font-semibold text-[#1a3020] text-sm text-center tracking-[0] leading-5 whitespace-nowrap">
                  {suggestion.label}
                </span>
              </button>
            </div>
          ))}
        </div>
        <div className="flex flex-col items-start pt-0 pb-4 px-4 relative self-stretch w-full flex-[0_0_auto] overflow-x-auto overflow-y-hidden">
          <button
            type="button"
            onClick={() => handleSuggestionClick(suggestions[2].label)}
            className="inline-flex items-center justify-center px-4 py-2 relative flex-[0_0_auto] rounded-full border-2 border-solid border-[#1a3020]"
          >
            <span className="relative flex items-center justify-center w-fit [font-family:'Inter-SemiBold',Helvetica] font-semibold text-[#1a3020] text-sm text-center tracking-[0] leading-5 whitespace-nowrap">
              {suggestions[2].label}
            </span>
          </button>
        </div>
        <section
          aria-label="Đoạn hội thoại"
          className="flex flex-col items-start gap-4 p-4 relative flex-1 self-stretch w-full grow overflow-y-auto"
        >
          {messages.map((message) =>
            message.sender === "user" ? (
              <div
                key={message.id}
                className="flex items-start justify-end relative self-stretch w-full flex-[0_0_auto]"
              >
                <div className="inline-flex flex-col max-w-[286.4px] items-start p-4 relative flex-[0_0_auto] self-stretch bg-[#d4f03d] rounded-[16px_0px_16px_16px] shadow-[0px_1px_2px_#0000000d]">
                  <p className="relative flex items-center w-fit mt-[-1.00px] [font-family:'Inter-Medium',Helvetica] font-medium text-black text-sm tracking-[0] leading-5 whitespace-nowrap">
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
                  className="relative max-w-[304.3px] w-[45.05px] self-stretch bg-[#263d2e] rounded-[0px_16px_16px_16px] shadow-[0px_1px_2px_#0000000d] min-h-9"
                />
              </div>
            ),
          )}
          <div className="relative self-stretch w-full h-8" />
          <div className="relative self-stretch w-full h-[31.5px]" />
        </section>
        <form
          onSubmit={handleSubmit}
          className="flex flex-col items-start p-4 relative self-stretch w-full flex-[0_0_auto] bg-[#e9efec]"
        >
          <div className="items-center flex relative self-stretch w-full flex-[0_0_auto]">
            <label className="flex w-[286px] items-center px-4 py-2 relative bg-white rounded-full border border-solid border shadow-[0px_1px_2px_#0000000d]">
              <div className="inline-flex flex-col items-start p-1 relative flex-[0_0_auto]">
                <div className="relative w-6 h-6">
                  <img
                    className="absolute w-[83.33%] h-[95.83%] top-[4.17%] left-[16.67%]"
                    alt=""
                    src={image}
                  />
                </div>
              </div>
              <div className="flex flex-col items-start px-2 py-2.5 relative flex-1 grow">
                <div className="flex-col items-start flex relative self-stretch w-full flex-[0_0_auto]">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(event) => setInputValue(event.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Hỏi AI..."
                    aria-label="Nhập câu hỏi cho AI"
                    className="relative flex items-center self-stretch mt-[-1.00px] [font-family:'Inter-Regular',Helvetica] font-normal text-[#1a3020] placeholder:text-gray-400 text-base tracking-[0] leading-[normal]"
                  />
                </div>
              </div>
            </label>
            <div className="flex-col w-[72px] items-start pl-3 pr-0 py-0 flex h-14 relative">
              <button
                type="submit"
                aria-label="Gửi tin nhắn"
                disabled={!canSend}
                className="w-[60px] items-center justify-center bg-[#d4f03d] rounded-full flex h-14 relative disabled:opacity-100"
              >
                <div className="relative w-7 h-7">
                  <img
                    className="absolute w-[91.67%] h-[87.50%] top-[12.50%] left-[8.33%]"
                    alt=""
                    src={vector2}
                  />
                </div>
              </button>
            </div>
          </div>
        </form>
      </section>
    </main>
  );
};
