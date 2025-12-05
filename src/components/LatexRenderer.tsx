import React, { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface LatexRendererProps {
  content: string;
  block?: boolean;
  className?: string;
}

/**
 * Component to render LaTeX content using KaTeX
 * Supports both inline and block math modes
 */
export const LatexRenderer: React.FC<LatexRendererProps> = ({
  content,
  className = ''
}) => {
  if (!content) return null;

  try {
    // Split content by LaTeX delimiters
    const parts = parseLatexContent(content);

    return (
      <span className={className}>
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
  } catch (error) {
    console.error('Error rendering LaTeX:', error);
    return <span className={`${className} latex-error`}>{content}</span>;
  }
};

/**
 * Inline LaTeX rendering component
 */
const LatexInline: React.FC<{ content: string }> = ({ content }) => {
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
};

/**
 * Block LaTeX rendering component
 */
const LatexBlock: React.FC<{ content: string }> = ({ content }) => {
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
};

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

  // Sort matches by position
  matches.sort((a, b) => a.index - b.index);

  // Build parts array
  for (const match of matches) {
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
