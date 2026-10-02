import { useEffect, useState } from "react";

const WORDS = ["restaurant", "clinic", "studio", "boutique", "law firm", "agency", "gym", "hotel"];

function useTypewriter(words: string[]) {
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const target = words[index];
    const atEnd = shown === target;
    const delay = deleting ? 45 : atEnd ? 1600 : 85;
    const t = setTimeout(() => {
      if (!deleting && atEnd) {
        setDeleting(true);
        return;
      }
      if (deleting && shown.length === 0) {
        setDeleting(false);
        setIndex((i) => (i + 1) % words.length);
        return;
      }
      setShown(deleting ? target.slice(0, shown.length - 1) : target.slice(0, shown.length + 1));
    }, delay);
    return () => clearTimeout(t);
  }, [shown, deleting, index, words]);

  return shown;
}

export default function HeroIntro() {
  const word = useTypewriter(WORDS);
  return (
    <div className="stagger flex w-full flex-col items-center text-center" data-testid="hero-intro">
      <p className="text-[12px] font-medium uppercase tracking-[0.2em] text-slate-500">LevelStudio by LevelUp Ecosystem</p>
      <h1
        className="mt-5 max-w-[820px] font-heading text-[34px] font-semibold leading-[1.08] tracking-tight text-white sm:text-[52px] lg:text-[60px]"
        data-testid="hero-title"
      >
        Your <span className="text-slate-400">{word}</span>
        <span className="animate-caret ml-0.5 inline-block h-[0.9em] w-[3px] translate-y-[0.12em] bg-slate-400 align-baseline" aria-hidden="true" />
        <br />
        website, drafted before you commit.
      </h1>
      <p className="mt-5 max-w-[560px] text-[15px] leading-relaxed text-slate-400 sm:text-[16px]" data-testid="hero-subtitle">
        Describe the business. Answer a few sharp questions. Receive a complete, interactive website draft in minutes — no account required.
      </p>
    </div>
  );
}
