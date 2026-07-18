# mosaic.pdf()

Displays a PDF in an iframe viewer with configurable buttons. Supports loading from Zoho WorkDrive, public URLs, base64 strings, or HTML content (converted via the Zoho Writer API). Also available in headless `download` mode. For filling PDF form fields or merging multiple PDFs, use the convenience wrappers [`mosaic.pdffiller()`](pdffiller.md) and [`mosaic.pdfmerge()`](pdfmerge.md). For HTML content you want to render, print, or convert, use [`mosaic.html()`](html.md) instead.

```javascript
mosaic.pdf(source, options)
```

---

## Parameters

| Parameter | Type | Default | Required | Description |
|---|---|---|---|---|
| `source` | object | | Yes | PDF source configuration - see [Source Types](#source-types) below |
| `options.title` | string | `''` | | Title displayed above the preview. Falls back to `options.filename` in the viewer if not set |
| `options.filename` | string | `'document.pdf'` | | Suggested filename for download - `.pdf` is appended if missing |
| `options.mode` | string | `'preview'` | | Viewer mode - see [Modes](#modes) below |
| `options.buttons` | array | `['Close', 'Download']` | | Button labels or `{ label, style, value }` objects - see [Buttons](../reference/buttons.md) |
| `options.show_toolbar` | boolean | `false` | | Preview mode only. Show the browser's built-in PDF toolbar (Chromium-based browsers only). Hidden by default |
| `options.skip_download` | boolean | `false` | | Fill/merge modes only. Return generated PDF base64 without triggering a browser download |
| `options.workdrive_connection` | string | | for WorkDrive sources | WorkDrive connection name for resolving WorkDrive sources. Falls back to `DEFAULTS.connections.workdrive` |
| `options.writer_connection` | string | | for HTML sources | Writer connection name for converting `html` sources to PDF. Falls back to `DEFAULTS.connections.writer` |

See [Shared Popup / Flyout Options](../reference/popup-flyout-options.md) for positioning and animation options.

---

## Returns

`MosaicResponse` | `null`

The `response.data` object returns the Base64 string of the document alongside user interaction states.

| Property | Type | Description |
|---|---|---|
| `base64` | string \| null | The Base64-encoded string of the PDF document |
| `downloaded` | boolean | `true` if the user clicked a Download/Save button in `preview` mode, or if the widget was run in `download` mode |
| `printed` | boolean | `true` if the user clicked a Print button during `preview` mode |

**Example Response (`preview` mode):**
```javascript
{
    success: true,
    cancelled: false,
    type: 'pdf',
    button_clicked: { label: 'Send to Client', value: 'Send to Client' },
    data: {
        base64: 'JVBERi0xLjMKJcTl8uXrp/Og0MTGCjQgMCBvYmoKPDwg...',
        downloaded: true,  // User clicked "Download" before closing
        printed: false     // User did not click "Print"
    }
}
```

---

## Source Types

The `source` parameter defines where the PDF comes from. Use an object with a `type` key.

| Source Type | Properties | Description |
|---|---|---|
| `workdrive` | `{ type: 'workdrive', id: '<resource_id>' }` | Downloads from WorkDrive via `workdrive_connection`. Requires `WorkDrive.files.READ` and `ZohoFiles.files.READ` scopes |
| `url` | `{ type: 'url', url: '<public_url>' }` | Fetches from a public URL. The URL must be accessible from the widget iframe (no auth, no CORS restrictions), and the domain must be added to your CRM's [trusted domains](https://crm.zoho.com/crm/settings/trusted-domain) |
| `base64` | `{ type: 'base64', content: '<base64_string>' }` | Decodes a base64-encoded PDF string directly into a blob. Useful when the PDF is already in memory |
| `html` | `{ type: 'html', content: '<html_string>', connection?: '<writer_conn>' }` | Converts HTML to PDF via the Zoho Writer API. The optional `connection` overrides `options.writer_connection` for this source |

## Modes

| Mode | Behavior |
|---|---|
| `'preview'` | Renders the PDF in an iframe with a header bar and configurable buttons. Default mode |
| `'download'` | Shows a loading spinner, resolves the source, triggers a browser download, and closes the widget |
| `'merge'` | Headless: resolves multiple sources, merges them via pdf-lib, downloads the result unless `skip_download: true`, and closes - see [`mosaic.pdfmerge()`](pdfmerge.md) |
| `'fill'` | Headless pipeline: resolves a template, fills form fields, downloads the result unless `skip_download: true`, and closes - see [`mosaic.pdffiller()`](pdffiller.md) |

---

## Merge Mode

Merging is fully documented in [`mosaic.pdfmerge()`](pdfmerge.md), which is the recommended way to merge PDFs. It accepts the `sources` array directly without the `mosaic.pdf(null, { mode: 'merge', ... })` wrapper.

---

## Button behavior

Non-cancel buttons route to different actions based on their label or `value`:

| Button config | Action |
|---|---|
| `value: 'download'` or label contains `download` / `save` | Re-resolves the PDF source and triggers a browser download |
| `value: 'print'` or label contains `print` | Calls `print()` on the iframe content window |
| Any other `value` string | Closes immediately and returns that value as `button_clicked.value` |
| Anything else | Closes the widget |

This means you can mix download and print buttons:

```javascript
buttons: ['Close', 'Download', 'Print']
```

---

## Connection setup

Connections can be provided per-call or set once via `mosaic.DEFAULTS.connections`. See [Connections](../getting-started.md#connections) for details and required scopes.

| Connection | Used for |
|---|---|
| `workdrive_connection` | Resolving `workdrive` source types |
| `writer_connection` | Converting `html` source types to PDF |

---

## Examples

### Preview a WorkDrive PDF

```javascript
var result = mosaic.pdf(
    { type: 'workdrive', id: 'ekj9tb3e7298a1e224752b5289c67ad5086bf' },
    {
        title: 'Contract Preview',
        filename: 'Contract_2026.pdf',
        workdrive_connection: 'workdrive_connection',
        width: '80vw',
        height: '85vh'
    }
);
```

---

### Preview a base64 PDF

```javascript
var result = mosaic.pdf(
    { type: 'base64', content: pdfBase64String },
    {
        filename: 'Report.pdf',
        width: '80vw',
        height: '85vh'
    }
);
```

---

### Preview HTML converted to PDF

```javascript
var result = mosaic.pdf(
    { type: 'html', content: invoiceHtml },
    {
        filename: 'Invoice_2026.pdf',
        writer_connection: 'writer_connection',
        width: '80vw',
        height: '85vh'
    }
);
```

---

### Preview with Download, Print, and Close

```javascript
var result = mosaic.pdf(
    { type: 'workdrive', id: resourceId },
    {
        title: 'Invoice Preview',
        filename: 'Invoice_' + invoiceNumber + '.pdf',
        buttons: ['Close', 'Download', 'Print'],
        workdrive_connection: 'workdrive_connection',
        width: '80vw',
        height: '85vh'
    }
);
```

---

### Download directly (no preview)

Downloads the PDF immediately and closes the widget.

```javascript
mosaic.pdf(
    { type: 'workdrive', id: resourceId },
    {
        mode: 'download',
        filename: 'Report_Q4.pdf',
        workdrive_connection: 'workdrive_connection'
    }
);

mosaic.splash.success('PDF downloaded.');
```

---

### View only (no download or print)

```javascript
mosaic.pdf(
    { type: 'workdrive', id: resourceId },
    {
        title: 'Document Preview',
        buttons: ['Close'],
        workdrive_connection: 'workdrive_connection',
        width: '80vw',
        height: '85vh'
    }
);
```

---

### Preview a public URL

```javascript
mosaic.pdf(
    { type: 'url', url: 'https://example.com/report.pdf' },
    {
        title: 'External Report',
        filename: 'report.pdf',
        width: '80vw',
        height: '85vh'
    }
);
```
