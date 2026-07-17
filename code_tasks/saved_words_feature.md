# Feature: Saved Words (personal vocabulary) — Mobile

## Summary

PRO subscribers can save word explanations to a personal vocabulary via a "+" button in the
word-explanation modal. Saved words are viewable (by any signed-in user, including lapsed
PRO) from a new "My Words" entry in the profile drawer, opening a new vocabulary screen.

The backend is implemented in parallel against the pinned wire contract in the Appendix —
code strictly against that contract; do not invent fields. The backend resolves the word
content server-side: **the app sends only coordinates** (`episode_id`, `target_language`,
`segment_index`, `start_char`), never the explanation content.

UX decisions already made:
- "+" (add) icon in the modal header; turns into a filled checkmark when saved; tapping the
  checkmark unsaves. Non-PRO users tapping "+" get the RevenueCat paywall (`usePaywall`).
- Vocabulary screen: flat list, newest first, row shows surface + translation (fallback:
  meaning) + episode title; trash icon deletes; tapping a row reopens the same
  `WordExplanationModal` with the saved card.
- Reading the vocabulary is NOT pro-gated (lapsed subscribers keep read access).

## 1. API layer (`services/api.ts`)

Add types (the `card` is a superset of the existing `WordExplanation` — extra fields like
`difficulty` and token `morph`/offsets arrive from the backend; existing `WordToken` works
as-is since extra JSON fields are simply not typed):

```ts
export interface SavedWordCard extends WordExplanation {
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}

export interface SavedWord {
  id: string;
  episode_id: string | null;
  episode_title: string | null;
  target_language: string;
  segment_index: number;
  start_char: number;
  card: SavedWordCard;
  schema_version: number;
  created_at: string;
}

export interface SavedWordsPage {
  items: SavedWord[];
  total: number;
}

export interface SaveWordInput {
  episode_id: string;
  target_language: string;
  segment_index: number;
  start_char: number;
}
```

Add functions following the existing `fetchJSON`/`authHeaders` style:

- `saveWord(token: string, input: SaveWordInput): Promise<SavedWord>` — `POST /api/saved-words`.
- `fetchSavedWords(token: string, params?: { episodeId?: string; targetLanguage?: string; limit?: number; offset?: number }): Promise<SavedWordsPage>` — `GET /api/saved-words` with query string.
- `deleteSavedWord(token: string, id: string): Promise<void>` — `DELETE /api/saved-words/{id}`.
  Note: the response is 204 with an empty body — check whether `fetchJSON` tolerates empty
  bodies; if not, add a small variant (don't `res.json()` on 204).

## 2. Word tap plumbing — segment index

Today `onWordPress` passes only the `WordExplanation`; the save call needs the segment index.

- `components/transcript-panel.tsx`: change the prop to
  `onWordPress: (word: WordExplanation, segmentIndex: number) => void` and pass
  `segmentIndex` at the call site (it's already in scope where words are rendered, see the
  `explanations[String(segmentIndex)]` lookup around line 46).
- `app/player.tsx`: `selectedWord` state becomes `{ word: WordExplanation; segmentIndex: number } | null`
  (adjust `handleWordPress` around line 159 and the modal mount around line 390). Keep the
  existing `word_tapped` PostHog event unchanged.

## 3. Saved-words hook (`hooks/use-saved-words.ts`, new)

Model the fetch lifecycle on `hooks/use-episode-questions.ts` (enabled flag, keep stale data)
and thread the token via `useAuthToken()` like other hooks do.

`useSavedWords(episodeId: string | undefined, targetLanguage: string | undefined)` returns:

- `savedByKey: Map<string, SavedWord>` — key `` `${segment_index}:${start_char}` ``; built
  from `fetchSavedWords(token, { episodeId, targetLanguage, limit: 200 })` on mount / when
  episode or language changes. (200 covers any realistic per-episode count; no pagination here.)
- `save(segmentIndex: number, startChar: number): Promise<void>` — calls `saveWord`, inserts
  the returned row into the map.
- `remove(savedWord: SavedWord): Promise<void>` — calls `deleteSavedWord`, evicts from map.
- `pending: boolean` — true while a save/remove is in flight (used to disable the button).

On save/remove failure: revert nothing (state only updates on success), log via
`console.warn`, and rethrow so the caller can react to `pro_required` (see §4). Follow the
app's existing `ApiError` handling pattern (`hooks/use-episode-data.ts:53`).

## 4. Modal save button (`components/word-explanation-modal.tsx`)

New optional props (modal stays reusable for the vocabulary screen, which passes different
handlers or none):

```ts
isSaved?: boolean;
onToggleSave?: () => void;
savePending?: boolean;
```

Render an icon button inline with the headline word (immediately after `word.surface`,
binding the action to the word rather than the window chrome — placement revised after
design review; the close button stays alone in the top-right corner):

- not saved → Ionicons `add-circle-outline`, default text color;
- saved → Ionicons `checkmark-circle`, cyan `#06b6d4`;
- `disabled={savePending}`; render nothing if `onToggleSave` is undefined.
- Accessibility label from i18n: `wordModal.save` / `wordModal.saved`.

In `app/player.tsx`, wire the toggle:

```
onToggleSave:
  if (!me?.is_subscribed) {
    presentPaywall()                    // usePaywall(), entitlement 'pro'
    if purchased → refetch me, then fall through to save
    else return
  }
  key = `${segmentIndex}:${word.start_char}`
  savedByKey.has(key) ? remove(savedByKey.get(key)) : save(segmentIndex, word.start_char)
```

PostHog events: `word_saved` / `word_unsaved` with `{ word: surface, episode_id, target_language }`.
If the backend still answers 403 `pro_required` (edge: stale `me`), present the paywall too.

## 5. Profile drawer entry (`components/profile-drawer.tsx`)

Add a new `<Pressable style={styles.menuItem}>` in the menuSection block (~line 209),
matching the exact structure of existing items: Ionicons `book-outline`, label
`t('profile.myWords')`. On press: close the drawer, then `router.push('/vocabulary')`.
Visible to all signed-in users (read access is not pro-gated).

## 6. Vocabulary screen (`app/vocabulary.tsx`, new route)

Check how existing non-tab routes (e.g. `player`) are declared in `app/_layout.tsx` and
mirror that (header title, back navigation, dark theme).

- Data: local state + `fetchSavedWords(token, { limit: 50, offset })`; `onEndReached` loads
  the next page while `items.length < total`; pull-to-refresh via `RefreshControl` resets to
  offset 0. (No caching library in this app — plain `useState`/`useEffect` like
  `use-episode-questions.ts`.)
- Row: `card.surface` (bold) — `card.translation ?? card.meaning` (one line, ellipsized) —
  `episode_title` in secondary/dimmed style if present. Trash icon (Ionicons
  `trash-outline`) on the right → `deleteSavedWord` + remove from list.
- Tap row → open `WordExplanationModal` with `word={item.card}` and
  `targetLanguage={item.target_language}` (no `onToggleSave` — read/delete only here).
- Empty state: centered `t('vocabulary.empty')` + `t('vocabulary.emptyHint')`.
- Loading/error states consistent with other screens.
- PostHog: `vocabulary_opened` on mount.

## 7. i18n (`locales/en.json`, `locales/es.json`)

Add to both files (match existing key style; Spanish must be real translations, not copies):

- `profile.myWords` — "My Words" / "Mis palabras"
- `vocabulary.title` — "My Words" / "Mis palabras"
- `vocabulary.empty` — "No saved words yet" / …
- `vocabulary.emptyHint` — "Tap a word while listening and press + to save it" / …
- `wordModal.save` — "Save word" / …
- `wordModal.saved` — "Saved" / …

## 8. Quality gates (all must pass)

```bash
npm run lint
npx tsc --noEmit
```

No test framework is configured; do not add one. Do NOT commit; leave changes in the
working tree. Do not start the dev server.

## Appendix: pinned wire contract (backend implements this exactly)

```
POST /api/saved-words          (auth: Bearer JWT)
  body: {"episode_id": "<uuid>", "target_language": "en", "segment_index": 17, "start_char": 42}
  200: SavedWord (idempotent — same row on repeat saves)
  403: {"detail": {"code": "pro_required" | "saved_words_limit_reached", "message": "..."}}
  404: {"detail": "Episode not found"} | {"detail": {"code": "word_not_found", "message": "..."}}

GET /api/saved-words?episode_id=&target_language=&q=&limit=50&offset=0   (auth)
  200: {"items": [SavedWord, ...], "total": 123}
  q: optional search (1..50 chars) over card surface + translation, accent- and
     case-insensitive (Postgres unaccent); total reflects the filtered count

DELETE /api/saved-words/{id}   (auth)
  204 | 404

SavedWord = {
  "id": "<uuid>", "episode_id": "<uuid>|null", "episode_title": "…|null",
  "target_language": "en", "segment_index": 17, "start_char": 42,
  "card": {  // full WordExplanation — superset of the episode-data word shape
    "surface": "sin embargo", "start_char": 42, "end_char": 53,
    "tokens": [{"surface": "sin", "lemma": "sin", "pos": "ADP", "morph": {}, "start_char": 42, "end_char": 45}, …],
    "translation": "however|null", "meaning": "…", "pattern": "…|null",
    "usage_notes": "…|null", "example": "…|null",
    "difficulty": "beginner|intermediate|advanced"
  },
  "schema_version": 1, "created_at": "2026-07-16T…Z"
}
```
