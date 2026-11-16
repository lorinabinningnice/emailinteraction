import { useState, useRef, useEffect } from "react";
import {
  ChevronDown, Paperclip, Link2, ImageIcon, Table2, Trash2, Plus,
  MoreHorizontal, Bold, Italic, Underline, Strikethrough,
  Reply, ReplyAll, Forward, FileText, Zap, X, Check, Sparkles, RefreshCw,
  CornerDownLeft, List, ListOrdered, Indent, Outdent,
  Undo2, Redo2, Quote, StickyNote,
} from "lucide-react";
import { Button, Popover, Divider } from "@nicecxone/lyra-ui";

/* ── Types ─────────────────────────────────────────────────────────────────── */

interface Attachment {
  name: string;
  size: string;
  type: "pdf" | "image" | "doc" | "other";
}

interface EmailMessage {
  id: string;
  from: { name: string; initials: string; color: string };
  to: string;
  date: string;
  /** HTML string — rendered via dangerouslySetInnerHTML */
  body: string;
  attachments?: Attachment[];
  defaultExpanded?: boolean;
  isNew?: boolean;
  isNote?: boolean;
}

export interface EmailViewProps {
  customerName?: string;
  customerEmail?: string;
  onInboundMessage?: () => void;
  onReplySent?: () => void;
}

/* ── Mock HTML thread ───────────────────────────────────────────────────────── */

const INITIAL_THREAD: EmailMessage[] = [
  {
    id: "1",
    from: { name: "Liam Davis", initials: "L", color: "#2563eb" },
    to: "customer.service@delta.com",
    date: "Mon, July 25 10:36 AM (2 days ago)",
    body: `
      <p>I've been waiting for my refund for <strong>over three weeks</strong> now and I still haven't received it. This is completely unacceptable.</p>
      <p>Here are the details:</p>
      <ul>
        <li>Order number: <strong>#A-228473</strong></li>
        <li>Purchase date: <strong>July 1, 2026</strong></li>
        <li>Refund amount: <strong>$349.99</strong></li>
        <li>Payment method: Visa ending in 4821</li>
      </ul>
      <p>I was told the refund would be processed within 5–7 business days. It has now been <em>21 business days</em>. Please escalate this immediately.</p>
      <p>— Liam Davis</p>
    `,
    attachments: [
      { name: "Invoice_July2026.pdf", size: "234 KB", type: "pdf" },
      { name: "Screenshot.png",       size: "1.2 MB", type: "image" },
    ],
    defaultExpanded: false,
  },
  {
    id: "2",
    from: { name: "Customer Service", initials: "C", color: "#0891b2" },
    to: "davisbrliam342@sunsecurity.com",
    date: "Mon, July 25 1:17 PM (2 days ago)",
    body: `
      <p>Dear Liam,</p>
      <p>Thank you for reaching out. I apologize for the delay — this is certainly not the experience we want our customers to have.</p>
      <p>I've located your order and can see the refund was initiated on July 8th. Here's what I found:</p>
      <ol>
        <li>The refund was approved on <strong>July 8</strong></li>
        <li>It was sent to your bank on <strong>July 10</strong></li>
        <li>Your bank's processing time can take up to <em>10 additional business days</em></li>
      </ol>
      <p>I'm escalating this to our finance team to investigate the delay. You will hear back within <strong>24 hours</strong>.</p>
      <p>Best regards,<br>Customer Service Team</p>
    `,
    defaultExpanded: false,
  },
  {
    id: "3",
    from: { name: "Liam Davis", initials: "L", color: "#2563eb" },
    to: "customer.service@delta.com",
    date: "Mon, July 26 9:19 AM (Yesterday)",
    body: `
      <p>I spoke with my bank and they confirmed they have <strong>not received any refund</strong> from your company. Your finance team needs to re-initiate the transfer.</p>
      <blockquote>
        <p>I've escalated this to our finance team to investigate the delay.</p>
      </blockquote>
      <p>It has now been <strong>48 hours</strong> since that message and I still have no update. Please provide a resolution by end of business today or I will have no choice but to escalate with my credit card provider.</p>
      <p>— Liam Davis</p>
    `,
    defaultExpanded: true,
  },
];

const TEMPLATES = [
  { id: "t1", label: "Acknowledge receipt",  body: "<p>Thank you for reaching out. I've received your message and will look into this right away.</p>" },
  { id: "t2", label: "Request more info",    body: "<p>To better assist you, could you please provide additional details about the issue you're experiencing?</p>" },
  { id: "t3", label: "Escalation notice",    body: "<p>I've escalated your case to our specialist team. You can expect a response within <strong>one business day</strong>.</p>" },
  { id: "t4", label: "Case resolved",        body: "<p>I'm happy to let you know that your case has been <strong>resolved</strong>. Please don't hesitate to reach out if you need further assistance.</p>" },
  { id: "t5", label: "Follow-up scheduled",  body: "<p>I'll be following up with you by <strong>end of day</strong> to make sure everything has been resolved to your satisfaction.</p>" },
];

/* ── Constants ──────────────────────────────────────────────────────────────── */

type CaseStatus = "open" | "resolved" | "deferred";
type ComposeMode = "reply" | "replyAll" | "forward" | null;

const STATUS_LABELS: Record<CaseStatus, string> = { open: "Open", resolved: "Resolved", deferred: "Deferred" };
const STATUS_COLORS: Record<CaseStatus, { dot: string; badge: string; text: string }> = {
  open:     { dot: "bg-green-500",  badge: "bg-green-50 border-green-200",   text: "text-green-700"  },
  resolved: { dot: "bg-blue-500",   badge: "bg-blue-50 border-blue-200",     text: "text-blue-700"   },
  deferred: { dot: "bg-yellow-500", badge: "bg-yellow-50 border-yellow-200", text: "text-yellow-700" },
};

const TEXT_COLORS = [
  "#1a1a1a", "#4a4a4a", "#888888", "#bbbbbb",
  "#c0392b", "#e67e22", "#f1c40f", "#27ae60",
  "#2980b9", "#8e44ad", "#d35400", "#16a085",
  "#e74c3c", "#3498db",
];

const HIGHLIGHT_COLORS = [
  { label: "Yellow",  value: "#fef08a" },
  { label: "Green",   value: "#bbf7d0" },
  { label: "Blue",    value: "#bfdbfe" },
  { label: "Pink",    value: "#fbcfe8" },
  { label: "Orange",  value: "#fed7aa" },
  { label: "None",    value: "transparent" },
];

const FONT_SIZES = [
  { label: "Small",  value: "2" },
  { label: "Normal", value: "3" },
  { label: "Large",  value: "4" },
  { label: "Huge",   value: "5" },
];

const FONT_FAMILIES = [
  { label: "Sans-serif", value: "Inter, Arial, sans-serif" },
  { label: "Serif",      value: "'Times New Roman', Georgia, serif" },
  { label: "Mono",       value: "'Courier New', Courier, monospace" },
];

/* ── Attachment chip ────────────────────────────────────────────────────────── */

function AttachChip({ file, onRemove }: { file: Attachment; onRemove?: () => void }) {
  const Icon = file.type === "pdf" || file.type === "doc" ? FileText : ImageIcon;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lyra-sm border border-lyra-border-default bg-lyra-bg-surface-base px-2 py-1 text-xs text-lyra-fg-default">
      <Icon className="h-3.5 w-3.5 text-lyra-fg-secondary shrink-0" strokeWidth={1.5} />
      <span className="max-w-[120px] truncate">{file.name}</span>
      <span className="text-lyra-fg-secondary">·</span>
      <span className="text-lyra-fg-secondary shrink-0">{file.size}</span>
      {onRemove && (
        <button type="button" onClick={onRemove} className="ml-0.5 text-lyra-fg-secondary hover:text-lyra-fg-default" aria-label={`Remove ${file.name}`}>
          <X className="h-3 w-3" strokeWidth={2} />
        </button>
      )}
    </span>
  );
}

/* ── Toolbar button ─────────────────────────────────────────────────────────── */

function TBtn({ icon, label, onMouseDown }: {
  icon: React.ReactNode;
  label: string;
  onMouseDown: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onMouseDown={onMouseDown}
      className="p-1.5 rounded-lyra-sm hover:bg-lyra-state-hover text-lyra-fg-secondary shrink-0"
    >
      {icon}
    </button>
  );
}

function TDivider() {
  return <div className="h-5 w-px bg-lyra-border-subtle mx-0.5 shrink-0" />;
}

/* ── Main component ─────────────────────────────────────────────────────────── */

export function EmailView({
  customerName = "Liam Davis",
  customerEmail = "davisbrliam342@sunsecurity.com",
  onInboundMessage,
  onReplySent,
}: EmailViewProps) {

  /* Thread */
  const [thread, setThread] = useState<EmailMessage[]>(INITIAL_THREAD);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(INITIAL_THREAD.filter((m) => m.defaultExpanded).map((m) => m.id))
  );
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryText, setSummaryText] = useState<string | null>(null);

  /* Subject */
  const [subject, setSubject] = useState("Where's my refund? I can't believe I'm still waiting...");
  const [subjectEditing, setSubjectEditing] = useState(false);
  const subjectInputRef = useRef<HTMLInputElement>(null);

  /* Status */
  const [caseStatus, setCaseStatus] = useState<CaseStatus>("open");
  const [statusPopoverOpen, setStatusPopoverOpen] = useState(false);

  /* Compose */
  const [composeMode, setComposeMode] = useState<ComposeMode>(null);
  const [replyToMsg, setReplyToMsg] = useState<EmailMessage | null>(null);
  const [showCc, setShowCc]   = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [toField,  setToField]  = useState(customerEmail);
  const [ccField,  setCcField]  = useState("");
  const [bccField, setBccField] = useState("");
  const [charCount, setCharCount] = useState(0);
  const [showPlaceholder, setShowPlaceholder] = useState(true);
  const [sendOptionsOpen, setSendOptionsOpen] = useState(false);
  const [composeAttachments, setComposeAttachments] = useState<Attachment[]>([]);

  /* Note mode */
  const [noteMode, setNoteMode] = useState(false);

  /* Toolbar state — tracked only for the color/highlight popovers */
  const [colorPopoverOpen,     setColorPopoverOpen]     = useState(false);
  const [highlightPopoverOpen, setHighlightPopoverOpen] = useState(false);
  const [templateOpen,         setTemplateOpen]         = useState(false);
  const [templateQuery,        setTemplateQuery]        = useState("");

  /* Refs */
  const editorRef    = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const composerRef  = useRef<HTMLDivElement>(null);
  const newMsgRef    = useRef<HTMLDivElement>(null);

  useEffect(() => { setToField(customerEmail); }, [customerEmail]);
  useEffect(() => { if (subjectEditing) subjectInputRef.current?.focus(); }, [subjectEditing]);

  /* Set default paragraph separator once on mount */
  useEffect(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (document as any).execCommand("defaultParagraphSeparator", false, "p");
    } catch { /* ignore */ }
  }, []);

  /* ── Helpers ── */

  const toggle = (id: string) =>
    setExpandedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  /* ── Compose ── */

  const openCompose = (mode: ComposeMode, msg?: EmailMessage) => {
    setComposeMode(mode);
    setReplyToMsg(msg ?? null);
    if (mode === "replyAll") { setShowCc(true); setCcField("agent@company.com"); }
    setTimeout(() => {
      if (!editorRef.current) return;
      if (msg && (mode === "reply" || mode === "replyAll")) {
        editorRef.current.innerHTML =
          `<p><br></p>` +
          `<blockquote style="border-left:3px solid #cbd5e1;padding:4px 12px;margin:8px 0;color:#64748b">` +
          `<p style="margin:0 0 4px"><strong>${msg.from.name}</strong> — ${msg.date}</p>` +
          `<div style="margin:0">${msg.body}</div>` +
          `</blockquote>`;
        const range = document.createRange();
        const sel = window.getSelection();
        range.setStart(editorRef.current.firstChild!, 0);
        range.collapse(true);
        sel?.removeAllRanges();
        sel?.addRange(range);
      } else if (mode === "forward" && msg) {
        editorRef.current.innerHTML =
          `<p>---------- Forwarded message ----------</p>` +
          `<p><strong>From:</strong> ${msg.from.name} &lt;${msg.to}&gt;</p>` +
          `<p><strong>Date:</strong> ${msg.date}</p>` +
          `<p><strong>Subject:</strong> ${subject}</p>` +
          `<hr>` +
          msg.body;
        setToField("");
      } else {
        editorRef.current.innerHTML = "<p><br></p>";
      }
      syncCount();
      editorRef.current.focus();
    }, 50);
    setTimeout(() => composerRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 80);
  };

  /* ── Rich text commands ── */

  const exec = (cmd: string, value?: string) => {
    editorRef.current?.focus();
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (document as any).execCommand(cmd, false, value ?? null);
    } catch { /* ignore */ }
  };

  const syncCount = () => {
    const text = editorRef.current?.textContent ?? "";
    setCharCount(text.length);
    setShowPlaceholder(text.replace(/\s/g, "").length === 0);
  };

  /** Strip HTML tags to plain text for preview snippets */
  const stripHtml = (html: string) => {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return (tmp.textContent ?? tmp.innerText ?? "").replace(/\s+/g, " ").trim();
  };

  const handleEditorInput = (e: React.FormEvent<HTMLDivElement>) => {
    syncCount();
    const text = e.currentTarget.textContent ?? "";
    const lastWord = text.split(/\s+/).pop() ?? "";
    if (lastWord.startsWith("#") && lastWord.length > 1) {
      setTemplateQuery(lastWord.slice(1).toLowerCase());
      setTemplateOpen(true);
    } else {
      setTemplateOpen(false);
      setTemplateQuery("");
    }
  };

  const insertTemplate = (body: string) => {
    if (!editorRef.current) return;
    editorRef.current.innerHTML = editorRef.current.innerHTML.replace(/#\w+$/, "");
    editorRef.current.innerHTML += body;
    // Move cursor to end
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(editorRef.current);
    range.collapse(false);
    sel?.removeAllRanges();
    sel?.addRange(range);
    syncCount();
    setTemplateOpen(false);
    setTemplateQuery("");
    editorRef.current.focus();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    setComposeAttachments((prev) => [
      ...prev,
      ...files.map((f) => ({
        name: f.name,
        size: `${(f.size / 1024).toFixed(0)} KB`,
        type: (f.type.startsWith("image/") ? "image" : f.name.endsWith(".pdf") ? "pdf" : "other") as Attachment["type"],
      })),
    ]);
    e.target.value = "";
  };

  const handleSend = (andResolve = false) => {
    const text = editorRef.current?.textContent ?? "";
    if (!text.trim()) return;
    const sent: EmailMessage = {
      id: `${noteMode ? "note" : "sent"}-${Date.now()}`,
      from: { name: "Customer Service", initials: "C", color: noteMode ? "#92400e" : "#0891b2" },
      to: noteMode ? "" : toField,
      date: "Just now",
      body: editorRef.current?.innerHTML ?? text,
      attachments: composeAttachments.length ? [...composeAttachments] : undefined,
      isNote: noteMode || undefined,
    };
    setThread((prev) => [...prev, sent]);
    setExpandedIds((prev) => new Set([...prev, sent.id]));
    if (editorRef.current) editorRef.current.innerHTML = "";
    setCharCount(0);
    setShowPlaceholder(true);
    setComposeAttachments([]);
    setComposeMode(null);
    setReplyToMsg(null);
    setShowCc(false);
    setShowBcc(false);
    setSendOptionsOpen(false);
    if (andResolve) setCaseStatus("resolved");
    if (!noteMode) onReplySent?.();
  };

  const simulateInbound = () => {
    const msg: EmailMessage = {
      id: `inbound-${Date.now()}`,
      from: { name: "Liam Davis", initials: "L", color: "#2563eb" },
      to: "customer.service@delta.com",
      date: "Just now",
      body: `<p>Just following up — has there been any update on my refund? I still haven't heard back.</p><p>Please let me know <strong>as soon as possible</strong>.</p><p>— Liam</p>`,
      isNew: true,
    };
    setThread((prev) => [...prev, msg]);
    setExpandedIds((prev) => new Set([...prev, msg.id]));
    onInboundMessage?.();
    setTimeout(() => newMsgRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 100);
  };

  /* ── Template filter ── */
  const filteredTemplates = templateQuery
    ? TEMPLATES.filter((t) => t.label.toLowerCase().includes(templateQuery) || t.body.toLowerCase().includes(templateQuery))
    : TEMPLATES;

  const composePlaceholder =
    noteMode ? "Add an internal note (not visible to the customer)..."
    : composeMode === "forward" ? "Add a message..."
    : composeMode ? `Reply to ${replyToMsg?.from.name ?? customerName}...`
    : `Reply to ${customerName}...`;

  const sc = STATUS_COLORS[caseStatus];

  /* ── AI summary ── */
  const generateSummary = () => {
    setSummaryLoading(true);
    setSummaryText(null);
    // Simulate AI processing delay, then produce a summary derived from the thread
    setTimeout(() => {
      const plainMessages = thread.map((m) => ({
        from: m.from.name,
        text: stripHtml(m.body),
        isNote: m.isNote,
      }));
      // Build a realistic mock summary from actual thread content
      const emailCount  = plainMessages.filter((m) => !m.isNote).length;
      const noteCount   = plainMessages.filter((m) => m.isNote).length;
      const lastSender  = plainMessages[plainMessages.length - 1].from;
      const generated = [
        `**Issue:** ${customerName} has been waiting over three weeks for a refund of $349.99 on order #A-228473 (purchased July 1, 2026, Visa ending 4821). They expected processing within 5–7 business days.`,
        `**What happened:** The refund was approved on July 8 and reportedly sent to the bank on July 10. However, ${customerName} confirmed with their bank that no funds were received. The customer is now threatening to dispute the charge with their credit card provider.`,
        `**Agent response:** The team acknowledged the delay, provided a timeline, and escalated to the finance team — but the customer has not received a follow-up within the promised 24-hour window.`,
        `**Current state:** ${emailCount} email${emailCount !== 1 ? "s" : ""} exchanged${noteCount ? `, ${noteCount} internal note${noteCount !== 1 ? "s" : ""}` : ""}. Last message from ${lastSender}. Case is unresolved and escalation risk is high.`,
        `**Recommended next step:** Re-initiate the refund transfer, confirm the transaction reference number with the finance team, and reply to ${customerName} with a tracking reference today.`,
      ].join("\n\n");
      setSummaryText(generated);
      setSummaryLoading(false);
    }, 1400);
  };

  const handleToggleSummary = () => {
    if (!summaryOpen) {
      setSummaryOpen(true);
      if (!summaryText) generateSummary();
    } else {
      setSummaryOpen(false);
    }
  };

  /* ── Render ── */
  return (
    <div className="flex flex-col h-full overflow-hidden bg-lyra-bg-surface-base">

      {/* ── Subject / case header ── */}
      <div className="flex items-center gap-2 px-6 py-2.5 border-b border-lyra-border-subtle shrink-0">
        {subjectEditing ? (
          <input
            ref={subjectInputRef}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            onBlur={() => setSubjectEditing(false)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") setSubjectEditing(false); }}
            className="flex-1 text-sm font-medium bg-transparent border-b border-lyra-border-focus outline-none text-lyra-fg-default"
          />
        ) : (
          <button
            type="button"
            title="Click to edit subject"
            onClick={() => setSubjectEditing(true)}
            className="flex-1 text-sm font-medium text-lyra-fg-default truncate text-left hover:underline decoration-dotted"
          >
            {subject}
          </button>
        )}

        <span className="text-xs text-lyra-fg-secondary shrink-0">#22073579</span>

        {/* Status badge */}
        <Popover
          content={
            <div className="py-1 min-w-[140px]">
              {(["open", "resolved", "deferred"] as CaseStatus[]).map((s) => (
                <button key={s} type="button"
                  onClick={() => { setCaseStatus(s); setStatusPopoverOpen(false); }}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-lyra-state-hover text-lyra-fg-default ${caseStatus === s ? "font-semibold" : ""}`}
                >
                  <span className={`h-2 w-2 rounded-full shrink-0 ${STATUS_COLORS[s].dot}`} />
                  {STATUS_LABELS[s]}
                  {caseStatus === s && <Check className="ml-auto h-3.5 w-3.5 text-lyra-fg-secondary" strokeWidth={2} />}
                </button>
              ))}
            </div>
          }
          placement="bottom" align="end"
          open={statusPopoverOpen} onOpenChange={setStatusPopoverOpen} sideOffset={4}
        >
          <button type="button" className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium border shrink-0 ${sc.badge} ${sc.text}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
            {STATUS_LABELS[caseStatus]}
            <ChevronDown className="h-3 w-3" strokeWidth={2} />
          </button>
        </Popover>

        <button
          type="button"
          onClick={() => setDetailsOpen((v) => !v)}
          className={`inline-flex items-center gap-1 text-xs shrink-0 transition-colors ${detailsOpen ? "text-lyra-fg-default font-medium" : "text-lyra-fg-link hover:underline"}`}
        >
          View Details
          <ChevronDown className={`h-3 w-3 transition-transform duration-150 ${detailsOpen ? "rotate-180" : ""}`} strokeWidth={2} />
        </button>

        <button
          type="button"
          onClick={handleToggleSummary}
          className={`inline-flex items-center gap-1.5 text-xs shrink-0 rounded-full px-2.5 py-0.5 border transition-colors ${
            summaryOpen
              ? "bg-violet-100 border-violet-300 text-violet-700 font-medium"
              : "border-lyra-border-default bg-lyra-bg-control text-lyra-fg-secondary hover:bg-lyra-state-hover"
          }`}
        >
          <Sparkles className="h-3 w-3" strokeWidth={1.5} />
          AI Summary
          <ChevronDown className={`h-3 w-3 transition-transform duration-150 ${summaryOpen ? "rotate-180" : ""}`} strokeWidth={2} />
        </button>

        {/* Simulate inbound — demo */}
        <button type="button" title="Simulate new inbound email (demo)" onClick={simulateInbound}
          className="p-1 rounded-lyra-sm hover:bg-lyra-state-hover text-lyra-fg-secondary shrink-0">
          <CornerDownLeft className="h-4 w-4" strokeWidth={1.5} />
        </button>

        <button type="button" className="p-1 rounded-lyra-sm hover:bg-lyra-state-hover text-lyra-fg-secondary shrink-0">
          <MoreHorizontal className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>

      {/* ── Case details panel ── */}
      {detailsOpen && (
        <div className="border-b border-lyra-border-subtle bg-lyra-bg-surface-canvas px-6 py-4 shrink-0">
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-xs">
            {/* Left column */}
            <div className="flex flex-col gap-3">
              <div>
                <span className="block text-lyra-fg-secondary mb-0.5">Case ID</span>
                <span className="font-mono text-lyra-fg-default">#22073579</span>
              </div>
              <div>
                <span className="block text-lyra-fg-secondary mb-0.5">Customer</span>
                <span className="text-lyra-fg-default">{customerName}</span>
              </div>
              <div>
                <span className="block text-lyra-fg-secondary mb-0.5">Email</span>
                <span className="text-lyra-fg-default break-all">{customerEmail}</span>
              </div>
              <div>
                <span className="block text-lyra-fg-secondary mb-0.5">Channel</span>
                <span className="text-lyra-fg-default">Email</span>
              </div>
            </div>
            {/* Right column */}
            <div className="flex flex-col gap-3">
              <div>
                <span className="block text-lyra-fg-secondary mb-0.5">Status</span>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-medium border ${STATUS_COLORS[caseStatus].badge} ${STATUS_COLORS[caseStatus].text}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${STATUS_COLORS[caseStatus].dot}`} />
                  {STATUS_LABELS[caseStatus]}
                </span>
              </div>
              <div>
                <span className="block text-lyra-fg-secondary mb-0.5">Opened</span>
                <span className="text-lyra-fg-default">July 25, 2026</span>
              </div>
              <div>
                <span className="block text-lyra-fg-secondary mb-0.5">Last activity</span>
                <span className="text-lyra-fg-default">July 26, 2026 · 9:19 AM</span>
              </div>
              <div>
                <span className="block text-lyra-fg-secondary mb-0.5">Assigned queue</span>
                <span className="text-lyra-fg-default">Email Support</span>
              </div>
            </div>
          </div>
          {/* Subject row */}
          <div className="mt-3 pt-3 border-t border-lyra-border-subtle text-xs">
            <span className="text-lyra-fg-secondary">Subject</span>
            <p className="mt-0.5 text-lyra-fg-default">{subject}</p>
          </div>
        </div>
      )}

      {/* ── AI Summary panel ── */}
      {summaryOpen && (
        <div className="border-b border-violet-200 bg-gradient-to-b from-violet-50/80 to-white shrink-0 px-6 py-4">
          {/* Header row */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-violet-500" strokeWidth={1.5} />
              <span className="text-xs font-semibold text-violet-700 uppercase tracking-wide">AI Summary</span>
            </div>
            <span className="text-xs text-lyra-fg-secondary">· {thread.filter(m => !m.isNote).length} emails, {thread.filter(m => m.isNote).length} notes</span>
            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                onClick={generateSummary}
                title="Regenerate summary"
                disabled={summaryLoading}
                className="p-1 rounded-lyra-sm hover:bg-violet-100 text-violet-400 hover:text-violet-600 disabled:opacity-40"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${summaryLoading ? "animate-spin" : ""}`} strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* Loading state */}
          {summaryLoading && (
            <div className="flex flex-col gap-2">
              {[80, 100, 65, 90, 75].map((w, i) => (
                <div key={i} className="h-3 rounded-full bg-violet-100 animate-pulse" style={{ width: `${w}%` }} />
              ))}
            </div>
          )}

          {/* Summary content */}
          {!summaryLoading && summaryText && (
            <div className="flex flex-col gap-3 text-sm text-lyra-fg-default">
              {summaryText.split("\n\n").map((block, i) => {
                // Bold the **label:** prefix
                const match = block.match(/^\*\*(.+?):\*\*\s*(.*)/s);
                if (match) {
                  return (
                    <div key={i} className="flex gap-2">
                      <div className="w-1 rounded-full bg-violet-300 shrink-0 self-stretch" />
                      <p className="leading-relaxed">
                        <span className="font-semibold text-violet-800">{match[1]}: </span>
                        <span className="text-lyra-fg-default">{match[2]}</span>
                      </p>
                    </div>
                  );
                }
                return <p key={i} className="leading-relaxed text-lyra-fg-secondary">{block}</p>;
              })}
              <p className="text-[11px] text-lyra-fg-secondary mt-1 pt-2 border-t border-violet-100">
                Generated from {thread.length} message{thread.length !== 1 ? "s" : ""} · AI summaries may be inaccurate — always verify before acting
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Thread ── */}
      <div className="flex-1 overflow-y-auto px-6 py-2">
        {thread.map((msg, idx) => {
          const expanded = expandedIds.has(msg.id);
          return (
            <div
              key={msg.id}
              ref={msg.isNew ? newMsgRef : undefined}
              className={`flex gap-3 py-4 border-b border-lyra-border-subtle last:border-b-0 ${
                msg.isNote  ? "-mx-6 px-6 bg-amber-50/60 border-l-2 border-l-amber-400" :
                msg.isNew   ? "-mx-6 px-6 bg-blue-50/50" : ""
              }`}
            >
              {/* Avatar */}
              <div
                className="h-8 w-8 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0 mt-0.5 select-none"
                style={{ backgroundColor: msg.from.color }}
              >
                {msg.from.initials}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {/* Header row */}
                <div className="flex items-start justify-between gap-4">
                  <button type="button" className="flex items-center gap-1 text-sm min-w-0 text-left" onClick={() => toggle(msg.id)}>
                    <span className="font-medium text-lyra-fg-default shrink-0">{msg.from.name}</span>
                    {msg.isNote ? (
                      <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 uppercase tracking-wide shrink-0">
                        <StickyNote className="h-2.5 w-2.5" strokeWidth={2} /> Note
                      </span>
                    ) : (
                      <>
                        <span className="text-lyra-fg-secondary shrink-0">→</span>
                        <span className="text-lyra-fg-secondary truncate">{msg.to}</span>
                      </>
                    )}
                    <ChevronDown className={`h-3.5 w-3.5 text-lyra-fg-secondary shrink-0 ml-0.5 transition-transform duration-150 ${expanded ? "rotate-180" : ""}`} strokeWidth={1.5} />
                  </button>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {msg.isNew && (
                      <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 uppercase tracking-wide">New</span>
                    )}
                    <button type="button" className="flex items-center gap-1 text-left" onClick={() => toggle(msg.id)}>
                      <span className="text-xs text-lyra-fg-secondary whitespace-nowrap">{msg.date}</span>
                      <ChevronDown className={`h-3.5 w-3.5 text-lyra-fg-secondary transition-transform duration-150 ${expanded ? "rotate-180" : ""}`} strokeWidth={1.5} />
                    </button>
                  </div>
                </div>

                {/* Collapsed body preview — always visible */}
                {!expanded && (
                  <p className="mt-0.5 text-xs text-lyra-fg-secondary line-clamp-2 leading-relaxed">
                    {stripHtml(msg.body)}
                  </p>
                )}

                {/* Expanded body — rendered as HTML */}
                {expanded && (
                  <div className="mt-2">
                    <div
                      className="email-body text-sm text-lyra-fg-default"
                      // eslint-disable-next-line react/no-danger
                      dangerouslySetInnerHTML={{ __html: msg.body }}
                    />

                    {/* Attachments */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {msg.attachments.map((a) => <AttachChip key={a.name} file={a} />)}
                      </div>
                    )}

                    {/* Message actions */}
                    <div className="mt-3 flex items-center gap-1 flex-wrap">
                      {[
                        { label: "Reply",    icon: <Reply    className="h-3.5 w-3.5" strokeWidth={1.5} />, mode: "reply"    as ComposeMode },
                        { label: "Reply All",icon: <ReplyAll className="h-3.5 w-3.5" strokeWidth={1.5} />, mode: "replyAll" as ComposeMode },
                        { label: "Forward",  icon: <Forward  className="h-3.5 w-3.5" strokeWidth={1.5} />, mode: "forward"  as ComposeMode },
                      ].map(({ label, icon, mode }) => (
                        <button key={label} type="button" onClick={() => openCompose(mode, msg)}
                          className="inline-flex items-center gap-1.5 rounded-lyra-sm border border-lyra-border-default bg-lyra-bg-control px-2.5 py-1 text-xs text-lyra-fg-action hover:bg-lyra-state-hover">
                          {icon} {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Compose ── */}
      <div ref={composerRef} className={`border-t shrink-0 px-6 pt-3 pb-4 transition-colors ${noteMode ? "border-amber-300 bg-amber-50/40" : "border-lyra-border-subtle bg-lyra-bg-surface-base"}`}>

        {/* Note mode banner */}
        {noteMode && (
          <div className="flex items-center gap-2 mb-2 rounded-lyra-sm bg-amber-100 border border-amber-300 px-3 py-1.5 text-xs text-amber-800">
            <StickyNote className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
            <span className="font-medium">Internal Note</span>
            <span className="text-amber-600">— not visible to the customer</span>
            <button type="button" onClick={() => setNoteMode(false)} className="ml-auto text-amber-600 hover:text-amber-800">
              <X className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          </div>
        )}

        {/* To / CC / BCC — hidden in note mode */}
        {!noteMode && (
          <div className="mb-1.5 flex flex-col gap-1 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-8 shrink-0 text-xs text-lyra-fg-secondary">To:</span>
              <input value={toField} onChange={(e) => setToField(e.target.value)}
                className="flex-1 bg-transparent outline-none text-lyra-fg-default placeholder:text-lyra-fg-placeholder text-sm"
                placeholder="Recipient email..." />
              <div className="flex items-center gap-1 shrink-0">
                {!showCc  && <button type="button" onClick={() => setShowCc(true)}  className="text-xs text-lyra-fg-link hover:underline">CC</button>}
                {!showBcc && <button type="button" onClick={() => setShowBcc(true)} className="text-xs text-lyra-fg-link hover:underline">BCC</button>}
                <span className="text-xs text-lyra-fg-secondary">
                  {composeMode === "reply" ? "Reply" : composeMode === "replyAll" ? "Reply All" : composeMode === "forward" ? "Forward" : "Reply"}
                </span>
              </div>
            </div>
            {showCc && (
              <div className="flex items-center gap-2">
                <span className="w-8 shrink-0 text-xs text-lyra-fg-secondary">CC:</span>
                <input value={ccField} onChange={(e) => setCcField(e.target.value)} className="flex-1 bg-transparent outline-none text-sm text-lyra-fg-default placeholder:text-lyra-fg-placeholder" placeholder="CC recipients..." />
                <button type="button" onClick={() => { setShowCc(false); setCcField(""); }} className="text-lyra-fg-secondary hover:text-lyra-fg-default"><X className="h-3.5 w-3.5" strokeWidth={2} /></button>
              </div>
            )}
            {showBcc && (
              <div className="flex items-center gap-2">
                <span className="w-8 shrink-0 text-xs text-lyra-fg-secondary">BCC:</span>
                <input value={bccField} onChange={(e) => setBccField(e.target.value)} className="flex-1 bg-transparent outline-none text-sm text-lyra-fg-default placeholder:text-lyra-fg-placeholder" placeholder="BCC recipients..." />
                <button type="button" onClick={() => { setShowBcc(false); setBccField(""); }} className="text-lyra-fg-secondary hover:text-lyra-fg-default"><X className="h-3.5 w-3.5" strokeWidth={2} /></button>
              </div>
            )}
          </div>
        )}

        <Divider className="mb-2" />

        {/* Char count */}
        <div className="text-xs text-lyra-fg-secondary mb-1.5">{charCount.toLocaleString()} chars</div>

        {/* Rich text editor */}
        <div className={`relative rounded-lyra-md border overflow-hidden focus-within:ring-2 ${noteMode ? "border-amber-300 focus-within:ring-amber-300/50 bg-amber-50/30" : "border-lyra-border-default focus-within:ring-lyra-border-focus"}`}>
          {showPlaceholder && (
            <div className="absolute left-3 top-2 text-sm text-lyra-fg-placeholder pointer-events-none select-none">
              {composePlaceholder}
            </div>
          )}
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handleEditorInput}
            className="email-body email-compose px-3 py-2"
          />
        </div>

        {/* Compose attachments */}
        {composeAttachments.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {composeAttachments.map((a, i) => (
              <AttachChip key={i} file={a}
                onRemove={() => setComposeAttachments((prev) => prev.filter((_, j) => j !== i))} />
            ))}
          </div>
        )}

        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} />

        {/* ── Rich toolbar ── */}
        <div className="flex items-center gap-0.5 mt-2 flex-wrap overflow-x-auto">

          {/* Undo / Redo */}
          <TBtn icon={<Undo2 className="h-4 w-4" strokeWidth={1.5} />}    label="Undo"  onMouseDown={(e) => { e.preventDefault(); exec("undo"); }} />
          <TBtn icon={<Redo2 className="h-4 w-4" strokeWidth={1.5} />}    label="Redo"  onMouseDown={(e) => { e.preventDefault(); exec("redo"); }} />
          <TDivider />

          {/* Block format */}
          <select
            title="Block format"
            onMouseDown={(e) => e.stopPropagation()}
            onChange={(e) => { exec("formatBlock", e.target.value); e.target.value = "p"; editorRef.current?.focus(); }}
            defaultValue="p"
            className="text-xs border border-lyra-border-default rounded-lyra-sm px-1 py-1 bg-lyra-bg-control text-lyra-fg-default cursor-pointer h-7 shrink-0"
          >
            <option value="p">Normal</option>
            <option value="h1">Heading 1</option>
            <option value="h2">Heading 2</option>
            <option value="h3">Heading 3</option>
            <option value="pre">Code block</option>
          </select>

          {/* Font family */}
          <select
            title="Font family"
            onMouseDown={(e) => e.stopPropagation()}
            onChange={(e) => { exec("fontName", e.target.value); editorRef.current?.focus(); }}
            defaultValue={FONT_FAMILIES[0].value}
            className="text-xs border border-lyra-border-default rounded-lyra-sm px-1 py-1 bg-lyra-bg-control text-lyra-fg-default cursor-pointer h-7 shrink-0"
          >
            {FONT_FAMILIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>

          {/* Font size */}
          <select
            title="Font size"
            onMouseDown={(e) => e.stopPropagation()}
            onChange={(e) => { exec("fontSize", e.target.value); editorRef.current?.focus(); }}
            defaultValue="3"
            className="text-xs border border-lyra-border-default rounded-lyra-sm px-1 py-1 bg-lyra-bg-control text-lyra-fg-default cursor-pointer h-7 w-20 shrink-0"
          >
            {FONT_SIZES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
          <TDivider />

          {/* Inline formatting */}
          <TBtn icon={<Bold        className="h-4 w-4" strokeWidth={2} />}   label="Bold"          onMouseDown={(e) => { e.preventDefault(); exec("bold"); }} />
          <TBtn icon={<Italic      className="h-4 w-4" strokeWidth={2} />}   label="Italic"        onMouseDown={(e) => { e.preventDefault(); exec("italic"); }} />
          <TBtn icon={<Underline   className="h-4 w-4" strokeWidth={2} />}   label="Underline"     onMouseDown={(e) => { e.preventDefault(); exec("underline"); }} />
          <TBtn icon={<Strikethrough className="h-4 w-4" strokeWidth={2} />} label="Strikethrough" onMouseDown={(e) => { e.preventDefault(); exec("strikeThrough"); }} />
          <TDivider />

          {/* Text color */}
          <Popover
            content={
              <div className="p-2">
                <p className="text-xs text-lyra-fg-secondary mb-1.5">Text color</p>
                <div className="grid grid-cols-7 gap-1">
                  {TEXT_COLORS.map((c) => (
                    <button key={c} type="button" title={c}
                      onClick={() => { exec("foreColor", c); setColorPopoverOpen(false); editorRef.current?.focus(); }}
                      className="h-5 w-5 rounded-sm border border-lyra-border-subtle hover:scale-110 transition-transform"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <button type="button"
                  onClick={() => { exec("removeFormat"); setColorPopoverOpen(false); editorRef.current?.focus(); }}
                  className="mt-1.5 w-full text-xs text-lyra-fg-secondary hover:text-lyra-fg-default text-left px-0.5">
                  Remove formatting
                </button>
              </div>
            }
            placement="top" align="start"
            open={colorPopoverOpen} onOpenChange={setColorPopoverOpen} sideOffset={6}
          >
            <button type="button" title="Text color"
              className="p-1.5 rounded-lyra-sm hover:bg-lyra-state-hover text-lyra-fg-secondary shrink-0 flex flex-col items-center gap-0.5">
              <span className="text-xs font-bold leading-none" style={{ color: "#1a1a1a" }}>A</span>
              <span className="h-0.5 w-4 rounded-full bg-red-500" />
            </button>
          </Popover>

          {/* Highlight color */}
          <Popover
            content={
              <div className="p-2">
                <p className="text-xs text-lyra-fg-secondary mb-1.5">Highlight color</p>
                <div className="flex flex-wrap gap-1">
                  {HIGHLIGHT_COLORS.map(({ label, value }) => (
                    <button key={label} type="button" title={label}
                      onClick={() => { exec("hiliteColor", value); setHighlightPopoverOpen(false); editorRef.current?.focus(); }}
                      className="h-5 w-5 rounded-sm border border-lyra-border-subtle hover:scale-110 transition-transform"
                      style={{ backgroundColor: value === "transparent" ? "#fff" : value }}
                    >
                      {value === "transparent" && <X className="h-3 w-3 text-lyra-fg-secondary mx-auto" strokeWidth={2} />}
                    </button>
                  ))}
                </div>
              </div>
            }
            placement="top" align="start"
            open={highlightPopoverOpen} onOpenChange={setHighlightPopoverOpen} sideOffset={6}
          >
            <button type="button" title="Highlight color"
              className="p-1.5 rounded-lyra-sm hover:bg-lyra-state-hover text-lyra-fg-secondary shrink-0 flex flex-col items-center gap-0.5">
              <span className="text-xs font-bold leading-none text-lyra-fg-secondary">A</span>
              <span className="h-0.5 w-4 rounded-full bg-yellow-300" />
            </button>
          </Popover>
          <TDivider />

          {/* Lists & indent */}
          <TBtn icon={<List          className="h-4 w-4" strokeWidth={1.5} />} label="Unordered list" onMouseDown={(e) => { e.preventDefault(); exec("insertUnorderedList"); }} />
          <TBtn icon={<ListOrdered   className="h-4 w-4" strokeWidth={1.5} />} label="Ordered list"   onMouseDown={(e) => { e.preventDefault(); exec("insertOrderedList"); }} />
          <TBtn icon={<Indent        className="h-4 w-4" strokeWidth={1.5} />} label="Indent"         onMouseDown={(e) => { e.preventDefault(); exec("indent"); }} />
          <TBtn icon={<Outdent       className="h-4 w-4" strokeWidth={1.5} />} label="Outdent"        onMouseDown={(e) => { e.preventDefault(); exec("outdent"); }} />
          <TBtn icon={<Quote         className="h-4 w-4" strokeWidth={1.5} />} label="Blockquote"     onMouseDown={(e) => { e.preventDefault(); exec("formatBlock", "blockquote"); }} />
          <TDivider />

          {/* Insert */}
          <TBtn icon={<Link2    className="h-4 w-4" strokeWidth={1.5} />} label="Insert link"
            onMouseDown={(e) => { e.preventDefault(); const url = window.prompt("URL:"); if (url) exec("createLink", url); }} />
          <TBtn icon={<Paperclip className="h-4 w-4" strokeWidth={1.5} />} label="Attach file"
            onMouseDown={(e) => { e.preventDefault(); fileInputRef.current?.click(); }} />
          <TBtn icon={<ImageIcon className="h-4 w-4" strokeWidth={1.5} />} label="Insert image"
            onMouseDown={(e) => e.preventDefault()} />
          <TBtn icon={<Table2   className="h-4 w-4" strokeWidth={1.5} />} label="Insert table"
            onMouseDown={(e) => e.preventDefault()} />

          {/* Templates */}
          <Popover
            content={
              <div className="py-1 w-56">
                <div className="px-3 pb-1 pt-0.5 text-xs text-lyra-fg-secondary">
                  {templateQuery ? `Matching "#${templateQuery}"` : 'Quick replies — or type # to trigger'}
                </div>
                {filteredTemplates.length === 0 && (
                  <div className="px-3 py-2 text-xs text-lyra-fg-secondary italic">No matches</div>
                )}
                {filteredTemplates.map((t) => (
                  <button key={t.id} type="button" onClick={() => insertTemplate(t.body)}
                    className="flex w-full flex-col gap-0.5 px-3 py-2 text-left hover:bg-lyra-state-hover">
                    <span className="text-sm font-medium text-lyra-fg-default">{t.label}</span>
                    <span className="text-xs text-lyra-fg-secondary line-clamp-1" dangerouslySetInnerHTML={{ __html: t.body.replace(/<[^>]+>/g, "") }} />
                  </button>
                ))}
              </div>
            }
            placement="top" align="start"
            open={templateOpen} onOpenChange={(v) => { setTemplateOpen(v); if (!v) setTemplateQuery(""); }} sideOffset={6}
          >
            <button type="button" title="Insert template (or type # in compose)"
              className="p-1.5 rounded-lyra-sm hover:bg-lyra-state-hover text-lyra-fg-secondary shrink-0">
              <Zap className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </Popover>

          {/* Note toggle */}
          <TDivider />
          <button
            type="button"
            title={noteMode ? "Switch to email reply" : "Add internal note (not sent to customer)"}
            onMouseDown={(e) => { e.preventDefault(); setNoteMode((v) => !v); }}
            className={`p-1.5 rounded-lyra-sm shrink-0 transition-colors ${noteMode ? "bg-amber-100 text-amber-700 hover:bg-amber-200" : "hover:bg-lyra-state-hover text-lyra-fg-secondary"}`}
          >
            <StickyNote className="h-4 w-4" strokeWidth={1.5} />
          </button>

          {/* Spacer → right-side actions */}
          <div className="flex-1" />

          <button type="button" title="Discard draft"
            onClick={() => {
              if (editorRef.current) editorRef.current.innerHTML = "";
              setCharCount(0); setShowPlaceholder(true);
              setComposeAttachments([]); setComposeMode(null); setReplyToMsg(null);
              setNoteMode(false);
            }}
            className="p-1.5 rounded-lyra-sm hover:bg-lyra-state-hover text-lyra-fg-secondary shrink-0">
            <Trash2 className="h-4 w-4" strokeWidth={1.5} />
          </button>
          <button type="button" title="More" className="p-1.5 rounded-lyra-sm hover:bg-lyra-state-hover text-lyra-fg-secondary shrink-0">
            <Plus className="h-4 w-4" strokeWidth={1.5} />
          </button>

          {/* Send / Add Note button */}
          {noteMode ? (
            <Button size="default" onClick={() => handleSend(false)}
              className="bg-amber-500 hover:bg-amber-600 border-amber-500 text-white">
              <StickyNote className="h-3.5 w-3.5 mr-1.5" strokeWidth={1.5} />
              Add Note
            </Button>
          ) : (
            <Popover
              content={
                <div className="py-1 min-w-[180px]">
                  <button type="button" onClick={() => handleSend(false)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-lyra-fg-default hover:bg-lyra-state-hover">Send</button>
                  <button type="button" onClick={() => handleSend(true)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-lyra-fg-default hover:bg-lyra-state-hover">Send &amp; Resolve</button>
                  <button type="button" onClick={() => handleSend(false)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-lyra-fg-default hover:bg-lyra-state-hover">Send &amp; Keep Open</button>
                  <Divider className="my-1" />
                  <button type="button" onClick={() => setSendOptionsOpen(false)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-lyra-fg-secondary hover:bg-lyra-state-hover">Save Draft</button>
                </div>
              }
              placement="top" align="end"
              open={sendOptionsOpen} onOpenChange={setSendOptionsOpen} sideOffset={6}
            >
              <Button size="default">
                Send Options <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.5} />
              </Button>
            </Popover>
          )}
        </div>
      </div>
    </div>
  );
}
