<img src="docs/assets/icons/mosaic.png" width="300" alt="mosaic" style="border: 0px solid #666;">

Mosaic is a modular widget framework for Zoho CRM.

---

> [!IMPORTANT]
> This repository contains two parts:
> - The `mosaic` widget (deployed once to your CRM org)
> - A client script helper loaded as a [Static Resource](https://www.zoho.com/crm/developer/docs/client-script/static-resources.html) (`mosaic.js`)
> 
> The widget handles all UI rendering internally - you never interact with it directly. The helper provides the `mosaic` object and every method you call from your
> client scripts.
>
> **All documentation, code examples, and references here cover the client script helper.**

---

> [!WARNING]
> The widget in `/app/` is **not a standalone web page** - it only runs inside Zoho CRM's widget iframe, which injects several globals at runtime. If you open `widget.html` directly in a browser you will see `ReferenceError`s for these:
>
> | Global | Provided by | Used for |
> |---|---|---|
> | `ZOHO` | `ZohoEmbededAppSDK.min.js` (the one script tag in `widget.html`) | Page-load payload, CRM API calls, resize |
> | `ZDK` | Zoho's Client Script bridge (injected when the widget is opened via `ZDK.Client.openPopup` / flyout) | `sendResponse`, host splash/loader messages |
> | `$Client` | Same Client Script bridge | Closing the widget and returning data |
> | `zrc` | Zoho's request client, available in the widget iframe | REST calls to CRM v8 and connection-based APIs (WorkDrive, Writer, ...) |
> 
> The regression tests stub all four (see `loadMosaic()` in `tests/mosaic-regression-tests.js`), which is the easiest reference for what the widget expects from each.
  
---

## Documentation

- [Getting Started](docs/getting-started.md)
  - [Connections](docs/getting-started.md#connections)
  - [Customizing Defaults](docs/getting-started.md#customizing-defaults)
  
- Methods
  - [mosaic.form()](docs/methods/form.md) - Multi-field form popup
  - [mosaic.input()](docs/methods/input.md) - Single-field input popup
  - [mosaic.table()](docs/methods/table.md) - Table selection popup with search and export
  - [mosaic.html()](docs/methods/html.md) - HTML preview with print and PDF download
  - [mosaic.html2pdf()](docs/methods/html.md#mosaichtml2pdf) - Convert HTML to PDF via Writer API
  - [mosaic.pdf()](docs/methods/pdf.md) - PDF viewer with preview, download, merge, and fill support
  - [mosaic.pdffiller()](docs/methods/pdffiller.md) - Fill a PDF form and download
  - [mosaic.pdfmerge()](docs/methods/pdfmerge.md) - Merge multiple PDF sources and download
  - [mosaic.launcher()](docs/methods/launcher.md) - Searchable command palette / quick-action picker
  - [mosaic.confirmation()](docs/methods/confirmation.md) - Yes/no dialog with configurable buttons
  - [mosaic.message()](docs/methods/message.md) - Informational popup with icon and styled message
  - [mosaic.splash()](docs/methods/splash.md) - Non-blocking toast notification
  - [mosaic.loader](docs/methods/loader.md) - Page-level loading indicator

- Reference
  - [Shared Popup / Flyout Options](docs/reference/popup-flyout-options.md)
  - [Field Types](docs/reference/fields.md) (`mosaic.form()` / `mosaic.input()`)
  - [Buttons](docs/reference/buttons.md)
  - [Overrides](docs/reference/overrides.md)
  - [Defaults](docs/reference/defaults.md)
  - [Response](docs/reference/response.md)
  - [Utils](docs/reference/utils.md)
  - [Related List Mode](docs/reference/related-list.md) (widget-side, no helper involved)

---
  
## Examples

- [Blueprint Transition](docs/examples/bp-transition/bp-transition.md) - Blueprint transition + required file upload (*using [mosaic.form()](docs/methods/form.md)*)
- [Call Transcription Viewer](docs/examples/call-transcription/call-transcription.md) - View markdown call transcription + custom inline button (*using [mosaic.form()](docs/methods/form.md)*)
- [File Upload](docs/examples/file-upload/file-upload.md) - File upload examples (*using [mosaic.form()](docs/methods/form.md) and [mosaic.input()](docs/methods/input.md)*)
- [New Deal Intake Wizard](docs/examples/multi-page-deal-intake/multi-page-deal-intake.md) - Multi-page form with conditional fields/groups (*using [mosaic.form()](docs/methods/form.md)*)
- [COQL Table with Format Rules](docs/examples/table-coql-with-format-rules/table-coql-with-format-rules.md) - Table loaded with data fetched from COQL query + conditional formatting rules (*using [mosaic.table()](docs/methods/table.md)*)
- [Quote Preview and Signed Upload](docs/examples/quote-preview-send/quote-preview-send.md) - Create/view/download invoice HTML then upload to CRM record and Workdrive (*using [mosaic.form()](docs/methods/form.md) and [mosaic.html()](docs/methods/html.md)*)
- [PDF Filler Character Sheet](docs/examples/pdffiller-application/pdffiller-application.md) - Fill PDF-LIB's sample character sheet PDF (*using [mosaic.form()](docs/methods/form.md) and [mosaic.pdffiller()](docs/methods/pdffiller.md)*)
- [Task Triage Launcher](docs/examples/task-triage-launcher/task-triage-launcher.md) - Display a launcher with multiple output options (*using [mosaic.launcher()](docs/methods/launcher.md) and [mosaic.form()](docs/methods/form.md)*)

---

> **Version**
>
> - Widget: **1.0.1**
> - Client Script: **1.0.0**
> 
> View [Changelog](CHANGELOG.md)
