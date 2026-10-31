# Changelog

---

> ## Client Script v1.0.3

### Changes

- Flyout `px` sizes are no longer "clamped". Zoho caps flyouts at `50vw` × `80vh` and clips anything larger without an error. `clampFlyoutDimensions` tried to clamp `px` values against `window.innerWidth` / `innerHeight`, but a client script has no `window`, so that branch never ran and `px` values always reached Zoho unchanged. The dead branch is gone and the docs now say what actually happens: `vw` widths clamp to `flyout_max_width_vw` (`45`), `vh` heights clamp to `flyout_max_height_vh` (`72`), and `px` and other units pass through. Use `vw` / `vh` for flyout sizes.
- Defaults are unchanged. The `table` default width of `800px` is wider than Zoho's `50vw` cap on any window under 1600px wide, so the Flyout Mode docs now suggest passing a `vw` width (e.g. `width: '45vw'`) when opening a table as a flyout.
- `MosaicFlyoutOptions` JSDoc no longer gives "max ~80vh" / "max ~50vw" as the limits. It now names Mosaic's ceilings and recommends `vw` / `vh`.

### Files Changed

| File | Change |
|---|---|
| `cscript/mosaic.js` | `clampFlyoutDimensions` handles `vw` / `vh` only (`window` branch removed); JSDoc fixes; version bump to 1.0.3 |
| `cscript/mosaic-tests.js` | Add "Flyout Sizing" test (oversized `vw` / `vh` clamp, in-range `vw` / `vh`, `px` pass-through) |
| `tests/mosaic-regression-tests.js` | Add `loadHelper()` (helper with a recording ZDK stub and no `window`); tests for the `vw` / `vh` clamp and `px` pass-through, unchanged popup sizes, and that the clamp doesn't read `window` |
| `docs/reference/popup-flyout-options.md` | Flyout Mode: describe the `vw` / `vh` clamp and `px` pass-through; tip to pass a `vw` width for table flyouts |
| `docs/reference/defaults.md` | Clarify the `flyout_max_*` ceilings |
| `README.md` | Client Script version 1.0.3 |

---

> ## v1.0.4

### Changes

- Fixed flyouts intermittently failing to answer the client script. A flyout answers with `ZDK.Client.sendResponse(requestId, response)`, and the request id comes from a `NotifyAndWait` event sent when the helper calls `flyout.notify({}, { wait: true })`. The helper calls `notify()` the moment `open()` returns, so the event races the widget's own load, and the Zoho SDK drops every message that lands before `ZOHO.embeddedApp.init()` (which runs only after the last script has loaded). When the event won, the widget had no id, logged `Missing flyout request id`, and closed with `$Client.close(response)`, which in a flyout carries no data: the client script got `null` as if the user had dismissed it. Heavier pages (e.g. a large `mosaic.html()` document) lost the race far more often. The widget now also reads `NotifyAndWait` straight off `window` `message` events (`mosaic.flyout.requests.capture`), attached as soon as `mosaic-flyout.js` loads; `mosaic-core.js` and `mosaic-flyout.js` move into `<head>` straight after the SDK so the listener exists before the event can arrive. Both routes feed the same `setRequest()`, so the id is still kept in one place, and the SDK handler stays as before.
- `mosaic.respond()` in a flyout now waits for the request id if it hasn't arrived yet (up to 3 s) instead of closing straight away, so a response sent early in the widget's life is still delivered. If the id never arrives it logs `No flyout request id - response not delivered` and closes without a payload, rather than suggesting the data went through.
- The widget no longer calls `$Client.close()` after `sendResponse`. The helper already closes the flyout (`flyout.close()`) as soon as `notify()` returns, and a close sent from the old flyout frame could land after the client script's next popup had opened (e.g. a `mosaic.confirmation()` straight after a flyout form) and close that popup instead, which the helper reported as a dismissal (`null`).
- A `NotifyAndWait` without an id is now ignored rather than clearing an id that has already arrived, and `setRequest()` writes the pre-init buffer through `mosaic.flyout.requests` rather than `this`, matching the rest of the module.

### Files Changed

| File | Change |
|---|---|
| `app/widget.html` | Load `mosaic-core.js` and `mosaic-flyout.js` in `<head>` straight after the SDK |
| `app/js/mosaic-flyout.js` | Add `requests.capture` (attached to `window` `message` at file load), `requests.whenReady` and `requests.flushWaiters`; `setRequest` ignores missing ids and releases waiting responses |
| `app/js/mosaic-core.js` | `response.send` waits for the flyout request id via `whenReady` and no longer closes the flyout itself after `sendResponse`; version bump to 1.0.4 |
| `tests/mosaic-regression-tests.js` | `window` stub records listeners; tests for the `<head>` script order, wire capture before init, ignored messages, missing ids, no self-close after `sendResponse`, late ids and the timeout path |
| `cscript/mosaic-tests.js` | Add "Flyout Responses" test (large `mosaic.html()` flyout, form, dismiss, and 5 flyout → popup rounds with a delivered / stayed-open tally) |

---

> ## v1.0.3

### Changes

- The date picker's day grid now fills the first and last weeks with the trailing days of the previous month and the leading days of the next month (e.g. September 2026 opens with Aug 30 to 31 and closes with Oct 1 to 3) instead of leaving blank cells. These days render at reduced opacity so the focused month stays prominent, and they are fully selectable: clicking one picks that exact date in the adjacent month. They go through the same `dayCell` path as in-month days, so `disable_past_dates`, today and selected highlighting all apply to them unchanged. Only the final week is completed; no extra row is added, so the calendar height is unchanged.

### Files Changed

| File | Change |
|---|---|
| `app/js/mosaic-datepicker.js` | `render.days` renders adjacent-month filler days via `dayCell` in place of empty cells; `dayCell` and `actions.selectDay` take an optional `monthOffset` (default `0`) |
| `app/css/components/_datepicker.css` | Add `.mcp-day--outside` (muted opacity) |
| `app/js/mosaic-core.js` | Version bump to 1.0.3 |
| `docs/getting-started.md` | Version Compatibility: widget and helper are versioned independently; matching major.minor means compatible |

---

> ## Client Script v1.0.2

### Changes

- Added `show_overflow_toggle` (default `true`) to `mosaic.table()`. Set to `false` to hide the clip/wrap toggle button and lock the table to whatever `overflow_mode` specifies. The export button is unaffected; it shares the same wrapper and still renders.

### Files Changed

| File | Change |
|---|---|
| `cscript/mosaic.js` | Add `show_overflow_toggle` to `DEFAULTS.table` and the table `resolveConfig` list; JSDoc entry; version bump to 1.0.2 |
| `cscript/mosaic-tests.js` | Add "Table - Overflow Toggle Hidden" test (clip mode, toggle hidden, export enabled, paged) |
| `docs/methods/table.md` | Document `show_overflow_toggle`; drop the "toggle is always shown" note from `overflow_mode` |
| `docs/reference/defaults.md` | Add `show_overflow_toggle` to the table defaults table |

---

> ## v1.0.2

### Changes

- Required fields now show their label in red while empty, returning to the normal label color as soon as they are filled. Makes unfilled fields obvious on long forms without waiting for a submit. Applies to every field type, needs no configuration, and re-applies if a field is cleared again. Field borders are deliberately left untouched: the label is the one element every field type has exactly one of, so the marker looks identical for text, picklist, radio, checkbox, multiselect, file and date fields.
- Required-field marking now waits for deferred field setup before it runs. Smart date fields (`type: 'date'` without `use_date_input`) and `datetime-local` fields render with no `value` attribute (their `default_value` is parked in `data-default-iso` and written in by a `setTimeout` in the field builder), so seeding synchronously marked a date that *had* a default as unfilled, and the red label only cleared once the value was retyped by hand. Seeding is now deferred behind `mosaic.ui.readiness.buildPromise()`, the same signal `force_focus` already waited on. Forms without date/datetime/time/tel fields still seed immediately.
- Fixed the invalid-field colour in dark mode. `--field-invalid-color` was declared only as the light-mode `--color-error` (`#f44336`) with no dark override, so every red field surface (error borders, the `.invalid-group` accent bar, error labels and the required `*`) used the light red against dark inputs. Now resolves to `--color-dark-error` (`#ef5350`) under `.dark-mode`. Single declaration; all seven consumers read the variable.
- Fixed the overflow-toggle setup guard, which tested for `#tableOverflowToggle` when what actually gets inserted is `.table-overflow-toggle-wrapper`. Harmless while the toggle was unconditional, but with `show_overflow_toggle: false` the guard never tripped and every re-render (paging, search, sort) appended another wrapper, stacking duplicate export buttons.

### Files Changed

| File | Change |
|---|---|
| `app/js/mosaic-validators.js` | `setupLiveClearing`: `clearInvalid` → `syncFieldState`, now toggles `required-empty` both ways; seeding collected into `seeds[]` and deferred behind a new optional `readyPromise` argument |
| `app/js/mosaic-form.js` | Build one `mosaic.ui.readiness.buildPromise()` and share it between `setupLiveClearing` and `mosaic.ui.focus.force` |
| `app/js/mosaic-table.js` | Guard `overflowToggle()` and the render path on `.table-overflow-toggle-wrapper`; skip the toggle html when `show_overflow_toggle === false` |
| `app/css/components/_utilities.css` | Add `.field-group.required-empty` label rules; route `.required-indicator` through `--field-invalid-color` and add the `.dark-mode` override for it |
| `app/js/mosaic-core.js` | Version bump to 1.0.2 |
| `tests/mosaic-regression-tests.js` | Add live-clearing tests for required and optional fields |
| `docs/reference/fields.md` | Note the red border on the `required` field option |

---

> ## Client Script v1.0.1

### Changes

- Popup/flyout headers longer than 50 characters are now truncated (last character replaced with an ellipsis) instead of failing the whole dialog. Previously ZDK.Client threw `header must be atmost 50 characters` and the dialog silently never opened (e.g. `[mosaic.cscript] HTML (flyout) error: ... header must be atmost 50 characters`). A warning is logged when truncation occurs (with `debug: true`). Applies to every method, both popup and flyout paths, via a shared `truncateHeader` helper in the two config builders.

### Files Changed

| File | Change |
|---|---|
| `cscript/mosaic.js` | Add `truncateHeader` helper; apply in `buildPopupConfig`/`buildFlyoutConfig`; JSDoc note on `header`; version bump to 1.0.1 |
| `cscript/mosaic-tests.js` | Add over-length header truncation test |

---

> ## v1.0.1

### Changes

- Fixed "unsupported file type" error when downloading from the HTML viewer in the mobile app: `mosaic.api.writer.html2pdf()` now retypes the Writer conversion result as an `application/pdf` blob. zrc returned the blob untyped, which desktop browsers tolerated but the mobile WebView's download handler rejected. Fixes all Writer-conversion download paths (HTML viewer, `mosaic.pdf` html sources, merge/fill with html sources).

### Files Changed

| File | Change |
|---|---|
| `app/js/mosaic-api.js` | Retype `html2pdf()` result blob as `application/pdf` |
| `app/js/mosaic-core.js` | Version bump to 1.0.1 |

---

> ## v1.0.0

Initial public release.

- Widget: **1.0.0**
- Client Script: **1.0.0**

Mosaic was developed privately prior to this release (widget `0.6.6.x`, client script `0.2.x` lineage). That history is maintained in a private archive; all future changes are documented here.
