# Getting Started

## How it works

Mosaic is a single Zoho CRM widget that renders different UI types - forms, tables, confirmations, PDF viewers, command palettes, and more - based on a configuration object you pass it. You never interact with the widget directly. Instead, you call methods on the `mosaic` client script helper, which serializes your config, opens the widget in a popup, waits for the user's response, and returns a structured result. This means one widget deployment handles every popup type in your org.

```javascript
const result = mosaic.form({
    title: 'Update Status',
    fields: [
        { name: 'status', label: 'New Status', type: 'picklist', options: ['Open', 'Closed'], required: true },
        { name: 'notes',  label: 'Notes',      type: 'textarea' }
    ]
});

if (mosaic.utils.isSuccess(result)) {
    const status = result.data.status.actual_value;
    const notes  = result.data.notes;
}
```

---

## Installation

1. **Install the Widget**
    - Upload the widget package (`dist/mosaic.zip` — a zip of the `/app` folder) to **Setup > Developer Hub > [Widgets](https://crm.zoho.com/crm/settings/widgets)**.
    - The widget API name must be exactly `mosaic`. If you name it something else, update the `WIDGET_API_NAME` constant at the top of the helper (`cscript/mosaic.js`) to match.

2. **Install the Client Script Helper**
    - Upload `mosaic.js` to **Setup > Developer Hub > Client Script > [Static Resources](https://crm.zoho.com/crm/settings/static-resource)**.

3. **Include the static resource in your client script**
    - In the client script editor, add `mosaic` as a required static resource. The `mosaic` object will then be available globally in your script.

---

## Connections

Some methods need Zoho service connections to call APIs on your behalf - for example, `mosaic.html()` uses a Writer connection for PDF conversion, and `mosaic.pdf()` uses a WorkDrive connection to fetch files.

You can pass the connection name on each call, or set it once via `mosaic.DEFAULTS.connections` so every subsequent call uses it automatically:

```javascript
// Set once at the top of your script
mosaic.DEFAULTS.connections.writer    = 'writer_connection';
mosaic.DEFAULTS.connections.workdrive = 'workdrive_connection';

// Then omit the connection parameter on individual calls
mosaic.html2pdf(html, { filename: 'Report.pdf' });
mosaic.pdf({ type: 'workdrive', id: resourceId });
```

| Connection | Used by | Required scopes |
|---|---|---|
| `writer` | `mosaic.html()` (Download PDF button), `mosaic.html2pdf()`, `mosaic.pdf()` (html source type) | `ZohoWriter.documents.CREATE` |
| `workdrive` | `mosaic.pdf()`, `mosaic.pdffiller()`, `file` fields with WorkDrive destination | `WorkDrive.files.READ`, `ZohoFiles.files.READ` (for reading); `WorkDrive.files.CREATE`, `WorkDrive.files.ALL` (for uploads) |

---

## Customizing Defaults

The `mosaic.DEFAULTS` object contains the default values used by each method. You can mutate it to change defaults for the duration of the page session without modifying the source file:

```javascript
// Widen all form popups
mosaic.DEFAULTS.form.width = '700px';

// Change the default table page size
mosaic.DEFAULTS.table.per_page = 25;

// Change shared behavior for future form calls
mosaic.DEFAULTS.form.close_icon = false;
mosaic.DEFAULTS.form.close_on_escape = true;

// Set connections (see above)
mosaic.DEFAULTS.connections.workdrive = 'workdrive_connection';
```

Method defaults are the source of truth for behavior such as `close_icon`, `close_on_escape`, `submit_on_enter`, `force_focus`, and table `sort_order`. Mutations affect all subsequent calls in the same client script execution. They do not persist across page loads.

See [Defaults](reference/defaults.md) for a complete list of all available keys and their default values.

---

## Version Compatibility

The client script helper (`mosaic.js`) and the widget must be kept in sync. When you update the widget, also update the static resource. Mismatched versions may cause unexpected behavior or missing features.

The current version is shown in the [README](../README.md). See the [Changelog](../CHANGELOG.md) for a history of changes.