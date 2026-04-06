import { ReactNode } from 'react';

interface PageContainerProps {
  children:  ReactNode;
  narrow?:   boolean;   // max-w-3xl
  className?: string;
}

export function PageContainer({ children, narrow = false, className = '' }: PageContainerProps) {
  return (
    <main className={`${narrow ? 'max-w-3xl' : 'max-w-5xl'} mx-auto px-4 sm:px-6 py-8 w-full ${className}`}>
      {children}
    </main>
  );
}
