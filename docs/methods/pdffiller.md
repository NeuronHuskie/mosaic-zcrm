# mosaic.pdffiller()

Fills a PDF form and triggers a browser download. Headless - shows a loading spinner, generates the PDF, downloads it, and closes the widget. No interactive UI.

This is a convenience wrapper around [`mosaic.pdf()`](pdf.md) with `mode: 'fill'`.

The template source must be a typed [source object](pdf.md#source-types), such as `{ type: 'workdrive', id: '...' }` or `{ type: 'base64', content: '...' }`.

```javascript
mosaic.pdffiller(source, fields, options)
```

---

## Parameters

| Parameter | Type | Default | Required | Description |
|---|---|---|---|---|
| `source` | object | | Yes | Typed [source object](pdf.md#source-types) |
| `fields` | array | `[]` | Yes | Array of `{ field, value }` objects - see [Fields](#fields) below |
| `options.filename` | string | `'document.pdf'` | | Suggested filename for download - `.pdf` is appended if missing |
| `options.remove_pages` | array | `[]` | | Array of page numbers to remove from the source PDF before saving |
| `options.flatten` | boolean | `true` | | Flatten fillable PDF after fields are populated. Set `false` to keep fields editable |
| `options.skip_download` | boolean | `false` | | Return the generated PDF as base64 without triggering a browser download. `response.data.downloaded` will be `false` |
| `options.workdrive_connection` | string | | for WorkDrive sources | WorkDrive connection name. Falls back to `DEFAULTS.connections.workdrive` |

See [Shared Popup / Flyout Options](../reference/popup-flyout-options.md) for positioning options (though the popup/flyout is headless, a small loader is visible).

---

## Returns

`MosaicResponse` | `null`

`response.data` contains `{ base64, downloaded, printed }` - see [`mosaic.pdf()` response](pdf.md#returns) for details.

```javascript
var result = mosaic.pdffiller({ type: 'workdrive', id: resourceId }, fields, {
    filename: 'App.pdf'
});

if (mosaic.utils.isSuccess(result)) {
    mosaic.splash.success('PDF downloaded.');
}
```

Use `skip_download: true` when you need the generated PDF base64 returned in `response.data.base64` without saving the file locally:

```javascript
var result = mosaic.pdffiller({ type: 'workdrive', id: resourceId }, fields, {
    filename: 'App.pdf',
    skip_download: true
});

if (mosaic.utils.isSuccess(result)) {
    var pdfBase64 = mosaic.utils.getData(result).base64;
}
```

---

## Source

### WorkDrive source

The most common pattern - store your fillable PDF templates in WorkDrive and reference them by resource ID. The widget downloads the file, converts to base64, and fills it.

```javascript
mosaic.pdffiller({ type: 'workdrive', id: 'ekj9tb3e7298a1e224752b5289c67ad5086bf' }, fields, {
    filename: 'Application.pdf',
    workdrive_connection: 'workdrive_connection'
});
```

Requires a connection with `WorkDrive.files.READ` and `ZohoFiles.files.READ` scopes.

### Base64 source

Pass the base64-encoded PDF directly. Useful when the template is already in memory (e.g. fetched from another API, stored in a CRM field, or generated dynamically).

```javascript
var templateBase64 = '...';  // base64 string of a fillable PDF

mosaic.pdffiller({ type: 'base64', content: templateBase64 }, fields, {
    filename: 'Application.pdf'
});
```

---

## Fields

Each entry maps a PDF form field name to a value. The `field` property must match the field name in the fillable PDF exactly.

| Property | Type | Required | Description |
|---|---|---|---|
| `field` | string | Yes | PDF form field name (must match the template exactly) |
| `value` | string \| boolean | Yes | Value to fill. `true`/`false` for checkboxes, string for text/radio/dropdown |

```javascript
[
    { field: 'Full_Name',    value: 'John Smith' },
    { field: 'Date',         value: '03/28/2026' },
    { field: 'Plan_Type',    value: 'Plan G' },
    { field: 'Agree_Terms',  value: true }
]
```

**Field type behavior:**

| PDF field type | `value` | Behavior |
|---|---|---|
| Text field | string | Sets the text value |
| Checkbox | `true` / `false` | Checks or unchecks |
| Radio group | string | Selects the matching option (must match exactly) |
| Dropdown | string | Selects the matching option (must match exactly) |

> [!NOTE]
> Fields not found in the PDF template are skipped with a console warning. Fields with empty values on radio/dropdown types are also skipped. By default, the form is flattened after filling (`flatten: true`) - fields become static text and are no longer editable. Set `flatten: false` to keep fields editable.

---

## Connection setup

The WorkDrive connection can be provided per-call via `workdrive_connection`, or set once via `mosaic.DEFAULTS.connections.workdrive`. See [Connections](../getting-started.md#connections) for details and required scopes.

---

## Examples

### Basic usage

```javascript
var fields = [
    { field: 'Applicant_Name',  value: deal.Full_Name },
    { field: 'Date_of_Birth',   value: deal.Date_of_Birth },
    { field: 'Effective_Date',  value: deal.Effective_Date },
    { field: 'Plan',            value: deal.Plan_Type },
    { field: 'Tobacco_Use',     value: deal.Tobacco === 'Yes' }
];

var result = mosaic.pdffiller({ type: 'workdrive', id: deal.Template_Resource_ID }, fields, {
    filename: deal.Deal_Name + '_Application.pdf',
    workdrive_connection: 'workdrive_connection'
});

if (mosaic.utils.isSuccess(result)) {
    mosaic.splash.success('Application PDF generated.');
}
```

### Collecting fields via form then filling PDF

Combine `mosaic.form()` to collect user input with `mosaic.pdffiller()` to generate the document:

```javascript
var formResult = mosaic.form({
    title: 'Application Details',
    fields: [
        { name: 'name',    label: 'Full Name',       type: 'text',     required: true },
        { name: 'dob',     label: 'Date of Birth',   type: 'date',     required: true },
        { name: 'plan',    label: 'Plan',            type: 'picklist', required: true, options: ['Plan F', 'Plan G', 'Plan N'] }
    ]
});

if (mosaic.utils.isSuccess(formResult)) {
    var data = mosaic.utils.getData(formResult);

    mosaic.pdffiller({ type: 'workdrive', id: 'ekj9tb3e7298a1e224752b5289c67ad5086bf' }, [
        { field: 'Applicant_Name',  value: data.name },
        { field: 'Date_of_Birth',   value: data.dob },
        { field: 'Plan_Type',       value: data.plan.actual_value }
    ], {
        filename: data.name + '_Application.pdf'
    });
}
```
