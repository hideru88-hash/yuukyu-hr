import React, { useState, useRef, useEffect } from 'react';

interface OTPInputProps {
    length?: number;
    onComplete: (code: string) => void;
    disabled?: boolean;
}

const OTPInput: React.FC<OTPInputProps> = ({ length = 6, onComplete, disabled = false }) => {
    const [otp, setOtp] = useState<string[]>(new Array(length).fill(""));
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        if (inputRefs.current[0]) {
            inputRefs.current[0].focus();
        }
    }, []);

    const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (isNaN(Number(value))) return;

        const newOtp = [...otp];
        // Allow only last entered character
        newOtp[index] = value.substring(value.length - 1);
        setOtp(newOtp);

        // Submit trigger
        const combinedOtp = newOtp.join("");
        if (combinedOtp.length === length) {
            onComplete(combinedOtp);
        }

        // Move to next input if current field is filled
        if (value && index < length - 1 && inputRefs.current[index + 1]) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleClick = (index: number) => {
        inputRefs.current[index]?.setSelectionRange(1, 1);

        // Optional: move focus to first empty input
        if (index > 0 && !otp[index - 1]) {
            inputRefs.current[otp.indexOf("")]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace" && !otp[index] && index > 0 && inputRefs.current[index - 1]) {
            // Move to previous input on backspace if empty
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData("text/plain").slice(0, length);

        if (!/^\d+$/.test(pastedData)) return; // Only allow digits

        const newOtp = [...otp];
        pastedData.split("").forEach((char, idx) => {
            if (idx < length) newOtp[idx] = char;
        });

        setOtp(newOtp);

        const combinedOtp = newOtp.join("");
        if (combinedOtp.length === length) {
            onComplete(combinedOtp);
        }

        // Focus last filled or next empty
        const nextIdx = Math.min(pastedData.length, length - 1);
        inputRefs.current[nextIdx]?.focus();
    };

    return (
        <div className="flex gap-2 sm:gap-3 justify-center">
            {otp.map((value, index) => (
                <input
                    key={index}
                    ref={(input) => (inputRefs.current[index] = input)}
                    type="text"
                    value={value}
                    onChange={(e) => handleChange(index, e)}
                    onClick={() => handleClick(index)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste} // Capture paste on any input
                    className={`w-10 h-14 sm:w-12 sm:h-16 text-center text-2xl font-bold rounded-xl border-2 outline-none transition-all duration-200
                        ${value
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-gray-200 bg-gray-50 text-gray-400 focus:border-primary/50 focus:bg-white focus:shadow-md focus:text-gray-900'
                        }
                        ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-100' : ''}
                    `}
                    disabled={disabled}
                    maxLength={1} // Prevent multiple chars physically but controlled by state too
                />
            ))}
        </div>
    );
};

export default OTPInput;
