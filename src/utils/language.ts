/** Maps dataset language names to react-syntax-highlighter language strings. */
export function toHighlightLang(language: string): string {
  const map: Record<string, string> = {
    Python: 'python',
    Java: 'java',
    C: 'c',
    'C++': 'cpp',
    JavaScript: 'javascript',
    TypeScript: 'typescript',
  };
  return map[language] ?? 'text';
}

/** Short display label for a language. */
export function langLabel(language: string): string {
  const map: Record<string, string> = { 'C++': 'C++' };
  return map[language] ?? language;
}
