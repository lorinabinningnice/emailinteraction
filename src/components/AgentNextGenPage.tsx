import React, { useState, useEffect, useMemo, useRef } from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { EmailView } from "@/components/EmailView";
import { CustomerInfoContent } from "@/components/CustomerInfoContent";
import {
  AppHeader,
  AppName,
  AppMenu,
  CXoneLogo,
  AiPanel,
  AiSparkleIcon,
  NotificationsBell,
  AgentNotifications,
  AgentProfile,
  Container,
  CustomerInformationPanel,
  PanelPinButton,
  PageHeader,
  LeftNav,
  CreateNew,
  useOutboundAddButton,
  InteractionNavItem,
  TabList,
  ChannelTab,
  type NavItem,
  type CreateNewOutboundConfig,
  type CreateNewOutboundContact,
  type InteractionChannel,
  type ChannelType,
  type AgentStatus,
  type AgentNotification,
  type DraggableVariant,
} from "@nicecxone/lyra-ui";
import appIcon from "@/assets/app-icon.svg";
import {
  Home,
  Users,
  BookUser,
  CalendarDays,
  Settings,
  Mail,
} from "lucide-react";


/* ── Left nav items ──
   Matches lyra-ui's AgentNextGenTemplate.stories.tsx "Agent Next Gen Left Nav"
   icon rail exactly — no item marked active (the rail doesn't track a current
   page here, same as that story). */

const NAV_ITEMS: NavItem[] = [
  { icon: <Home className="h-4 w-4" strokeWidth={1.5} />, label: "Home" },
  { icon: <Users className="h-4 w-4" strokeWidth={1.5} />, label: "Contacts" },
  { icon: <BookUser className="h-4 w-4" strokeWidth={1.5} />, label: "Directory" },
  { icon: <CalendarDays className="h-4 w-4" strokeWidth={1.5} />, label: "Schedule" },
  { icon: <Settings className="h-4 w-4" strokeWidth={1.5} />, label: "Settings" },
];

/* ── Outbound config ──
   Shell config with empty contact lists — add real records as needed. */

const OUTBOUND_CONFIG: CreateNewOutboundConfig = {
  outboundTitle: "New Outbound",
  groups: [
    { id: "favorites", label: "Favorites", kind: "favorites", emptyMessage: "No favorites yet" },
    { id: "agents",    label: "Agents",    searchPlaceholder: "Search Agents",    contacts: [] },
    {
      id: "customers",
      label: "Customers",
      searchPlaceholder: "Search customers",
      contacts: [
        { id: "c-1", name: "Liam Davis",   initials: "LD", subtitle: "CUS-10041", channels: ["email"] },
      ],
    },
    { id: "dialpad", label: "Dial Pad", kind: "dialpad" },
  ],
  defaultGroupId: "customers",
  channelOptions: [
    { id: "email", label: "Email", icon: <Mail className="h-5 w-5" strokeWidth={1.5} /> },
  ],
  phoneOptions: [
    { value: "davisbrliam342@sunsecurity.com", label: "davisbrliam342@sunsecurity.com" },
  ],
  skillOptions: [
    { value: "sk-email", label: "Email Support" },
  ],
  onQuickDial: () => {},
  onStartCall: () => {},
  pageSize: 10,
};

interface TrackedChannel {
  id: string;
  type: ChannelType;
  startTick: number;
  preview?: string;
  value?: string;
  addressLabel?: string;
  awaitingResponse?: boolean;
  messageCount?: number;
  interactionId?: string;
}

interface ActiveInteraction {
  id: string;
  customerName?: string;
  recordId: string;
  channels: TrackedChannel[];
  currentChannelId?: string;
}

function generateCaseId(): string {
  return `CS-${Math.floor(1000000 + Math.random() * 9000000)}`;
}

function generateInteractionId(): string {
  return String(Math.floor(100000000000 + Math.random() * 900000000000));
}

function formatElapsedTime(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds);
  const mm = Math.floor(clamped / 60);
  const ss = clamped % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

const AI_PANEL_DEFAULT_WIDTH = 360;

export function AgentNextGenPage({ onNavigate: _onNavigate }: { onNavigate?: (page: string) => void } = {}) {
  const [navOpen, setNavOpen] = useState(false);
  const [interactions, setInteractions] = useState<ActiveInteraction[]>([]);
  const [activeInteractionId, setActiveInteractionId] = useState<string | null>(null);
  const activeInteraction = interactions.find((i) => i.id === activeInteractionId) ?? null;

  const [clockTick, setClockTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setClockTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const [windowWidth, setWindowWidth] = useState(() => window.innerWidth);
  const [notifications, setNotifications] = useState<AgentNotification[]>([]);
  const [agentStatus, setAgentStatus] = useState<AgentStatus>("available");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [appMenuOpen, setAppMenuOpen] = useState(false);

  type PanelState = "closed" | "open" | "closing";

  /* AI panel state */
  const [aiPanelOpen,   setAiPanelOpen]   = useState(false);
  const [aiMounted,     setAiMounted]     = useState(false);
  const [aiState,       setAiState]       = useState<PanelState>("closed");
  const [aiVariant,     setAiVariant]     = useState<DraggableVariant>("float");
  const [aiWidth,       setAiWidth]       = useState(AI_PANEL_DEFAULT_WIDTH);
  const [aiHeight,      setAiHeight]      = useState(860);
  const [aiIsResizing,  setAiIsResizing]  = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const aiFloatLeft  = useRef<number | null>(null);
  const aiFloatTop   = useRef<number | null>(null);
  const aiPanelRef   = useRef<HTMLDivElement>(null);
  const aiAnimTimer  = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  /* Notifications panel state */
  const [notifOpen,       setNotifOpen]       = useState(false);
  const [notifMounted,    setNotifMounted]    = useState(false);
  const [notifState,      setNotifState]      = useState<PanelState>("closed");
  const [notifVariant,    setNotifVariant]    = useState<DraggableVariant>("float");
  const [notifWidth,      setNotifWidth]      = useState(360);
  const [notifHeight,     setNotifHeight]     = useState(860);
  const [notifIsResizing, setNotifIsResizing] = useState(false);
  const [topPanel,        setTopPanel]        = useState<"ai" | "notif" | null>(null);
  const notifFloatLeft = useRef<number | null>(null);
  const notifFloatTop  = useRef<number | null>(null);
  const notifPanelRef  = useRef<HTMLDivElement>(null);
  const notifAnimTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  /* Side panel */
  const [sidePanelOpen,     setSidePanelOpen]     = useState(false);
  const [sidePanelPinned,   setSidePanelPinned]   = useState(false);
  const [sidePanelResizing, setSidePanelResizing] = useState(false);
  const [sidePanelWidth,    setSidePanelWidth]    = useState(256);
  const [containerWidth,    setContainerWidth]    = useState(9999);
  const sidePanelTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setContainerWidth(el.getBoundingClientRect().width);
    const ro = new ResizeObserver(([entry]) => setContainerWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const isNarrowContainer = containerWidth < 768;
  const effectivePinned = isNarrowContainer ? false : sidePanelPinned;

  useEffect(() => {
    if (isNarrowContainer) { setSidePanelOpen(false); setSidePanelPinned(false); }
  }, [isNarrowContainer]);

  useEffect(() => {
    if (!activeInteractionId) { setSidePanelOpen(false); setSidePanelPinned(false); }
  }, [activeInteractionId]);

  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const isNavNarrow = windowWidth < 1280;
  const isCompactHeader = windowWidth < 760;

  useEffect(() => {
    if (isNavNarrow && navOpen) setNavOpen(false);
  }, [isNavNarrow]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isNavNarrow) {
      if (aiVariant === "docked") { setAiVariant("float"); setAiPanelOpen(false); }
      if (notifVariant === "docked") { setNotifVariant("float"); setNotifOpen(false); }
    }
  }, [isNavNarrow]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSidePanelHoverStart = () => { clearTimeout(sidePanelTimer.current); setSidePanelOpen(true); };
  const onSidePanelHoverEnd = () => {
    if (sidePanelPinned) return;
    sidePanelTimer.current = setTimeout(() => setSidePanelOpen(false), 300);
  };
  const handleSidePanelPinToggle = () => { setSidePanelPinned((v) => !v); setSidePanelOpen(true); };
  const handleSidePanelIconToggle = () => {
    clearTimeout(sidePanelTimer.current);
    const nextPinned = !sidePanelPinned;
    setSidePanelPinned(nextPinned);
    setSidePanelOpen(nextPinned);
  };

  const MAX_PANEL_HEIGHT = 860;
  const BOTTOM_PADDING   = 8;

  const computePanelHeight = () => {
    if (!containerRef.current) return MAX_PANEL_HEIGHT;
    const top = containerRef.current.getBoundingClientRect().top;
    return Math.min(window.innerHeight - top - BOTTOM_PADDING, MAX_PANEL_HEIGHT);
  };

  useEffect(() => {
    const id = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const h = Math.floor(elapsedSeconds / 3600);
  const m = Math.floor((elapsedSeconds % 3600) / 60);
  const s = elapsedSeconds % 60;
  const formattedTimer = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

  const handleStatusChange = (status: AgentStatus) => { setAgentStatus(status); setElapsedSeconds(0); };

  const handleStartCall = (selection: {
    contact: CreateNewOutboundContact;
    channel: ChannelType;
    phone: string;
    skillId: string;
  }) => {
    const skillLabel = OUTBOUND_CONFIG.skillOptions.find((o) => o.value === selection.skillId)?.label;
    const addressLabel = OUTBOUND_CONFIG.phoneOptions.find((o) => o.value === selection.phone)?.label ?? selection.phone;
    const newChannel: TrackedChannel = {
      id: `${selection.channel}:${selection.phone}`,
      type: selection.channel,
      startTick: clockTick,
      preview: skillLabel,
      value: selection.phone,
      addressLabel,
      messageCount: selection.channel === "voice" ? undefined : 0,
      interactionId: generateInteractionId(),
    };
    setInteractions((prev) => {
      const idx = prev.findIndex((i) => i.id === selection.contact.id);
      if (idx === -1) {
        return [...prev, {
          id: selection.contact.id,
          customerName: selection.contact.name,
          recordId: selection.contact.subtitle ?? generateCaseId(),
          channels: [newChannel],
          currentChannelId: newChannel.id,
        }];
      }
      return prev.map((interaction, i) => {
        if (i !== idx) return interaction;
        const chIdx = interaction.channels.findIndex((c) => c.id === newChannel.id);
        const channels = chIdx === -1
          ? [...interaction.channels, newChannel]
          : interaction.channels.map((c, j) => (j === chIdx ? newChannel : c));
        return { ...interaction, channels, currentChannelId: newChannel.id };
      });
    });
    setActiveInteractionId(selection.contact.id);
    setNavOpen(true);
  };

  const handleQuickDial = (phoneNumber: string) => {
    const id = `quickdial:${phoneNumber}`;
    const newChannel: TrackedChannel = {
      id: "voice", type: "voice", startTick: clockTick,
      value: phoneNumber, addressLabel: phoneNumber, interactionId: generateInteractionId(),
    };
    setInteractions((prev) => {
      const idx = prev.findIndex((i) => i.id === id);
      if (idx === -1) return [...prev, { id, recordId: generateCaseId(), channels: [newChannel], currentChannelId: newChannel.id }];
      return prev.map((interaction, i) => (i === idx ? { ...interaction, channels: [newChannel], currentChannelId: newChannel.id } : interaction));
    });
    setActiveInteractionId(id);
    setNavOpen(true);
  };

  const handleDismissInteraction = (id: string) => {
    setInteractions((prev) => prev.filter((interaction) => interaction.id !== id));
    setActiveInteractionId((current) => (current === id ? null : current));
  };

  const handleDismissChannel = (id: string, channel: Pick<InteractionChannel, "id" | "type">) => {
    const dismissedKey = channel.id ?? channel.type;
    setInteractions((prev) =>
      prev.map((interaction) => {
        if (interaction.id !== id) return interaction;
        const channels = interaction.channels.filter((c) => (c.id ?? c.type) !== dismissedKey);
        const currentChannelId = interaction.currentChannelId === dismissedKey
          ? channels[channels.length - 1]?.id
          : interaction.currentChannelId;
        return { ...interaction, channels, currentChannelId };
      })
    );
  };

  /* ── Email-specific callbacks ─────────────────────────────────────────────
     Called by EmailView to keep InteractionNavItem in sync with the email
     thread state — inbound message sets awaitingResponse (red chip/clock),
     reply sent clears it. */

  const handleEmailInbound = (interactionId: string, channelId: string) => {
    setInteractions((prev) =>
      prev.map((interaction) => {
        if (interaction.id !== interactionId) return interaction;
        return {
          ...interaction,
          channels: interaction.channels.map((c) =>
            c.id === channelId
              ? { ...c, awaitingResponse: true, messageCount: (c.messageCount ?? 0) + 1 }
              : c
          ),
        };
      })
    );
  };

  const handleEmailReplySent = (interactionId: string, channelId: string) => {
    setInteractions((prev) =>
      prev.map((interaction) => {
        if (interaction.id !== interactionId) return interaction;
        return {
          ...interaction,
          channels: interaction.channels.map((c) =>
            c.id === channelId ? { ...c, awaitingResponse: false } : c
          ),
        };
      })
    );
  };

  const handleChannelSelect = (interactionId: string, channelKey: string) => {
    setInteractions((prev) =>
      prev.map((interaction) =>
        interaction.id === interactionId ? { ...interaction, currentChannelId: channelKey } : interaction
      )
    );
  };

  const outboundConfig = useMemo<CreateNewOutboundConfig>(() => {
    const openAddressesByContactId = new Map<string, Partial<Record<ChannelType, string[]>>>(
      interactions.map((interaction) => {
        const byType: Partial<Record<ChannelType, string[]>> = {};
        for (const c of interaction.channels) {
          if (!c.value) continue;
          (byType[c.type] ??= []).push(c.value);
        }
        return [interaction.id, byType];
      })
    );
    return {
      ...OUTBOUND_CONFIG,
      groups: OUTBOUND_CONFIG.groups.map((group) => {
        if (!group.contacts) return group;
        return {
          ...group,
          contacts: group.contacts.map((contact) => {
            const openChannelAddresses = openAddressesByContactId.get(contact.id);
            if (!openChannelAddresses || Object.keys(openChannelAddresses).length === 0) return contact;
            return { ...contact, openChannelAddresses };
          }),
        };
      }),
    };
  }, [interactions]);

  const { launchRequest: outboundLaunchRequest, onLaunchRequestHandled, getHeaderAction } = useOutboundAddButton(outboundConfig);

  /* AI panel show/hide */
  useEffect(() => {
    clearTimeout(aiAnimTimer.current);
    if (aiPanelOpen) {
      if (containerRef.current && aiFloatLeft.current === null) {
        const r = containerRef.current.getBoundingClientRect();
        aiFloatLeft.current = r.left + containerRef.current.offsetWidth - aiWidth - 16;
      }
      setAiHeight(computePanelHeight());
      setAiMounted(true);
      setAiState("open");
      setTopPanel("ai");
    } else {
      setAiState("closing");
      aiAnimTimer.current = setTimeout(() => setAiState("closed"), 150);
    }
    return () => clearTimeout(aiAnimTimer.current);
  }, [aiPanelOpen]);

  useEffect(() => {
    if (!aiPanelOpen) return;
    const onResize = () => setAiHeight(computePanelHeight());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [aiPanelOpen]);

  /* Notifications panel show/hide */
  useEffect(() => {
    clearTimeout(notifAnimTimer.current);
    if (notifOpen) {
      if (containerRef.current && notifFloatLeft.current === null) {
        const r = containerRef.current.getBoundingClientRect();
        notifFloatLeft.current = r.left + containerRef.current.offsetWidth - notifWidth - 16;
      }
      setNotifHeight(computePanelHeight());
      setNotifMounted(true);
      setNotifState("open");
      setTopPanel("notif");
    } else {
      setNotifState("closing");
      notifAnimTimer.current = setTimeout(() => setNotifState("closed"), 150);
    }
    return () => clearTimeout(notifAnimTimer.current);
  }, [notifOpen]);

  useEffect(() => {
    if (!notifOpen) return;
    const onResize = () => setNotifHeight(computePanelHeight());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [notifOpen]);

  const handleNotifVariantChange = (v: DraggableVariant) => {
    if (v === "docked" && notifPanelRef.current) {
      const r = notifPanelRef.current.getBoundingClientRect();
      notifFloatLeft.current = r.left; notifFloatTop.current = r.top;
    }
    if (v === "docked" && aiVariant === "docked" && containerRef.current) {
      const r = containerRef.current.getBoundingClientRect();
      aiFloatLeft.current = r.left + containerRef.current.offsetWidth - aiWidth - 16;
      aiFloatTop.current = null;
      setAiVariant("float");
    }
    setNotifVariant(v);
  };

  const getNotifFloatStyle = (): React.CSSProperties => {
    const rect = containerRef.current?.getBoundingClientRect();
    const left = notifFloatLeft.current !== null
      ? notifFloatLeft.current
      : containerRef.current ? (rect?.left ?? 0) + containerRef.current.offsetWidth - notifWidth - 16 : 0;
    const top = notifFloatTop.current !== null ? notifFloatTop.current : (rect?.top ?? 0);
    return { position: "fixed", top, left, zIndex: topPanel === "notif" ? 10000 : 9999 };
  };

  const notifPanel = notifMounted ? (
    <AgentNotifications
      ref={notifPanelRef}
      notifications={notifications}
      draggableVariant={notifVariant}
      onVariantChange={handleNotifVariantChange}
      onWidthChange={setNotifWidth}
      onResizeStateChange={setNotifIsResizing}
      onInteract={() => setTopPanel("notif")}
      onMarkAllRead={() => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))}
      onClearAll={() => setNotifications([])}
      onDismiss={(id) => setNotifications((prev) => prev.filter((n) => n.id !== id))}
      onNotificationClick={(n) => setNotifications((prev) => prev.map((i) => i.id === n.id ? { ...i, read: true } : i))}
      onClose={() => setNotifOpen(false)}
      defaultWidth={notifWidth}
      height={notifHeight}
    />
  ) : null;

  const handleAiVariantChange = (v: DraggableVariant) => {
    if (v === "docked" && aiPanelRef.current) {
      const r = aiPanelRef.current.getBoundingClientRect();
      aiFloatLeft.current = r.left; aiFloatTop.current = r.top;
    }
    if (v === "docked" && notifVariant === "docked" && containerRef.current) {
      const r = containerRef.current.getBoundingClientRect();
      notifFloatLeft.current = r.left + containerRef.current.offsetWidth - notifWidth - 16;
      notifFloatTop.current = null;
      setNotifVariant("float");
    }
    setAiVariant(v);
  };

  const getAiFloatStyle = (): React.CSSProperties => {
    const rect = containerRef.current?.getBoundingClientRect();
    const left = aiFloatLeft.current !== null
      ? aiFloatLeft.current
      : containerRef.current ? (rect?.left ?? 0) + containerRef.current.offsetWidth - aiWidth - 16 : 0;
    const top = aiFloatTop.current !== null ? aiFloatTop.current : (rect?.top ?? 0);
    return { position: "fixed", top, left, zIndex: topPanel === "ai" ? 10000 : 9999 };
  };

  const aiPanel = aiMounted ? (
    <AiPanel
      ref={aiPanelRef}
      draggable
      draggableVariant={aiVariant}
      defaultDraggableWidth={aiWidth}
      defaultDraggableHeight={aiHeight}
      onVariantChange={handleAiVariantChange}
      onWidthChange={setAiWidth}
      onResizeStateChange={setAiIsResizing}
      onInteract={() => setTopPanel("ai")}
      userName="John"
      suggestions={[
        { id: "1", label: "Summarise this contact's history" },
        { id: "2", label: "Suggest a response to the customer" },
        { id: "3", label: "What changed since yesterday?" },
      ]}
      onClose={() => setAiPanelOpen(false)}
      className={aiVariant === "docked" ? "h-full" : undefined}
    />
  ) : null;

  return (
    <div className="flex flex-col h-screen bg-lyra-bg-surface-shell overflow-hidden animate-in fade-in-0 duration-500">

      {/* ── App Header ── */}
      <AppHeader
        appName={
          <PopoverPrimitive.Root open={appMenuOpen} onOpenChange={setAppMenuOpen}>
            <PopoverPrimitive.Trigger asChild>
              <AppName
                icon={<img src={appIcon} alt="Agent Next Gen" className="h-6 w-6" />}
                name="Agent Next Gen"
                compact={isCompactHeader}
                aria-expanded={appMenuOpen}
              />
            </PopoverPrimitive.Trigger>
            <PopoverPrimitive.Portal>
              <PopoverPrimitive.Content
                side="bottom"
                align="start"
                sideOffset={6}
                onOpenAutoFocus={(e: Event) => e.preventDefault()}
                className="z-[9999] animate-in fade-in-0 slide-in-from-top-2 duration-150 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-1 data-[state=closed]:duration-100"
              >
                <AppMenu
                  groups={[
                    { items: [{ label: "Admin" }, { label: "Supervisor" }, { label: "Agent", active: true }, { label: "Cognigy AI" }] },
                    { items: [{ label: "Workforce Management" }, { label: "Quality Management" }, { label: "Interaction Hub" }, { label: "My Zone" }] },
                    { items: [{ label: "Dashboard" }, { label: "Analytics" }] },
                  ]}
                  footer={<CXoneLogo />}
                  header={isCompactHeader ? "Agent Next Gen" : undefined}
                />
              </PopoverPrimitive.Content>
            </PopoverPrimitive.Portal>
          </PopoverPrimitive.Root>
        }
        actions={
          <>
            <NotificationsBell notifications={notifications} open={notifOpen} onOpenChange={setNotifOpen} renderPanel={false} />
            <button
              type="button"
              aria-label="Ask AI"
              aria-expanded={aiPanelOpen}
              onClick={() => setAiPanelOpen((v) => !v)}
              className={`relative flex h-10 w-10 items-center justify-center rounded-lyra-lg text-lyra-fg-default transition-colors hover:bg-lyra-state-hover active:bg-lyra-state-pressed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lyra-border-focus ${aiPanelOpen ? "bg-lyra-state-hover" : ""}`}
            >
              <AiSparkleIcon />
            </button>
            <AgentProfile
              name="John Smith"
              initials="JS"
              status={agentStatus}
              onStatusChange={handleStatusChange}
              timer={formattedTimer}
              className="ml-1"
            />
          </>
        }
      />

      {/* ── Body: LeftNav + Content ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        <LeftNav
          items={NAV_ITEMS}
          open={navOpen}
          onToggle={() => setNavOpen((v) => !v)}
          overlay={isNavNarrow}
          pinnedHeader={
            <CreateNew
              title="New Outbound"
              outbound={{
                ...outboundConfig,
                onStartCall: handleStartCall,
                onQuickDial: handleQuickDial,
                launchRequest: outboundLaunchRequest,
                onLaunchRequestHandled,
              }}
              expanded={navOpen}
            />
          }
          header={
            <>
              {/* No cards until the agent starts one from CreateNew — each card is
                  one contact with every open channel folded in. */}
              {interactions.map((interaction) => {
                const mostRecentId = interaction.channels[interaction.channels.length - 1]?.id;
                const currentId = interaction.currentChannelId ?? mostRecentId;
                const channels: InteractionChannel[] = interaction.channels.map((c) => ({
                  id: c.id,
                  type: c.type,
                  elapsed: formatElapsedTime(clockTick - c.startTick),
                  preview: c.preview,
                  current: c.id === currentId,
                  awaitingResponse: c.awaitingResponse ?? false,
                }));
                const earliestStart = Math.min(...interaction.channels.map((c) => c.startTick));
                return (
                  <InteractionNavItem
                    key={interaction.id}
                    customerName={interaction.customerName}
                    active={activeInteractionId === interaction.id}
                    onClick={() => setActiveInteractionId(interaction.id)}
                    awaitingResponse={channels.some((c) => c.awaitingResponse)}
                    elapsed={formatElapsedTime(clockTick - earliestStart)}
                    expanded={navOpen}
                    channels={channels}
                    onDismiss={() => handleDismissInteraction(interaction.id)}
                    onDismissChannel={(channel) => handleDismissChannel(interaction.id, channel)}
                    headerAction={getHeaderAction(interaction.id)}
                    currentChannelKey={currentId}
                    onCurrentChannelChange={(key) => handleChannelSelect(interaction.id, key)}
                  />
                );
              })}
            </>
          }
        />

        <div ref={containerRef} className="relative flex flex-1 min-w-0 overflow-hidden pr-3 pb-3">

          <Container className="flex flex-1 overflow-hidden relative">

            {activeInteraction && (
              <CustomerInformationPanel
                side="left"
                open={sidePanelOpen}
                pinned={effectivePinned}
                person={{ name: activeInteraction.customerName ?? "Customer", id: activeInteraction.recordId }}
                onPinToggle={isNarrowContainer ? undefined : handleSidePanelPinToggle}
                width={sidePanelWidth}
                onWidthChange={setSidePanelWidth}
                onResizeStateChange={setSidePanelResizing}
                onMouseEnter={onSidePanelHoverStart}
                onMouseLeave={sidePanelResizing ? undefined : onSidePanelHoverEnd}
              >
                <CustomerInfoContent
                  name={activeInteraction.customerName}
                  email={activeInteraction.channels.find((c) => c.type === "email")?.addressLabel}
                />
              </CustomerInformationPanel>
            )}

            <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
              {activeInteraction ? (
                <>
                  <PageHeader
                    icon={
                      <span
                        onMouseEnter={onSidePanelHoverStart}
                        onMouseLeave={sidePanelResizing ? undefined : onSidePanelHoverEnd}
                      >
                        <PanelPinButton
                          pinned={sidePanelPinned}
                          onToggle={handleSidePanelIconToggle}
                          icon={<Mail className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />}
                          pinnedLabel="Toggle Overview"
                          unpinnedLabel="Toggle Overview"
                        />
                      </span>
                    }
                    iconAriaHidden={false}
                    title={activeInteraction.customerName ?? "Customer"}
                    subtitle={activeInteraction.recordId}
                  />
                  {activeInteraction.channels.length > 0 && (
                    <TabList className="px-6 bg-lyra-bg-surface-base shrink-0 lyra-channel-tab-list-wrap">
                      {activeInteraction.channels.map((c) => {
                        const key = c.id ?? c.type;
                        return (
                          <ChannelTab
                            key={key}
                            type={c.type}
                            address={c.addressLabel}
                            messageCount={c.messageCount}
                            interactionId={c.interactionId}
                            active={(activeInteraction.currentChannelId ?? activeInteraction.channels[activeInteraction.channels.length - 1]?.id) === key}
                            onClick={() => handleChannelSelect(activeInteraction.id, key)}
                            onDismiss={() => {
                              if (activeInteraction.channels.length > 1) handleDismissChannel(activeInteraction.id, c);
                              else handleDismissInteraction(activeInteraction.id);
                            }}
                          />
                        );
                      })}
                    </TabList>
                  )}
                  {/* Email interaction body */}
                  {(() => {
                    const emailCh = activeInteraction.channels.find((c) => c.type === "email");
                    return (
                      <EmailView
                        customerName={activeInteraction.customerName}
                        customerEmail={emailCh?.addressLabel}
                        onInboundMessage={() => emailCh && handleEmailInbound(activeInteraction.id, emailCh.id)}
                        onReplySent={() => emailCh && handleEmailReplySent(activeInteraction.id, emailCh.id)}
                      />
                    );
                  })()}
                </>
              ) : (
                <div className="flex-1 overflow-y-auto" />
              )}
            </div>

          </Container>

          {notifVariant === "float" && notifMounted && (
            <div style={{ ...getNotifFloatStyle(), pointerEvents: "none", visibility: notifState === "closed" ? "hidden" : "visible", opacity: notifState === "open" ? 1 : 0, transform: notifState === "open" ? "translateY(0)" : "translateY(-8px)", transition: notifState === "open" ? "opacity 150ms ease, transform 150ms ease" : "opacity 100ms ease, transform 100ms ease" }}>
              <div style={{ pointerEvents: "auto" }}>{notifPanel}</div>
            </div>
          )}

          {aiVariant === "float" && aiMounted && (
            <div style={{ ...getAiFloatStyle(), pointerEvents: "none", visibility: aiState === "closed" ? "hidden" : "visible", opacity: aiState === "open" ? 1 : 0, transform: aiState === "open" ? "translateY(0)" : "translateY(-8px)", transition: aiState === "open" ? "opacity 150ms ease, transform 150ms ease" : "opacity 100ms ease, transform 100ms ease" }}>
              <div style={{ pointerEvents: "auto" }}>{aiPanel}</div>
            </div>
          )}

        </div>

        {notifVariant === "docked" && (
          <div className="pb-3" style={{ width: notifState === "open" ? notifWidth : 0, marginRight: notifState === "open" ? 12 : 0, overflow: "hidden", flexShrink: 0, transition: notifIsResizing ? "none" : "width 250ms cubic-bezier(0.4, 0, 0.2, 1)" }}>
            <div className="h-full animate-in fade-in-0 duration-150" style={{ width: notifWidth, display: notifState === "open" ? "block" : "none" }}>{notifPanel}</div>
          </div>
        )}

        {aiVariant === "docked" && (
          <div className="pb-3" style={{ width: aiState === "open" ? aiWidth : 0, marginRight: aiState === "open" ? 12 : 0, overflow: "hidden", flexShrink: 0, transition: aiIsResizing ? "none" : "width 250ms cubic-bezier(0.4, 0, 0.2, 1)" }}>
            <div className="h-full animate-in fade-in-0 duration-150" style={{ width: aiWidth, display: aiState === "open" ? "block" : "none" }}>{aiPanel}</div>
          </div>
        )}

      </div>
    </div>
  );
}
