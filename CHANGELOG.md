# Changelog

---

> ## Client Script v1.0.2

### Changes

- Added `show_overflow_toggle` (default `true`) to `mosaic.table()`. Set to `false` to hide the clip/wrap toggle button and lock the table to whatever `overflow_mode` specifies. The export button is unaffected — it shares the same wrapper and still renders.

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

- Required fields now show their label in red while empty, returning to the normal label color as soon as they are filled. Makes unfilled fields obvious on long forms without waiting for a submit. Applies to every field type, needs no configuration, and re-applies if a field is cleared again. Field borders are deliberately left untouched — the label is the one element every field type has exactly one of, so the marker looks identical for text, picklist, radio, checkbox, multiselect, file and date fields.
- Required-field marking now waits for deferred field setup before it runs. Smart date fields (`type: 'date'` without `use_date_input`) and `datetime-local` fields render with no `value` attribute — their `default_value` is parked in `data-default-iso` and written in by a `setTimeout` in the field builder — so seeding synchronously marked a date that *had* a default as unfilled, and the red label only cleared once the value was retyped by hand. Seeding is now deferred behind `mosaic.ui.readiness.buildPromise()`, the same signal `force_focus` already waited on. Forms without date/datetime/time/tel fields still seed immediately.
- Fixed the invalid-field colour in dark mode. `--field-invalid-color` was declared only as the light-mode `--color-error` (`#f44336`) with no dark override, so every red field surface — error borders, the `.invalid-group` accent bar, error labels and the required `*` — used the light red against dark inputs. Now resolves to `--color-dark-error` (`#ef5350`) under `.dark-mode`. Single declaration; all seven consumers read the variable.
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
