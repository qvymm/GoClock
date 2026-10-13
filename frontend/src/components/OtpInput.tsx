import React, { useRef, useEffect } from 'react';

interface OtpInputProps {
  value: string;
  onChange: (val: string) => void;
  length?: number;
  disabled?: boolean;
  hasError?: boolean;
}

export function OtpInput({
  value,
  onChange,
  length = 6,
  disabled = false,
  hasError = false,
}: OtpInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Tự động focus vào ô đầu tiên khi mở màn hình
    inputRefs.current[0]?.focus();
  }, []);

  const digits = Array.from({ length }, (_, i) => value[i] || '');

  const handleChange = (index: number, char: string) => {
    if (disabled) return;
    // Chỉ lấy chữ số
    const cleanChar = char.replace(/\D/g, '');
    if (!cleanChar) {
      // Xóa ký tự hiện tại
      const nextArr = [...digits];
      nextArr[index] = '';
      onChange(nextArr.join(''));
      return;
    }

    // Nếu gõ 1 ký tự
    const nextArr = [...digits];
    nextArr[index] = cleanChar[cleanChar.length - 1];
    const newCombined = nextArr.join('');
    onChange(newCombined);

    // Tự động nhảy sang ô kế tiếp
    if (index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        // Nếu ô hiện tại rỗng và bấm Backspace, lùi về ô trước
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (disabled) return;
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!pasted) return;

    onChange(pasted);
    const targetIdx = Math.min(pasted.length, length - 1);
    inputRefs.current[targetIdx]?.focus();
  };

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3 w-full my-2">
      {digits.map((digit, idx) => {
        const isFocused = !disabled;
        const isFilled = Boolean(digit);

        return (
          <input
            key={idx}
            ref={(el) => (inputRefs.current[idx] = el)}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={digit}
            disabled={disabled}
            onChange={(e) => handleChange(idx, e.target.value)}
            onKeyDown={(e) => handleKeyDown(idx, e)}
            onPaste={handlePaste}
            className={`w-11 h-14 sm:w-12 sm:h-16 text-center text-xl sm:text-2xl font-bold rounded-2xl outline-none transition-all duration-200 select-none ${
              hasError
                ? 'border-red-500 bg-red-500/10 text-red-300'
                : isFilled
                ? 'border-[#94d400] bg-[#94d400]/10 text-white shadow-[0_0_12px_rgba(148,212,0,0.2)]'
                : 'border-white/15 bg-white/5 text-white focus:border-[#94d400] focus:bg-[#94d400]/5'
            } border-2`}
          />
        );
      })}
    </div>
  );
}
