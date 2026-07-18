# Example: PDF Filler Character Sheet

Fill PDF-LIB's sample `dod_character.pdf` form with data collected in a Mosaic form, then download the flattened PDF.

This example uses a real public fillable PDF so you can test the field mapping without creating your own template first. 

Sample PDF: https://pdf-lib.js.org/assets/dod_character.pdf

---

## Setup

- Download `dod_character.pdf`, upload it to WorkDrive, and set the resource ID in `pdfSource` below.
- Alternatively, a public URL source (`{ type: 'url', url: '...' }`) can be used — but only if the domain has been added to your CRM's [trusted domains](https://crm.zoho.com/crm/settings/trusted-domain), otherwise the widget iframe cannot fetch it.
- The `field` values in `pdfFields` must match the PDF form field names exactly.

---

## Code

```javascript
const deal = $Page.record;

const characterResponse = mosaic.form({
    title: 'Generate Character Sheet',
    width: '760px',
    height: '80vh',
    fields: [
        {
            name: 'character_name',
            label: 'Character Name',
            type: 'text',
            required: true,
            default_value: deal.Deal_Name || 'Mosaic Hero',
            width: '50%'
        },
        {
            name: 'age',
            label: 'Age',
            type: 'text',
            default_value: '29 years',
            width: '50%'
        },
        {
            name: 'height',
            label: 'Height',
            type: 'text',
            default_value: '5 ft 10 in',
            width: '33%'
        },
        {
            name: 'weight',
            label: 'Weight',
            type: 'text',
            default_value: '175 lbs',
            width: '33%'
        },
        {
            name: 'eyes',
            label: 'Eyes',
            type: 'text',
            default_value: 'Brown',
            width: '33%'
        },
        {
            name: 'skin',
            label: 'Skin',
            type: 'text',
            default_value: 'Olive',
            width: '50%'
        },
        {
            name: 'hair',
            label: 'Hair',
            type: 'text',
            default_value: 'Black',
            width: '50%'
        },
        {
            name: 'faction_name',
            label: 'Faction Name',
            type: 'text',
            default_value: 'Mosaic Guild'
        },
        {
            name: 'allies',
            label: 'Allies',
            type: 'textarea',
            rows: 6,
            default_value: [
                'Zoho CRM Team',
                'Widget Builders',
                'Client Script Users',
                '',
                'This field is intentionally filled with several lines so the sample PDF keeps a readable multiline font size.'
            ].join('\n')
        },
        {
            name: 'backstory',
            label: 'Backstory',
            type: 'textarea',
            rows: 4,
            default_value: [
                'This character sheet was generated from a Zoho CRM client script using mosaic.pdffiller().',
                '',
                'The script collects values in a Mosaic form, maps them to the exact AcroForm field names in the PDF, and downloads a flattened copy for review.'
            ].join('\n')
        },
        {
            name: 'traits',
            label: 'Feats and Traits',
            type: 'textarea',
            rows: 5,
            default_value: [
                'Fast implementation',
                'Clean field mapping',
                'PDF automation',
                '',
                'Useful for templates that already exist as fillable PDFs and should keep their original layout.'
            ].join('\n')
        },
        {
            name: 'treasure',
            label: 'Treasure',
            type: 'textarea',
            rows: 3,
            default_value: [
                'A completed fillable PDF',
                'A reusable Mosaic example',
                'A field-name mapping that can be copied into real CRM document generation flows'
            ].join('\n')
        }
    ],
    buttons: [
        'Cancel',
        { label: 'Fill PDF', style: 'primary' }
    ]
});

if (!mosaic.utils.isSuccess(characterResponse)) return;

const character = mosaic.utils.getData(characterResponse);
const pdfSource = { type: 'workdrive', id: 'WORKDRIVE_RESOURCE_ID_GOES_HERE' };

const pdfFields = [
    { field: 'CharacterName 2', value: valueOrBlank(character.character_name) },
    { field: 'Age',             value: valueOrBlank(character.age) },
    { field: 'Height',          value: valueOrBlank(character.height) },
    { field: 'Weight',          value: valueOrBlank(character.weight) },
    { field: 'Eyes',            value: valueOrBlank(character.eyes) },
    { field: 'Skin',            value: valueOrBlank(character.skin) },
    { field: 'Hair',            value: valueOrBlank(character.hair) },
    { field: 'Allies',          value: valueOrBlank(character.allies) },
    { field: 'FactionName',     value: valueOrBlank(character.faction_name) },
    { field: 'Backstory',       value: valueOrBlank(character.backstory) },
    { field: 'Feat+Traits',     value: valueOrBlank(character.traits) },
    { field: 'Treasure',        value: valueOrBlank(character.treasure) }
];

const fillResponse = mosaic.pdffiller(pdfSource, pdfFields, {
    filename: sanitizeFilename(`${character.character_name} - Character Sheet`),
    flatten: true
});

if (mosaic.utils.isSuccess(fillResponse)) {
    mosaic.splash.success('Character sheet PDF downloaded.');
} else if (mosaic.utils.isError(fillResponse)) {
    mosaic.message.error(mosaic.utils.getError(fillResponse) || 'The character sheet could not be generated.', {
        title: 'PDF Generation Failed'
    });
}

// --- example helper functions ---

function valueOrBlank(value) {
    return value == null ? '' : String(value);
}

function sanitizeFilename(value) {
    return String(value || 'Character Sheet')
        .replace(/[<>:"/\\|?*]+/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}
```

---

## Notes

- `dod_character.pdf` includes the text fields used in `pdfFields`, plus image button fields that this helper example intentionally leaves alone.
- The large multiline fields in this sample PDF use auto-sized appearances. When PDF-LIB regenerates those appearances, very short values can render with large text. Paragraph-length values keep the generated output closer to the original form's intended layout.
- `source` is a typed object. Use `{ type: 'workdrive', id: '...' }` after uploading the PDF to WorkDrive.
- `mosaic.pdffiller()` is headless. It shows a loader, fills the PDF, downloads the file, then closes.
- Set `flatten: false` if the downloaded PDF should remain editable.
- Set `skip_download: true` if you need the filled PDF in `mosaic.utils.getData(fillResponse).base64` without downloading it locally.
