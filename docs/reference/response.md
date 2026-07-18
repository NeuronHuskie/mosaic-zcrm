# Response

## `MosaicResponse`

Every popup/flyout method (`form`, `input`, `table`, `html`, `pdf`, `pdffiller`, `pdfmerge`, `launcher`, `confirmation`, `message`) returns a `MosaicResponse` object, or `null` if the user dismissed the widget without clicking a button (via the X icon or Escape key).

```javascript
{
    success:        true,
    cancelled:      false,
    button_clicked: { label: 'Submit', value: 'Submit' },
    type:           'form',
    data:           { ... }
}
```

> `button_clicked.label` is the text shown to the user. `button_clicked.value` is the return identifier from the button config, falling back to the label when no `value` was set.

### data shape by method

| Method | `response.data` shape |
|---|---|
| `form` | Object keyed by field `name` - `{ fieldName: value, ... }` |
| `input` | Raw value - string, number, object, or array depending on field type |
| `table` | Array of row objects (or single object when `allow_multiple: false`) |
| `html` | `{ base64, downloaded, printed }` - tracks user interactions during preview. `base64` is populated only if a PDF download occurred |
| `pdf` | `{ base64, downloaded, printed }` - Base64-encoded PDF string and interaction tracking across all modes |
| `pdffiller` | `{ base64, downloaded, printed }` - same as `pdf` (pdffiller is a convenience wrapper around `mosaic.pdf()`) |
| `pdfmerge` | `{ base64, downloaded, printed }` - same as `pdf` (pdfmerge is a convenience wrapper around `mosaic.pdf()`) |
| `launcher` | Selected item object with `index` property - `{ actual_value, display_value, description?, icon?, status_color?, index }` |
| `confirmation` | `[]` - empty array, outcome determined by button |
| `message` | `[]` - empty array, outcome determined by button |

> [!NOTE]
> **Conditional fields:** Fields hidden by [conditions](../reference/fields.md#conditions) at the time of submission are excluded from `response.data` entirely. They are not included as `null` or empty values - the key is simply absent. This means you can safely check for the presence of a key to determine whether a conditional section was visible.

---

## Error Responses

If the helper or widget throws (for example a missing connection, an invalid COQL query, or a Zoho API failure), the method returns an error response instead of a normal `MosaicResponse`:

```javascript
{
    success: false,
    error: true,
    error_message: 'WorkDrive source requires workdrive_connection.'
}
```

Use `mosaic.utils.isError(r)` to detect this case and `mosaic.utils.getError(r)` to read the message. Error responses are **not** treated as cancellations - `mosaic.utils.isCancelled(r)` returns `false` for them.

---

## `mosaic.utils`

See [Utils](utils.md) for the full `mosaic.utils` method list and usage examples.

---

## File Upload Results

When a `mosaic.form()` or `mosaic.input.file()` call includes a `file` field, the upload result is included in `response.data` keyed by the field name. The shape of the result varies by `destination.type`.

When `multiple: true`, each key contains an array of result objects rather than a single object.

---

**Attachment (`destination.type: 'attachment'`):**

```javascript
{
    document: {
        destination: 'attachment',
        code: 'SUCCESS',
        status: 'success',
        message: 'attachment uploaded successfully',
        details: { id: '4329472347328947324', ... }
    }
}
```

**Field upload (`destination.type: 'field'`):**

```javascript
{
    contract: {
        destination: 'field',
        code: 'SUCCESS',
        status: 'success',
        message: 'record updated',
        details: { id: '4329472347328947324', ... }
    }
}
```

**WorkDrive upload (`destination.type: 'workdrive'`):**

```javascript
{
    report: {
        destination: 'workdrive',
        resource_id: '5fdsfsdb4539543n543o5ih43oi5n43',
        filename: 'Contract_2025.pdf',
        permalink: 'https://workdrive.zoho.com/file/5fdsfsdb4539543n543o5ih43oi5n43',
        parent_id: 'i458574354kfhdufhsdn54353sdsff4'
    }
}
```
