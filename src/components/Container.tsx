import { ReactNode } from 'react';

interface ContainerProps {
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
}

const sizes = {
  sm: 'max-w-lg',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-5xl',
  '2xl': 'max-w-6xl',
};

export default function Container({
  children,
  size = 'lg',
  className = '',
}: ContainerProps) {
  return (
    <div className={`relative z-10 ${sizes[size]} mx-auto px-4 sm:px-6 ${className}`}>
      {children}
    </div>
  );
}
