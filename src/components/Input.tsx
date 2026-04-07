import { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function Input({
  label,
  error,
  className = '',
  ...props
}: InputProps) {
  return (
    <div>
      {label && (
        <label className="block text-sm font-bold text-red-400 mb-2 uppercase tracking-wider">
          {label}
        </label>
      )}
      <input
        className={`
          w-full px-4 py-3 bg-gray-800 border-2 border-red-500/50 rounded-lg 
          text-white placeholder-gray-500 focus:ring-2 focus:ring-red-500 
          focus:border-red-500 outline-none transition font-mono
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="mt-2 text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}
