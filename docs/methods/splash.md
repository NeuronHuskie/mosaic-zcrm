# mosaic.splash()

Displays a non-blocking toast notification using the native Zoho CRM `ZDK.Client.showMessage()`. Unlike `mosaic.message()`, splash does not open a popup - it shows a brief overlay notification and disappears automatically. There is no response to handle.

```javascript
mosaic.splash(message, options)
```

Shorthand methods set `options.type` automatically:

```javascript
mosaic.splash.info(message)
mosaic.splash.success(message)
mosaic.splash.warning(message)
mosaic.splash.error(message)
```

---

## Parameters

| Parameter | Type | Default | Required | Description |
|---|---|---|---|---|
| `message` | string | required | ✅ | Toast message text |
| `options.type` | string | `'info'` | | Toast style (`info`, `success`, `warning`, `error`) |

---

## Returns

`void` - splash does not return a response.

---

## When to Use Splash vs. Message

| Use | Method |
|---|---|
| Brief confirmation that something worked | `mosaic.splash.success()` |
| Background operation completed | `mosaic.splash.success()` |
| Non-critical warning the user should notice | `mosaic.splash.warning()` |
| Error that needs explanation or user action | `mosaic.message.error()` |
| Outcome that requires the user to acknowledge before continuing | `mosaic.message()` |

---

## Examples

### After a successful save

```javascript
ZDK.Apps.CRM.Records.update({ ... });
mosaic.splash.success('Record updated successfully.');
```

---

### After a background operation

```javascript
triggerEmailSync();
mosaic.splash.info('Email sync started. This may take a moment.');
```

---

### Non-critical warning

```javascript
mosaic.splash.warning('Close date is more than 12 months away. Please verify.');
```

---

### Error feedback for a failed operation

```javascript
try {
    sendWebhook(data);
} catch (e) {
    mosaic.splash.error('Webhook delivery failed. Check the log for details.');
}
```

---

### Using the base method with explicit type

```javascript
mosaic.splash('3 records were skipped due to missing required fields.', { type: 'warning' });
```
