# mosaic.DEFAULTS

`mosaic.DEFAULTS` holds the default values used by every method. Mutate it at the top of your client script to change behavior for the session without modifying the source file. Changes do not persist across page loads. Per-call options always take precedence over defaults.

```javascript
mosaic.DEFAULTS.connections.workdrive = 'workdrive_connection';
mosaic.DEFAULTS.connections.writer    = 'writer_connection';
mosaic.DEFAULTS.debug = true;
mosaic.DEFAULTS.form.width = '700px';
mosaic.DEFAULTS.table.per_page = 25;
```

---

## Global

| Key | Default | Description |
|---|---|---|
| `connections.workdrive` | `undefined` | WorkDrive connection used by `pdf`, `pdffiller`, `pdfmerge`, and `file` fields with WorkDrive destination |
| `connections.writer` | `undefined` | Zoho Writer connection used by `html`, `html2pdf`, and `pdf` with HTML sources |
| `debug` | `false` | Log debug output to the console |
| `flyout_max_width_vw` | `45` | Ceiling used when clamping flyout `width` values (Zoho silently clips oversized flyouts) |
| `flyout_max_height_vh` | `72` | Ceiling used when clamping flyout `height` values |

---

## Popup / Flyout Positioning

Applied to all popup and flyout calls unless overridden per-call.

| Key | Default | Description |
|---|---|---|
| `popup.top` | `'20px'` | Distance from top of viewport |
| `popup.left` | `'center'` | Horizontal position |
| `popup.animation_type` | `4` | Open animation style (1–6) |
| `flyout.header` | `'☰'` | Zoho title bar text in flyout mode |
| `flyout.top` | `'20px'` | Distance from top of viewport |
| `flyout.left` | `'center'` | Horizontal position |
| `flyout.animation_type` | `1` | Open animation style (1–6) |

---

## Methods

### `confirmation`

| Key | Default |
|---|---|
| `height` | `'350px'` |
| `width` | `'420px'` |
| `buttons` | `['Cancel', 'OK']` |
| `close_icon` | `true` |
| `close_on_escape` | `false` |
| `enable_markdown` | `true` |
| `submit_on_enter` | `false` |

### `message`

| Key | Default |
|---|---|
| `height` | `'350px'` |
| `width` | `'420px'` |
| `buttons` | `['OK']` |
| `close_icon` | `true` |
| `close_on_escape` | `true` |
| `message_type` | `'info'` |
| `show_icon` | `true` |
| `show_buttons` | `true` |
| `enable_markdown` | `true` |
| `submit_on_enter` | `true` |

### `form`

| Key | Default |
|---|---|
| `height` | `'70vh'` |
| `width` | `'600px'` |
| `buttons` | `['Cancel', 'Submit']` |
| `close_icon` | `true` |
| `close_on_escape` | `false` |
| `enable_markdown` | `true` |
| `submit_on_enter` | `true` |
| `force_focus` | `true` |

### `table`

| Key | Default |
|---|---|
| `height` | `'70vh'` |
| `width` | `'800px'` |
| `buttons` | `['Cancel', 'Submit']` |
| `close_icon` | `true` |
| `close_on_escape` | `false` |
| `selectable` | `true` |
| `allow_multiple` | `true` |
| `show_buttons` | `true` |
| `per_page` | `10` |
| `show_search` | `false` |
| `allow_export` | `false` |
| `required` | `false` |
| `selection_limit` | `0` |
| `force_focus` | `true` |
| `sort_order` | `'desc'` |

### `launcher`

| Key | Default |
|---|---|
| `height` | `'500px'` |
| `width` | `'500px'` |
| `buttons` | `[]` |
| `close_icon` | `true` |
| `close_on_escape` | `true` |
| `show_search` | `true` |
| `match_mode` | `'fuzzy'` |
| `placeholder` | `'Type to search...'` |
| `show_description` | `true` |
| `show_icons` | `true` |
| `show_buttons` | `false` |
| `force_focus` | `true` |

### `html`

| Key | Default |
|---|---|
| `height` | `'80vh'` |
| `width` | `'50vw'` |
| `buttons` | `['Close', 'Print']` |
| `close_icon` | `true` |
| `close_on_escape` | `true` |
| `mode` | `'preview'` |

### `pdf`

| Key | Default |
|---|---|
| `height` | `'80vh'` |
| `width` | `'50vw'` |
| `buttons` | `['Close', 'Download']` |
| `close_icon` | `true` |
| `close_on_escape` | `true` |
| `mode` | `'preview'` |

> [!NOTE]
> `mosaic.pdffiller()` and `mosaic.pdfmerge()` are convenience wrappers around `mosaic.pdf()` and share its defaults.

### `input`

| Key | Default |
|---|---|
| `height` | `'350px'` |
| `width` | `'400px'` |
| `buttons` | `['Cancel', 'OK']` |
| `close_icon` | `true` |
| `close_on_escape` | `false` |
| `required` | `true` |
| `submit_on_enter` | `true` |
| `force_focus` | `true` |
| `enable_markdown` | `true` |

---

## Org Context

At initialization, Mosaic pre-populates the following values from the CRM session. These are set automatically and do not need to be configured. Use the `overrides` option on individual method calls if you need to override any of them for a specific call - see [Overrides](overrides.md).

| Key | Source | Description |
|---|---|---|
| `date_format_display` | `$Crm.user.date_format` | User's CRM date format - applied to date field display automatically |
| `org_domain_name` | `$Crm.org.domain_name` | Org domain - used for CRM record links and export filenames |
| `deployment` | `$Crm.deployment` | Data center deployment - used for API domain resolution |
