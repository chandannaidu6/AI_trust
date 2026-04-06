import { useState } from 'react';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { SlotLabel } from '../../types';
import { toHighlightLang } from '../../utils/language';

const SLOT_BADGE: Record<SlotLabel, string> = {
  A: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  B: 'bg-sky-500/20    text-sky-300    border-sky-500/30',
  C: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  D: 'bg-amber-500/20  text-amber-300  border-amber-500/30',
};

interface CodeViewerProps {
  code: string;
  language: string;
  slot: SlotLabel;
}

export function CodeViewer({ code, language, slot }: CodeViewerProps) {
  const [copied,   setCopied]   = useState(false);
  const [expanded, setExpanded] = useState(false);
  const lineCount = code.split('\n').length;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="rounded-xl overflow-hidden border border-slate-700/60 shadow-xl fade-in"
      role="region"
      aria-label={`Solution ${slot} code`}
    >
      {/* Chrome bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#1a1f2e] border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          {/* Traffic-light dots — decorative */}
          <div className="flex gap-1.5" aria-hidden="true">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840]" />
          </div>

          <span className={`text-xs font-semibold px-2 py-0.5 rounded-md border font-mono ${SLOT_BADGE[slot]}`}>
            Solution {slot}
          </span>
          <span className="text-xs text-slate-500 font-mono hidden sm:inline">{language}</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-600 font-mono tabular-nums hidden sm:inline">
            {lineCount} lines
          </span>

          {/* Expand / collapse */}
          <button
            onClick={() => setExpanded(x => !x)}
            className="text-xs text-slate-500 hover:text-slate-200 transition-colors flex items-center gap-1"
            aria-label={expanded ? 'Collapse code' : 'Expand code'}
          >
            {expanded ? (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
            <span className="hidden sm:inline">{expanded ? 'Collapse' : 'Expand'}</span>
          </button>

          {/* Copy */}
          <button
            onClick={handleCopy}
            className="text-xs text-slate-500 hover:text-slate-200 transition-colors flex items-center gap-1.5"
            aria-label={copied ? 'Copied to clipboard' : 'Copy code to clipboard'}
          >
            {copied ? (
              <>
                <svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-green-400">Copied</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span className="hidden sm:inline">Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code body */}
      <div
        className={`overflow-auto code-scroll transition-all ${
          expanded ? 'max-h-[80vh]' : 'max-h-[52vh]'
        } min-h-[160px] text-[0.8rem] sm:text-[0.82rem]`}
      >
        <SyntaxHighlighter
          language={toHighlightLang(language)}
          style={atomOneDark}
          showLineNumbers
          lineNumberStyle={{
            color: '#3d4455',
            fontSize: '0.68rem',
            paddingRight: '1.2em',
            userSelect: 'none',
            minWidth: '2.6em',
          }}
          customStyle={{
            margin: 0,
            padding: '1.1rem 1rem',
            background: '#161b2e',
            fontSize: 'inherit',
            lineHeight: '1.65',
          }}
          codeTagProps={{
            style: {
              fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", Menlo, monospace',
            },
          }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
