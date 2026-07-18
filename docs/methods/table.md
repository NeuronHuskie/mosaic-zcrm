# mosaic.table()

Displays a table popup with optional row selection, search/filter, pagination, and export. Data can come from a static array, a COQL query executed on load, or a live API search that the user drives from a search input. Returns the selected row(s).

```javascript
mosaic.table(options)
```

---

## Parameters

| Parameter | Type | Default | Required | Description |
|---|---|---|---|---|
| `options.title` | string | `''` | | Table title |
| `options.columns` | array | `[]` | | Column definitions - see [Columns](#columns) |
| `options.source` | object | | ✅ | Data source config - see [Source](#source) |
| `options.selectable` | boolean | `true` | | Show selection checkboxes or radio buttons |
| `options.show_search` | boolean | `false` | | Show a local filter input above the table. Applies to `static` and `coql` source types only - `search` always shows a search input |
| `options.search_placeholder` | string | | | Placeholder text for the search/filter input |
| `options.allow_export` | boolean | `false` | | Show an export button (CSV, XLSX, PDF, JSON) |
| `options.per_page` | number | `10` | | Number of rows per page |
| `options.overflow_mode` | string | `'wrap'` | | Initial text-overflow mode: `'wrap'` (default) wraps long cell text; `'clip'` truncates with ellipsis and shows the full value on hover. The clip/wrap toggle button is always shown so users can switch modes |
| `options.sort_field` | string | | | Column key to sort by on load. Column headers are also clickable to sort the loaded data client-side |
| `options.sort_order` | string | `'desc'` | | Initial sort direction: `'asc'` or `'desc'` |
| `options.buttons` | array | `['Cancel', 'Submit']` | | Button labels or `{ label, style, value }` objects - see [Buttons](../reference/buttons.md) |
| `options.show_buttons` | boolean | `true` | | Show the footer button row |
| `options.force_focus` | boolean | `true` | | Auto-focus the search input on load when present |
| `options.module` | string | | | CRM module API name (for record context) |
| `options.record_id` | string | | | CRM record ID (for record context) |

The following options apply only when `selectable` is `true`:

| Parameter | Type | Default | Description |
|---|---|---|---|
| `options.allow_multiple` | boolean | `true` | `true` = checkboxes (multi-select), `false` = radio (single select) |
| `options.required` | boolean | `false` | Prevent submit if no row is selected |
| `options.selection_limit` | number | `0` | Maximum selectable rows. `0` = unlimited |

See [Shared Popup / Flyout Options](../reference/popup-flyout-options.md) for positioning and animation options.

---

## Returns

`MosaicResponse` | `null`

`response.data` is an array of selected row objects when `allow_multiple` is `true`, or a single row object when `false`. See [Response & Utils](../reference/response.md) for full details.

```javascript
var result = mosaic.table({ ... });

if (mosaic.utils.isSuccess(result)) {
    var rows = mosaic.utils.getData(result); // array or object depending on allow_multiple
}
```

---

## `columns`

Each column is defined as an object:

| Property | Type | Required | Default | Description |
|---|---|---|---|---|
| `header` | string | ✅ | | Column header text. Pass `''` for a blank header (e.g. icon columns) |
| `key` | string | ✅ | | Data field key (supports dot notation - e.g. `'Account_Name.name'`) |
| `link` | object | | | Makes the cell a clickable link - see Link config below |
| `format` | object | | | Formats the displayed cell value - see Format config below |
| `rules` | array | | | Applies conditional inline cell styles - see Rules below |
| `sortable` | boolean | | `true` | Set to `false` to remove the sort button from this column's header |
| `raw_html` | boolean | | `false` | Render the cell value as raw HTML instead of escaped text. Only use with values you construct in code — never with user-supplied CRM field values |

### `link`

Three link modes are supported. Use whichever fits your data:

<details>
<summary>CRM record link</summary>

Resolves a Zoho CRM record URL from a field in the row

| Property | Type | Required | Description |
|---|---|---|---|
| `link.module` | string | ✅ | CRM module name to link to |
| `link.id_key` | string | ✅ | Dot-notation path to the record ID field in the row data |

</details>

<details>
<summary>Dynamic URL</summary>

URL and display text are resolved from fields in the row

| Property | Type | Required | Description |
|---|---|---|---|
| `link.url_key` | string | ✅ | Dot-notation path to the URL field in the row data |
| `link.text_key` | string | | Dot-notation path to the display text field. Falls back to the cell's display value if omitted |

</details>

<details>
<summary>Static URL</summary>

Same URL and text for every row

| Property | Type | Required | Description |
|---|---|---|---|
| `link.url` | string | ✅ | URL to link to |
| `link.text` | string | | Display text. Falls back to the cell's display value if omitted |

</details>

```javascript
columns: [
    // crm record link
    { header: 'Name',     key: 'Full_Name',   link: { module: 'Contacts', id_key: 'id' } },
    // dynamic url from row data
    { header: 'LinkedIn', key: 'LinkedIn_URL', link: { url_key: 'LinkedIn_URL', text_key: 'LinkedIn_Label' } },
    // dynamic url, cell value used as display text
    { header: 'Website',  key: 'Website',      link: { url_key: 'Website' } },
    // static url, same for every row
    { header: 'Docs',     key: 'Doc_Version',  link: { url: 'https://docs.example.com', text: 'View Docs' } }
]
```

### `format`

Formatting changes the displayed cell text only. Selected rows and exported data still use the original row values. Date columns automatically use the user's CRM date format.

| Property | Type | Default | Required | Description |
|---|---|---|---|---|
| `format.type` | string | | ✅ | `'currency'`, `'number'`, or `'date'` |
| `format.currency` | string | | When `type` is `'currency'` | Currency code for `currency` formatting. If omitted, the raw value is shown and a warning is logged |
| `format.locale` | string | Browser locale | | Locale passed to `Intl.NumberFormat` |
| `format.decimals` | number | | | Decimal places for number/currency formatting |
| `format.input_date_format` | string | | | Date input format hint for parsing non-ISO dates |

```javascript
columns: [
    { key: 'Amount', header: 'Premium', format: { type: 'currency', currency: 'USD', decimals: 2 } },
    { key: 'Effective_Date', header: 'Effective Date', format: { type: 'date' } }
]
```

### `rules`

Rules are evaluated against the raw row value, not the formatted display text. If multiple rules match, later rules can override earlier style properties.

| Property | Type | Default | Required | Description |
|---|---|---|---|---|
| `operator` | string | | ✅ | `not_empty`, `empty`, `equals`, `not_equals`, `contains`, `greater_than`, `less_than`, `before`, `after`, `between`, `in`, or `not_in` |
| `value` | any | | | Comparison value. Use a two-item array for `between`, and an array for `in` / `not_in` |
| `target` | string | `'cell'` | | Style target: `'cell'` applies to the current cell, `'row'` applies to the entire row |
| `style` | object | | | Inline styles to apply when the rule matches |

`greater_than` and `less_than` are numeric comparisons. `before` and `after` are date comparisons. `between` supports numbers and dates.

Supported style keys are `color`, `background-color`, `font-weight`, `font-style`, `text-align`, `border-left`, and `opacity`. Style values containing extra CSS declarations or URL/expression syntax are ignored.

```javascript
columns: [
    {
        key: 'Amount',
        header: 'Premium',
        format: { type: 'currency', currency: 'USD', decimals: 2 },
        rules: [
            { operator: 'greater_than', value: 500, style: { color: '#097969' } },
            { operator: 'less_than', value: 0, style: { color: '#c1121f' } }
        ]
    },
    {
        key: 'Effective_Date',
        header: 'Effective Date',
        format: { type: 'date', input_date_format: 'yyyy-MM-dd' },
        rules: [
            { operator: 'before', value: '2026-01-01', target: 'row', style: { 'background-color': '#fff3f3' } }
        ]
    }
]
```

---

## `source`

`source` is a required object that defines how the table is populated. Set `source.type` to one of `'static'`, `'coql'`, or `'search'`.

### `static`

Pass a pre-built array of objects directly. Good for small datasets or data you've already fetched.

| Property | Type | Required | Description |
|---|---|---|---|
| `source.type` | string | ✅ | `'static'` |
| `source.data` | array | ✅ | Array of row objects |

```javascript
var result = mosaic.table({
    title: 'Select a Product',
    columns: [
        { header: 'Product',  key: 'name' },
        { header: 'Category', key: 'category' },
        { header: 'Price',    key: 'unit_price' }
    ],
    source: {
        type: 'static',
        data: [
            { id: 1, name: 'Widget A', category: 'Hardware', unit_price: '$49.99' },
            { id: 2, name: 'Widget B', category: 'Software', unit_price: '$99.00' }
        ]
    },
    show_search: true,
    allow_multiple: false
});

if (mosaic.utils.isSuccess(result)) {
    var product = mosaic.utils.getData(result);
}
```

---

### `coql`

Pass a COQL query string. The widget executes the query when the popup opens and displays the results.

| Property | Type | Required | Description |
|---|---|---|---|
| `source.type` | string | ✅ | `'coql'` |
| `source.query` | string | ✅ | COQL query string |

```javascript
var result = mosaic.table({
    title: 'Open Deals',
    columns: [
        { header: 'Deal Name',  key: 'Deal_Name', link: { module: 'Deals', id_key: 'id' } },
        { header: 'Account',    key: 'Account_Name.name' },
        { header: 'Stage',      key: 'Stage' },
        { header: 'Amount',     key: 'Amount' },
        { header: 'Close Date', key: 'Closing_Date' }
    ],
    source: {
        type:  'coql',
        query: "select Deal_Name, Account_Name, Stage, Amount, Closing_Date from Deals where Stage not in ('Closed Won', 'Closed Lost') order by Amount desc limit 200"
    },
    show_search:  true,
    allow_export: true,
    sort_field:   'Amount',
    sort_order:   'desc',
    per_page:     25
});

if (mosaic.utils.isSuccess(result)) {
    var selected = mosaic.utils.getData(result);
}
```

---

### `search`

The table starts empty and performs a live API search each time the user submits a query. Best for large datasets where you want the user to narrow results before they are shown. The search input is always visible with this source type.

| Property | Type | Required | Description |
|---|---|---|---|
| `source.type` | string | ✅ | `'search'` |
| `source.module` | string | ✅ | CRM module to search |
| `source.search_type` | string | | Search type: `'word'`, `'criteria'`, `'email'`, or `'phone'`. Defaults to `'word'` |
| `source.fields` | array | | Field API names to match against. Only used when `search_type` is `'criteria'` |

```javascript
var result = mosaic.table({
    title: 'Find a Contact',
    columns: [
        { header: 'Name',    key: 'Full_Name', link: { module: 'Contacts', id_key: 'id' } },
        { header: 'Email',   key: 'Email' },
        { header: 'Account', key: 'Account_Name.name' },
        { header: 'Phone',   key: 'Phone' }
    ],
    source: {
        type:        'search',
        module:      'Contacts',
        search_type: 'criteria',
        fields:      ['Full_Name', 'Email']
    },
    search_placeholder: 'Search by name or email...',
    allow_multiple: false,
    required:       true
});

if (mosaic.utils.isSuccess(result)) {
    var contact = mosaic.utils.getData(result);
}
```

---

## Examples

### Multi-select with a limit

```javascript
var result = mosaic.table({
    title: 'Add Team Members',
    columns: [
        { header: 'Name',       key: 'full_name' },
        { header: 'Department', key: 'department' },
        { header: 'Email',      key: 'email' }
    ],
    source: {
        type: 'static',
        data: availableUsers
    },
    allow_multiple:   true,
    selection_limit:  5,
    required:         true,
    show_search:      true,
    search_placeholder: 'Filter by name...',
    buttons: ['Cancel', 'Add Selected']
});

if (mosaic.utils.isSuccess(result)) {
    var members = mosaic.utils.getData(result);
    members.forEach(function(m) {
        addTeamMember(m.full_name, m.email);
    });
}
```

---

### Read-only COQL table with export

```javascript
mosaic.table({
    title: 'Activity Summary',
    columns: [
        { header: 'Subject',  key: 'Subject' },
        { header: 'Type',     key: 'Type' },
        { header: 'Status',   key: 'Status' },
        { header: 'Due Date', key: 'Due_Date' },
        { header: 'Owner',    key: 'Owner.name' }
    ],
    source: {
        type:  'coql',
        query: "select Subject, Type, Status, Due_Date, Owner from Tasks where Status = 'Open' limit 500"
    },
    selectable:   false,
    show_search:  true,
    allow_export: true,
    per_page:     20,
    sort_field:   'Due_Date',
    sort_order:   'asc',
    buttons: ['Close']
});
```

---

### Phone number search

```javascript
var result = mosaic.table({
    title: 'Find Contact by Phone',
    columns: [
        { header: 'Name',   key: 'Full_Name' },
        { header: 'Phone',  key: 'Phone' },
        { header: 'Mobile', key: 'Mobile' }
    ],
    source: {
        type:        'search',
        module:      'Contacts',
        search_type: 'phone'
    },
    search_placeholder: 'Enter a phone number...',
    allow_multiple: false
});
```

---

### Email search across Leads

```javascript
var result = mosaic.table({
    title: 'Find Lead by Email',
    columns: [
        { header: 'Name',    key: 'Full_Name', link: { module: 'Leads', id_key: 'id' } },
        { header: 'Email',   key: 'Email' },
        { header: 'Company', key: 'Company' },
        { header: 'Status',  key: 'Lead_Status' }
    ],
    source: {
        type:        'search',
        module:      'Leads',
        search_type: 'email'
    },
    search_placeholder: 'Enter email address...',
    allow_multiple: false
});

if (mosaic.utils.isSuccess(result)) {
    var lead = mosaic.utils.getData(result);
    ZDK.Client.navigateTo('record_detail', { module: 'Leads', record_id: lead.id });
}
```
