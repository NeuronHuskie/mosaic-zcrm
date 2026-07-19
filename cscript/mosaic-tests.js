/**
 * ──────────────────────────────────────────────────────────────────────────────────────────────────── 
 * mosaic static resource tests
 * ──────────────────────────────────────────────────────────────────────────────────────────────────── 
 */
function RUN_MOSAIC_STATIC_RESOURCE_TESTS() {

    const pretty = obj => JSON.stringify(obj, null, 2);

    const run = (name, resp) => {
        console.log(`[MOSAIC.TESTS] ${name}:`, resp);
        const r = mosaic.form({
            height: '85vh', width: '60vw', top: '0', submit_on_enter: true, force_focus: false,
            fields: [
                { name: 'copy_btn', type: 'button', label: 'Copy', style: 'secondary', action: "navigator.clipboard.writeText(document.querySelector('.field-description').innerText).then(() => mosaic.ui.host.splash.show('Copied to clipboard!', 'success'));" },
                { type: 'description', name: 'description', value: `\`\`\`\n${prettifyJSON(resp)}\n\`\`\`` }
            ],
            buttons: [{ label: 'Exit Script', style: 'destructive' }, 'OK']
        });
        return !mosaic.utils.wasButtonClicked(r, 'Exit Script');
    };

    const mosaic_tests_items = [
        { actual_value: 'quick_inputs', display_value: 'Quick Input Helpers' },
        { actual_value: 'form_buttons', display_value: 'Form — Button Fields' },
        { actual_value: 'form_conditions', display_value: 'Form - Conditional Fields' },
        { actual_value: 'confirmation', display_value: 'Confirmation Dialogs' },
        { actual_value: 'message', display_value: 'Message Popups' },
        { actual_value: 'splash_tests', display_value: 'Splash' },
        { actual_value: 'form_basic', display_value: 'Form - Basic Fields' },
        { actual_value: 'form_advanced', display_value: 'Form - Advanced Fields' },
        { actual_value: 'table_static', display_value: 'Table - Static Data' },
        { actual_value: 'table_coql', display_value: 'Table - COQL Query' },
        { actual_value: 'table_search', display_value: 'Table - Search' },
        { actual_value: 'table_url_link', display_value: 'Table - URL Links' },
        { actual_value: 'table_format_rules', display_value: 'Table - Format & Rules' },
        { actual_value: 'html_viewer', display_value: 'HTML Viewer' },
        { actual_value: 'pdf_viewer', display_value: 'PDF Viewer' },
        { actual_value: 'launcher_tests', display_value: 'Launcher Tests' },
        { actual_value: 'file_to_field', display_value: 'Upload to File Field' },
        { actual_value: 'image_upload', display_value: 'Upload to Image Field' },
        { actual_value: 'upload_to_workdrive', display_value: 'Upload to Workdrive' },
        { actual_value: 'upload_to_attachments', display_value: 'Upload to Attachments' },
        { actual_value: 'utils', display_value: 'Utility Functions' }
    ];

    const testMenu = mosaic.launcher(mosaic_tests_items, {
        title: 'Mosaic Widget Test Suite',
        show_search: true,
        match_mode: 'contains',     
        placeholder: 'Type to search...',
        show_description: true,
        show_icons: true,
        close_icon: false,
        close_on_escape: true,
        submit_on_enter: true,
        width: '800px',
        height: '80vh',
        top: '0',
        force_focus: true,
        buttons: ['Cancel', 'Run Test']
    });

    if (!mosaic.utils.isSuccess(testMenu)) return console.log('[MOSAIC.TESTS] Test suite cancelled');

    const selectedTest = testMenu.data.actual_value;
    console.log('[MOSAIC.TESTS] Running test:', selectedTest);

    // ═══════════════════════════════════════════════════════════════════════════
    //  quick inputs
    // ═══════════════════════════════════════════════════════════════════════════

    const quick_inputs_tests = () => {
        const inputMenu = mosaic.form({
            title: 'Quick Inputs — Select Type', height: '650px', width: '750px', submit_on_enter: true,
            fields: [{ name: 'input_type', type: 'picklist', label: 'Input Type', required: true, visible_options: 15, searchable: true, options: [
                { actual_value: 'date', display_value: 'Date' }, { actual_value: 'time', display_value: 'Time' }, { actual_value: 'datetime', display_value: 'DateTime Local' },
                { actual_value: 'text', display_value: 'Text' }, { actual_value: 'textarea', display_value: 'Textarea' }, { actual_value: 'number', display_value: 'Number' },
                { actual_value: 'email', display_value: 'Email' }, { actual_value: 'tel', display_value: 'Phone / Tel' }, { actual_value: 'picklist', display_value: 'Picklist' },
                { actual_value: 'multiselect', display_value: 'Multiselect' }, { actual_value: 'checkbox', display_value: 'Checkbox' }, { actual_value: 'radio', display_value: 'Radio' }
            ]}],
            buttons: ['Cancel', 'Run']
        });

        if (!mosaic.utils.isSuccess(inputMenu)) return;
        const type = inputMenu.data.input_type.actual_value;
        const o = { width: '650px', height: '650px' };

        const runners = {
            date: () => {
                if (!run('Date [1]', mosaic.input.date('Start Date', { ...o, title: 'Date [1/6]', use_date_input: true, default_value: 'today', instructions: 'use_date_input: true | default_value: today' }))) return;
                if (!run('Date [2]', mosaic.input.date('Start Date', { ...o, title: 'Date [2/6]', use_date_input: true, instructions: 'use_date_input: true | no default_value' }))) return;
                if (!run('Date [3]', mosaic.input.date('Start Date', { ...o, title: 'Date [3/6]', use_date_input: false, default_value: 'today', instructions: 'use_date_input: false | default_value: today' }))) return;
                if (!run('Date [4]', mosaic.input.date('Start Date', { ...o, title: 'Date [4/6]', use_date_input: false, instructions: 'use_date_input: false | no default_value' }))) return;
                if (!run('Date [5]', mosaic.input.date('Start Date', { ...o, title: 'Date [5/6]', use_date_input: false, default_value: 'today', instructions: 'date_format_display: yyyy-MM-dd | date_format_return: MM/dd/yyyy', overrides: { date_format_display: 'yyyy-MM-dd', date_format_return: 'MM/dd/yyyy' } }))) return;
                if (!run('Date [6]', mosaic.input.date('Start Date', { ...o, title: 'Date [6/6]', use_date_input: false, default_value: '2025-06-15', instructions: 'default_value: 2025-06-15' }))) return;
                mosaic.message.success('Date tests complete!', { title: 'Date — Done' });
            },
            time: () => {
                if (!run('Time [1]', mosaic.input.time('Start Time', { ...o, title: 'Time [1/4]', instructions: 'no default | return: HH:mm' }))) return;
                if (!run('Time [2]', mosaic.input.time('Start Time', { ...o, title: 'Time [2/4]', default_value: 'now', instructions: 'default_value: now' }))) return;
                if (!run('Time [3]', mosaic.input.time('Start Time', { ...o, title: 'Time [3/4]', default_value: 'now', instructions: 'time_format_return: h:mm AM/PM', overrides: { time_format_return: 'h:mm AM/PM' } }))) return;
                if (!run('Time [4]', mosaic.input.time('Start Time', { ...o, title: 'Time [4/4]', instructions: 'display: HH:mm | return: HH:mm', overrides: { time_format_display: 'HH:mm', time_format_return: 'HH:mm' } }))) return;
                mosaic.message.success('Time tests complete!', { title: 'Time — Done' });
            },
            datetime: () => {
                if (!run('DateTime [1]', mosaic.input.datetime('Appointment', { ...o, title: 'DateTime [1/3]', instructions: 'no default_value' }))) return;
                if (!run('DateTime [2]', mosaic.input.datetime('Appointment', { ...o, title: 'DateTime [2/3]', default_value: 'now', instructions: 'default_value: now' }))) return;
                if (!run('DateTime [3]', mosaic.input.datetime('Appointment', { ...o, title: 'DateTime [3/3]', default_value: 'now', instructions: 'date_format_display: dd/MM/yyyy', overrides: { date_format_display: 'dd/MM/yyyy' } }))) return;
                mosaic.message.success('DateTime tests complete!', { title: 'DateTime — Done' });
            },
            text: () => {
                if (!run('Text [1]', mosaic.input.text('Enter a value', { ...o, title: 'Text [1/5]', placeholder: 'Type anything...', instructions: 'no constraints' }))) return;
                if (!run('Text [2]', mosaic.input.text('Full Name', { ...o, title: 'Text [2/5]', required: true, default_value: 'John Doe', instructions: 'required: true | default: John Doe' }))) return;
                if (!run('Text [3]', mosaic.input.text('Username', { ...o, title: 'Text [3/5]', required: true, minlength: 3, maxlength: 12, instructions: 'minlength: 3 | maxlength: 12' }))) return;
                if (!run('Text [4]', mosaic.input.text('Product Code', { ...o, title: 'Text [4/5]', required: true, pattern: '^[A-Z]{3}-[0-9]{4}$', pattern_message: 'Format ABC-1234', instructions: "pattern: '^[A-Z]{3}-[0-9]{4}$'" }))) return;
                if (!run('Text [5]', mosaic.input.text('Optional Note', { ...o, title: 'Text [5/5]', required: false, submit_on_enter: true, placeholder: 'Optional...', instructions: 'required: false | submit_on_enter: true' }))) return;
                mosaic.message.success('Text tests complete!', { title: 'Text — Done' });
            },
            textarea: () => {
                const ta = { width: '700px', height: '650px' };
                if (!run('Textarea [1]', mosaic.input.textarea('Notes', { ...o, title: 'Textarea [1/3]', placeholder: 'Enter notes...', instructions: 'rows: 4 (default)' }))) return;
                if (!run('Textarea [2]', mosaic.input.textarea('Description', { ...ta, title: 'Textarea [2/3]', rows: 8, maxlength: 500, instructions: 'rows: 8 | maxlength: 500' }))) return;
                if (!run('Textarea [3]', mosaic.input.textarea('Template', { ...ta, title: 'Textarea [3/3]', rows: 6, default_value: 'Dear [Name],\n\nThank you for your inquiry.\n\nBest regards,', instructions: 'pre-populated default_value' }))) return;
                mosaic.message.success('Textarea tests complete!', { title: 'Textarea — Done' });
            },
            number: () => {
                if (!run('Number [1]', mosaic.input.number('Enter a number', { ...o, title: 'Number [1/4]', instructions: 'no min/max' }))) return;
                if (!run('Number [2]', mosaic.input.number('Quantity', { ...o, title: 'Number [2/4]', min: 1, max: 100, instructions: 'min: 1 | max: 100' }))) return;
                if (!run('Number [3]', mosaic.input.number('Score', { ...o, title: 'Number [3/4]', min: 0, max: 100, default_value: 50, instructions: 'default_value: 50' }))) return;
                if (!run('Number [4]', mosaic.input.number('Optional Count', { ...o, title: 'Number [4/4]', required: false, instructions: 'required: false' }))) return;
                mosaic.message.success('Number tests complete!', { title: 'Number — Done' });
            },
            email: () => {
                if (!run('Email [1]', mosaic.input.email('Email Address', { ...o, title: 'Email [1/3]', placeholder: 'user@example.com', instructions: 'required: true' }))) return;
                if (!run('Email [2]', mosaic.input.email('CC Email', { ...o, title: 'Email [2/3]', required: false, placeholder: 'optional@example.com', instructions: 'required: false' }))) return;
                if (!run('Email [3]', mosaic.input.email('Email Address', { ...o, title: 'Email [3/3]', default_value: 'test@example.com', instructions: 'default_value: test@example.com' }))) return;
                mosaic.message.success('Email tests complete!', { title: 'Email — Done' });
            },
            tel: () => {
                if (!run('Tel [1]', mosaic.input.tel('Phone Number', { ...o, title: 'Tel [1/5]', instructions: 'no overrides' }))) return;
                if (!run('Tel [2]', mosaic.input.tel('Phone Number', { ...o, title: 'Tel [2/5]', instructions: 'phone_country: GB', overrides: { phone_country: 'GB' } }))) return;
                if (!run('Tel [3]', mosaic.input.tel('Phone Number', { ...o, title: 'Tel [3/5]', instructions: 'return: national', overrides: { phone_format_return: 'national' } }))) return;
                if (!run('Tel [4]', mosaic.input.tel('Phone Number', { ...o, title: 'Tel [4/5]', instructions: 'return: display', overrides: { phone_format_return: 'display' } }))) return;
                if (!run('Tel [5]', mosaic.input.tel('Phone Number', { ...o, title: 'Tel [5/5]', instructions: 'return: E164', overrides: { phone_format_return: 'E164' } }))) return;
                mosaic.message.success('Tel tests complete!', { title: 'Tel — Done' });
            },
            picklist: () => {
                const opts = [{actual_value:'low',display_value:'Low Priority'}, {actual_value:'medium',display_value:'Medium Priority'}, {actual_value:'high',display_value:'High Priority'}, {actual_value:'critical',display_value:'Critical'}];
                if (!run('Picklist [1]', mosaic.input.picklist('Select Priority', { ...o, title: 'Picklist [1/3]', options: opts, instructions: 'no default | required' }))) return;
                if (!run('Picklist [2]', mosaic.input.picklist('Select Priority', { ...o, title: 'Picklist [2/3]', options: opts, default_value: 'medium', instructions: 'default: medium' }))) return;
                if (!run('Picklist [3]', mosaic.input.picklist('Select Status', { ...o, title: 'Picklist [3/3]', options: ['Active', 'Inactive', 'Pending', 'Archived'], instructions: 'string options array' }))) return;
                mosaic.message.success('Picklist tests complete!', { title: 'Picklist — Done' });
            },
            multiselect: () => {
                const opts = [{actual_value:'red',display_value:'Red'}, {actual_value:'green',display_value:'Green'}, {actual_value:'blue',display_value:'Blue'}, {actual_value:'yellow',display_value:'Yellow'}, {actual_value:'purple',display_value:'Purple'}];
                const msO = { ...o, height: '750px', visible_options: 10, options: opts };
                if (!run('Multiselect [1]', mosaic.input.multiselect('Select Colors', { ...msO, title: 'Multiselect [1/4]', instructions: 'no constraints' }))) return;
                if (!run('Multiselect [2]', mosaic.input.multiselect('Select Colors', { ...msO, title: 'Multiselect [2/4]', min: 2, max: 3, instructions: 'min: 2 | max: 3' }))) return;
                if (!run('Multiselect [3]', mosaic.input.multiselect('Exact 2 Colors', { ...msO, title: 'Multiselect [3/4]', min: 2, max: 2, instructions: 'exact: 2' }))) return;
                if (!run('Multiselect [4]', mosaic.input.multiselect('Select Colors', { ...msO, title: 'Multiselect [4/4]', default_value: ['red', 'blue'], instructions: 'default_value: [red, blue]' }))) return;
                mosaic.message.success('Multiselect tests complete!', { title: 'Multiselect — Done' });
            },
            checkbox: () => {
                const opts = [{actual_value:'dashboard',display_value:'Dashboard'}, {actual_value:'reports',display_value:'Reports'}, {actual_value:'api',display_value:'API Access'}, {actual_value:'export',display_value:'Data Export'}];
                if (!run('Checkbox [1]', mosaic.input.checkbox('Select Features', { ...o, title: 'Checkbox [1/4]', options: opts, instructions: 'multi-option' }))) return;
                if (!run('Checkbox [2]', mosaic.input.checkbox('Select Features', { ...o, title: 'Checkbox [2/4]', options: opts, min: 1, max: 2, instructions: 'min: 1 | max: 2' }))) return;
                if (!run('Checkbox [3]', mosaic.input.checkbox('Select Features', { ...o, title: 'Checkbox [3/4]', options: opts, default_value: ['dashboard', 'reports'], instructions: 'default_value: [dashboard, reports]' }))) return;
                if (!run('Checkbox [4]', mosaic.input.checkbox('I agree', { ...o, title: 'Checkbox [4/4]', required: true, instructions: 'single boolean checkbox' }))) return;
                mosaic.message.success('Checkbox tests complete!', { title: 'Checkbox — Done' });
            },
            radio: () => {
                const opts = [{actual_value:'xs',display_value:'Extra Small'}, {actual_value:'sm',display_value:'Small'}, {actual_value:'md',display_value:'Medium'}, {actual_value:'lg',display_value:'Large'}, {actual_value:'xl',display_value:'Extra Large'}];
                if (!run('Radio [1]', mosaic.input.radio('Select Size', { ...o, title: 'Radio [1/3]', options: opts, instructions: 'no default' }))) return;
                if (!run('Radio [2]', mosaic.input.radio('Select Size', { ...o, title: 'Radio [2/3]', options: opts, default_value: 'md', instructions: 'default: md' }))) return;
                if (!run('Radio [3]', mosaic.input.radio('Decision', { ...o, title: 'Radio [3/3]', options: ['Approve', 'Reject', 'Hold'], required: true, instructions: 'string options | required' }))) return;
                mosaic.message.success('Radio tests complete!', { title: 'Radio — Done' });
            }
        };
        
        runners[type] && runners[type]();
    };

    // ═══════════════════════════════════════════════════════════════════════════
    //  form buttons test
    // ═══════════════════════════════════════════════════════════════════════════

    const form_buttons_test = () => {
        if (!run('Buttons [1]', mosaic.form({
            title: 'Button Fields [1/3] — All Styles', height: '650px', width: '500px', buttons: ['Close'],
            fields: [
                { name: 'desc', type: 'description', value: 'Each row below is a `button` type field...' },
                { name: 'btn_primary', type: 'button', label: 'Primary (default)', style: 'primary' },
                { name: 'btn_secondary', type: 'button', label: 'Secondary', style: 'secondary' },
                { name: 'btn_cancel', type: 'button', label: 'Cancel style', style: 'cancel' },
                { name: 'btn_success', type: 'button', label: 'Success', style: 'success' },
                { name: 'btn_warning', type: 'button', label: 'Warning', style: 'warning' },
                { name: 'btn_error', type: 'button', label: 'Error', style: 'error' },
                { name: 'btn_question', type: 'button', label: 'Question', style: 'question' }
            ]
        }))) return;

        if (!run('Buttons [2]', mosaic.form({
            title: 'Button Fields [2/3] — Submit via Inline Button', height: '450px', width: '500px', buttons: ['Cancel'],
            fields: [
                { name: 'desc', type: 'description', value: 'The button below calls `submitForm()` directly.' },
                { name: 'name', type: 'text', label: 'Name', required: true },
                { name: 'submit_btn', type: 'button', label: 'Submit Now', style: 'success' }
            ]
        }))) return;

        if (!run('Buttons [3]', mosaic.form({
            title: 'Button Fields [3/3] — Custom Action + Width', height: '750px', width: '750px', enable_markdown: true, buttons: ['Cancel', 'Submit'],
            fields: [
                { name: 'desc', type: 'description', value: 'Buttons can have a custom `action`...' },
                { name: 'account_id', type: 'text', label: 'Account ID', width: '75%' },
                { name: 'lookup_btn', type: 'button', label: 'Look Up', style: 'secondary', width: '25%', action: "mosaic.ui.alert.show('Lookup triggered for: ' + document.getElementById('account_id').value)" },
                { name: 'notes', type: 'textarea', label: 'Notes', rows: 3 },
                { name: 'clear_btn', type: 'button', label: 'Clear Notes', style: 'cancel', action: "document.getElementById('notes').value = ''" }
            ]
        }))) return;

        mosaic.message.success('Button field tests complete!', { title: 'Button Fields — Done' });
    };

    // ═══════════════════════════════════════════════════════════════════════════
    //  form conditional test
    // ═══════════════════════════════════════════════════════════════════════════

    const form_conditions_tests = () => run('Form Conditions', mosaic.form({
        title: 'Conditional Fields Test', height: '90vh', width: '800px',
        fields: [
            // ── equals / not_equals (radio → fields) ─────────────────────────────
            { name: 'section_equals', type: 'description', value: '**equals / not_equals**' },
            { name: 'has_coverage', label: 'Has existing coverage?', type: 'radio', required: true, options: ['Yes', 'No'] },
            { name: 'carrier', label: 'Carrier Name', type: 'text', width: '50%',
                conditions: [{ field: 'has_coverage', operator: 'equals', value: 'Yes' }]
            },
            { name: 'no_coverage_reason', label: 'Why no coverage?', type: 'textarea', rows: 2,
                conditions: [{ field: 'has_coverage', operator: 'not_equals', value: 'Yes' }]
            },

            // ── empty / not_empty (text → field) ─────────────────────────────────
            { name: 'section_empty', type: 'description', value: '**empty / not_empty**' },
            { name: 'referral_code', label: 'Referral Code (optional)', type: 'text' },
            { name: 'referral_source', label: 'Who referred you?', type: 'text',
                conditions: [{ field: 'referral_code', operator: 'not_empty' }]
            },

            // ── greater_than / less_than / between (number → fields) ─────────────
            { name: 'section_numeric', type: 'description', value: '**greater_than / less_than / between**' },
            { name: 'amount', label: 'Deal Amount', type: 'number', min: 0 },
            { name: 'manager_approval', label: 'Manager Approval Notes', type: 'textarea', rows: 2,
                conditions: [{ field: 'amount', operator: 'greater_than', value: 10000 }]
            },
            { name: 'small_deal_reason', label: 'Small Deal Justification', type: 'text',
                conditions: [{ field: 'amount', operator: 'less_than', value: 100 }]
            },
            { name: 'mid_tier_plan', label: 'Mid-Tier Plan', type: 'picklist', options: ['Bronze', 'Silver', 'Gold'],
                conditions: [{ field: 'amount', operator: 'between', value: [1000, 5000] }]
            },

            // ── in / not_in (picklist → fields) ──────────────────────────────────
            { name: 'section_set', type: 'description', value: '**in / not_in**' },
            { name: 'stage', label: 'Deal Stage', type: 'picklist',
                options: ['Prospecting', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost']
            },
            { name: 'close_reason', label: 'Close Reason', type: 'textarea', rows: 2,
                conditions: [{ field: 'stage', operator: 'in', value: ['Closed Won', 'Closed Lost'] }]
            },
            { name: 'next_step', label: 'Next Step', type: 'text',
                conditions: [{ field: 'stage', operator: 'not_in', value: ['Closed Won', 'Closed Lost'] }]
            },

            // ── contains (text → field) ──────────────────────────────────────────
            { name: 'section_contains', type: 'description', value: '**contains**' },
            { name: 'notes', label: 'Notes (type "urgent" to reveal)', type: 'text' },
            { name: 'escalation_contact', label: 'Escalation Contact', type: 'text',
                conditions: [{ field: 'notes', operator: 'contains', value: 'urgent' }]
            },

            // ── before / after / between (date → fields) ────────────────────────
            { name: 'section_date', type: 'description', value: '**before / after / between (date)**' },
            { name: 'target_date', label: 'Target Date', type: 'date' },
            { name: 'rush_fee_note', label: 'Rush Fee Applies', type: 'text',
                conditions: [{ field: 'target_date', operator: 'before', value: '2026-06-01' }]
            },
            { name: 'future_planning', label: 'Future Planning Notes', type: 'textarea', rows: 2,
                conditions: [{ field: 'target_date', operator: 'after', value: '2027-01-01' }]
            },
            { name: 'q4_promo', label: 'Q4 Promo Code', type: 'text',
                conditions: [{ field: 'target_date', operator: 'between', value: ['2026-10-01', '2026-12-31'] }]
            },

            // ── multiple AND conditions ──────────────────────────────────────────
            { name: 'section_and', type: 'description', value: '**Multiple conditions (AND)**' },
            { name: 'priority', label: 'Priority', type: 'radio', options: ['Low', 'Medium', 'High'] },
            { name: 'vip_escalation', label: 'VIP Escalation Notes', type: 'textarea', rows: 2,
                conditions: [
                    { field: 'priority', operator: 'equals', value: 'High' },
                    { field: 'amount', operator: 'greater_than', value: 5000 }
                ]
            },

            // ── checkbox source ──────────────────────────────────────────────────
            { name: 'section_checkbox', type: 'description', value: '**Checkbox source**' },
            { name: 'agree_terms', label: 'I agree to the terms', type: 'checkbox' },
            { name: 'signature', label: 'Digital Signature', type: 'text',
                conditions: [{ field: 'agree_terms', operator: 'not_empty' }]
            }
        ]
    }));

    // ═══════════════════════════════════════════════════════════════════════════
    //  confirmation tests
    // ═══════════════════════════════════════════════════════════════════════════

    const confirmation_tests = () => {
        if (!run('Confirm [1]', mosaic.confirmation('Do you want to proceed?', { title: 'Basic Confirmation', height: '400px', width: '500px' }))) return;
        if (!run('Confirm [2]', mosaic.confirmation('Are you sure you want to delete?', { title: 'Delete Confirmation', height: '400px', buttons: ['No, Keep It', 'Yes, Delete'] }))) return;
        if (!run('Confirm [3]', mosaic.confirmation('This action will:\n\n- **Update** status\n- *Send* email', { title: 'Markdown Confirmation', enable_markdown: true, height: '600px' }))) return;
        mosaic.message.success('Confirmation tests completed!', { title: 'Tests Complete' });
    };

    // ═══════════════════════════════════════════════════════════════════════════
    //  message tests
    // ═══════════════════════════════════════════════════════════════════════════

    const message_tests = () => {
        mosaic.message.info('This is an informational message.', { title: 'Info Message' });
        mosaic.message.success('The operation completed successfully!', { title: 'Success Message' });
        mosaic.message.warning('Please review the data before proceeding.', { title: 'Warning Message' });
        mosaic.message.error('An error occurred while processing your request.', { title: 'Error Message' });
        mosaic.message('Choose an action:', { title: 'Custom Buttons', type: 'info', buttons: ['Option A', 'Option B', 'Option C'] });
        mosaic.message('Is this a new Deal?', { type: 'question', buttons: ['No', 'Yes'] });
        mosaic.message.success('Message tests completed!', { title: 'Tests Complete' });
    };

    // ═══════════════════════════════════════════════════════════════════════════
    //  splash test
    // ═══════════════════════════════════════════════════════════════════════════

    const splash_tests = () => {
        const text = `Lorem Ipsum is simply dummy text of the printing and typesetting industry...`;
        mosaic.loader.show('This is a test loader', { template: 'standard' });
        mosaic.splash.info(text);
        sleep(3000);
        mosaic.splash.warning(text);
        mosaic.loader.hide();
    };

    // ═══════════════════════════════════════════════════════════════════════════
    //  form basic test
    // ═══════════════════════════════════════════════════════════════════════════

    const form_basic_tests = () => run('Form Basic', mosaic.form({
        title: 'Basic Form Fields Test', height: '90vh', width: '1000px',
        fields: [
            { name: 'text_field', label: 'Text Field', type: 'text', required: true, pattern: '^[A-Za-z]{3}$', pattern_message: 'Format: ABC', placeholder: 'Enter some text...' },
            { name: 'email_field', label: 'Email Field', type: 'email', placeholder: 'email@example.com' },
            { name: 'phone_field', label: 'Phone Field', type: 'tel', placeholder: '(555) 123-4567' },
            { name: 'number_field', label: 'Number Field', type: 'number', required: true, min: 0, max: 100, default_value: 50 },
            { name: 'date_field', label: 'Date Field', type: 'date', width: '50%' },
            { name: 'textarea_field', label: 'Textarea Field', type: 'textarea', rows: 4, placeholder: 'Multiple lines...' }
        ]
    }));

    // ═══════════════════════════════════════════════════════════════════════════
    //  form advanced test
    // ═══════════════════════════════════════════════════════════════════════════

    const form_advanced_tests = () => run('Form Advanced', mosaic.form({
        title: 'Advanced Form Fields Test', height: '90vh', width: '650px',
        fields: [
            { name: 'section1', type: 'description', label: 'Selection Fields' },
            { name: 'picklist_field', label: 'Picklist', type: 'picklist', required: true, options: [{actual_value:'option1',display_value:'Option 1'}, {actual_value:'option2',display_value:'Option 2'}, {actual_value:'option3',display_value:'Option 3'}] },
            { name: 'multiselect_field', label: 'Multi-Select', type: 'multiselect', options: [{actual_value:'red',display_value:'Red'}, {actual_value:'green',display_value:'Green'}, {actual_value:'blue',display_value:'Blue'}, {actual_value:'yellow',display_value:'Yellow'}] },
            { name: 'radio_field', label: 'Radio Buttons', type: 'radio', options: [{actual_value:'small',display_value:'Small'}, {actual_value:'medium',display_value:'Medium'}, {actual_value:'large',display_value:'Large'}], default_value: 'medium' },
            { name: 'section2', type: 'description', label: 'Other Fields' },
            { name: 'checkbox_field', label: 'Checkbox Field', type: 'checkbox', default_value: true },
            { name: 'inline_fields', type: 'description', label: 'Inline Fields (50% width each)' },
            { name: 'first_name', label: 'First Name', type: 'text', width: '50%' },
            { name: 'last_name', label: 'Last Name', type: 'text', width: '50%' }
        ]
    }));

    // ═══════════════════════════════════════════════════════════════════════════
    //  table static data test
    // ═══════════════════════════════════════════════════════════════════════════

    const table_static_data_tests = () => run('Table Static', mosaic.table({
        title: 'Select Products', height: '95vh', width: '95vw', top: '0', right: '0', show_search: true, allow_export: true, allow_multiple: true, per_page: 10,
        columns: [
            { key: 'name', header: 'Product Name', width: '40%' }, { key: 'category', header: 'Category', width: '25%' },
            { key: 'price', header: 'Price', width: '20%' }, { key: 'stock', header: 'In Stock', width: '15%' }
        ],
        source: {
            type: 'static',
            data: [
                { id:1, name:'Widget Pro', category:'Electronics', price:'$99.99', stock:'Yes' }, { id:2, name:'Gadget Plus', category:'Electronics', price:'$149.99', stock:'Yes' },
                { id:3, name:'Super Tool', category:'Tools', price:'$49.99', stock:'No' }, { id:4, name:'Mega Device', category:'Electronics', price:'$299.99', stock:'Yes' },
                { id:5, name:'Basic Item', category:'General', price:'$19.99', stock:'Yes' }, { id:6, name:'Premium Package', category:'Services', price:'$499.99', stock:'Yes' },
                { id:7, name:'Starter Kit', category:'General', price:'$29.99', stock:'No' }, { id:8, name:'Advanced System', category:'Electronics', price:'$599.99', stock:'Yes' },
                { id:9, name:'Power Drill', category:'Tools', price:'$79.99', stock:'Yes' }, { id:10, name:'Wireless Mouse', category:'Electronics', price:'$34.99', stock:'Yes' },
                { id:11, name:'USB Hub', category:'Electronics', price:'$24.99', stock:'No' }, { id:12, name:'Desk Lamp', category:'General', price:'$44.99', stock:'Yes' },
                { id:13, name:'Hammer Set', category:'Tools', price:'$39.99', stock:'Yes' }, { id:14, name:'Consulting Hour', category:'Services', price:'$150.00', stock:'Yes' },
                { id:15, name:'Keyboard Pro', category:'Electronics', price:'$129.99', stock:'Yes' }, { id:16, name:'Screwdriver Kit', category:'Tools', price:'$54.99', stock:'No' },
                { id:17, name:'Monitor Stand', category:'General', price:'$69.99', stock:'Yes' }, { id:18, name:'Training Session', category:'Services', price:'$299.99', stock:'Yes' },
                { id:19, name:'Bluetooth Speaker', category:'Electronics', price:'$89.99', stock:'Yes' }, { id:20, name:'Level Tool', category:'Tools', price:'$29.99', stock:'Yes' },
                { id:21, name:'Cable Organizer', category:'General', price:'$14.99', stock:'Yes' }, { id:22, name:'Webcam HD', category:'Electronics', price:'$74.99', stock:'No' },
                { id:23, name:'Wrench Set', category:'Tools', price:'$64.99', stock:'Yes' }, { id:24, name:'Support Plan', category:'Services', price:'$99.99', stock:'Yes' },
                { id:25, name:'Portable Charger', category:'Electronics', price:'$49.99', stock:'Yes' }, { id:26, name:'Office Chair Mat', category:'General', price:'$39.99', stock:'No' },
                { id:27, name:'Tape Measure', category:'Tools', price:'$12.99', stock:'Yes' }
            ]
        }
    }));

    // ═══════════════════════════════════════════════════════════════════════════
    //  table coql data test
    // ═══════════════════════════════════════════════════════════════════════════

    const table_coql_data_tests = () => run('Table COQL', mosaic.table({
        title: 'COQL Test', height: '95vh', width: '95vw', left: 'center', top: '0', right: '0',
        allow_export: true, selectable: true, allow_multiple: true, required: true, show_buttons: true, close_on_escape: false, close_icon: false, per_page: 10,
        sort_field: 'Statement_Date', sort_order: 'desc', buttons: ['Cancel', 'Select Contact'],
        columns: [
            { key: 'Name', header: 'zCommission', link: { module: 'CustomModule3', id_key: 'id' } },
            { key: 'Company', header: 'Company' },
            { key: 'Deal.Deal_Name', header: 'zDeal', link: { module: 'Deals', id_key: 'Deal.id' } },
            { key: 'Client.Full_Name', header: 'zClient', link: { module: 'Contacts', id_key: 'Client.id' } },
            { key: 'Agency', header: 'Agency' }, { key: 'Statement_Date', header: 'Statement Date' },
            { key: 'Type', header: 'Type' }, { key: 'Override', header: 'Override ($)' }, { key: 'Commission', header: 'Commission ($)' }
        ],
        source: {
            type:  'coql',
            query: `select Name, Company, Deal, Deal.Deal_Name, Client, Client.Full_Name, Agency, Statement_Date, Type, Override, Commission from Commissions where Client.id = ${record.id}`
        }
    }));

    // ═══════════════════════════════════════════════════════════════════════════
    //  table search data test
    // ═══════════════════════════════════════════════════════════════════════════

    const table_search_data_tests = () => run('Table Search', mosaic.table({
        title: 'Search Table Test', height: '95vh', width: '95vw', top: '0', allow_multiple: true, per_page: 10,
        search_placeholder: 'Search by Full Name, Email or Home Phone...', buttons: ['Cancel', { label: 'Test', style: 'secondary' }, 'Add Selected Contacts'],
        columns: [{ header: 'Contact Name', key: 'Full_Name', link: { module: 'Contacts', id_key: 'id' } }, { header: 'Email Address', key: 'Email' }, { header: 'Home Phone', key: 'Home_Phone' }],
        source: {
            type:        'search',
            module:      'Contacts',
            search_type: 'criteria',
            fields:      ['Full_Name', 'Email', 'Home_Phone']
        }
    }));

    // ═══════════════════════════════════════════════════════════════════════════
    //  table url links test
    // ═══════════════════════════════════════════════════════════════════════════

    const table_url_link_tests = () => run('Table URL Links', mosaic.table({
        title: 'URL Link Test', height: '95vh', width: '95vw', top: '0', allow_multiple: false, per_page: 10, show_search: true,
        columns: [
            { header: 'Contact Name', key: 'Full_Name', link: { module: 'Contacts', id_key: 'id' } },
            { header: 'LinkedIn',     key: 'LinkedIn',  link: { url_key: 'LinkedIn', text: 'View Profile' } },
            { header: 'Website',      key: 'Website',   link: { url_key: 'Website' } },
            { header: 'Docs',         key: 'Doc_Version', link: { url: 'https://docs.example.com', text: 'View Docs' } }
        ],
        source: {
            type: 'static',
            data: [
                { id: '1', Full_Name: 'Jane Smith',   LinkedIn: 'https://linkedin.com/in/janesmith',   Website: 'https://janesmith.com',   Doc_Version: 'v1.0' },
                { id: '2', Full_Name: 'John Doe',     LinkedIn: 'https://linkedin.com/in/johndoe',     Website: 'https://johndoe.io',      Doc_Version: 'v1.2' },
                { id: '3', Full_Name: 'Alice Johnson', LinkedIn: 'https://linkedin.com/in/alicej',     Website: null,                      Doc_Version: 'v1.2' },
                { id: '4', Full_Name: 'Bob Williams',  LinkedIn: null,                                 Website: 'https://bobwilliams.net',  Doc_Version: 'v1.3' }
            ]
        }
    }));

    // ═══════════════════════════════════════════════════════════════════════════
    //  table format rules test
    // ═══════════════════════════════════════════════════════════════════════════

    const table_format_rules_tests = () => run('Table Format & Rules', mosaic.table({
        title: 'Format & Rules Test',
        height: '95vh',
        width: '95vw',
        top: '0',
        selectable: false,
        show_search: true,
        allow_export: true,
        per_page: 10,
        buttons: ['Close'],
        columns: [
            { key: 'policy', header: 'Policy Number' },
            {
                key: 'premium',
                header: 'Premium',
                format: { type: 'currency', currency: 'USD', decimals: 2 },
                rules: [
                    { operator: 'greater_than', value: 500, style: { color: '#097969', 'font-weight': '600' } },
                    { operator: 'less_than', value: 0, style: { color: '#c1121f', 'font-weight': '600' } }
                ]
            },
            {
                key: 'effective_date',
                header: 'Effective Date',
                format: { type: 'date', input_date_format: 'yyyy-MM-dd' },
                rules: [
                    { operator: 'between', value: ['2026-04-01', '2026-04-30'], style: {  color: '#000000', 'background-color': '#f0fff4' } }
                ]
            },
            {
                key: 'inactive_date',
                header: 'Inactive Date',
                format: { type: 'date', input_date_format: 'yyyy-MM-dd' },
                rules: [
                    { operator: 'before', value: '2026-01-01', target: 'row', style: { color: '#000000', 'background-color': '#fff3f3' } },
                    { operator: 'after', value: '2026-12-31', target: 'row', style: { color: '#000000','background-color': '#fff8e1' } }
                ]
            },
            {
                key: 'status',
                header: 'Status',
                rules: [
                    { operator: 'equals', value: 'Inactive', style: { color: '#c1121f', 'font-weight': '600' } },
                    { operator: 'equals', value: 'Active', style: { color: '#097969' } }
                ]
            }
        ],
        source: {
            type: 'static',
            data: [
                { id: '1', policy: 'POL-1001', premium: 1250, effective_date: '2026-04-15', inactive_date: '', status: 'Active' },
                { id: '2', policy: 'POL-1002', premium: -125, effective_date: '2026-03-01', inactive_date: '2025-12-31', status: 'Inactive' },
                { id: '3', policy: 'POL-1003', premium: 499.5, effective_date: '2026-04-30', inactive_date: '2027-01-15', status: 'Pending' },
                { id: '4', policy: 'POL-1004', premium: 500, effective_date: '2026-05-01', inactive_date: '', status: 'Active' }
            ]
        }
    }));

    // ═══════════════════════════════════════════════════════════════════════════
    //  html viewer tests
    // ═══════════════════════════════════════════════════════════════════════════

    const html_viewer_tests = () => {
        const sampleHtml = `
            <html><head><style>
                body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
                h1 { color: #4e63e0; border-bottom: 2px solid #4e63e0; padding-bottom: 10px; }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                th, td { border: 1px solid #ddd; padding: 10px 14px; text-align: left; }
                th { background-color: #f1f3f5; font-weight: 600; }
                tr:nth-child(even) { background-color: #f9f9f9; }
                .total-row td { font-weight: 700; border-top: 2px solid #333; }
                .footer { margin-top: 30px; font-size: 13px; color: #888; }
            </style></head><body>
                <h1>Invoice #INV-2026-0042</h1>
                <p><strong>Bill To:</strong> Acme Corp<br><strong>Date:</strong> March 22, 2026<br><strong>Due:</strong> April 21, 2026</p>
                <table>
                    <tr><th>Item</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr>
                    <tr><td>Medicare Supplement Plan G — Annual Premium</td><td>1</td><td>$2,244.00</td><td>$2,244.00</td></tr>
                    <tr><td>Dental + Vision Rider</td><td>1</td><td>$384.00</td><td>$384.00</td></tr>
                    <tr><td>Policy Processing Fee</td><td>1</td><td>$25.00</td><td>$25.00</td></tr>
                    <tr class="total-row"><td colspan="3">Total</td><td>$2,653.00</td></tr>
                </table>
                <p class="footer">Thank you for your business. Payment is due within 30 days.</p>
            </body></html>`;

        const encodedHtml = '<p>This was <strong>entity-encoded</strong> HTML &amp; decoded automatically.</p>';
        
        if (!run('HTML [1]', mosaic.html(sampleHtml,     { title: 'HTML [1/9] — Preview (default mode)', width: '80vw', height: '85vh', top: '0', filename: 'Invoice_INV-2026-0042.pdf', content_theme: 'content' }))) return;
        if (!run('HTML [2]', mosaic.html(sampleHtml,     { title: 'HTML [2/9] — Auto Print', width: '80vw', height: '85vh', top: '0', filename: 'Invoice_AutoPrint.pdf', mode: 'print' }))) return;
        if (!run('HTML [3]', mosaic.html(sampleHtml,     { filename: 'Invoice_PrintAndClose.pdf', mode: 'print' }))) return;
        if (!run('HTML [4]', mosaic.html(encodedHtml,    { title: 'HTML [4/9] — Entity-Encoded Content', width: '60vw', height: '400px' }))) return;
        if (!run('HTML [5]', mosaic.html(sampleHtml,     { title: 'HTML [5/9] — View Only (no print button)', width: '80vw', height: '85vh', top: '0', buttons: ['Close'] }))) return;
        if (!run('HTML [6]', mosaic.html(sampleHtml,     { title: 'HTML [6/9] — Custom Buttons', width: '80vw', height: '85vh', top: '0', filename: 'Invoice_Custom.pdf', buttons: ['Cancel', { display_value: 'Download PDF', style: 'success' }] }))) return;
        if (!run('HTML [7]', mosaic.html(sampleHtml,     { title: 'HTML [7/9] — Print + Download PDF', width: '80vw', height: '85vh', top: '0', filename: 'Invoice_INV-2026-0042.pdf', connection: 'writer_connection', buttons: ['Close', 'Print', { label: 'Download PDF', style: 'primary' }] }))) return;
        if (!run('HTML [8]', mosaic.html(sampleHtml,     { filename: 'Invoice_DownloadMode.pdf', connection: 'writer_connection', mode: 'download'}))) return;
        mosaic.message.success('HTML viewer tests complete!', { title: 'HTML — Done' });
    };

    // ═══════════════════════════════════════════════════════════════════════
    //  pdf viewer tests
    // ═══════════════════════════════════════════════════════════════════════
 
    const pdf_viewer_tests = () => {

        const sampleHtml = `
            <html><head><style>
                body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
                h1 { color: #4e63e0; border-bottom: 2px solid #4e63e0; padding-bottom: 10px; }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                th, td { border: 1px solid #ddd; padding: 10px 14px; text-align: left; }
                th { background-color: #f1f3f5; font-weight: 600; }
                tr:nth-child(even) { background-color: #f9f9f9; }
                .total-row td { font-weight: 700; border-top: 2px solid #333; }
                .footer { margin-top: 30px; font-size: 13px; color: #888; }
            </style></head><body>
                <h1>Invoice #INV-2026-0042</h1>
                <p><strong>Bill To:</strong> Acme Corp<br><strong>Date:</strong> March 22, 2026<br><strong>Due:</strong> April 21, 2026</p>
                <table>
                    <tr><th>Item</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr>
                    <tr><td>Medicare Supplement Plan G — Annual Premium</td><td>1</td><td>$2,244.00</td><td>$2,244.00</td></tr>
                    <tr><td>Dental + Vision Rider</td><td>1</td><td>$384.00</td><td>$384.00</td></tr>
                    <tr><td>Policy Processing Fee</td><td>1</td><td>$25.00</td><td>$25.00</td></tr>
                    <tr class="total-row"><td colspan="3">Total</td><td>$2,653.00</td></tr>
                </table>
                <p class="footer">Thank you for your business. Payment is due within 30 days.</p>
            </body></html>`;
            
        const id = mosaic.input.text('WorkDrive PDF Resource ID', { title: 'PDF Viewer Setup', placeholder: 'e.g. abcdef1234567890abcdef1234567890' });
        if (!mosaic.utils.isSuccess(id)) return;
        const wd = id.data;
        const shared = { workdrive_connection: 'workdrive_connection', width: '80vw', height: '85vh', top: '0' };
 
        if (!run('PDF [1] WD preview default',     mosaic.pdf({ type: 'workdrive', id: wd }, { ...shared, title: 'PDF [1/5] — Default Buttons', filename: 'test_preview.pdf' }))) return;
        if (!run('PDF [2] WD preview 3 buttons',   mosaic.pdf({ type: 'workdrive', id: wd }, { ...shared, title: 'PDF [2/5] — Close+Download+Print', filename: 'test.pdf', buttons: ['Close', 'Download', 'Print'] }))) return;
        if (!run('PDF [3] WD view only',           mosaic.pdf({ type: 'workdrive', id: wd }, { ...shared, title: 'PDF [3/5] — View Only', buttons: ['Close'] }))) return;
        if (!run('PDF [4] WD download mode',       mosaic.pdf({ type: 'workdrive', id: wd }, { mode: 'download', filename: 'test_dl.pdf', workdrive_connection: 'workdrive_connection' }))) return;
        if (!run('PDF [5] URL preview',            mosaic.pdf({ type: 'url', url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' }, { ...shared, title: 'PDF [5/5] — Public URL', filename: 'dummy.pdf' }))) return;
        if (!run('PDF [6] HTML2PDF',               mosaic.pdf({ type: 'html', content: sampleHtml}, { filename: 'Invoice_html2pdf_test.pdf', connection: 'writer_connection'}))) return;
 
        mosaic.message.success('PDF viewer tests complete!', { title: 'PDF Viewer — Done' });
    };

    // ═══════════════════════════════════════════════════════════════════════
    //  launcher tests
    // ═══════════════════════════════════════════════════════════════════════

    const launcher_tests = () => {
        const example_launcher_options = [
            { actual_value: 'new_deal', display_value: 'New Deal', description: 'Create a new deal record', icon: 'fa-plus' },
            { actual_value: 'send_email', display_value: 'Send Email', description: 'Send email to contact', icon: 'fa-envelope' },
            { actual_value: 'run_report', display_value: 'Run Sales Report', icon: 'fa-chart-bar' },
            { actual_value: 'example_item', display_value: 'Example Item - No Icon' },
            { actual_value: 'example_item2', display_value: 'Example Item - Call' },
            { actual_value: 'example_item3', display_value: 'Example Item - Delete' },
            { actual_value: 'example_item4', display_value: 'Example Item - Confirm' },
        ];

        if (!run('Launcher [1] Example Data', mosaic.launcher(example_launcher_options, { show_search: true, match_mode: 'fuzzy', placeholder: 'Type to search...', show_description: true, show_icons: true, close_icon: false, close_on_escape: true, width: '500px', height: '500px', force_focus: true }))) return;

        if (!run('Launcher [2] Status Dots — Named + Hex', mosaic.launcher([
            { actual_value: 'send_email', display_value: 'Send Email',    description: 'Named: success',       icon: 'fa-envelope',    status_color: 'success'  },
            { actual_value: 'run_report', display_value: 'Run Report',    description: 'Named: warning',       icon: 'fa-chart-bar',   status_color: 'warning'  },
            { actual_value: 'delete',     display_value: 'Delete Record', description: 'Named: error',         icon: 'fa-trash',       status_color: 'error'    },
            { actual_value: 'view_info',  display_value: 'View Info',     description: 'Named: info',          icon: 'fa-circle-info', status_color: 'info'     },
            { actual_value: 'ask',        display_value: 'Ask Question',  description: 'Named: question',      icon: 'fa-question',    status_color: 'question' },
            { actual_value: 'custom',     display_value: 'Custom Hex',    description: 'Hex: 03989E (no #)',   icon: 'fa-star',        status_color: '03989E'   },
            { actual_value: 'custom2',    display_value: 'Custom Hex #',  description: 'Hex: #E91E63 (with #)',icon: 'fa-heart',       status_color: '#E91E63'  },
            { actual_value: 'no_dot',     display_value: 'No Status',     description: 'No status_color — empty gutter', icon: 'fa-gear' }
        ], { title: 'Status Dots — Named + Hex', show_description: true, width: '750px', height: '750px' }))) return;

        if (!run('Launcher [3] Status Dots — No Icons', mosaic.launcher([
            { actual_value: 'a', display_value: 'Item A', description: 'success dot, icons off', status_color: 'success' },
            { actual_value: 'b', display_value: 'Item B', description: 'no dot' },
            { actual_value: 'c', display_value: 'Item C', description: 'error dot, icons off',   status_color: 'error'   }
        ], { title: 'Status Dots — show_icons: false', show_icons: false, show_description: true }))) return;

        if (!run('Launcher [4] No Status Colors — Normal Layout', mosaic.launcher([
            { actual_value: 'a', display_value: 'Item A', description: 'No dots in this list' },
            { actual_value: 'b', display_value: 'Item B', description: 'Layout should be identical to default' },
            { actual_value: 'c', display_value: 'Item C' }
        ], { title: 'No Status Colors — Normal Layout', show_description: true, height: '300px' }))) return;

        mosaic.message.success('Launcher tests complete!', { title: 'mosaic.launcer()' });
    };

    // ═══════════════════════════════════════════════════════════════════════
    //  file upload file field test
    // ═══════════════════════════════════════════════════════════════════════
 
    const file_upload_file_field_tests = () => {
        const o = { module: $Page.module, record_id: $Page.record.id, accept: '.pdf', width: '700px', destination: { type: 'field', field_type: 'file', field_name: 'File_Upload_Field', connection: 'crm_connection' } };
        if (!run('File Upload [1]', mosaic.input.file('Select File', { ...o, title: 'Upload File to Field (original)' }))) return;
        if (!run('File Upload [2]', mosaic.input.file('Select File', { ...o, title: 'Upload File to Field (rename)', filename: `${record.id} - ${new Date().toISOString()}` }))) return;
    };

    // ═══════════════════════════════════════════════════════════════════════
    //  file upload image field test
    // ═══════════════════════════════════════════════════════════════════════

    const file_upload_image_field_tests = () => {
        const o = { module: $Page.module, record_id: $Page.record.id, accept: 'image/*', height: '400px', width: '700px', destination: { type: 'field', field_type: 'image', field_name: 'Image_Upload_Field', connection: 'crm_connection' } };
        if (!run('Image Upload [1]', mosaic.input.file('Select Image', { ...o, title: 'Upload Image (original)' }))) return;
        if (!run('Image Upload [2]', mosaic.input.file('Select Image', { ...o, title: 'Upload Image (rename)', filename: `${record.id} - ${new Date().toISOString()}` }))) return;
    };

    // ═══════════════════════════════════════════════════════════════════════
    //  file upload workdrive test
    // ═══════════════════════════════════════════════════════════════════════

    const file_upload_workdrive_tests = () => {
        const o = { module: $Page.module, record_id: $Page.record.id, accept: '.pdf,.xlsx,.docx', height: '400px', width: '750px', destination: { type: 'workdrive', folder_id: record.Workdrive_Folder_ID, connection: 'workdrive_connection', override_existing: true } };
        if (!run('Workdrive [1]', mosaic.input.file('Select File', { ...o, title: 'Upload to WorkDrive (original)' }))) return;
        if (!run('Workdrive [2]', mosaic.input.file('Select File', { ...o, title: 'Upload to WorkDrive (rename)', filename: `${record.id} - ${new Date().toISOString()}` }))) return;
    };

    // ═══════════════════════════════════════════════════════════════════════
    //  file upload attachment test
    // ═══════════════════════════════════════════════════════════════════════

    const file_upload_attachments_tests = () => {
        const o = { module: $Page.module, record_id: $Page.record.id, height: '400px', width: '750px', destination: { type: 'attachment' } };
        if (!run('Attachments [1]', mosaic.input.file('Select File', { ...o, title: 'Upload to Attachments (original)' }))) return;
        $Client.refresh();
        if (!run('Attachments [2]', mosaic.input.file('Select File', { ...o, title: 'Upload to Attachments (rename)', filename: `${record.id} - ${new Date().toISOString()}` }))) return;
        $Client.refresh();
        if (!run('Attachments [3]', mosaic.input.file('Select File', { ...o, title: 'Upload to Attachments (multiple files)', multiple: true }))) return;
        $Client.refresh();
    };

    // ═══════════════════════════════════════════════════════════════════════
    //  mosaic utils test
    // ═══════════════════════════════════════════════════════════════════════

    const utility_functions_tests = () => {
        const res = mosaic.input('Enter some example text:', { title: 'Utility Function Test', default_value: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.....', width: '500px', height: '500px', buttons: ['Cancel', 'Confirm'] });
        console.log('[MOSAIC.TESTS] utils testResponse', res);
        const msg = [
            `Response:\n\`\`\`\n${pretty(res)}\n\`\`\`\n`,
            `Utility Function Results:`,
            `- isSuccess: ${mosaic.utils.isSuccess(res)}`,
            `- isCancelled: ${mosaic.utils.isCancelled(res)}`,
            `- getButtonClicked: ${mosaic.utils.getButtonClicked(res)}`,
            `- wasButtonClicked("Cancel"): ${mosaic.utils.wasButtonClicked(res, 'Cancel')}`,
            `- wasButtonClicked("Confirm"): ${mosaic.utils.wasButtonClicked(res, 'Confirm')}`,
            `- wasDismissed: ${mosaic.utils.wasDismissed(res)}`,
            `- getType: ${mosaic.utils.getType(res)}`,
            `- getData: ${JSON.stringify(mosaic.utils.getData(res))}`
        ].join('\n');
        mosaic.message(msg, { title: 'Utility Function Results', show_icon: false, height: '85vh', width: '60vw', enable_markdown: true });
    };

    // ═══════════════════════════════════════════════════════════════════════════
    //  test execution router
    // ═══════════════════════════════════════════════════════════════════════════

    const runTests = {
        quick_inputs:           quick_inputs_tests,
        form_buttons:           form_buttons_test,
        form_conditions:        form_conditions_tests,
        confirmation:           confirmation_tests,
        message:                message_tests,
        splash_tests:           splash_tests,
        form_basic:             form_basic_tests,
        form_advanced:          form_advanced_tests,
        table_static:           table_static_data_tests,
        table_coql:             table_coql_data_tests,
        table_search:           table_search_data_tests,
        table_url_link:         table_url_link_tests,
        table_format_rules:     table_format_rules_tests,
        html_viewer:            html_viewer_tests,
        pdf_viewer:             pdf_viewer_tests,
        launcher_tests:         launcher_tests,
        file_to_field:          file_upload_file_field_tests,
        image_upload:           file_upload_image_field_tests,
        upload_to_workdrive:    file_upload_workdrive_tests,
        upload_to_attachments:  file_upload_attachments_tests,
        utils:                  utility_functions_tests
    };

    runTests[selectedTest] && runTests[selectedTest]();
    console.log('[MOSAIC.TESTS] Test completed:', selectedTest);
}
