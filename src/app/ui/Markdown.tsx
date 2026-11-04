import ReactMarkdown from "react-markdown";

// Question text is written by teachers and read by students, so it is never HTML: raw HTML is
// dropped and only these elements render (Phase-3-Critic #5). No images until uploads exist.
const ALLOWED = [
  "p",
  "strong",
  "em",
  "code",
  "pre",
  "ul",
  "ol",
  "li",
  "blockquote",
  "br",
  "hr",
  "a",
];

export function Markdown({ children }: { children: string }) {
  return (
    <div className="space-y-2 [&_code]:rounded [&_code]:bg-surface-muted [&_code]:px-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6">
      <ReactMarkdown
        skipHtml
        allowedElements={ALLOWED}
        unwrapDisallowed
        components={{
          a: ({ href, children: text }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="text-accent underline"
            >
              {text}
            </a>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
