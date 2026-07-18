# Example: File Upload

Demonstrates all three `destination` types for `file` fields - record attachment, CRM field, and WorkDrive - plus common patterns like multiple files, dynamic naming, and side-by-side file fields.

See the [file field reference](../../reference/fields.md#field-file) for full parameter details, and [File Upload Results](../../reference/response.md#file-upload-results) for the return shape per destination type.

---

## Attachment (default)

The simplest case. Uploads the file as a standard record attachment. If `destination` is omitted entirely, this is the default.

```javascript
const result = mosaic.form({
    title: 'Upload Supporting Document',
    module: 'Deals',
    record_id: recordId,
    fields: [
        {
            name: 'document',
            label: 'Supporting Document',
            type: 'file',
            accept: '.pdf,.docx',
            required: true,
            destination: { type: 'attachment' }
        }
    ]
});

if (mosaic.utils.isSuccess(result)) {
    const uploadResult = mosaic.utils.getData(result).document;
    // uploadResult.status === 'success'
    // uploadResult.details.id  → attachment record ID
}
```

---

## CRM File Field

Uploads directly into a CRM file upload field on the record.

```javascript
const result = mosaic.form({
    title: 'Upload Proposal',
    module: 'Deals',
    record_id: recordId,
    fields: [
        {
            name: 'proposal',
            label: 'Proposal Document',
            type: 'file',
            accept: '.pdf,.docx,.xlsx',
            required: true,
            destination: {
                type: 'field',
                field_name: 'Proposal_Document',
                field_type: 'file'
            }
        }
    ]
});
```

---

## CRM Image Field

```javascript
const result = mosaic.form({
    title: 'Upload Product Image',
    module: 'Products',
    record_id: recordId,
    fields: [
        {
            name: 'product_image',
            label: 'Product Image',
            type: 'file',
            accept: 'image/*',
            required: true,
            destination: {
                type: 'field',
                field_name: 'Product_Image',
                field_type: 'image'
            }
        }
    ]
});
```

---

## WorkDrive

Uploads to a WorkDrive folder. Requires a connection with `WorkDrive.files.CREATE` and `WorkDrive.files.ALL` scopes.

```javascript
const result = mosaic.form({
    title: 'Upload Contract',
    module: 'Deals',
    record_id: recordId,
    fields: [
        {
            name: 'contract',
            label: 'Signed Contract',
            type: 'file',
            accept: '.pdf',
            filename: 'Contract_' + dealName,
            destination: {
                type: 'workdrive',
                folder_id: 'ilvurb7e9370cb1714f7f83bb6bbdaa7d554b',
                connection: 'workdrive_connection',
                override_existing: true
            }
        }
    ]
});

if (mosaic.utils.isSuccess(result)) {
    const upload = mosaic.utils.getData(result).contract;
    // upload.permalink  → direct WorkDrive link
    // upload.filename  → 'Contract_Acme Corp.pdf'
}
```

### Dynamic folder from record data

```javascript
const result = mosaic.form({
    title: 'Upload Contract',
    module: 'Deals',
    record_id: recordId,
    fields: [
        {
            name: 'contract',
            label: 'Upload Contract',
            type: 'file',
            accept: '.pdf',
            filename: record.Full_Name + '_Contract',
            destination: {
                type: 'workdrive',
                folder_id: record.Workdrive_Folder_ID,
                connection: 'workdrive_connection',
                override_existing: true
            },
            instructions: 'Upload signed contract PDF'
        }
    ]
});
```

---

## Multiple Files

When `multiple: true`, the user can select more than one file. Each file is uploaded separately and the field returns an array of result objects.

```javascript
const result = mosaic.form({
    title: 'Upload Invoices',
    module: 'Accounts',
    record_id: recordId,
    fields: [
        {
            name: 'invoices',
            label: 'Upload Invoices',
            type: 'file',
            multiple: true,
            accept: '.pdf',
            instructions: 'Upload one or more PDF invoices',
            destination: { type: 'attachment' }
        }
    ]
});
```

---

## Side-by-Side File Fields

Use `width: '50%'` to place two file fields on the same row.

```javascript
const result = mosaic.form({
    title: 'Upload ID Documents',
    module: 'Contacts',
    record_id: recordId,
    fields: [
        {
            name: 'id_front',
            label: 'ID Front',
            type: 'file',
            accept: 'image/*',
            width: '50%',
            destination: {
                type: 'field',
                field_name: 'ID_Front_Image',
                field_type: 'image'
            }
        },
        {
            name: 'id_back',
            label: 'ID Back',
            type: 'file',
            accept: 'image/*',
            width: '50%',
            destination: {
                type: 'field',
                field_name: 'ID_Back_Image',
                field_type: 'image'
            }
        }
    ]
});
```

---

## Using mosaic.input.file()

For a single file upload without a full form, use `mosaic.input.file()`. Pass `module` and `record_id` directly in options.

```javascript
const result = mosaic.input.file('Supporting Document', {
    accept: '.pdf,.docx',
    module: 'Deals',
    record_id: recordId,
    destination: { type: 'attachment' }
});

if (mosaic.utils.isSuccess(result)) {
    const upload = mosaic.utils.getData(result);
    // result.data is the upload result directly, not wrapped in a field name key
}
```
