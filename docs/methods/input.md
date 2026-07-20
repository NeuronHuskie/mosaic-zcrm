# mosaic.input()

A convenience wrapper around `mosaic.form()` for collecting a single value. The popup title defaults to the field label, and `response.data` is the raw value directly - not wrapped in a field name key.

```javascript
mosaic.input(label, options)
```

---

Type shorthand methods set `options.type` automatically:

```javascript
mosaic.input.text(label, options)
mosaic.input.textarea(label, options)
mosaic.input.number(label, options)
mosaic.input.email(label, options)
mosaic.input.tel(label, options)          // also: mosaic.input.phone()
mosaic.input.url(label, options)
mosaic.input.date(label, options)
mosaic.input.time(label, options)
mosaic.input.datetime(label, options)     // alias for datetime-local
mosaic.input.picklist(label, options)
mosaic.input.multiselect(label, options)
mosaic.input.checkbox(label, options)
mosaic.input.radio(label, options)
mosaic.input.file(label, options)
```

---

## Parameters

| Parameter | Type | Default | Required | Description |
|---|---|---|---|---|
| `label` | string | | ✅ | Field label - also used as the popup title if `options.title` is not set |
| `options.title` | string | label value | | Popup header title |
| `options.type` | string | `'text'` | | Input field type |
| `options.required` | boolean | `true` | | Require a value before the form can be submitted |
| `options.placeholder` | string | `''` | | Input placeholder text |
| `options.default_value` | any | `''` | | Pre-filled default value |
| `options.instructions` | string | - | | Help text displayed below the field |
| `options.buttons` | array | `['Cancel', 'OK']` | | Button labels or `{ label, style, value }` objects - see [Buttons](../reference/buttons.md) |
| `options.submit_on_enter` | boolean | `true` | | Submit when Enter is pressed |
| `options.force_focus` | boolean | `true` | | Auto-focus the input field on load |
| `options.module` | string | - | for `file` fields (`attachments`) | CRM module API name. |
| `options.record_id` | string | - | for `file` fields (`attachments`) | CRM record ID. |

See [Shared Popup / Flyout Options](../reference/popup-flyout-options.md) for positioning and animation options.

---

## Returns

`MosaicResponse` | `null`

`response.data` is the raw input value - not wrapped in a field name key. See [Response & Utils](../reference/response.md) for full details.

```javascript
// Simple text input
const result = mosaic.input('Enter a note');
if (mosaic.utils.isSuccess(result)) {
    const note = result.data; // raw string
}

// Picklist - result.data is the value object directly
const result = mosaic.input.picklist('Select Stage', { options: ['Open', 'Won', 'Lost'] });
if (mosaic.utils.isSuccess(result)) {
    const stage = result.data.actual_value; // not result.data.fieldName.actual_value
}

// Multiselect - result.data is the array directly
const result = mosaic.input.multiselect('Industries', { options: ['Technology', 'Finance'] });
if (mosaic.utils.isSuccess(result)) {
    const values = result.data.map(function(o) { return o.actual_value; });
}
```

---

## Field Types

All field types, their properties, and return shapes are documented in [Field Types](../reference/fields.md). The same field types apply to both `mosaic.form()` and `mosaic.input()`. The only difference is that `input` returns the value directly in `response.data` rather than nested under a field name key.
