interface TextInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  id?: string;
}

export function TextInput({ value, onChange, placeholder, id }: TextInputProps) {
  return (
    <input
      id={id}
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5
                 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800
                 placeholder:text-slate-300 dark:placeholder:text-slate-500
                 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
    />
  );
}
