# Feature: Demo Mode & New-User Onboarding — Mobile

## Summary

Let **signed-out (guest) users** use the app in a **demo mode**: browse the curated demo
catalog, listen, and tap words for explanations — the full comprehensible-input aha — with
**no account and no wall**. The two value-add actions are gated to drive signup and, later,
PRO:

- **Ask a question** → guests hit a single wall: **sign-in**. After registering they have
  **3 free questions** (already seeded server-side), so the question they wanted goes
  through immediately. When a registered free user runs out (quota 0), the **paywall**
  appears.
- **Save a word (vocabulary)** → **PRO-only**, staged over two separate moments: a guest
  tapping save sees a "PRO feature — create a free account" message and the **register**
  wall (**never the paywall**); a registered free user who tries again sees the **paywall**.

A lightweight **first-run coachmark** on the guest's first demo episode teaches the two core
gestures (tap a word, ask a question). PostHog instruments the pre-signup funnel.

**Guests land directly in demo content** — no upfront value/carousel screen. All limits are
disclosed contextually at the gates, framed as unlocking, never as fine print upfront.

## Value ladder (for reference)

| | **Guest** (no account) | **Free** (registered) | **PRO** |
|---|---|---|---|
| Browse + listen | Demo episodes | Free episodes | Full catalog |
| Tap word → explanation | ✅ | ✅ | ✅ |
| Ask questions | — → sign-in | **3 total** (lifetime) | Weekly quota |
| Save words | — → sign-in (msg only) | — → paywall | ✅ |

## Backend status — NO CHANGES REQUIRED (verified)

Do not touch `krashen-backend`. The following already exist and this feature codes against
them as-is:

- **Demo endpoints** (unauthenticated, IP-rate-limited 30/60s, 404-mask the private catalog),
  returning the same shapes as the authed endpoints, including full explanation payloads:
  - `GET /api/demo/podcasts`
  - `GET /api/demo/podcast/{podcast_id}/episodes`
  - `GET /api/demo/episode/{episode_id}/data?target_language={lang}`
- **3 free questions on registration**: `get_or_create_user` seeds
  `questions_left = settings.default_user_questions_left` (= `3`).
- **Ask quota**: `/api/ask` enforces quota server-side (free lifetime counter; PRO weekly
  window) and returns a quota error when exhausted.
- **Save is PRO-only**: `POST /api/saved-words` depends on `get_current_pro_user` and returns
  `403 {code: "pro_required"}` for non-subscribers.

## Non-goals / out of scope

- No backend changes. No web (`krashen-web`) changes.
- No new onboarding/tour npm dependency (New Architecture is enabled — build the coachmark
  from `react-native-reanimated` + a `Modal`, both already deps). Use existing
  `@react-native-async-storage/async-storage` for the one-time flag.
- No upfront value/carousel screen. No changes to how PRO episodes are gated for *signed-in*
  users (that already works via `usePaywall`).
- Vocabulary read access rules unchanged.

---

## 1. API layer (`services/api.ts`)

Add unauthenticated demo fetchers mirroring the existing authed ones, reusing `fetchJSON`
(no `authHeaders`). They return the exact same types (`Podcast`, `Episode`, `EpisodeData`):

- `fetchDemoPodcasts(): Promise<Podcast[]>` → `GET /api/demo/podcasts`
- `fetchDemoEpisodes(podcastId: string): Promise<Episode[]>` → `GET /api/demo/podcast/{podcastId}/episodes`
- `fetchDemoEpisodeData(episodeId: string, targetLanguage: string): Promise<EpisodeData>` →
  `GET /api/demo/episode/{episodeId}/data?target_language={lang}`

## 2. Auth-state model (`app/_layout.tsx` — `AuthGate`)

Remove the hard redirect that sends signed-out users to `/sign-in`. Guests must be allowed
on the app's demo surfaces.

- Delete the `if (!isSignedIn && !onSignIn) router.replace('/sign-in')` branch. Signed-out
  users now land on `index` (Home) in demo mode.
- Keep splash-hide-on-loaded and the RevenueCat/PostHog/Crisp identify-vs-reset effects
  exactly as they are.
- `/sign-in` becomes **intent-driven** only (reached from the gates below), never a cold
  boot wall.

## 3. Auth-aware data hooks

`use-podcasts`, `use-episodes`, `use-episode-data` currently early-return when
`!isSignedIn`. Change each so that once `isLoaded`:
- **signed in** → authed endpoint with token (unchanged path);
- **signed out** → the corresponding **demo** endpoint (no token).

Keep the existing effect deps (`isLoaded`, `isSignedIn`, …) so a mid-session sign-in/out
re-fetches from the correct source. `use-episode-data`'s `proRequired` (403) handling stays;
guests only ever open demo episodes, which resolve normally.

## 4. Home screen behavior for guests (`app/index.tsx`)

- `useMe()` is `null` for guests; `me?.is_subscribed` is falsy. **Guests must never see a
  paywall.** In `handleEpisodeTap`, when signed out, skip the
  `!episode.is_free && !me?.is_subscribed` paywall branch entirely and open the player
  directly (demo episodes are the curated free sample).
- PRO badges are cosmetic for guests; do not let them trigger any purchase flow.
- `ProfileDrawer` for a guest shows a **"Sign in / Create account"** CTA (routing to the
  contextual sign-in, trigger `drawer`) instead of profile/subscription info and "My Words".
  Tapping "My Words" as a guest routes to sign-in (trigger `vocabulary`).

## 5. Contextual sign-in with return context (`app/sign-in.tsx` + callers)

Today `sign-in` is a full screen doing `router.replace('/')` on success — which would strand
a guest who signed in from deep inside an episode. Fix so the user returns to exactly where
they were, so the "naturally come back and try again" flow works:

- Present sign-in **as a modal** (expo-router `presentation: 'modal'` for the `sign-in`
  screen in the root `Stack`) **and/or** accept an optional `returnTo` search param.
- On success: if a `returnTo` is present, `router.replace(returnTo)`; otherwise
  `router.back()` (dismiss the modal back onto the originating screen). Fall back to `/` only
  when there is no back entry.
- Add an optional `reason` param used to render a one-line context header on the sign-in
  screen (e.g. the Ask/Save framing copy from the Appendix) plus a compact **Guest / Free /
  PRO** value-ladder block, so the tier limits are disclosed once, positively, at the moment
  of signup.
- Callers push e.g. `router.push({ pathname: '/sign-in', params: { reason: 'ask', returnTo } })`.

## 6. Ask gate (`app/player.tsx` + `components/ask-controls.tsx`)

The record trigger is `AskControls`' `onStart` (owned by the player).

- **Guest**: `onStart` must NOT start recording. Instead route to contextual sign-in with
  `reason: 'ask'` and a `returnTo` pointing back at the current player (preserve
  `podcastId` / `episodeId` / `targetLanguage`). Fire `ask_gate_shown_guest` then
  `signup_started {trigger:'ask'}`.
- **Signed-in free / PRO**: existing recording flow. **Verify** the app surfaces the paywall
  when `/api/ask` reports the quota is exhausted (free user at 0): catch the quota/403 in the
  ask flow (`use-ask-question` / player) and call `usePaywall()`. If this path is missing,
  add it. (Do not re-implement quota — the backend owns it.)

## 7. Save gate (`app/player.tsx` save handler → `components/word-explanation-modal.tsx`)

The modal renders the save toggle only when `onToggleSave` is provided; the branching lives
in the player's save handler:

- **Guest**: tapping save shows the PRO-feature message (Appendix `wordModal.guestSavePrompt`)
  and routes to contextual sign-in with `reason: 'save'` + `returnTo`. **No paywall.** Fire
  `save_gate_shown_guest` then `signup_started {trigger:'save'}`.
- **Signed-in free (not subscribed)**: present the **paywall** (existing `usePaywall`). This
  is the "returns and tries again" moment.
- **PRO**: save proceeds (existing behavior).

## 8. First-run coachmark (`components/coach-mark.tsx` — new)

A lightweight, dismissible, once-only overlay shown the first time a **guest** opens a demo
episode (player). No new dependency.

- Two sequential steps, each a highlight + one-line caption pointing at a measured target:
  1. the transcript area — *"Tap any word to see what it means."*
  2. the Ask control — *"Ask about anything you didn't catch."*
- Implement with a `Modal`/absolute overlay + Reanimated fade/pulse; obtain target rects via
  `onLayout`/`measureInWindow` refs passed from the player. Always show a visible **Skip**.
- Gate with AsyncStorage key `onboarding.player.v1` (write on complete or skip). Do not
  reappear. Fire `coachmark_shown`, and `coachmark_completed` / `coachmark_skipped`.
- Keep it robust: if a target rect can't be measured, degrade to a simple centered 2-step
  card rather than crashing.

## 9. Analytics (`services/analytics.ts` — `posthog?.capture(...)`)

Events fire on the anonymous distinct_id pre-signup (consent gating already handled inside
the wrapper). Add:

- `demo_mode_entered` — guest session reaches Home.
- `demo_episode_opened` `{ episode_id }`.
- `word_explanation_viewed` `{ target_language }` — fires for guests too (add if not already).
- `ask_gate_shown_guest`, `save_gate_shown_guest`.
- `signup_started` `{ trigger: 'ask' | 'save' | 'catalog' | 'drawer' | 'vocabulary' }`.
- `signup_completed` — on successful Clerk sign-up (distinguish from sign-in of an existing
  user if feasible).
- `coachmark_shown` / `coachmark_completed` / `coachmark_skipped`.

`paywall_shown` / `paywall_purchased` / `paywall_dismissed` already fire in `usePaywall` —
do not duplicate.

## 10. i18n

Add all new keys to **both** `locales/en.json` and `locales/es.json` (see Appendix for
copy). No hard-coded strings in components.

---

## Acceptance criteria

1. Fresh install, no account → lands on Home showing **demo** podcasts/episodes; can open an
   episode, play, and tap words to see explanations — **no sign-in, no paywall** anywhere in
   that path.
2. First demo-episode open shows the 2-step coachmark once; never again after complete/skip.
3. Guest taps **Ask** → sign-in (reason=ask), no recording; after sign-up returns to the same
   episode and can ask (3 free questions available).
4. Guest taps **Save** → PRO-feature message + sign-in (reason=save); **no paywall** shown to
   the signed-out user; after sign-up returns to the same episode.
5. Registered free user taps **Save** → paywall. Registered free user at 0 questions taps
   **Ask** → paywall. PRO user → both actions work.
6. Signed-in users see the full (non-demo) catalog exactly as before; no regression.
7. Paywall never renders while signed out (guard every `usePaywall()` call site behind
   `isSignedIn`).
8. `npm run lint` clean; `tsc --noEmit` (or `npx tsc`) clean.
9. All PostHog events above fire at the specified moments; funnel
   `demo_episode_opened → word_explanation_viewed → ask_gate_shown_guest →
   signup_started → signup_completed` is observable.

## Appendix — microcopy (add to en.json / es.json)

English (`en`):
- `signIn.reasonAsk`: "Create a free account to ask your first question — 3 on the house."
- `signIn.reasonSave`: "Create a free account to start building your vocabulary."
- `signIn.ladderGuest`: "Guest — listen & tap words"
- `signIn.ladderFree`: "Free — + ask 3 questions"
- `signIn.ladderPro`: "PRO — unlimited questions & saved words"
- `wordModal.guestSavePrompt`: "Saving words to your vocabulary is a PRO feature. First, create your free account."
- `player.askGuestPrompt`: "Ask about anything you didn't catch — Krashen answers instantly."
- `coach.tapWord`: "Tap any word to see what it means."
- `coach.askQuestion`: "Ask about anything you didn't catch."
- `coach.skip`: "Skip"
- `drawer.signInCta`: "Sign in / Create account"

Spanish (`es`):
- `signIn.reasonAsk`: "Crea una cuenta gratis para hacer tu primera pregunta: 3 de regalo."
- `signIn.reasonSave`: "Crea una cuenta gratis para empezar a construir tu vocabulario."
- `signIn.ladderGuest`: "Invitado: escucha y toca palabras"
- `signIn.ladderFree`: "Gratis: + haz 3 preguntas"
- `signIn.ladderPro`: "PRO: preguntas y palabras guardadas ilimitadas"
- `wordModal.guestSavePrompt`: "Guardar palabras en tu vocabulario es una función PRO. Primero, crea tu cuenta gratis."
- `player.askGuestPrompt`: "Pregunta sobre cualquier cosa que no hayas entendido: Krashen responde al instante."
- `coach.tapWord`: "Toca cualquier palabra para ver su significado."
- `coach.askQuestion`: "Pregunta sobre cualquier cosa que no hayas entendido."
- `coach.skip`: "Omitir"
- `drawer.signInCta`: "Iniciar sesión / Crear cuenta"

(Match the exact nested key structure already used in the locale files; the paths above are
indicative — place them under the existing `signIn` / `player` / `wordModal` / `drawer`
namespaces, adding a `coach` namespace.)
