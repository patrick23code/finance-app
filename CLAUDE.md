# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server (Vite, localhost:5173)
npm run build     # Production build → dist/
npm run lint      # ESLint
npm run preview   # Preview production build locally
vercel deploy --prod  # Deploy to Vercel (run from finance-app/)
```

## Architecture

**Stack:** React 19 + Vite + Tailwind CSS v4 + Firebase (Firestore + Google Auth) + Recharts + lucide-react

### Routing
There is no react-router-dom usage for navigation. App.jsx uses a `tab` useState to switch between pages. Navigation is done by calling `onNavigate(tabName)` passed as a prop. The only special route is `DebtDetailPage` which is rendered when `selectedDebt` is set (replaces the tab view entirely).

Tab names: `'overview'` | `'activity'` | `'wealth'` | `'stats'` | `'add'` | `'add-transaction'` | `'recurring'`

### Data Layer (`src/hooks/useFirestore.js`)
All Firestore access goes through four exports:
- `useCollection(collectionName, uid)` — real-time listener, returns `{ data, loading }`
- `addDocument(collectionName, uid, payload)` — adds `uid` + `createdAt` automatically
- `updateDocument(collectionName, id, payload)`
- `deleteDocument(collectionName, id)`

Every Firestore document is scoped to the logged-in user via a `uid` field. Collections: `transactions`, `debts`, `recurring`, `accounts`.

### Key Data Shapes
- **transactions**: `{ uid, name, amount, type: 'income'|'expense', category, date: 'YYYY-MM-DD', sourceId?, sourceType?: 'card'|'account', cardName? }`
- **debts**: `{ uid, type: 'credit_card'|'loan'|'personal', name, remaining, creditLimit?, originalAmount?, monthly?, dueDay?, apr?, last4?, bank?, direction?: 'they_owe'|'i_owe' }`
- **accounts**: `{ uid, name, balance, type: 'checking'|'savings'|'cash', color?, last4? }`
- **recurring**: `{ uid, name, amount, dueDay, category, cardName?, sourceId?, sourceType? }`

### Side Effects
`useProcessRecurring` (called once in AppShell) runs on mount and checks recurring expenses against today's date, auto-creating transactions for overdue recurring items.

When a transaction linked to a debt/account is deleted, the parent's `remaining`/`balance` is manually reversed in the delete handler (see ActivityPage and DebtDetailPage).

### Categories (`src/hooks/useCategories.js`)
Built-in categories come from `src/constants/categories.js`. Custom categories and hidden built-ins are stored in `localStorage` (`custom_expense_cats`, `custom_income_cats`, `hidden_categories`). The `useCategories` hook merges both sources.

### UI Patterns
- **Modals/sheets** always use `createPortal(…, document.body)` to escape stacking context issues.
- **Animations** are utility classes defined in `src/index.css`: `animate-scale-in`, `animate-fade-in-up`, `animate-slide-up`, `animate-fade-in`.
- **Number animations** use `useCountUp(value, duration)` hook.
- **Swipe-to-delete** on transaction rows is handled by `useSwipeDelete` hook — swipe opens a delete button, tap navigates (distinguished by `wasSwipe()`).
- FAB buttons use `createPortal` with `fixed bottom-24` positioning to sit above the bottom nav.
- Tailwind v4 is used — config is in `vite.config.js` via `@tailwindcss/vite` plugin, not a `tailwind.config.js` file.
