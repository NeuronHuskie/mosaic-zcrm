# Shared Popup / Flyout Options

All primary methods (`form`, `input`, `table`, `launcher`, `html`, `pdf`, `confirmation`, `message`) accept these common options in addition to their own method-specific parameters. For default values — including per-method dimensions and `close_on_escape` — see [Defaults](defaults.md).

---

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `header` | string |  | Text shown in the Zoho popup/flyout title bar - see note below |
| `title` | string | `''` | Title rendered inside the widget content area |
| `height` | string | varies | Popup/flyout height |
| `width` | string | varies | Popup/flyout width |
| `top` | string | `'20px'` | Distance from top of viewport |
| `left` | string | `'center'` | Horizontal position, or `'center'` |
| `bottom` | string |  | Overrides `top` when set |
| `right` | string |  | Overrides `left` when set |
| `close_icon` | boolean | `true` | Show the X close icon |
| `close_on_escape` | boolean | varies | Close on Escape key press |
| `animation_type` | number | `4` | Open animation style (1-6) |
| `flyout` | boolean | `false` | Open as a Zoho CRM flyout instead of a popup |
| `close_on_exit` | boolean |  | Flyout-only Zoho close behavior |
| `overrides` | object | `{}` | Per-call format and theme overrides - see [Overrides](overrides.md) |

---

> [!TIP]
> #### `header` vs `title`
>
> These are two distinct things that are easy to confuse:
>
> - **`header`** - rendered by Zoho CRM at the very top of the popup/flyout window
> - **`title`** - rendered by the Mosaic widget inside the popup/flyout body
>
> Most use cases only need `title`. Set `header` if you want text in the Zoho title bar, or leave it empty.

---

## Flyout Mode

Set `flyout: true` to open Mosaic as a Zoho CRM side flyout instead of a popup:

```javascript
const result = mosaic.form({
    flyout: true,
    title: 'Quick Edit',
    fields: [...]
});
```

The return shape is the same as popup mode. Closing the flyout with Escape or the X icon resolves to `null`, matching popup dismissal behavior.

Flyouts use the same `height` and `width` options, but Zoho enforces maximum flyout dimensions. Mosaic clamps oversized `px`, `vw`, and `vh` values before sending them to Zoho so the final size is predictable.

> [!NOTE]
> In flyout mode, Zoho's shell-level X button is disabled and Mosaic renders its own X button when `close_icon: true`. This keeps flyout dismissal on the normal Mosaic response path.

---

## Keyboard Shortcuts

These shortcuts are active in all widget modes:

| Key | Behavior |
|---|---|
| `Enter` | Triggers the primary button when `submit_on_enter` is enabled |
| `Escape` | Closes an open alert overlay; closes the widget if `close_on_escape` is enabled |
| `Alt + D` | Toggles light/dark mode |
| Arrow keys | Navigates between footer buttons when one is focused |
