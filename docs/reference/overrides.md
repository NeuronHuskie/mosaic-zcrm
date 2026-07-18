# Overrides

The `overrides` object can be passed to any popup method to customize formatting and theme on a per-call basis.

> [!NOTE]
> **Per-call only.** Mosaic automatically seeds three values from the CRM session — `date_format_display` (user's CRM profile format), `org_domain_name`, and `deployment` — so you rarely need to set those manually. All other keys must be passed in `options.overrides` on each call.

---

## Default behavior (no overrides)

When no overrides are provided, Mosaic determines formatting automatically by making API calls to fetch the user's and org's preferences:

- **Date and time formats** - fetched from the user's Zoho CRM profile settings
- **Phone country and mask** - derived from the org's country setting
- **API domain** - detected from the org's data center

Overrides let you skip those API calls and specify values directly, which is useful when you want to:

1. **Hardcode a format** regardless of what the user or org has configured (e.g. always return dates as ISO)
2. **Avoid the API calls** Mosaic would otherwise make to determine the correct format - useful in performance-sensitive flows or when you already know the correct values

---

## Available overrides

| Key | Default | Example | Scope | Description |
|-----|---------|---------|-------|-------------|
| `date_format_display` | `$Crm.user.date_format` | `'dd/MM/yyyy'` | `form`, `input` | Format shown in date inputs |
| `date_format_return` | `'yyyy-MM-dd'` | `'MM/dd/yyyy'` | `form`, `input` | Format used in submitted data |
| `time_format_display` | fetched from CRM | `'HH:mm'` | `form`, `input` | Format shown in time inputs |
| `time_format_return` | `'HH:mm'` | `'h:mm AM/PM'` | `form`, `input` | Format used in submitted data |
| `phone_country_code` | org country | `'GB'` | `form`, `input` | Country for phone validation and input masking (where available) |
| `phone_format_display` | derived from `phone_country_code` | `'#### ### ###'` | `form`, `input` | Override the phone input mask |
| `phone_format_return` | `'E164'` | `'national'` | `form`, `input` | Phone value format in submitted data |
| `api_domain` | derived from `deployment` | `'https://www.zohoapis.eu'` | all | Override the Zoho API base URL |
| `org_domain_name` | `$Crm.org.domain_name` | `'yourcompany'` | all | Override the org domain name used for CRM record links |
| `deployment` | `$Crm.deployment` | `'EU'` | all | Override the org data center deployment |
| `theme` | user's CRM theme | `'dark'` | all | Force `'light'` or `'dark'` theme |

---

## date_format_display

Controls how dates are shown to the user in text date inputs. Follows Zoho/Java date format tokens.

Without this override, Mosaic fetches the format from the user's Zoho CRM profile.

```javascript
overrides: { date_format_display: 'dd/MM/yyyy' }  // European
overrides: { date_format_display: 'yyyy-MM-dd' }  // ISO
overrides: { date_format_display: 'MM/dd/yyyy' }  // US
```

---

## date_format_return

Controls the format of the date value in submitted response data.

Without this override, dates are returned as `yyyy-MM-dd` by default.

```javascript
overrides: { date_format_return: 'yyyy-MM-dd' }  // default
overrides: { date_format_return: 'MM/dd/yyyy' }  // US style
```

---

## time_format_display

Controls how times are displayed in the input after the user enters a value.

Without this override, Mosaic fetches the format from the user's Zoho CRM profile.

```javascript
overrides: { time_format_display: 'HH:mm' }       // 24hr
overrides: { time_format_display: 'h:mm AM/PM' }  // 12hr
```

---

## time_format_return

Controls the format of the time value in submitted data.

Without this override, times are returned as `HH:mm` (24hr) by default.

```javascript
overrides: { time_format_return: 'HH:mm' }       // 24hr (default)
overrides: { time_format_return: 'h:mm AM/PM' }  // 12hr
```

---

## phone_country_code

Forces a specific country's validation pattern and input mask. Uses ISO 3166-1 alpha-2 country codes.

Without this override, Mosaic derives the country from the org's settings.

```javascript
overrides: { phone_country_code: 'US' }
overrides: { phone_country_code: 'GB' }
overrides: { phone_country_code: 'AU' }
```

Supported: `US`, `CA`, `GB`, `AU`, `DE`, `FR`, `IN`, `JP`, `CN`

Most countries apply an input mask that auto-formats digits as the user types. Some countries (`GB`) use free-form input with validation only, since their number formats vary too much for a single mask. To force a specific mask regardless, set `phone_format_display` explicitly.

---

## phone_format_display

Overrides the phone input mask directly. `#` represents a digit; all other characters are treated as literal separators and inserted automatically as the user types.

Without this override, the mask is derived from `phone_country_code`, or from the org's country if `phone_country_code` is also not set. Countries without a default mask (e.g. `GB`) use free-form input -setting `phone_format_display` explicitly will force a mask.

```javascript
overrides: { phone_format_display: '(###) ###-####' }  // US
overrides: { phone_format_display: '#### ### ###' }    // AU
overrides: { phone_format_display: '## #### ####' }    // DE
overrides: { phone_format_display: '##### ######' }    // GB (optional -no mask by default)
```

---

## phone_format_return

Controls the format of the phone value in submitted data.

Without this override, phone values are returned in `E164` format by default.

| Value | Description | Example |
|-------|-------------|---------|
| `'E164'` | International format (default) | `+15551234567` |
| `'national'` | Digits only, no country code | `5551234567` |
| `'display'` | As shown in the input | `(555) 123-4567` |
| `'raw'` | Exactly as typed by the user | `555.123.4567` |

---

## api_domain

Overrides the Zoho API base URL used for any API calls the widget makes internally (fetching user preferences, executing COQL queries, uploading files, etc.).

Without this override, Mosaic detects the data center from the org. Set this explicitly when the auto-detection is not working correctly for EU, AU, IN, or other regional deployments - or to avoid the detection API call entirely.

```javascript
overrides: { api_domain: 'https://www.zohoapis.eu' }
overrides: { api_domain: 'https://www.zohoapis.com.au' }
overrides: { api_domain: 'https://www.zohoapis.in' }
```

---

## theme

Forces a specific theme regardless of the user's Zoho CRM preference. Without this override, the widget matches the user's current CRM theme.

```javascript
overrides: { theme: 'dark' }
overrides: { theme: 'light' }
```

---

## org_domain_name

Overrides the org domain name used internally for constructing CRM record links (e.g. in table cells with `link.module`). Without this override, the value is pre-populated from `$Crm.org.domain_name`.

```javascript
overrides: { org_domain_name: 'yourcompany' }
```

---

## deployment

Overrides the org data center deployment used to resolve the Zoho API domain and other region-specific behavior. Without this override, the value is pre-populated from `$Crm.deployment`.

```javascript
overrides: { deployment: 'EU' }
```

Set `api_domain` directly if you only need to override the API base URL without changing other deployment-dependent behavior.

---

## Example: EU org with all relevant overrides

For a European org where you want to fully control formatting and skip all auto-detection API calls:

```javascript
mosaic.form({
    title: 'Event Registration',
    fields: [
        { name: 'name',       label: 'Full Name', type: 'text', required: true },
        { name: 'phone',      label: 'Phone',     type: 'tel' },
        { name: 'event_date', label: 'Date',      type: 'date', required: true }
    ],
    overrides: {
        api_domain:          'https://www.zohoapis.eu',
        date_format_display: 'dd/MM/yyyy',
        date_format_return:  'yyyy-MM-dd',
        phone_country_code:       'GB',            // validation only - no input mask for GB
        phone_format_return: 'E164'
    }
});
```

To add an input mask for GB, set `phone_format_display` explicitly:

```javascript
overrides: {
    phone_country_code:        'GB',
    phone_format_display: '##### ######',  // e.g. 07911 123456
    phone_format_return:  'E164'
}
```
