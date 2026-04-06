interface Option<T extends string> {
  value: T;
  label: string;
}

interface OptionPickerProps<T extends string> {
  options: Option<T>[];
  value: T | '';
  onChange: (v: T) => void;
  label?: string;
}

interface MultiOptionPickerProps<T extends string> {
  options: Option<T>[];
  value: T[];
  onChange: (v: T[]) => void;
  label?: string;
  multi: true;
}

const baseBtn = 'px-3.5 py-2 text-sm rounded-lg border transition-all font-medium focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900';
const activeBtn = 'bg-indigo-600 text-white border-indigo-600 shadow-sm';
const inactiveBtn = 'bg-white text-slate-600 border-slate-200 hover:border-indigo-400 hover:text-indigo-700 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600 dark:hover:border-indigo-500 dark:hover:text-indigo-300';

export function OptionPicker<T extends string>({ options, value, onChange, label }: OptionPickerProps<T>) {
  return (
    <div className="space-y-2">
      {label && <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{label}</p>}
      <div className="flex flex-wrap gap-2" role="radiogroup">
        {options.map(opt => (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={value === opt.value}
            onClick={() => onChange(opt.value)}
            className={`${baseBtn} ${value === opt.value ? activeBtn : inactiveBtn}`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function MultiOptionPicker<T extends string>({ options, value, onChange, label }: MultiOptionPickerProps<T>) {
  const toggle = (v: T) =>
    onChange(value.includes(v) ? value.filter(x => x !== v) : [...value, v]);

  return (
    <div className="space-y-2">
      {label && <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{label}</p>}
      <div className="flex flex-wrap gap-2" role="group">
        {options.map(opt => {
          const selected = value.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={selected}
              onClick={() => toggle(opt.value)}
              className={`${baseBtn} ${selected ? activeBtn : inactiveBtn}`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
