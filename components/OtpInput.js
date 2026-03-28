"use client";

import { useRef } from "react";

export default function OtpInput({ value, onChange, disabled }) {
  const inputs = useRef([]);

  const handleChange = (index, e) => {
    const char = e.target.value.replace(/\D/g, "").slice(-1);
    const next = value.split("");
    next[index] = char;
    const newVal = next.join("");
    onChange(newVal);

    if (char && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    onChange(pasted.padEnd(6, "").slice(0, 6));
    const focusIndex = Math.min(pasted.length, 5);
    inputs.current[focusIndex]?.focus();
  };

  return (
    <div className="flex gap-3 justify-center" onPaste={handlePaste}>
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => (inputs.current[i] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ""}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          disabled={disabled}
          autoFocus={i === 0}
          className="w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 border-gray-700 bg-gray-800 text-white focus:border-blue-500 focus:outline-none transition-colors disabled:opacity-50"
        />
      ))}
    </div>
  );
}
