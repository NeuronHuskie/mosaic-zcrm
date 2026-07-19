# Changelog

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
