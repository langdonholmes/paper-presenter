# Task: Add keyboard navigation to presenter view

## Description
Add left/right arrow key navigation to the presenter view so the user can move between waypoints using the keyboard. This should be a pure utility module with a React hook, plus integration into PresenterShell.

The presenter view (`src/presenter/PresenterShell.tsx`) displays waypoints sequentially. Currently there's no way to navigate between them via keyboard.

## Acceptance Criteria
- [ ] Pressing `ArrowRight` advances to the next waypoint
- [ ] Pressing `ArrowLeft` goes back to the previous waypoint
- [ ] Navigation wraps: right on last waypoint does nothing (no wrap)
- [ ] Navigation wraps: left on first waypoint does nothing (no wrap)
- [ ] The hook cleans up its event listener on unmount
- [ ] `pnpm run build` passes
- [ ] `pnpm run test` passes

## Files
**Create:** `src/presenter/use-keyboard-nav.ts`, `src/presenter/use-keyboard-nav.test.ts`
**Modify:** `src/presenter/PresenterShell.tsx`

## Tests
Write tests for the navigation logic in `src/presenter/use-keyboard-nav.test.ts`:
- Calling `next()` increments index (clamped to length - 1)
- Calling `prev()` decrements index (clamped to 0)
- Index stays at 0 when `prev()` called at start
- Index stays at max when `next()` called at end
- Returned index updates correctly after multiple calls

Note: Test the pure navigation logic (next/prev/clamp), not the DOM event binding. Keep tests free of jsdom — extract the logic into a testable function.

## Notes
- PresenterShell currently has minimal content — it will need state for `currentIndex` and the waypoint list
- The hook should accept `{ length: number }` and return `{ index, next, prev }`
- Arrow key listener should only fire when no input/textarea is focused (check `document.activeElement`)
