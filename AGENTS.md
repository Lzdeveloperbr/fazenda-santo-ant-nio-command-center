<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Farm data access is gated by RLS `public.is_member()`; the first two signups get the `member` role via the `handle_new_user` trigger — shared farm, no per-user ownership.
- Litter counters (deaths, transfers, weight, weaning) are updated only by inserting `litter_events`; a DB trigger applies them so the event log stays the source of truth.
- App pages live under `src/routes/_authenticated/` (client-only shell with nav); queries are shared `queryOptions` in `src/lib/farm.ts`.
- Indicators must come from recorded data only — never show invented numbers or comparisons.
