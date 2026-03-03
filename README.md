# Scrubin Employer Portal

SvelteKit-based employer portal for the Scrubin healthcare recruitment platform. Company users manage headhunts, review candidates, track recruitment pipeline progress, and handle payments/subscriptions.

## Tech Stack

- **Framework:** SvelteKit 2.16 + Svelte 5 (runes: `$state`, `$derived`, `$effect`, `$props`)
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS 3.4 with `tailwindcss-animate` and `@tailwindcss/typography`
- **UI Components:** shadcn-svelte (built on `bits-ui` 1.8 headless library), `tailwind-variants` for variant management
- **Icons:** `lucide-svelte` / `@lucide/svelte`
- **Charts:** ECharts 5.6 (funnel, bar charts)
- **Forms:** `sveltekit-superforms` + `formsnap` + `zod`
- **Payments:** Stripe (`@stripe/stripe-js` client + `stripe` server)
- **i18n:** Custom store-based system (`src/lib/i18n/`) — English (en) and Estonian (et)
- **Notifications:** `svelte-sonner` toasts
- **Animations:** `lottie-web` for logo animation

## Project Structure

```
src/
├── routes/
│   └── (logged_in)/dashboard/       # All authenticated routes
│       ├── +page.svelte              # Main dashboard (search + stats + hunts)
│       ├── +layout.svelte            # Auth guard, sidebar, header
│       ├── hunts/                    # Hunt management
│       │   ├── [id]/+page.svelte     # Hunt detail (details/statistics/questions tabs)
│       │   └── requirements/[id]/    # Requirements detail + creation
│       ├── pricing/                  # Subscription plans
│       ├── settings/                 # User/company settings
│       ├── search/                   # Candidate search
│       ├── requirements/             # Requirements listing
│       └── faq/                      # FAQ page
├── lib/
│   ├── scrubinClient/                # API client layer
│   │   ├── index.ts                  # ScrubinClient class, all interfaces, resource classes
│   │   └── client.ts                 # Singleton instance + global stores (currentUser, currentUserCompany)
│   ├── components/
│   │   ├── ui/                       # Reusable UI primitives (shadcn-svelte)
│   │   │   ├── card/                 # Card.Root, Header, Title, Description, Content, Footer
│   │   │   ├── button/               # Button with variants (default, destructive, outline, ghost, link)
│   │   │   ├── badge/                # Badge with variants
│   │   │   ├── table/                # Table components
│   │   │   ├── tabs/                 # Tab navigation
│   │   │   ├── dialog/               # Modal dialogs
│   │   │   ├── sheet/                # Side panel sheets
│   │   │   ├── sidebar/              # App sidebar system (25+ files)
│   │   │   ├── layer-chart/          # ECharts wrappers (index, funnelChart, barChart)
│   │   │   ├── tooltip/              # Tooltips
│   │   │   ├── dropdown-menu/        # Dropdown menus
│   │   │   ├── select/               # Select dropdowns
│   │   │   ├── form/                 # Form components (superforms integration)
│   │   │   └── ...                   # separator, skeleton, scroll-area, alert, etc.
│   │   ├── dashboard/                # Dashboard-specific components
│   │   │   ├── companyStats.svelte   # Company-wide stats overview
│   │   │   ├── huntsList.svelte      # Hunt cards grid
│   │   │   ├── simpleSearchView.svelte # Search input + results
│   │   │   ├── candidateChat.svelte  # Chat with candidates
│   │   │   ├── interestedWorkerDialog.svelte # Candidate detail dialog
│   │   │   └── ...                   # Other dashboard components
│   │   ├── payment/                  # Payment components + helpers
│   │   │   ├── paymentDialog.svelte  # Stripe payment dialog
│   │   │   ├── planSelection.svelte  # Plan subscription flow
│   │   │   └── payments.ts           # getStatusColor() helper
│   │   └── requirements/             # Requirements chat + details
│   ├── i18n/                         # Internationalization
│   │   ├── index.ts                  # Translation store (t, locale), merges all JSON files
│   │   ├── config.ts                 # Available languages, default language
│   │   └── locales/
│   │       ├── en/                   # English: index.json, huntDetails.json, faq.json, requirementsV2.json
│   │       └── et/                   # Estonian: same structure
│   ├── config/
│   │   └── pipelineStatuses.ts       # Pipeline status icons/colors config
│   └── utils/                        # Utility functions
│       ├── languageUtils.ts          # Language switching
│       └── tokenUtil.ts              # JWT decode
├── hooks.server.ts                   # Server hooks: auth, user/company loading, cookie management
└── app.css                           # Global styles, CSS variables (HSL color system)
```

## API Client Architecture

All API calls go through `ScrubinClient` (`src/lib/scrubinClient/index.ts`), which contains resource classes:

- **`AuthStore`** — JWT token management, cookie storage, auto-refresh
- **`PortalResource`** — User profile (getUser, updateUser, updatePassword)
- **`CompanyResource`** — Company profile, billing, subscriptions, payment methods
- **`HuntResource`** — Hunts, requirements, candidates, stats, pipeline
- **`DataResource`** — Reference data (countries, professions, specialties, languages) with localStorage caching

Pattern for API calls:
```typescript
async getCompanyStats(): Promise<CompanyStats> {
  const url = new URL('/api/v1/hunts/company-stats', this.client.baseUrl);
  return this.request<CompanyStats>('GET', url.toString()) as Promise<CompanyStats>;
}
```

Note: The `HuntResource` constructor uses base path `/api/v1/hunt` (singular), but hunt listing/stats endpoints use `/api/v1/hunts` (plural) with hardcoded paths.

Auth is handled automatically via `BaseResource.request()` which attaches Bearer token headers.

## Key Patterns

### Data Fetching
- Dashboard components fetch their own data via `onMount()` (client-side)
- Server-side loading via `+page.server.ts` for pages that need auth-gated prefetching
- Global stores: `currentUser` and `currentUserCompany` (Svelte writable stores)

### Component Pattern
- Svelte 5 runes throughout (`$state`, `$derived`, `$effect`, `$props`, `$bindable`)
- `cn()` utility from `src/lib/utils.ts` for Tailwind class merging (clsx + tailwind-merge)
- Components use `bits-ui` for accessible headless behavior + Tailwind for styling

### Translations
```svelte
import { t, locale } from '$lib/i18n';
{$t('dashboard.companyStats.title')}
{$t('dashboard.searchView.welcomeBack', { name: userName })}
```

Translation files are JSON, split by domain:
- `index.json` — main app translations (nav, dashboard, settings, pricing, etc.)
- `huntDetails.json` — hunt detail page + statistics tab
- `faq.json` — FAQ content
- `requirementsV2.json` — requirements creation flow

### Status Colors
- Hunt statuses: `getStatusColor(status)` from `src/lib/components/payment/payments.ts`
- Pipeline statuses: `getStatusConfig(status)` from `src/lib/config/pipelineStatuses.ts`

## Environment Variables

| Variable | Description |
|---|---|
| `PUBLIC_API_URL` | Backend API base URL (e.g. `http://localhost:3000`) |
| `PUBLIC_ORIGIN` | Frontend origin URL (e.g. `http://localhost:5174`) |
| `PUBLIC_STRIPE_PUBLIC_KEY` | Stripe publishable key (live) |
| `PUBLIC_STRIPE_PUBLIC_KEY_DEV` | Stripe publishable key (test) |
| `PRIVATE_STRIPE_SECRET_KEY` | Stripe secret key (live, server-side only) |
| `PRIVATE_STRIPE_SECRET_KEY_DEV` | Stripe secret key (test, server-side only) |

## Development

```bash
npm install
npm run dev
```

The app runs on `http://localhost:5174` by default. Requires the backend API running at `PUBLIC_API_URL`.

## Auth Flow

- JWT tokens stored in `scrubin_auth` cookie
- Auto-refresh before expiration (60s buffer)
- Server hooks (`hooks.server.ts`) validate auth on each request
- Only `company` user sub-type is allowed; others redirect to `auth.scrubin.io`
- Auth domains: `scrubin.io`, `scrubin.uk`, `scrubin.ch`, `scrubin.au` (plus localhost)
