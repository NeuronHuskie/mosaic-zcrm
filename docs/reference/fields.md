# Field Types

Field type reference for `mosaic.form()` and `mosaic.input()`.

In `mosaic.form()`, each field is defined as an object in the `fields` array. In `mosaic.input()`, field type options are passed directly as `options` to the shorthand method. See each method's doc for how the returned value is shaped - `form` wraps values by field name, `input` returns the value directly.

> [!TIP]
> **About the examples below.** Code samples show `mosaic.form()` field syntax. The same properties work with `mosaic.input()` - pass them as `options` to the shorthand method (e.g. `mosaic.input.date('Label', { disable_past_dates: true })`). See [mosaic.input()](../methods/input.md) for details on calling conventions and return shape.

- [text](#field-text)
- [textarea](#field-textarea)
- [number](#field-number)
- [email](#field-email)
- [tel](#field-tel)
- [url](#field-url)
- [date](#field-date)
- [time](#field-time)
- [datetime-local](#field-datetime-local)
- [picklist](#field-picklist)
- [multiselect](#field-multiselect)
- [checkbox](#field-checkbox)
- [radio](#field-radio)
- [file](#field-file)
- [description](#field-description)
- [button](#field-button)
- [divider](#field-divider)
- [group](#field-group)

---

## Common Properties

All field types share these base properties:

| Property | Type | Default | Required | Description |
|---|---|---|---|---|
| `name` | string | - | ✅ | Key used in `response.data` - `form` only, ignored by `input` |
| `label` | string | - |  | Displayed above the field |
| `type` | string | `'text'` |  | Field type identifier |
| `required` | boolean | `true` / `false` |  | Fail validation on submit if empty. While empty the field's label is shown in red, returning to the normal label color as soon as it is filled. Defaults to `true` via `mosaic.input()`, `false` via `mosaic.form()` |
| `placeholder` | string | - |  | Input placeholder text |
| `default_value` | any | - |  | Pre-filled value |
| `instructions` | string | - |  | Italic help text rendered below the field |

### Layout

The following options control field positioning within the form grid. These apply to `mosaic.form()` only. `mosaic.input()` renders a single field and ignores these.

| Property | Type | Default | Description |
|---|---|---|---|
| `width` | string | `'100%'` | Field width, e.g. `'50%'` for two-column layouts |
| `break_before` | boolean | `false` | Force this field to start on a new line, even if the previous field's width would allow them to sit side by side |

```javascript
// Two fields side by side (50% + 50%)
mosaic.form({
    fields: [
        { name: 'first', label: 'First Name', type: 'text', width: '50%' },
        { name: 'last',  label: 'Last Name',  type: 'text', width: '50%' }
    ]
});

// 50% + 30%, but second field forced to a new line
mosaic.form({
    fields: [
        { name: 'street', label: 'Street', type: 'text', width: '50%' },
        { name: 'city',   label: 'City',   type: 'text', width: '30%', break_before: true }
    ]
});
```

### Conditions

Fields can be shown or hidden based on the value of other fields. Add a `conditions` array to any field - all conditions must pass (AND logic) for the field to be visible. Hidden fields are excluded from validation and response data. `form` only.

| Property | Type | Required | Description |
|---|---|---|---|
| `conditions` | array | | Array of condition objects |
| `conditions[].field` | string | ✅ | Source field name to evaluate |
| `conditions[].operator` | string | ✅ | Comparison operator |
| `conditions[].value` | any | | Expected value. Not used for `empty` / `not_empty` |

For the full operator reference, usage examples, and behavior details see [Conditional Fields](../methods/form.md#conditional-fields) in the `mosaic.form()` docs.

---

## Option Objects

Fields that accept a list of options (`picklist`, `multiselect`, `checkbox` group, `radio`) accept options as plain strings or objects. Both formats are supported interchangeably:

```javascript
// { actual_value, display_value } - standard input format
options: [
    { actual_value: '1', display_value: 'High' },
    { actual_value: '2', display_value: 'Medium' },
    { actual_value: '3', display_value: 'Low' }
]

// Plain strings - actual_value and display_value are both the string
options: ['Open', 'Closed', 'Pending']
```

Regardless of input format, all selection field types return values as `{ actual_value, display_value }` objects (or arrays of them for multi-select types).

> [!NOTE]
> For compatibility, option objects also accept `value` as an alias for `actual_value`, and `text` / `label` as aliases for `display_value`. The `{ actual_value, display_value }` form is the canonical shape used throughout these docs.

---

## Destination Object

The `destination` object is used by `file` fields to specify where the uploaded file should be saved. If omitted, files default to record attachment.

```javascript
// attachment (default)
destination: { type: 'attachment' }

// CRM field
destination: { type: 'field', field_name: 'Contract__s', field_type: 'file' }

// WorkDrive
destination: { type: 'workdrive', folder_id: 'abc123', connection: 'my_conn', override_existing: true }
```

See the [file](#field-file) field type below for the full destination parameter reference.

---

## Field: text

Standard single-line text input.

| Property | Type | Default | Required | Description |
|---|---|---|---|---|
| `minlength` | number | - |  | Minimum character count |
| `maxlength` | number | - |  | Maximum character count |
| `pattern` | string | - |  | Regex pattern for validation |
| `pattern_message` | string | - |  | Error message shown when pattern validation fails |

**Returns:** string

```javascript
{ name: 'company', label: 'Company Name', type: 'text', required: true, maxlength: 100 }

// with pattern validation
{
    name: 'product_code',
    label: 'Product Code',
    type: 'text',
    pattern: '^[A-Z]{3}-[0-9]{4}$',
    pattern_message: 'Format must be ABC-1234'
}
```

---

## Field: textarea

Multi-line text input.

| Property | Type | Default | Required | Description |
|---|---|---|---|---|
| `rows` | number | `4` |  | Visible row height |
| `minlength` | number | - |  | Minimum character count |
| `maxlength` | number | - |  | Maximum character count |

**Returns:** string

```javascript
{ name: 'notes', label: 'Notes', type: 'textarea', rows: 5 }
```

---

## Field: number

Numeric input with optional range validation.

| Property | Type | Default | Required | Description |
|---|---|---|---|---|
| `min` | number | - |  | Minimum allowed value |
| `max` | number | - |  | Maximum allowed value |

**Returns:** number

```javascript
{ name: 'quantity', label: 'Quantity', type: 'number', required: true, min: 1, max: 1000 }
```

---

## Field: email

Email input with format validation (`user@domain.tld`).

No additional properties beyond the common ones.

**Returns:** string

```javascript
{ name: 'email', label: 'Email Address', type: 'email', required: true }
```

---

## Field: tel

Phone input with country-aware validation and optional input masking. Most countries apply an auto-formatting mask as the user types; some (e.g. `GB`) use free-form input with validation only. In `mosaic.input()`, also available as `mosaic.input.phone()`.

| Property | Type | Default | Required | Description |
|---|---|---|---|---|
| `minlength` | number | - |  | Minimum character count (applied before formatting) |
| `maxlength` | number | - |  | Maximum character count |

Phone formatting is controlled via `overrides` on the parent call:

| Override | Default | Description |
|---|---|---|
| `phone_country_code` | org country | Country code for validation and input masking (where available). Supported: `US`, `CA`, `GB`, `AU`, `DE`, `FR`, `IN`, `JP`, `CN` |
| `phone_format_display` | derived from `phone_country_code` | Input mask - `#` is a digit, e.g. `'(###) ###-####'`. Some countries (e.g. `GB`) have no default mask; set this explicitly to force one |
| `phone_format_return` | `'E164'` | Return format: `E164`, `national`, `raw`, or `display` |

**Returns:** formatted phone string (`E164` by default, e.g. `+15551234567`)

```javascript
// US default
{ name: 'mobile', label: 'Mobile Number', type: 'tel' }

// UK via overrides on parent mosaic.form() call
mosaic.form({
    fields: [{ name: 'phone', label: 'Phone', type: 'tel' }],
    overrides: { phone_country_code: 'GB', phone_format_return: 'national' }
});
```

---

## Field: url

URL input with format validation. Requires `http://` or `https://`.

No additional properties beyond the common ones.

**Returns:** string

```javascript
{ name: 'website', label: 'Website', type: 'url', required: false }
```

---

## Field: date

Smart date text input with a calendar picker popup. Accepts many typed formats automatically - `08/15/26`, `15 Aug 2026`, `2026-08-15`, `Aug 15`, and others.

| Property | Type | Default | Required | Description |
|---|---|---|---|---|
| `default_value` | string | - |  | `'today'` or an ISO date string `'yyyy-MM-dd'` |
| `use_date_input` | boolean | `false` |  | Use the native browser `<input type="date">` instead of the smart text picker |
| `disable_past_dates` | boolean | `false` |  | Gray out and block past dates in the calendar popup |

Date format controlled via `overrides` on the parent call:

| Override | Default | Description |
|---|---|---|
| `date_format_display` | user's Zoho format | Format shown in the input |
| `date_format_return` | `'yyyy-MM-dd'` | Format used in `response.data` |

**Returns:** ISO date string `yyyy-MM-dd` by default

```javascript
{ name: 'close_date', label: 'Close Date', type: 'date', required: true, default_value: 'today' }
{ name: 'start_date', label: 'Start Date', type: 'date', disable_past_dates: true }
```

---

## Field: time

Smart time text input with a scrollable time-list popup (30-minute steps, labeled in the user's time format). Also accepts many typed formats - `130pm`, `1:30 PM`, `1330`, `9`, `0900`, and others.

| Property | Type | Default | Required | Description |
|---|---|---|---|---|
| `default_value` | string | - |  | `'now'` or a 24hr time string `'HH:MM'` |

Time format controlled via `overrides` on the parent call:

| Override | Default | Description |
|---|---|---|
| `time_format_display` | user's Zoho format | Format shown in the input |
| `time_format_return` | `'HH:mm'` | Format used in `response.data` (24hr) |

**Returns:** 24hr time string `HH:mm` by default (e.g. `'14:30'`)

```javascript
{ name: 'start_time', label: 'Start Time', type: 'time', default_value: '09:00', width: '50%' }
```

---

## Field: datetime-local

A single combined date + time input. The popup opens with **Date** and **Time** summary cards - tap one to drill into the calendar or a scrollable time list, then **Apply**. Typed entry is also accepted (e.g. `3/5/26 1:30 pm`). In `mosaic.input()`, also available as `mosaic.input.datetime()`.

| Property | Type | Default | Required | Description |
|---|---|---|---|---|
| `default_value` | string | - |  | `'now'` or an ISO datetime string `'yyyy-MM-ddTHH:mm'` |
| `use_date_input` | boolean | `false` |  | Use the native browser `<input type="datetime-local">` instead of the combined smart picker |

**Returns:** ISO datetime string `'yyyy-MM-ddTHH:mm'` (e.g. `'2026-03-15T14:30'`)

```javascript
{ name: 'appointment', label: 'Appointment', type: 'datetime-local', default_value: 'now' }
```

---

## Field: picklist

A custom styled dropdown with optional search filtering.

| Property | Type | Default | Required | Description |
|---|---|---|---|---|
| `options` | array | - | ✅ | See [Option Objects](#option-objects) above |
| `default_value` | string | - |  | Pre-selected option value (`value` / `actual_value`) |
| `searchable` | boolean | `false` |  | Add a filter input inside the dropdown |
| `visible_options` | number | `6` |  | Max visible options before scrolling |

**Returns:** `{ actual_value, display_value }`

```javascript
{
    name: 'stage',
    label: 'Deal Stage',
    type: 'picklist',
    required: true,
    options: ['Prospecting', 'Qualified', 'Proposal Sent', 'Negotiation', 'Closed Won'],
    default_value: 'Prospecting'
}

// with value/label objects
{
    name: 'priority',
    label: 'Priority',
    type: 'picklist',
    options: [
        { actual_value: '1', display_value: 'High' },
        { actual_value: '2', display_value: 'Medium' },
        { actual_value: '3', display_value: 'Low' }
    ],
    searchable: true
}
```

---

## Field: multiselect

A multi-choice dropdown with chip display for selected values.

| Property | Type | Default | Required | Description |
|---|---|---|---|---|
| `options` | array | - | ✅ | See [Option Objects](#option-objects) above |
| `default_value` | array | `[]` |  | Array of pre-selected values (`value` / `actual_value`) |
| `min` | number | - |  | Minimum required selections |
| `max` | number | - |  | Maximum allowed selections |
| `visible_options` | number | `6` |  | Max visible options before scrolling |

**Returns:** `[{ actual_value, display_value }, ...]`

```javascript
{
    name: 'tags',
    label: 'Tags',
    type: 'multiselect',
    options: ['Hot Lead', 'Decision Maker', 'Budget Confirmed', 'Referral', 'Enterprise'],
    min: 1,
    max: 3
}
```

---

## Field: checkbox

A single checkbox or a multi-checkbox group depending on whether `options` is provided.

**Single checkbox:**

| Property | Type | Default | Required | Description |
|---|---|---|---|---|
| `default_value` | boolean | `false` |  | Pre-checked state |
| `value` | string | `'true'` |  | The string value submitted when checked |

**Returns:** `true` or `false`

**Checkbox group (when `options` is provided):**

| Property | Type | Default | Required | Description |
|---|---|---|---|---|
| `options` | array | - | ✅ | See [Option Objects](#option-objects) above |
| `default_value` | array | `[]` |  | Array of pre-checked values |
| `min` | number | - |  | Minimum required selections |
| `max` | number | - |  | Maximum allowed selections |

**Returns:** `[{ actual_value, display_value }, ...]`

```javascript
// single checkbox
{ name: 'is_urgent', label: 'Mark as urgent', type: 'checkbox', default_value: false }

// checkbox group
{
    name: 'notify',
    label: 'Notify',
    type: 'checkbox',
    options: ['Account Manager', 'Sales Director', 'Finance Team'],
    min: 1
}
```

---

## Field: radio

A single-selection radio button group.

| Property | Type | Default | Required | Description |
|---|---|---|---|---|
| `options` | array | - | ✅ | See [Option Objects](#option-objects) above |
| `default_value` | string | - |  | Pre-selected value (`value` / `actual_value`) |

**Returns:** `{ actual_value, display_value }`

```javascript
{
    name: 'decision',
    label: 'Approval Decision',
    type: 'radio',
    required: true,
    options: ['Approve', 'Reject', 'Escalate'],
    default_value: 'Approve'
}
```

---

## Field: file

File upload field. The file is automatically uploaded to the configured destination when the form is submitted.

| Property | Type | Default | Required | Description |
|---|---|---|---|---|
| `accept` | string | - |  | Accepted file types or extensions, e.g. `'.pdf,.docx'` or `'image/*'` |
| `multiple` | boolean | `false` |  | Allow selecting multiple files. Each file is uploaded separately and the field returns an array of results |
| `filename` | string | - |  | Rename the file before upload. The original extension is always preserved - e.g. `'Report_2025'` + `data.xlsx` → `Report_2025.xlsx`. Ignored when `multiple: true` |
| `destination` | object | - |  | Upload destination config - see below. Defaults to `{ type: 'attachment' }` if omitted |

When used in `mosaic.form()`, the parent call must include `module` and `record_id`. When used via `mosaic.input.file()`, pass `module` and `record_id` directly in `options`.

---

### Destination

#### Common

| Property | Type | Default | Required | Description |
|---|---|---|---|---|
| `destination.type` | string | `'attachment'` |  | `'attachment'` - attach to the record<br>`'field'` - save to a specific CRM field<br>`'workdrive'` - upload to a WorkDrive folder |

#### `type: 'field'`

| Property | Type | Default | Required | Description |
|---|---|---|---|---|
| `destination.field_name` | string | - | ✅ | API name of the CRM field |
| `destination.field_type` | string | `'file'` |  | `'file'` - file upload field<br>`'image'` - image upload field |

#### `type: 'workdrive'`

| Property | Type | Default | Required | Description |
|---|---|---|---|---|
| `destination.folder_id` | string | - | ✅ | WorkDrive folder ID |
| `destination.connection` | string | - | ✅ | Connection name with WorkDrive scopes (`WorkDrive.files.CREATE`, `WorkDrive.files.ALL`) |
| `destination.override_existing` | boolean | `true` |  | Replace any existing file with the same name |

**Returns:** upload result object (or array when `multiple: true`) - see [File Upload Results](../reference/response.md#file-upload-results) for the full return shape per destination type.

For usage examples see [File Upload](../examples/file-upload/file-upload.md).

---

## Field: description

A static read-only content block rendered inside the form. Does not appear in `response.data`. Available in `mosaic.form()` only.

| Property | Type | Default | Required | Description |
|---|---|---|---|---|
| `value` / `text` / `label` | string | - | ✅ | Content to display. Supports Markdown when `enable_markdown: true` |

```javascript
{
    name: 'notice',
    type: 'description',
    value: '**Note:** This action will trigger an email to the client. Please review before submitting.'
}
```

---

## Field: button

An inline action button rendered in the form body, not the footer button bar. Does not appear in `response.data`. Available in `mosaic.form()` only.

| Property | Type | Default | Required | Description |
|---|---|---|---|---|
| `label` | string | - |  | Button text |
| `style` | string | `'primary'` |  | Button style - see [Buttons](../reference/buttons.md) |
| `action` | string | - |  | JavaScript expression executed on click. If omitted, clicking the button submits the form |

> [!NOTE]
> The `action` expression runs inside the widget iframe. The widget exposes the same `mosaic.splash()` / `mosaic.loader()` / `mosaic.alert()` shorthands as the helper, so `mosaic.splash.success('Done!')` works here too.

```javascript
{
    name: 'lookup_btn',
    type: 'button',
    label: 'Look Up Address',
    style: 'secondary',
    action: 'lookupAddress()'
}

// with clipboard copy and toast feedback
{
    name: 'copy_btn',
    type: 'button',
    label: 'Copy',
    style: 'secondary',
    action: "navigator.clipboard.writeText(document.querySelector('.field-description').innerText)" +
            ".then(() => mosaic.splash.success('Copied to clipboard!'))"
}
```

---

## Field: divider

A horizontal line that visually separates sections of a form. Does not appear in `response.data`. Available in `mosaic.form()` only.

| Property | Type | Default | Required | Description |
|---|---|---|---|---|
| `label` | string | - |  | Optional text displayed alongside the line |
| `name` | string | - |  | Only needed if targeting this divider with `conditions` |

Supports `conditions` and `break_before`.

```javascript
// simple divider
{ type: 'divider' }

// divider with label
{ type: 'divider', label: 'Additional Information' }

// conditional divider - only visible when a section is shown
{ type: 'divider', name: 'address_divider',
    conditions: [{ field: 'has_address', operator: 'equals', value: 'Yes' }]
}
```

---

## Field: group

A container that wraps related fields together. Supports `conditions` at the group level to show or hide an entire set of fields with a single condition. Does not appear in `response.data` - child fields are returned individually by their own `name`. Available in `mosaic.form()` only.

| Property | Type | Default | Required | Description |
|---|---|---|---|---|
| `name` | string | - | ✅ | Group identifier - used for condition targeting |
| `label` | string | - |  | Section header displayed above the group's fields |
| `style` | string | - |  | `'outlined'` adds a subtle border around the group |
| `fields` | array | - | ✅ | Array of child field configs - same format as top-level fields |
| `width` | string | `'100%'` |  | Group width in the parent layout |

Supports `conditions` and `break_before`. When a group is hidden by conditions, all child fields inside it are excluded from validation and response data.

> [!NOTE]
> Groups cannot be nested - child fields inside a group can be any field type except `group`.

```javascript
// outlined group with conditional visibility
{
    name: 'address_section',
    type: 'group',
    label: 'Home Address',
    style: 'outlined',
    conditions: [{ field: 'has_address', operator: 'equals', value: 'Yes' }],
    fields: [
        { name: 'street', label: 'Street',  type: 'text' },
        { name: 'city',   label: 'City',    type: 'text', width: '50%' },
        { name: 'state',  label: 'State',   type: 'text', width: '25%' },
        { name: 'zip',    label: 'Zip',     type: 'text', width: '25%' }
    ]
}

// unstyled group (no border) - purely for conditional visibility
{
    name: 'follow_up_section',
    type: 'group',
    conditions: [{ field: 'needs_follow_up', operator: 'equals', value: 'Yes' }],
    fields: [
        { name: 'follow_up_date', label: 'Follow-Up Date', type: 'date', required: true },
        { name: 'follow_up_note', label: 'Note',           type: 'textarea' }
    ]
}
```

For a full working example combining groups, dividers, and conditions see [Conditional Fields](../methods/form.md#conditional-fields) in the `mosaic.form()` docs.
