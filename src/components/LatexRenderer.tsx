import { useEffect, useRef, memo, useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface LatexRendererProps {
  content: string;
  block?: boolean;
  className?: string;
}

/**
 * Helper to unescape JSON-like strings.
 * Generalized JSON parsing to handle standard escapes while preserving
 * LaTeX backslashes that are not valid JSON escapes.
 */
const processEscapes = (str: string): string => {
  if (!str) return str;
  let jsonBody = '';
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === '"') {
      // Escape all quotes as they are delimiters in JSON string
      jsonBody += '\\"';
    } else if (char === '\\') {
      const nextChar = str[i + 1];
      if (nextChar && ['"', '\\', '/', 'b', 'f', 'n', 'r', 't'].includes(nextChar)) {
        // Valid standard escape. Keep it.
        jsonBody += '\\' + nextChar;
        i++;
      } else if (nextChar === 'u') {
        const hex = str.substring(i + 2, i + 6);
        if (/^[0-9a-fA-F]{4}$/.test(hex)) {
           // Valid unicode escape \uXXXX
           jsonBody += '\\u' + hex;
           i += 5;
        } else {
           // Invalid unicode escape (e.g. \usepackage), treat backslash as literal
           jsonBody += '\\\\';
        }
      } else {
        // Not a valid escape (e.g. \alpha), treat backslash as literal
        jsonBody += '\\\\';
      }
    } else if (char === '\n') {
       // Literal newline -> escaped newline
       jsonBody += '\\n';
    } else if (char === '\r') {
       jsonBody += '\\r';
    } else if (char === '\t') {
       jsonBody += '\\t';
    } else if (char === '\b') {
       jsonBody += '\\b';
    } else if (char === '\f') {
       jsonBody += '\\f';
    } else {
      jsonBody += char;
    }
  }

  try {
    return JSON.parse(`"${jsonBody}"`);
  } catch (error) {
    console.error('Error in generalized JSON helper:', error);
    // Fallback to original string if parsing fails, though our construction should be valid
    return str;
  }
};

/**
 * Component to render LaTeX content using KaTeX
 * Supports both inline and block math modes
 * Memoized to prevent unnecessary re-renders
 */
export const LatexRenderer = memo<LatexRendererProps>(({
  content,
  className = ''
}) => {
  // Memoize the parsed content to avoid reparsing on every render
  const parts = useMemo(() => {
    if (!content) return null;
    try {
      // First, process JSON-like escapes
      const unescaped = processEscapes(content);
      return parseLatexContent(unescaped);
    } catch (error) {
      console.error('Error parsing LaTeX:', error);
      return null;
    }
  }, [content]);

  if (!parts) {
    return content ? <span className={`${className} latex-error`} style={{ whiteSpace: 'pre-wrap' }}>{content}</span> : null;
  }

  // Use pre-wrap to preserve newlines resulting from unescaping
  return (
    <span className={className} style={{ whiteSpace: 'pre-wrap' }}>
      {parts.map((part, index) => {
        if (part.type === 'latex-block') {
          return <LatexBlock key={index} content={part.content} />;
        } else if (part.type === 'latex-inline') {
          return <LatexInline key={index} content={part.content} />;
        } else {
          return <span key={index}>{part.content}</span>;
        }
      })}
    </span>
  );
});

LatexRenderer.displayName = 'LatexRenderer';

/**
 * Inline LaTeX rendering component - memoized to prevent unnecessary re-renders
 */
const LatexInline = memo<{ content: string }>(({ content }) => {
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      try {
        katex.render(content, containerRef.current, {
          displayMode: false,
          throwOnError: false,
          errorColor: '#cc0000',
          strict: false,
          trust: false
        });
      } catch (error) {
        console.error('Error rendering inline LaTeX:', error);
        if (containerRef.current) {
          containerRef.current.textContent = content;
        }
      }
    }
  }, [content]);

  return <span ref={containerRef} className="latex-inline" />;
});

LatexInline.displayName = 'LatexInline';

/**
 * Block LaTeX rendering component - memoized to prevent unnecessary re-renders
 */
const LatexBlock = memo<{ content: string }>(({ content }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      try {
        katex.render(content, containerRef.current, {
          displayMode: true,
          throwOnError: false,
          errorColor: '#cc0000',
          strict: false,
          trust: false
        });
      } catch (error) {
        console.error('Error rendering block LaTeX:', error);
        if (containerRef.current) {
          containerRef.current.textContent = content;
        }
      }
    }
  }, [content]);

  return <div ref={containerRef} className="latex-block" />;
});

LatexBlock.displayName = 'LatexBlock';

interface ContentPart {
  type: 'text' | 'latex-inline' | 'latex-block';
  content: string;
}

/**
 * Parse content with LaTeX delimiters
 * Supports:
 * - $...$ for inline math
 * - $$...$$ for block math
 * - \(...\) for inline math
 * - \[...\] for block math
 */
function parseLatexContent(content: string): ContentPart[] {
  const parts: ContentPart[] = [];
  let currentPos = 0;

  // Regex patterns for different LaTeX delimiters
  const patterns = [
    { regex: /\$\$(.*?)\$\$/gs, type: 'latex-block' as const },
    { regex: /\\\[(.*?)\\\]/gs, type: 'latex-block' as const },
    { regex: /\$(.*?)\$/g, type: 'latex-inline' as const },
    { regex: /\\\((.*?)\\\)/g, type: 'latex-inline' as const }
  ];

  // Find all matches
  const matches: Array<{
    index: number;
    length: number;
    content: string;
    type: 'latex-inline' | 'latex-block'
  }> = [];

  for (const pattern of patterns) {
    let match;
    const regex = new RegExp(pattern.regex);
    while ((match = regex.exec(content)) !== null) {
      matches.push({
        index: match.index,
        length: match[0].length,
        content: match[1],
        type: pattern.type
      });
    }
  }

  // Sort matches by position, then by length (descending) to prioritize longer matches (e.g., $$ over $)
  matches.sort((a, b) => a.index - b.index || b.length - a.length);

  // Build parts array
  for (const match of matches) {
    // Skip if this match overlaps with a previously processed match
    if (match.index < currentPos) {
      continue;
    }

    // Add text before match
    if (match.index > currentPos) {
      parts.push({
        type: 'text',
        content: content.substring(currentPos, match.index)
      });
    }

    // Add LaTeX part
    parts.push({
      type: match.type,
      content: match.content
    });

    currentPos = match.index + match.length;
  }

  // Add remaining text
  if (currentPos < content.length) {
    parts.push({
      type: 'text',
      content: content.substring(currentPos)
    });
  }

  return parts.length > 0 ? parts : [{ type: 'text', content }];
}

export default LatexRenderer;
