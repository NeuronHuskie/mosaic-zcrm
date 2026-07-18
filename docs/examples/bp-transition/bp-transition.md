# Example: Blueprint Transition 

```javascript
if (transition.name.includes("Out for Signature")) {

    const deal = $Page.record;
    const workdrive_folder_id = deal.Workdrive_Folder_ID;
    const workdrive_connection = 'your_workdrive_connection';  // ← your WorkDrive connection name

    const result = mosaic.form({
        title: 'Upload Application',
        module: 'Deals',
        record_id: deal.id,
        fields: [
            {
                name: 'signature_date',
                label: 'Signature Date',
                type: 'date',
                disable_past_dates: true
            },
            {
                name: 'application',
                label: 'Signed Application',
                type: 'file',
                accept: '.pdf',
                filename: `${deal.Deal_Name} - Application - ${new Date().toISOString().split('T')[0]}`,
                destination: {
                    type: 'workdrive',
                    folder_id: workdrive_folder_id,
                    connection: workdrive_connection,
                    override_existing: true
                }
            }
        ]
    });

    if (mosaic.utils.isSuccess(result)) {
        const data = mosaic.utils.getData(result);
        ZDK.Page.getField('Signature_Date').setValue(data.signature_date);
        // data.application.permalink => direct WorkDrive link
        // data.application.filename => `${deal.Deal_Name} - Application - ${new Date().toISOString().split('T')[0]}.pdf`
        mosaic.splash.success('File uploaded successfully!');
    } else {
        return false;        // prevent blueprint from proceeding
    }
}
```
