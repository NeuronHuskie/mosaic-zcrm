# Changelog

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
