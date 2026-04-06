import { ReactNode } from 'react';

type Color = 'indigo' | 'green' | 'sky' | 'amber' | 'violet' | 'slate' | 'emerald' | 'red';

interface BadgeProps {
  color?: Color;
  children: ReactNode;
  className?: string;
}

const colorClasses: Record<Color, string> = {
  indigo:  'bg-indigo-50 text-indigo-700 border-indigo-200',
  green:   'bg-green-50  text-green-700  border-green-200',
  sky:     'bg-sky-50    text-sky-700    border-sky-200',
  amber:   'bg-amber-50  text-amber-700  border-amber-200',
  violet:  'bg-violet-50 text-violet-700 border-violet-200',
  slate:   'bg-slate-100 text-slate-600  border-slate-200',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  red:     'bg-red-50    text-red-700    border-red-200',
};

export function Badge({ color = 'slate', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${colorClasses[color]} ${className}`}
    >
      {children}
    </span>
  );
}
