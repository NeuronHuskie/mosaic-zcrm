# mosaic.pdfmerge()

Merges multiple PDF sources into a single document and triggers a browser download. Headless - shows a loading spinner, resolves each source, combines them via pdf-lib, downloads the merged PDF, and closes the widget. No interactive UI.

This is a convenience wrapper around [`mosaic.pdf()`](pdf.md) with `mode: 'merge'`.

```javascript
mosaic.pdfmerge(sources, options)
```

---

## Parameters

| Parameter | Type | Default | Required | Description |
|---|---|---|---|---|
| `sources` | array | | ✅ | Array of source objects to merge - see [Sources](#sources) below |
| `options.filename` | string | `'merged.pdf'` | | Suggested filename for download - `.pdf` is appended if missing |
| `options.skip_download` | boolean | `false` | | Return the merged PDF as base64 without triggering a browser download. `response.data.downloaded` will be `false` |
| `options.workdrive_connection` | string | | for WorkDrive sources | WorkDrive connection name. Falls back to `DEFAULTS.connections.workdrive` |
| `options.writer_connection` | string | | for HTML sources | Writer connection name for converting `html` sources. Falls back to `DEFAULTS.connections.writer` |

See [Shared Popup / Flyout Options](../reference/popup-flyout-options.md) for positioning options (though the popup/flyout is headless, a small loader is visible).

---

## Returns

`MosaicResponse` | `null`

`response.data` contains `{ base64, downloaded, printed }` - see [`mosaic.pdf()` response](pdf.md#returns) for details.

Set `skip_download: true` when you need the merged PDF base64 returned in `response.data.base64` without saving the file locally.

---

## Sources

Each entry in the `sources` array is a [source object](pdf.md#source-types) with an optional `pages` key for page selection. Sources are merged in the order they appear in the array.

| Source Type | Properties |
|---|---|
| `workdrive` | `{ type: 'workdrive', id: '<resource_id>', pages?: '<range>' }` |
| `url` | `{ type: 'url', url: '<public_url>', pages?: '<range>' }` |
| `base64` | `{ type: 'base64', content: '<base64_string>', pages?: '<range>' }` |
| `html` | `{ type: 'html', content: '<html_string>', connection?: '<writer_conn>' }` |

Individual sources can specify their own `connection` property, falling back to the widget-level `workdrive_connection` or `writer_connection`.

**Page selection syntax** (1-based, human-readable):

| Syntax | Result |
|---|---|
| `'1-3'` | Pages 1, 2, 3 |
| `'2,5-8'` | Pages 2, 5, 6, 7, 8 |
| `'3'` | Page 3 only |
| `'5-'` | Page 5 through the last page |
| *(omitted)* | All pages |

---

## Connection setup

Connections can be provided per-call or set once via `mosaic.DEFAULTS.connections`. See [Connections](../getting-started.md#connections) for details and required scopes.

| Connection | Used for |
|---|---|
| `workdrive_connection` | Resolving `workdrive` source types |
| `writer_connection` | Converting `html` source types to PDF |

---

## Examples

### Merge two WorkDrive PDFs

```javascript
mosaic.pdfmerge([
    { type: 'workdrive', id: 'ekj9tb3e7298a1e224752b5289c67ad5086bf' },
    { type: 'workdrive', id: 'fm8k2tc9e7298a1e224752b5289c67ad5087cg' }
], {
    filename: 'Combined.pdf',
    workdrive_connection: 'workdrive_connection'
});

mosaic.splash.success('Merged PDF downloaded.');
```

---

### Merge with page selection

Combine pages 1-3 of a contract with a specific appendix page.

```javascript
mosaic.pdfmerge([
    { type: 'workdrive', id: contractId, pages: '1-3' },
    { type: 'workdrive', id: appendixId, pages: '5' }
], {
    filename: 'Contract_Excerpt.pdf',
    workdrive_connection: 'workdrive_connection'
});
```

---

### Mixed source types

Combine a cover page (HTML), a main document (WorkDrive), and an appendix (base64).

```javascript
mosaic.pdfmerge([
    { type: 'html', content: coverPageHtml },
    { type: 'workdrive', id: contractResourceId },
    { type: 'base64', content: signaturePageBase64 }
], {
    filename: 'Full_Contract.pdf',
    workdrive_connection: 'workdrive_connection',
    writer_connection: 'writer_connection'
});
```

---

### Per-source connections

Override the default connection for a specific source.

```javascript
mosaic.pdfmerge([
    { type: 'workdrive', id: primaryId,   connection: 'workdrive_primary' },
    { type: 'workdrive', id: secondaryId, connection: 'workdrive_secondary' }
], {
    filename: 'Multi_Account.pdf'
});
```
