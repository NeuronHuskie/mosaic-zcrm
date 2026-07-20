# mosaic.utils

Utility functions for handling `MosaicResponse` objects without inspecting properties directly. See [Response](response.md) for the full response shape reference.

| Method | Returns | Description |
|---|---|---|
| `mosaic.utils.isSuccess(r)` | boolean | `true` if the user clicked a non-cancel button |
| `mosaic.utils.isCancelled(r)` | boolean | `true` if the user clicked a cancel-type button **or** dismissed the widget (`null` also counts as cancelled) |
| `mosaic.utils.wasDismissed(r)` | boolean | `true` if `r` is `null` (closed via X or Escape) |
| `mosaic.utils.isError(r)` | boolean | `true` if the helper/widget returned an error response |
| `mosaic.utils.getError(r)` | string \| null | Returns `r.error_message` or `null` |
| `mosaic.utils.getData(r)` | any | Returns `r.data` or `null` |
| `mosaic.utils.getButtonClicked(r)` | string \| null | Returns the button label or `null` |
| `mosaic.utils.wasButtonClicked(r, label)` | boolean | `true` if the specified button was clicked |
| `mosaic.utils.getButtonValue(r)` | string \| null | Returns the button return value or `null` |
| `mosaic.utils.wasButtonValue(r, value)` | boolean | `true` if the specified button value was returned |
| `mosaic.utils.getType(r)` | string \| null | Returns the widget type string |

---

## Handling Outcomes

Every popup/flyout interaction results in one of four outcomes. Note that the checks overlap: a dismissed widget (`null`) satisfies both `wasDismissed()` and `isCancelled()` — check `wasDismissed()` first if you need to treat dismissal differently from an explicit Cancel click:

```javascript
const result = mosaic.confirmation('Send this email now?');

if (mosaic.utils.wasDismissed(result)) {
    // result is null - user closed via X icon or Escape key
    // treat as no action taken
}

if (mosaic.utils.isError(result)) {
    // helper/widget error
    console.log(mosaic.utils.getError(result));
}

if (mosaic.utils.isCancelled(result)) {
    // user clicked a cancel-type button (Cancel, Close, No, etc.)
}

if (mosaic.utils.isSuccess(result)) {
    // user clicked a non-cancel button (OK, Submit, Yes, etc.)
}
```

### Checking specific buttons

When a popup has more than two buttons, use `wasButtonClicked` or `wasButtonValue` to branch on the specific button:

```javascript
const result = mosaic.confirmation('How would you like to save?', {
    buttons: [
        'Cancel',
        { label: 'Save Draft',  value: 'draft',   style: 'secondary' },
        { label: 'Publish Now', value: 'publish',  style: 'primary' }
    ]
});

if (mosaic.utils.wasButtonValue(result, 'publish')) {
    // publish path
} else if (mosaic.utils.wasButtonValue(result, 'draft')) {
    // draft path
}
```

### Working with form data

```javascript
const result = mosaic.form({
    fields: [
        { name: 'stage',  label: 'Stage',  type: 'picklist', options: ['Open', 'Won', 'Lost'] },
        { name: 'amount', label: 'Amount', type: 'number' },
        { name: 'notes',  label: 'Notes',  type: 'textarea' },
        { name: 'due',    label: 'Due',    type: 'date' },
        { name: 'time',   label: 'Time',   type: 'time' },
        { name: 'appt',   label: 'Appt',   type: 'datetime-local' }
    ]
});

if (mosaic.utils.isSuccess(result)) {
    const data   = mosaic.utils.getData(result);
    const stage  = data.stage.actual_value;         // picklist returns { actual_value, display_value }
    const amount = data.amount;                     // number returns a number
    const notes  = data.notes;                      // text/textarea returns a string
    const due    = data.due;                        // date returns 'yyyy-MM-dd' (or date_format_return override)
    const time   = data.time;                       // time returns 'HH:mm' (or time_format_return override)
    const appt   = data.appt;                       // datetime-local returns 'yyyy-MM-ddTHH:mm'
}
```

### Working with input data

`mosaic.input()` returns the value directly in `response.data` - not wrapped in a field name key:

```javascript
const result = mosaic.input.picklist('Select Stage', {
    options: ['Prospecting', 'Qualified', 'Closed Won']
});

if (mosaic.utils.isSuccess(result)) {
    const stage = mosaic.utils.getData(result).actual_value; // getData() returns the value directly, not wrapped in a field name key
}
```
