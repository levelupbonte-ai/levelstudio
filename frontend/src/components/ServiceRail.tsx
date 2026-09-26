import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface Service {
  id: string;
  label: string;
  hint: string;
}

export const SERVICES: Service[] = [
  { id: "barbershop", label: "Barbershop", hint: "chair booking, barber profiles, local visibility" },
  { id: "salon", label: "Hair & beauty", hint: "stylist portfolios, price grid, scheduling" },
  { id: "store", label: "Online store", hint: "products, merch, secure checkout" },
  { id: "booking", label: "Online booking", hint: "appointments, staff, clients" },
  { id: "restaurant", label: "Restaurant & café", hint: "interactive menu, reservations, directions" },
  { id: "portfolio", label: "Portfolio", hint: "showcase work on a personal brand" },
  { id: "creator", label: "Creator & media", hint: "link in bio, media kit, email capture" },
  { id: "landing", label: "Landing page", hint: "modern page built to convert" },
  { id: "events", label: "Events & pop-ups", hint: "RSVP, ticketing, schedule, galleries" },
];

interface ServiceRailProps {
  selected: string[];
  onToggle: (service: Service) => void;
  disabled?: boolean;
}

export default function ServiceRail({ selected, onToggle, disabled }: ServiceRailProps) {
  const railRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const sync = () => {
    const el = railRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  };

  const nudge = (dir: -1 | 1) => {
    railRef.current?.scrollBy({ left: dir * 260, behavior: "smooth" });
  };

  return (
    <div className="relative" data-testid="service-catalogue">
      <button
        type="button"
        onClick={() => nudge(-1)}
        disabled={atStart}
        aria-label="Previous services"
        className="absolute -left-1 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/10 bg-[#13131d] p-1.5 text-slate-400 transition-opacity duration-200 hover:text-white disabled:pointer-events-none disabled:opacity-0"
        data-testid="services-prev"
      >
        <ChevronLeft className="size-4" />
      </button>

      <div
        ref={railRef}
        onScroll={sync}
        className="no-scrollbar flex gap-2 overflow-x-auto scroll-smooth px-6"
      >
        {SERVICES.map((s) => {
          const active = selected.includes(s.id);
          return (
            <button
              key={s.id}
              type="button"
              disabled={disabled}
              onClick={() => onToggle(s)}
              className={`shrink-0 rounded-xl border px-3.5 py-2 text-[13px] transition-[border-color,color,background-color] duration-200 disabled:opacity-40 ${
                active
                  ? "border-violet-400/70 bg-violet-500/15 text-white"
                  : "border-white/8 bg-white/[0.02] text-slate-400 hover:border-violet-400/40 hover:text-white"
              }`}
              data-testid={`service-${s.id}`}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => nudge(1)}
        disabled={atEnd}
        aria-label="More services"
        className="absolute -right-1 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/10 bg-[#13131d] p-1.5 text-slate-400 transition-opacity duration-200 hover:text-white disabled:pointer-events-none disabled:opacity-0"
        data-testid="services-next"
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}
