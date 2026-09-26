// Small, dependency-free Markdown renderer for the architect's prose:
// headings, bold/italic, inline code, links, bullet and numbered lists, paragraphs.

function inline(text: string, keyPrefix: string) {
  const tokens = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\((?:https?:)?[^)]+\))/g);
  return tokens.filter(Boolean).map((tok, i) => {
    const key = `${keyPrefix}-${i}`;
    if (tok.startsWith("**") && tok.endsWith("**"))
      return (
        <strong key={key} className="font-semibold text-white">
          {tok.slice(2, -2)}
        </strong>
      );
    if (tok.startsWith("`") && tok.endsWith("`"))
      return (
        <code key={key} className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[0.85em] text-violet-200">
          {tok.slice(1, -1)}
        </code>
      );
    if (tok.startsWith("*") && tok.endsWith("*"))
      return (
        <em key={key} className="italic">
          {tok.slice(1, -1)}
        </em>
      );
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(tok);
    if (link)
      return (
        <a
          key={key}
          href={link[2]}
          target="_blank"
          rel="noreferrer"
          className="text-violet-300 underline underline-offset-2 hover:text-violet-200"
        >
          {link[1]}
        </a>
      );
    return <span key={key}>{tok}</span>;
  });
}

export default function Markdown({ text }: { text: string }) {
  const lines = text.replace(/\r/g, "").split("\n");
  const blocks: React.ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flush = () => {
    if (!list) return;
    const Tag = list.ordered ? "ol" : "ul";
    blocks.push(
      <Tag
        key={`list-${blocks.length}`}
        className={`my-2 space-y-1.5 pl-5 ${list.ordered ? "list-decimal" : "list-disc"} marker:text-violet-400/70`}
      >
        {list.items.map((item, i) => (
          <li key={i} className="leading-relaxed">
            {inline(item, `li-${blocks.length}-${i}`)}
          </li>
        ))}
      </Tag>,
    );
    list = null;
  };

  lines.forEach((raw, idx) => {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flush();
      return;
    }
    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      flush();
      const level = heading[1].length;
      blocks.push(
        <p
          key={`h-${idx}`}
          className={`mt-4 mb-1.5 font-heading font-semibold tracking-tight text-white ${
            level <= 2 ? "text-lg" : "text-base"
          }`}
        >
          {inline(heading[2], `h-${idx}`)}
        </p>,
      );
      return;
    }
    const bullet = /^[-*•]\s+(.*)$/.exec(line.trim());
    const numbered = /^\d+[.)]\s+(.*)$/.exec(line.trim());
    if (bullet || numbered) {
      const ordered = Boolean(numbered);
      if (!list || list.ordered !== ordered) {
        flush();
        list = { ordered, items: [] };
      }
      list.items.push((bullet ?? numbered)![1]);
      return;
    }
    flush();
    blocks.push(
      <p key={`p-${idx}`} className="my-1.5 leading-relaxed">
        {inline(line.trim(), `p-${idx}`)}
      </p>,
    );
  });
  flush();

  return <div className="text-[15px] text-slate-200">{blocks}</div>;
}
