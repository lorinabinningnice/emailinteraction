# CLAUDE.md — Email Interaction

## What this repo is

A React prototype of an agent workspace for Email interactions, built on the `lyra-ui` shared design system. It provides a fully functional email thread view inside the standard Agent Next Gen shell.

### Features implemented

- **Agent shell** — AppHeader ("Agent Next Gen"), LeftNav, AiPanel, CustomerInformationPanel, outbound CreateNew flow
- **Email thread** — collapsible messages with collapsed body preview, HTML rendering, attachments
- **AI Summary panel** — collapsible summary of all thread messages with loading state and regenerate button
- **View Details panel** — collapsible case metadata (ID, status, dates, queue, subject)
- **Rich compose** — contentEditable editor with full toolbar: Undo/Redo, block format, font family/size, Bold/Italic/Underline/Strikethrough, text color, highlight, lists, indent/outdent, blockquote, link, attach, image, table, templates
- **Internal notes** — sticky-note toggle in toolbar; notes post to thread with amber styling, hidden from customer
- **Thread actions** — Reply, Reply All, Forward per message; quoted reply pre-fill
- **CC / BCC** — toggleable address fields in compose
- **Status control** — Open / Resolved / Deferred badge with popover picker
- **Attachments** — chip display on messages; file picker on compose
- **Quick reply templates** — Zap popover + `#keyword` inline trigger
- **Case status** — Send & Resolve option collapses status to Resolved on send
- **Customer info sidebar** — contact details, sentiment bar, recent case history

## Running locally

```bash
cd "Email Interaction"
npm install          # always run on a fresh clone or after pulling
npm run dev          # Vite dev server → http://localhost:5173
```

> **Requires** a sibling `lyra-ui` checkout at `../lyra-ui` (same parent folder). The Vite aliases point there directly — no published package needed.

## Key files

| Path | Purpose |
|---|---|
| `src/components/AgentNextGenPage.tsx` | Shell — AppHeader, LeftNav, AiPanel, outbound panel, interaction state |
| `src/components/EmailView.tsx` | Full email thread + compose + AI summary (~700 lines) |
| `src/components/CustomerInfoContent.tsx` | Sidebar: contact details, sentiment, case history |
| `src/index.css` | Tailwind base + `.email-body` / `.email-compose` HTML reset classes |
| `vite.config.ts` | Aliases: `@nicecxone/lyra-ui → ../lyra-ui/src/index.ts`, `@/* → src/*` |
| `tailwind.config.js` | Extends lyra-ui tokens via `../lyra-ui/tailwind-tokens.cjs` |
| `.lyra-ui-sync` | Records the lyra-ui git commit this app was last verified against |

## lyra-ui rules (read before editing UI)

This app consumes `lyra-ui` via a live source alias — not a published package.

- Import UI atoms from `@nicecxone/lyra-ui`. Never build a local re-implementation of something that already exists there.
- Check `lyra-ui/src/index.ts` and the component's `__stories__` file before building anything new. Match the story's exact markup.
- Never modify a `lyra-ui` core component from this repo.
- Use lyra token classes (`bg-lyra-bg-surface-base`, `text-lyra-fg-default`, `border-lyra-border-subtle`, etc.) before raw Tailwind values. Tokens live in `../lyra-ui/src/styles/lyra-tokens.css`.
- `Popover` from lyra-ui: `children` = trigger, `content` prop = panel — not `PopoverContent`.

Full rationale and examples: `../lyra-ui/PROJECT_SUMMARY.md`.

## HTML email rendering

Tailwind's CSS reset strips browser defaults from lists, headings, links etc. The `.email-body` class in `src/index.css` re-applies them. Apply it to:
- Thread message bodies: `<div className="email-body" dangerouslySetInnerHTML={{ __html: msg.body }} />`
- The compose contentEditable: `<div className="email-body email-compose" contentEditable ... />`

## Sync check (run at the start of each session)

`.lyra-ui-sync` records the `lyra-ui` commit this app was last verified against.

1. `git -C ../lyra-ui rev-parse HEAD` — check current lyra-ui HEAD
2. `git -C ../lyra-ui log --oneline "$(cat .lyra-ui-sync)"..HEAD` — diff since last sync
3. If new commits, read `../lyra-ui/PROJECT_SUMMARY.md` for breaking changes
4. Once reviewed: `git -C ../lyra-ui rev-parse HEAD > .lyra-ui-sync`
