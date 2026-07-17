import { useMemo, useRef, useEffect } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import katex from 'katex';

interface LatexTextProps {
  /** Text content that may contain LaTeX math delimited by $...$ or $$...$$ */
  children: string;
  /** Optional styling */
  style?: any;
}

/**
 * Renders HTML string into a View using innerHTML (react-native-web supports this).
 */
function HtmlView({ html, style }: { html: string; style?: any }) {
  const ref = useRef<View>(null);

  useEffect(() => {
    if (ref.current) {
      (ref.current as any).innerHTML = html;
    }
  }, [html]);

  return <View ref={ref} style={style} />;
}

/**
 * Parses text for LaTeX delimiters ($...$ for inline, $$...$$ for display math)
 * and renders them using KaTeX on web.
 *
 * Falls back to plain Text when no LaTeX is detected.
 * Mixed plain-text and LaTeX segments are rendered inline.
 *
 * NOTE: Import `katex/dist/katex.min.css` in your app root for KaTeX styling.
 */
export function LatexText({ children, style }: LatexTextProps) {
  const segments = useMemo(() => {
    if (!children) return null;
    if (!children.includes('$')) return null;

    const parts: { type: 'text' | 'latex'; content: string }[] = [];
    const regex = /(\$\$(.+?)\$\$)|\$(.+?)\$/gs;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    const re = new RegExp(regex.source, 'gs');
    while ((match = re.exec(children)) !== null) {
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: children.slice(lastIndex, match.index),
        });
      }

      if (match[1]) {
        parts.push({ type: 'latex', content: match[2].trim() });
      } else if (match[3]) {
        parts.push({ type: 'latex', content: match[3].trim() });
      }

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < children.length) {
      parts.push({ type: 'text', content: children.slice(lastIndex) });
    }

    return parts;
  }, [children]);

  if (!segments) {
    return <Text style={style}>{children}</Text>;
  }

  const hasLatex = segments.some((s) => s.type === 'latex');
  if (!hasLatex) {
    return <Text style={style}>{children}</Text>;
  }

  try {
    if (segments.length === 1 && segments[0].type === 'latex') {
      const html = katex.renderToString(segments[0].content, {
        displayMode: false,
        throwOnError: false,
      });
      return <HtmlView html={html} style={style} />;
    }

    // Combine mixed segments into one HTML string
    let combinedHtml = '';
    for (const seg of segments) {
      if (seg.type === 'text') {
        combinedHtml += escapeHtml(seg.content);
      } else {
        combinedHtml += katex.renderToString(seg.content, {
          displayMode: false,
          throwOnError: false,
        });
      }
    }

    return <HtmlView html={combinedHtml} style={[styles.row, style]} />;
  } catch {
    return <Text style={style}>{children}</Text>;
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
});
