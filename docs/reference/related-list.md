# Related List Mode

Unlike every other mode, related-list mode does **not** use the client script helper. Zoho CRM loads the widget directly as a [custom related list](https://www.zoho.com/crm/help/customization/related-lists-dre.html), and the widget detects this from the PageLoad payload (`related_list` + `Entity` + `EntityId`).

## The template

`app/js/mosaic-relatedlist.js` ships as an intentional template:

- **Live:** `lifecycle.init()` and `lifecycle.postInit()` (body class, readiness wait, viewport fit)
- **Worked example (commented out):** the `config` / `builder` / `data` / `columns` block - uncomment and adapt it to your own related list. Because there is no client script call in this mode, configuration (columns, table options, overrides) lives in the widget itself.

## Adapting it

1. Uncomment the example block (`config` / `builder` / `data` / `columns`).
2. In `lifecycle.init()`, enable the two example lines:
    - `mosaic.relatedlist.config.applyDefaults()`
    - `await mosaic.relatedlist.builder.build()`
3. Replace `columns.deals()` and the `relatedList` name in `builder.tableConfig()` with your module's related list and fields.
4. Adjust `config.defaults()` (per-page count, search, selection, overrides) as needed.
