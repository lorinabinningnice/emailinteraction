import { Mail, Phone, Building2, CalendarDays, Clock, MessageSquare, ChevronRight } from "lucide-react";
import { Divider } from "@nicecxone/lyra-ui";

/* ── Types ─────────────────────────────────────────────────────────────────── */

export interface CustomerInfoContentProps {
  name?: string;
  email?: string;
}

/* ── Sentiment bar ──────────────────────────────────────────────────────────── */

function SentimentBar({ score }: { score: number }) {
  // score 0–100
  const pct = Math.min(100, Math.max(0, score));
  const color =
    pct >= 65 ? "bg-green-500"
    : pct >= 35 ? "bg-yellow-400"
    : "bg-red-500";
  const label =
    pct >= 65 ? "Positive"
    : pct >= 35 ? "Neutral"
    : "Negative";
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-lyra-fg-secondary">Sentiment</span>
        <span className="font-medium text-lyra-fg-default">{label}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-lyra-border-subtle overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* ── Case history row ───────────────────────────────────────────────────────── */

function CaseRow({ id, subject, date, status }: {
  id: string; subject: string; date: string; status: "closed" | "open" | "pending";
}) {
  const statusStyles = {
    open:    "bg-green-100 text-green-700",
    pending: "bg-yellow-100 text-yellow-700",
    closed:  "bg-lyra-bg-surface-shell text-lyra-fg-secondary",
  };
  return (
    <button
      type="button"
      className="w-full flex items-start gap-2 rounded-lyra-sm px-2 py-2 text-left hover:bg-lyra-state-hover group"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-mono text-lyra-fg-secondary">{id}</span>
          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${statusStyles[status]}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        </div>
        <p className="text-xs text-lyra-fg-default mt-0.5 truncate">{subject}</p>
        <p className="text-[11px] text-lyra-fg-secondary mt-0.5">{date}</p>
      </div>
      <ChevronRight className="h-3.5 w-3.5 text-lyra-fg-secondary shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" strokeWidth={1.5} />
    </button>
  );
}

/* ── Main component ─────────────────────────────────────────────────────────── */

export function CustomerInfoContent({
  name = "Liam Davis",
  email = "davisbrliam342@sunsecurity.com",
}: CustomerInfoContentProps) {
  return (
    <div className="flex flex-col gap-0 text-sm overflow-y-auto h-full">

      {/* Contact details */}
      <section className="px-4 pt-3 pb-3">
        <h3 className="text-xs font-semibold text-lyra-fg-secondary uppercase tracking-wide mb-2.5">
          Contact Details
        </h3>
        <ul className="flex flex-col gap-2">
          {[
            { icon: <Mail    className="h-3.5 w-3.5" strokeWidth={1.5} />, value: email },
            { icon: <Phone   className="h-3.5 w-3.5" strokeWidth={1.5} />, value: "+1 (253) 895-8956" },
            { icon: <Building2 className="h-3.5 w-3.5" strokeWidth={1.5} />, value: "Sun Security Inc." },
            { icon: <CalendarDays className="h-3.5 w-3.5" strokeWidth={1.5} />, value: "Customer since Mar 2021" },
          ].map(({ icon, value }) => (
            <li key={value} className="flex items-center gap-2 text-xs text-lyra-fg-default">
              <span className="text-lyra-fg-secondary shrink-0">{icon}</span>
              <span className="truncate">{value}</span>
            </li>
          ))}
        </ul>
      </section>

      <Divider />

      {/* Sentiment */}
      <section className="px-4 py-3">
        <SentimentBar score={42} />
        <div className="mt-2 flex items-center gap-1.5 text-xs text-lyra-fg-secondary">
          <Clock className="h-3 w-3 shrink-0" strokeWidth={1.5} />
          <span>Avg. response time: <span className="text-lyra-fg-default">4h 12m</span></span>
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-xs text-lyra-fg-secondary">
          <MessageSquare className="h-3 w-3 shrink-0" strokeWidth={1.5} />
          <span>Total interactions: <span className="text-lyra-fg-default">14</span></span>
        </div>
      </section>

      <Divider />

      {/* Case history */}
      <section className="px-2 pt-3 pb-4 flex-1">
        <h3 className="px-2 text-xs font-semibold text-lyra-fg-secondary uppercase tracking-wide mb-1.5">
          Recent Cases
        </h3>
        <div className="flex flex-col">
          <CaseRow
            id="CUS-10041"
            subject="Where's my refund? I can't believe I'm still waiting..."
            date="Today · Email"
            status="open"
          />
          <CaseRow
            id="CUS-09887"
            subject="Duplicate charge on July invoice"
            date="2 weeks ago · Voice"
            status="closed"
          />
          <CaseRow
            id="CUS-09654"
            subject="Account access issue after password reset"
            date="1 month ago · Chat"
            status="closed"
          />
          <CaseRow
            id="CUS-09201"
            subject="Billing discrepancy — Q1 statement"
            date="3 months ago · Email"
            status="closed"
          />
        </div>
      </section>
    </div>
  );
}
