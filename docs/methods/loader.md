# mosaic.loader()

Shows or hides a page-level loading indicator using the native Zoho CRM `ZDK.Client.showLoader()` and `ZDK.Client.hideLoader()`. Use this to provide visual feedback during async operations, API calls, or any task where the UI should be blocked while work completes.

```javascript
mosaic.loader(message, options)     // show (shorthand)
mosaic.loader()                     // hide (no arguments)
mosaic.loader.show(message, options)
mosaic.loader.hide()
```

---

> `mosaic.loader(...)` called with arguments is equivalent to `mosaic.loader.show(...)`; called with no arguments it is equivalent to `mosaic.loader.hide()`.

## mosaic.loader.show()

| Parameter | Type | Default | Required | Description |
|---|---|---|---|---|
| `message` | string |  | | Loading message text displayed to the user (max 240 characters). Omit for a loader with no message |
| `options.template` | string | `'standard'` | | Loader style (`standard`, `spinner`, `vertical-bar`) |

**Returns:** `void`

---

## mosaic.loader.hide()

No parameters. Hides the currently active loader.

**Returns:** `void`

---

> [!WARNING]
> Always call `mosaic.loader.hide()` after your work completes - including in error paths. 
>
> If the loader is not hidden it will remain on screen indefinitely.

```javascript
mosaic.loader.show('Processing...');

try {
    doWork();
} finally {
    mosaic.loader.hide();
}
```

---

## Examples

#### Example: Basic show and hide

```javascript
mosaic.loader.show('Fetching records...');

const records = ZDK.Apps.CRM.Records.search({ ... });

mosaic.loader.hide();
```

#### Example: Wrapping a mosaic popup sequence

Use the loader between popup calls when background work happens between user interactions.

```javascript
// Step 1: collect input
const result = mosaic.form({
    title: 'Export Settings',
    fields: [
        { name: 'format', label: 'Format', type: 'picklist', options: ['CSV', 'XLSX', 'PDF'] },
        { name: 'range',  label: 'Date Range', type: 'picklist', options: ['This Month', 'This Quarter', 'All Time'] }
    ]
});

if (!mosaic.utils.isSuccess(result)) return;

const data = mosaic.utils.getData(result);

// Step 2: show loader while processing
mosaic.loader.show('Generating export...', { template: 'spinner' });

try {
    const fileUrl = getSomeData(data.format, data.range);
    mosaic.loader.hide();
    mosaic.message.success('Your export is ready. [Download](' + fileUrl + ')', {
        title: 'Export Complete'
    });
} catch (e) {
    mosaic.loader.hide();
    mosaic.message.error('Export failed. Please try again.', { title: 'Error' });
}
```

#### Example: Long-running operation with status updates

To update the message mid-operation, just call `.show()` again with the new text - no `.hide()` needed in between. Hide once when the work is done.

```javascript
mosaic.loader('Step 1 of 3: Fetching contacts...');
const contacts = fetchContacts();

mosaic.loader('Step 2 of 3: Processing records...');
const processed = processRecords(contacts);

mosaic.loader('Step 3 of 3: Saving results...');
saveResults(processed);

mosaic.loader();
mosaic.splash.success('All done. ' + processed.length + ' records updated.');
```
