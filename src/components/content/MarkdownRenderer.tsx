import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import "highlight.js/styles/github-dark-dimmed.css";
import "katex/dist/katex.min.css";
import { CodeBlock } from "./CodeBlock";
import { ImageViewer } from "./ImageViewer";
import { VideoPlayer } from "./VideoPlayer";

const VIDEO_RE = /\.(mp4|webm|ogg|mov)(\?.*)?$/i;

interface Props {
  content: string;
}

export function MarkdownRenderer({ content }: Props) {
  return (
    <div
      className="
        [&_p]:my-1 [&_p]:leading-relaxed
        [&_h1]:text-lg [&_h1]:font-bold [&_h1]:my-2
        [&_h2]:text-base [&_h2]:font-bold [&_h2]:my-2
        [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:my-1.5
        [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:my-1
        [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:my-1
        [&_li]:my-0.5
        [&_blockquote]:border-l-2 [&_blockquote]:border-[var(--color-border)] [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-[var(--color-text-secondary)] [&_blockquote]:my-1
        [&_hr]:border-[var(--color-border)] [&_hr]:my-3
        [&_strong]:font-semibold [&_em]:italic
        [&_a]:text-[var(--color-accent)] [&_a]:underline [&_a]:underline-offset-2
      "
      style={{
        wordBreak: "break-word",
        overflowWrap: "anywhere",
        minWidth: 0,
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeHighlight, rehypeKatex]}
        components={{
          code({ className, children }) {
            const match = /language-(\w+)/.exec(className ?? "");
            const raw = String(children).replace(/\n$/, "");
            if (match || raw.includes("\n")) {
              return <CodeBlock code={raw} language={match?.[1]} />;
            }
            return (
              <code
                className="rounded font-mono border"
                style={{
                  fontSize: "0.85em",
                  padding: "1px 5px",
                  backgroundColor: "var(--color-elevated)",
                  borderColor: "var(--color-border)",
                  wordBreak: "break-all",
                }}
              >
                {children}
              </code>
            );
          },

          img({ src, alt }) {
            if (!src) return null;
            if (VIDEO_RE.test(src)) return <VideoPlayer src={src} />;
            return <ImageViewer src={src} alt={alt} />;
          },

          a({ href, children }) {
            if (href && VIDEO_RE.test(href)) return <VideoPlayer src={href} />;
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                style={{ wordBreak: "break-all" }}
              >
                {children}
              </a>
            );
          },

          // Tables: scroll horizontally inside the bubble, never expand the bubble
          table({ children }) {
            return (
              <div
                className="overflow-x-auto my-2"
                style={{ width: "100%", maxWidth: "100%" }}
              >
                <table
                  className="border-collapse border"
                  style={{
                    fontSize: "var(--text-xs)",
                    borderColor: "var(--color-border)",
                  }}
                >
                  {children}
                </table>
              </div>
            );
          },
          th({ children }) {
            return (
              <th
                className="border px-2 py-1 font-semibold text-left"
                style={{
                  borderColor: "var(--color-border)",
                  backgroundColor: "var(--color-elevated)",
                  // No nowrap — allow wrapping so wide tables don't blow out the bubble
                  wordBreak: "break-word",
                }}
              >
                {children}
              </th>
            );
          },
          td({ children }) {
            return (
              <td
                className="border px-2 py-1"
                style={{ borderColor: "var(--color-border)" }}
              >
                {children}
              </td>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
