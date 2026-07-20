/**
 * Mosaic - popup & flyout UI framework for Zoho CRM client scripts.
 *
 * Load this file as a required Static Resource on a client script and the
 * global `mosaic` object becomes available. Every dialog method opens the
 * Mosaic widget as a popup (or flyout with `flyout: true`), **blocks** until
 * the user responds, and returns a `MosaicResponse` object (`null` if
 * dismissed). Do not `await` these calls - they are synchronous.
 *
 * **Dialogs**
 * - `mosaic.form(options)` - multi-field form (15+ field types, validation, conditions, file uploads)
 * - `mosaic.input(label, options)` - single-field prompt (+ `.text` `.date` `.picklist` `.file` … shorthands)
 * - `mosaic.table(options)` - data table from static / COQL / search sources, with export
 * - `mosaic.launcher(items, options)` - searchable command palette
 * - `mosaic.confirmation(msg, options)` / `mosaic.message(msg, options)` - dialogs (+ `.info` `.success` … shorthands)
 * - `mosaic.html(content, options)` / `mosaic.pdf(source, options)` - HTML / PDF viewers (preview, print, download)
 * - `mosaic.html2pdf(content, options)` / `mosaic.pdffiller(source, fields, options)` / `mosaic.pdfmerge(sources, options)` - headless PDF tools
 *
 * **Host UI (no popup)**
 * - `mosaic.splash(msg, { type })` - toast (+ `.info` `.success` `.warning` `.error`)
 * - `mosaic.loader(message)` - page loader; call with no arguments to hide (also `.show()` / `.hide()`)
 *
 * **Helpers**
 * - `mosaic.utils` - response inspection (`isSuccess`, `getData`, `wasButtonClicked`, …)
 * - `mosaic.DEFAULTS` - mutable per-session defaults (connections, sizes, buttons)
 * - `mosaic.OVERRIDES` - org-level format overrides derived from `$Crm`
 *
 * @example
 * const r = mosaic.form({
 *     title: 'New Deal',
 *     fields: [
 *         { name: 'deal_name', label: 'Deal Name', type: 'text', required: true },
 *         { name: 'closing',   label: 'Closing Date', type: 'date' }
 *     ]
 * });
 * if (mosaic.utils.isSuccess(r)) {
 *     const data = mosaic.utils.getData(r);
 *     mosaic.splash.success(`Saved ${data.deal_name}!`);
 * }
 *
 * @version 1.0.0
 * @author NeuronHuskie
 * @license MIT
 * @see https://github.com/NeuronHuskie/mosaic-zcrm
 */
const mosaic = (function() {
    'use strict';

    const VERSION = '1.0.0';
    const WIDGET_API_NAME = 'mosaic';

    // ╭──────────────────────────────────────────────────╮
    // │                  configuration                   │
    // ╰──────────────────────────────────────────────────╯

    const DEFAULTS = {
        // ── global defaults ───────────────────────────────────────────────────
        // set your org's connection names here or via mosaic.DEFAULTS.connections.* in your client script
        connections:            { workdrive: undefined, writer: undefined },
        debug:                  false,
        // ── general popup/flyout defaults ─────────────────────────────────────
        flyout_max_width_vw:    45,
        flyout_max_height_vh:   72,
        popup:                  { top: '20px', left: 'center', animation_type: 4 },
        flyout:                 { header: '☰', top: '20px', left: 'center', animation_type: 1 },
        // ── methods defaults ──────────────────────────────────────────────────
        confirmation:           { height: '350px', width: '420px',  buttons: ['Cancel', 'OK'],      close_icon: true, close_on_escape: false, submit_on_enter: false, enable_markdown: true },
        message:                { height: '350px', width: '420px',  buttons: ['OK'],                close_icon: true, close_on_escape: true,  submit_on_enter: true,  enable_markdown: true, show_buttons: true, show_icon: true, message_type: 'info' },
        form:                   { height: '70vh',  width: '600px',  buttons: ['Cancel', 'Submit'],  close_icon: true, close_on_escape: false, submit_on_enter: true, enable_markdown: true, force_focus: true,   fields: [] },
        table:                  { height: '70vh',  width: '800px',  buttons: ['Cancel', 'Submit'],  close_icon: true, close_on_escape: false, force_focus: true, show_buttons: true, show_search: false, selectable: true, required: false, allow_multiple: true, selection_limit: 0, allow_export: false, sort_order: 'desc', per_page: 10, columns: [] },
        launcher:               { height: '500px', width: '500px',  buttons: [],                    close_icon: true, close_on_escape: true,  force_focus: true, show_buttons: false, show_search: true, placeholder: 'Type to search...', match_mode: 'fuzzy', show_icons: true, show_description: true, items: [] },
        html:                   { height: '80vh',  width: '50vw',   buttons: ['Close', 'Print'],    close_icon: true, close_on_escape: true, mode: 'preview' },
        pdf:                    { height: '80vh',  width: '50vw',   buttons: ['Close', 'Download'], close_icon: true, close_on_escape: true, mode: 'preview' },
        input:                  { height: '350px', width: '400px',  buttons: ['Cancel', 'OK'],      close_icon: true, close_on_escape: false, submit_on_enter: true, force_focus: true, required: true, enable_markdown: true }
    };

    /**
     * Org-level override defaults, merged into every widget call.
     * Per-call `options.overrides` take precedence over these values.
     * See {@link MosaicOverrides} for all available keys.
     */
    const OVERRIDES = Object.freeze(typeof $Crm !== 'undefined' ? {
        date_format_display: $Crm.user?.date_format,
        org_domain_name:     $Crm.org?.domain_name,
        deployment:          $Crm.deployment,
    } : {});

    const TYPE_THEMES         = ['info', 'success', 'warning', 'error', 'question'];
    const OPTIONS_FIELD_TYPES = ['checkbox', 'radio', 'picklist', 'multiselect'];
    const INPUT_FIELD_TYPES   = ['text', 'textarea', 'number', 'email', 'tel', 'url', 'date', 'time', 'datetime-local', 'picklist', 'multiselect', 'checkbox', 'radio', 'file'];
    const INPUT_ALIASES       = { datetime: 'datetime-local', phone: 'tel' };
    const PASS_THROUGH_KEYS   = ['min', 'max', 'minlength', 'maxlength', 'pattern', 'pattern_message', 'visible_options', 'rows', 'use_date_input', 'accept', 'filename', 'disable_past_dates', 'searchable', 'multiple', 'break_before', 'conditions'];

    // ╭──────────────────────────────────────────────────╮
    // │                     typedefs                     │
    // ╰──────────────────────────────────────────────────╯

    /**
     * @typedef {Object} MosaicOverrides
     * @property {string} [date_format_display]    - Format shown in date inputs (e.g. 'MM/dd/yyyy')
     * @property {string} [date_format_return]     - Format used in submitted data (e.g. 'yyyy-MM-dd')
     * @property {string} [time_format_display]    - Format shown in time inputs (e.g. 'h:mm AM/PM')
     * @property {string} [time_format_return]     - Format used in submitted data (e.g. 'HH:mm')
     * @property {string} [phone_country_code]     - Phone country code (e.g. 'US', 'GB', 'AU')
     * @property {string} [phone_format_display]   - Phone display mask (e.g. '(###) ###-####')
     * @property {string} [phone_format_return]    - Phone return format: 'E164'|'national'|'raw'|'display'
     * @property {string} [api_domain]             - Zoho API domain (e.g. 'https://www.zohoapis.eu')
     * @property {string} [org_domain_name]        - Org domain name (e.g. 'yourcompanyname')
     * @property {string} [deployment]             - Org deployment / datacenter (eg. 'US')
     * @property {string} [theme]                  - Force widget theme: 'light'|'dark'
     */

    /**
     * @typedef {Object} MosaicPopupOptions
     * @property {string}  [header]                - Popup header text (in title bar)
     * @property {string}  [height]                - Popup height (e.g. '350px', '70vh')
     * @property {string}  [width]                 - Popup width (e.g. '420px')
     * @property {string}  [top='20px']            - Popup position from top
     * @property {string}  [left='center']         - Popup position from left
     * @property {string}  [bottom]                - Popup position from bottom (overrides top)
     * @property {string}  [right]                 - Popup position from right (overrides left)
     * @property {boolean} [close_icon=true]       - Show close icon in popup header
     * @property {boolean} [close_on_escape=true]  - Close popup when Escape key is pressed
     * @property {number}  [animation_type=4]      - Popup animation type (1–6)
     * @property {MosaicOverrides} [overrides={}]  - Override default widget behavior
     */

    /**
     * @typedef {Object} MosaicFlyoutOptions
     * @property {string}  [header='☰']           - Flyout header text (in title bar)
     * @property {string}  [height]                - Flyout height (e.g. '80vh'; max ~80vh)
     * @property {string}  [width]                 - Flyout width (e.g. '50vw'; max ~50vw)
     * @property {string}  [top='20px']            - Flyout offset from top; use 'center' to vertically center
     * @property {string}  [left='center']         - Flyout offset from left; use 'center' to horizontally center
     * @property {string}  [bottom]                - Flyout offset from bottom (overrides top)
     * @property {string}  [right]                 - Flyout offset from right (overrides left)
     * @property {number}  [animation_type=1]      - Flyout animation type (1–6)
     * @property {boolean} [close_icon=true]       - Show close icon in flyout (rendered by widget; ZDK close_icon is always overridden to false)
     * @property {boolean} [close_on_escape=true]  - Close flyout when Escape key is pressed
     * @property {boolean} [close_on_exit]         - Close flyout when user navigates away from the page
     * @property {MosaicOverrides} [overrides={}]  - Override default widget behavior
     */

    /**
     * @typedef {Object} MosaicFieldConfig
     *
     * ── core ─────────────────────────────────────────────────────────────────
     * @property {string}  name                     - Field name (used as key in response data)
     * @property {string}  label                    - Field label displayed to user
     * @property {'text'|'textarea'|'number'|'email'|'tel'|'url'|'date'|'time'|'datetime-local'|'picklist'|'multiselect'|'checkbox'|'radio'|'file'|'description'|'button'|'divider'|'group'} [type='text'] - Field type
     * @property {boolean} [required=false]         - Whether the field is required
     * @property {boolean} [break_before=false]     - Force this field to start on a new line in the form layout
     * @property {string}  [placeholder]            - Placeholder text for input fields
     * @property {*}       [default_value]          - Default field value
     *
     * ── validation ───────────────────────────────────────────────────────────
     * @property {number} [min]                     - Minimum value (number) or minimum selections (multiselect/checkbox)
     * @property {number} [max]                     - Maximum value (number) or maximum selections (multiselect/checkbox)
     * @property {number} [minlength]               - Minimum character length (text/textarea/tel)
     * @property {number} [maxlength]               - Maximum character length (text/textarea/tel)
     * @property {string} [pattern]                 - Regex pattern for validation (text/textarea/tel/email)
     * @property {string} [pattern_message]         - Custom error message when pattern validation fails
     * @property {MosaicCondition[]} [conditions]   - Show this field only when all conditions are met
     *
     * ── options / choices ────────────────────────────────────────────────────
     * @property {Array<string|{actual_value:string, display_value:string}>} [options] - Options for picklist/multiselect/checkbox/radio fields
     * @property {number}  [visible_options]        - Number of options visible before scrolling
     * @property {number}  [rows]                   - Number of visible rows for textarea fields
     * @property {boolean} [use_date_input]         - Use native date picker for date fields
     *
     * ── file upload ──────────────────────────────────────────────────────────
     * @property {string}                [accept]           - Accepted file types (e.g. '.pdf,.doc,image/*')
     * @property {string}                [filename]         - Filename for file input (ignored when multiple=true)
     * @property {boolean}               [multiple=false]   - Allow uploading multiple files
     * @property {MosaicFileDestination} [destination]      - File upload destination configuration
     *
     * ── button / group fields ────────────────────────────────────────────
     * @property {string} [action]                 - (button type only) JS expression to execute on click
     * @property {MosaicButtonStyle|'outlined'} [style] - Visual style: button style (button type) or 'outlined' (group type)
     * @property {MosaicFieldConfig[]} [fields]    - Child fields (group type only)
     */

    /**
     * @typedef {Object} MosaicFileDestination
     * @property {'attachment'|'workdrive'|'field'} [type='attachment'] - Upload destination type
     * @property {'file'|'image'} [field_type]      - Field type for file/image upload fields
     * @property {string} [field_name]              - Field API name for file/image upload fields
     * @property {string} [folder_id]               - WorkDrive folder ID
     * @property {string} [connection]              - Connection name for WorkDrive
     * @property {boolean} [override_existing=true] - Override existing files with the same name
     */

    /**
     * @typedef {Object} MosaicCondition
     * @property {string} field - Source field name to evaluate
     * @property {'not_empty'|'empty'|'equals'|'not_equals'|'contains'|'greater_than'|'less_than'|'between'|'before'|'after'|'in'|'not_in'} operator - Comparison operator
     * @property {*} [value] - Expected value; use `[min, max]` for `between` and an array for `in` / `not_in`; unused for `empty` / `not_empty`
     *
     * Comparisons are case-insensitive and use submitted option values. Checkbox groups and multiselects match against selected value arrays.
     */

    /**
     * @typedef {Object} MosaicTableLinkConfig
     * @property {string} [module]   - CRM module name for record links
     * @property {string} [id_key]   - Dot-notation path to the record ID for CRM record links
     * @property {string} [url_key]  - Dot-notation path to a dynamic URL field
     * @property {string} [text_key] - Dot-notation path to dynamic link text
     * @property {string} [url]      - Static URL for every row
     * @property {string} [text]     - Static link text
     */

    /**
     * @typedef {Object} MosaicTableFormatConfig
     * @property {'currency'|'number'|'date'} type - Display formatter type
     * @property {string} [currency]              - Currency code required for currency formatting; omitted values render raw and log a warning
     * @property {string} [locale]                 - Locale passed to Intl.NumberFormat
     * @property {number} [decimals]               - Decimal places for number/currency formatting
     * @property {string} [input_date_format]      - Optional date input format hint for parsing non-ISO dates
     *
     * Date display uses the current CRM user's date format automatically.
     */

    /**
     * @typedef {Object} MosaicTableCellStyle
     * @property {string} [color]              - Text color, such as '#097969'
     * @property {string} [background-color]   - Cell background color, such as '#f0fff4'
     * @property {string} [font-weight]        - Font weight, such as '600' or 'bold'
     * @property {string} [font-style]         - Font style, such as 'italic'
     * @property {string} [text-align]         - Text alignment, such as 'right'
     * @property {string} [border-left]        - Left border, such as '3px solid #097969'
     * @property {string} [opacity]            - Cell opacity, such as '0.7'
     */

    /**
     * @typedef {Object} MosaicTableStyleRule
     * @property {'not_empty'|'empty'|'equals'|'not_equals'|'contains'|'greater_than'|'less_than'|'before'|'after'|'between'|'in'|'not_in'} operator - Raw-value comparison operator
     * @property {*} [value]                    - Comparison value; use a two-item array for between and an array for in/not_in
     * @property {'cell'|'row'} [target='cell'] - Whether matching styles apply to the cell or the entire row
     * @property {MosaicTableCellStyle} [style] - Safe inline cell styles to apply when the rule matches
     */

    /**
     * @typedef {Object} MosaicTableColumnConfig
     * @property {string}  header                       - Column header text
     * @property {string}  key                          - Data field key; supports dot notation
     * @property {MosaicTableLinkConfig} [link]         - Optional link configuration
     * @property {MosaicTableFormatConfig} [format]     - Optional display formatter
     * @property {MosaicTableStyleRule[]} [rules]       - Optional conditional cell/row styles evaluated against the raw value
     * @property {boolean} [sortable=true]              - Set to false to remove the sort button from this column's header
     * @property {boolean} [raw_html=false]             - Set to true to render the cell value as raw HTML instead of escaped text. Only use with values constructed from controlled data sources - never with user-supplied field values
     */

    /**
     * @typedef {Object} MosaicPdfSource
     * @property {'workdrive'|'url'|'base64'|'html'} type - Source type
     * @property {string} [id]         - WorkDrive resource ID (workdrive type)
     * @property {string} [url]        - Public URL to a PDF file (url type)
     * @property {string} [content]    - Base64 string or HTML string (base64/html types)
     * @property {string} [connection] - Per-source connection override (workdrive/html types; overrides options.workdrive_connection / options.writer_connection)
     * @property {string} [pages]      - Page selection for merge mode (e.g. '1-3', '2,5-8') - merge sources only
     */

    /**
     * @typedef {'primary'|'secondary'|'cancel'|'destructive'|'success'|'warning'|'error'} MosaicButtonStyle
     */

    /**
     * @typedef {Object} MosaicButtonConfig
     * @property {string}            label      - Button label text shown to the user
     * @property {MosaicButtonStyle} [style]    - Visual style of the button.
     *                                           style: 'cancel' also bypasses form validation (same as auto-cancel labels).
     * @property {string}            [value]    - Return identifier in response.button_clicked.value.
     *                                           Defaults to label when not set.
     *                                           For html/pdf viewers, 'download' and 'print' also trigger those actions.
     *                                           Plain string buttons use the string as both label and value.
     * @property {boolean}           [validate] - Set to false to skip validation and return current (unvalidated) form data.
     *                                           Useful for back navigation in multi-page forms or save-draft buttons. Defaults to true.
     */

    /**
     * @typedef {Object} MosaicButtonClicked
     * @property {string} label - Button label text (what was shown to the user)
     * @property {string} value - Return identifier (equals label when value was not set on button config)
     */

    /**
     * @typedef {Object} MosaicResponse
     * @property {boolean}             success        - Whether a button was clicked (not cancelled)
     * @property {boolean}             cancelled      - Whether the dialog was cancelled
     * @property {MosaicButtonClicked|null} button_clicked - Button that was clicked, or null if dismissed
     * @property {*}                   data           - Response data (type varies by widget)
     * @property {string}              type           - Widget type ('confirmation'|'message'|'form'|'table'|'launcher'|'html'|'pdf')
     */

    // ╭──────────────────────────────────────────────────╮
    // │                 internal helpers                 │
    // ╰──────────────────────────────────────────────────╯

    /**
     * debug-only console helper for client scripts
     * mirrors the widget console prefix styling without the full widget logging api
     * @private
     */
    const con = (() => {
        const BASE = 'color:#fff;font-weight:600;padding:2px 6px;border-radius:4px';
        const BG = { log: '#1e4f7a', warn: '#7a4f00', error: '#8a2f2f', info: '#1f6b52', debug: '#5a3f7a' };
        const write = method => (...args) => DEFAULTS.debug && (console[method] || console.log).call(console, '%c[mosaic.cscript]', `background:${BG[method] || BG.log};${BASE}`, ...args);
        return Object.freeze({ log: write('log'), warn: write('warn'), err: write('error'), info: write('info'), debug: write('debug') });
    })();

    /**
     * Return an object containing only keys that are explicitly defined.
     * Preserves falsy-but-valid values such as false, 0, and ''.
     * @private
     * @param {Object} source
     * @param {string[]} keys
     * @returns {Object}
     */
    const pickDefined = (source = {}, keys = []) => {
        const cfg = {};
        keys.forEach(key => {
            if (source[key] !== undefined) cfg[key] = source[key];
        });
        return cfg;
    };

    /**
     * Resolve selected option keys using defaults as the fallback source.
     * Caller values win unless they are null/undefined.
     * @private
     * @param {Object} options
     * @param {Object} defaults
     * @param {string[]} keys
     * @returns {Object}
     */
    const resolveConfig = (options = {}, defaults = {}, keys = []) => {
        const cfg = {};
        keys.forEach(key => {
            cfg[key] = options[key] ?? defaults[key];
        });
        return cfg;
    };

    /**
     * Merge OVERRIDES defaults with per-call overrides, excluding undefined values.
     * OVERRIDES provides org-level defaults; options.overrides wins on conflict.
     * @private
     * @param {MosaicOverrides} [callOverrides={}]
     * @returns {MosaicOverrides}
     */
    const buildOverrides = (callOverrides = {}) =>
        Object.fromEntries(
            Object.entries({ ...OVERRIDES, ...callOverrides }).filter(([, v]) => v !== undefined)
        );

    /**
     * Clamp flyout width/height to safe viewport-relative ceilings before ZDK receives them.
     * Zoho silently clips values exceeding its hard caps (50vw width, 80vh height) with no error.
     * Supports 'px', 'vw', and 'vh' units - other units pass through unchanged.
     * @private
     * @param {Object} cfg - Flyout config object (mutated in place)
     * @returns {Object} cfg
     */
    const clampFlyoutDimensions = (cfg = {}) => {
        const DIM_RE = /^(\d+(?:\.\d+)?)(px|vw|vh)$/i;
        const AXES = {
            width:  { relUnit: 'vw', maxRel: DEFAULTS.flyout_max_width_vw },
            height: { relUnit: 'vh', maxRel: DEFAULTS.flyout_max_height_vh },
        };

        const viewportPx = (axis) => {
            if (typeof window === 'undefined') return null;
            return axis === 'width' ? window.innerWidth : window.innerHeight;
        };

        const warnAndReturn = (axis, value, clamped) => {
            con.warn(`clampFlyoutDimensions | ${axis} clamped: '${value}' → '${clamped}'`);
            return clamped;
        };

        const clamp = (value, axis) => {
            const m = value && DIM_RE.exec(value);
            if (!m) return value;

            const num = parseFloat(m[1]);
            const unit = m[2].toLowerCase();
            const { relUnit, maxRel } = AXES[axis];

            if (unit === relUnit && num > maxRel) return warnAndReturn(axis, value, `${maxRel}${relUnit}`);

            if (unit === 'px') {
                const vp = viewportPx(axis);
                if (!vp) return value;

                const maxPx = Math.floor(vp * maxRel / 100);
                if (num > maxPx) return warnAndReturn(axis, value, `${maxPx}px`);
            }

            return value;
        };

        cfg.width = clamp(cfg.width, 'width');
        cfg.height = clamp(cfg.height, 'height');
        return cfg;
    };

    /**
     * Build popup configuration object for ZDK.Client.openPopup
     * @private
     */
    const buildPopupConfig = (options = {}, type_defaults = {}) => ({
        api_name:        WIDGET_API_NAME,
        type:            'widget',
        header:          options.header,
        close_icon:      options.close_icon ?? type_defaults.close_icon,
        close_on_escape: options.close_on_escape ?? type_defaults.close_on_escape,
        animation_type:  options.animation_type ?? DEFAULTS.popup.animation_type,
        height:          options.height ?? type_defaults.height,
        width:           options.width ?? type_defaults.width,

        ...(options.bottom !== undefined
            ? { bottom: options.bottom }
            : { top: options.top ?? DEFAULTS.popup.top }),

        ...(options.right !== undefined
            ? { right: options.right }
            : { left: options.left ?? DEFAULTS.popup.left })
    });

    /**
     * Build flyout configuration object for ZDK.Client.createFlyout
     * @private
     */
    const buildFlyoutConfig = (options = {}, type_defaults = {}) => clampFlyoutDimensions({
        api_name:        WIDGET_API_NAME,
        type:            'widget',
        header:          options.header ?? DEFAULTS.flyout.header,
        animation_type:  options.animation_type ?? DEFAULTS.flyout.animation_type,
        close_on_escape: options.close_on_escape ?? type_defaults.close_on_escape,
        close_icon:      options.close_icon ?? type_defaults.close_icon,
        height:          options.height ?? type_defaults.height,
        width:           options.width ?? type_defaults.width,

        ...(options.bottom !== undefined
            ? { bottom: options.bottom }
            : { top: options.top ?? DEFAULTS.flyout.top }),

        ...(options.right !== undefined
            ? { right: options.right }
            : { left: options.left ?? DEFAULTS.flyout.left }),

        ...pickDefined(options, ['close_on_exit'])
    });

    /**
     * Normalize a raw flyout notify response.
     * Converts the widget's dismiss sentinel to null so callers get null on dismissal,
     * matching popup semantics.
     * @private
     * @param {*} response - Raw response from flyout.notify()
     * @returns {MosaicResponse|null}
     */
    const normalizeFlyoutResponse = (response) => {
        if (response == null || response?.__mosaic_dismissed === true) return null;
        return response;
    };

    /**
     * Execute the popup and return response
     * @private
     * @param {Object} popupConfig  - Popup configuration for ZDK.Client.openPopup
     * @param {Object} mosaicConfig - Mosaic widget-specific configuration
     * @param {string} logPrefix    - Prefix for console logging
     * @returns {MosaicResponse|null} Response object or null if dismissed
     */
    const executePopup = (popupConfig, mosaicConfig, logPrefix) => {
        try {
            mosaicConfig.overrides       = buildOverrides(mosaicConfig.overrides);
            mosaicConfig.close_on_escape = popupConfig.close_on_escape;
            popupConfig.close_on_escape  = false;
            mosaicConfig._zdk_config     = popupConfig;
            mosaicConfig.debug           = mosaicConfig.debug ?? DEFAULTS.debug;
            const response = ZDK.Client.openPopup(popupConfig, mosaicConfig);
            con.log(`${logPrefix}:`, response ?? 'closed via escape');
            return response;
        } catch (error) {
            if (String(error).includes('widget_closed')) return null;
            con.err(`${logPrefix} error:`, error);
            return { success: false, error: true, error_message: error?.message || String(error) || 'Unknown error' };
        }
    };

    /**
     * Execute the flyout and return response.
     * Zoho's client script engine treats notify({ wait: true }) as a synchronous blocking
     * call - it pauses execution until the widget calls ZDK.Client.sendResponse(). Using
     * async/await here breaks that behaviour by yielding to the event loop, which causes
     * Zoho to attempt NotifyAndWait delivery before the widget has loaded its listener.
     * @private
     * @param {Object} flyoutConfig - Flyout configuration for ZDK.Client.createFlyout
     * @param {Object} mosaicConfig - Mosaic widget-specific configuration
     * @param {string} logPrefix    - Prefix for console logging
     * @returns {MosaicResponse|null} Response object or null
     */
    const executeFlyout = (flyoutConfig, mosaicConfig, logPrefix) => {
        const flyoutId = `mosaic_flyout_${Date.now()}`;
        let flyout;

        try {
            Object.assign(mosaicConfig, {
                overrides:       buildOverrides(mosaicConfig.overrides),
                close_on_escape: flyoutConfig.close_on_escape,
                close_icon:      flyoutConfig.close_icon,
                flyout:          true,
                flyout_id:       flyoutId,
                debug:           mosaicConfig.debug ?? DEFAULTS.debug
            });

            flyoutConfig.close_on_escape = false;
            flyoutConfig.close_icon      = false;
            mosaicConfig._zdk_config     = flyoutConfig;

            const widgetRef = { api_name: WIDGET_API_NAME, type: 'widget' };

            ZDK.Client.createFlyout(flyoutId, flyoutConfig);
            flyout = ZDK.Client.getFlyout(flyoutId);
            flyout.open(widgetRef, mosaicConfig);

            const response = normalizeFlyoutResponse(flyout.notify({}, { wait: true }));
            flyout.close();

            con.log(`${logPrefix} (flyout):`, response ?? 'closed/dismissed');

            return response;
        } catch (error) {
            try { flyout?.close(); } catch (_) {}
            if (String(error).includes('widget_closed')) return null;
            con.err(`${logPrefix} (flyout) error:`, error);
            return { success: false, error: true, error_message: error?.message || String(error) || 'Unknown error' };
        }
    };

    /**
     * Route to popup or flyout based on options.flyout
     * @private
     * @returns {MosaicResponse|null}
     */
    const execute = (options = {}, type_defaults = {}, mosaicConfig = {}, logPrefix) => options.flyout
        ? executeFlyout(buildFlyoutConfig(options, type_defaults), mosaicConfig, logPrefix)
        : executePopup(buildPopupConfig(options, type_defaults), mosaicConfig, logPrefix);

    // ╭──────────────────────────────────────────────────╮
    // │                  primary methods                 │
    // ╰──────────────────────────────────────────────────╯

    // ── confirmation ─────────────────────────────────────────────────────────

    /**
     * Display a confirmation dialog with customizable message and buttons.
     *
     * @param {string} msg - The confirmation message to display (supports markdown by default)
     * @param {Object} [options={}] - Configuration options
     *
     * ── core ─────────────────────────────────────────────────────────────────
     * @param {string} [options.title] - Dialog title displayed above the message
     * @param {Array<string|MosaicButtonConfig>} [options.buttons=['Cancel','OK']] - Button configuration
     *
     * ── behavior ─────────────────────────────────────────────────────────────
     * @param {boolean} [options.enable_markdown=true] - Enable markdown rendering in message
     * @param {boolean} [options.submit_on_enter=false] - Submit when Enter key is pressed
     *
     * ── popup / position ─────────────────────────────────────────────────────
     * @param {MosaicPopupOptions} [options] - Popup size, position, and behavior options
     *
     * ── flyout ───────────────────────────────────────────────────────────────
     * @param {boolean} [options.flyout=false] - Open as a ZDK Flyout instead of popup.
     *   Returns MosaicResponse|null after the flyout sends a response or is dismissed.
     *   See {@link MosaicFlyoutOptions} for flyout-specific sizing and position options.
     *
     * @returns {MosaicResponse|null} Response object or null if dismissed
     *
     * @example
     * const result = mosaic.confirmation('Are you sure you want to proceed?');
     * if (mosaic.utils.isSuccess(result)) { ... }
     *
     * @example
     * const result = mosaic.confirmation('Delete this record permanently?', {
     *     title: 'Confirm Deletion',
     *     buttons: ['Cancel', { label: 'Delete', style: 'destructive' }]
     * });
     */
    const confirmation = (msg, options = {}) => {
        const d = DEFAULTS.confirmation;
        const mosaicConfig = {
            type:    'confirmation',
            title:   options.title || '',
            message: msg,
            buttons: options.buttons ?? d.buttons,
            overrides: options.overrides || {},
            ...resolveConfig(options, d, ['enable_markdown', 'submit_on_enter']),
        };
        return execute(options, d, mosaicConfig, 'Confirmation');
    };

    // ── message ───────────────────────────────────────────────────────────────

    /**
     * Display a message popup with icon and customizable styling.
     * Shorthand methods: `mosaic.message.info()` · `.success()` · `.warning()` · `.error()` · `.question()`
     *
     * @param {string} msg           - The message to display (supports markdown by default)
     * @param {Object} [options={}]  - Configuration options
     *
     * ── core ─────────────────────────────────────────────────────────────────
     * @param {string} [options.title]                                       - Title displayed above the message
     * @param {'info'|'success'|'warning'|'error'|'question'} [options.type='info'] - Message type (sets icon and color)
     * @param {boolean} [options.show_icon=true]                             - Show the message type icon
     * @param {Array<string|MosaicButtonConfig>} [options.buttons=['OK']]    - Button configuration
     * @param {boolean} [options.show_buttons=true]                          - Show action buttons
     *
     * ── behavior ─────────────────────────────────────────────────────────────
     * @param {boolean} [options.enable_markdown=true]  - Enable markdown rendering in message
     * @param {boolean} [options.submit_on_enter=true]  - Submit when Enter key is pressed
     *
     * ── popup / position ─────────────────────────────────────────────────────
     * @param {MosaicPopupOptions} [options]            - Popup size, position, and behavior options
     *
     * ── flyout ───────────────────────────────────────────────────────────────
     * @param {boolean} [options.flyout=false]          - Open as a ZDK Flyout instead of popup.
     *   Returns MosaicResponse|null after the flyout sends a response or is dismissed.
     *   See {@link MosaicFlyoutOptions} for flyout-specific sizing and position options.
     *
     * @returns {MosaicResponse|null} Response object or null if dismissed
     *
     * @example
     * mosaic.message('Operation completed successfully.');
     * mosaic.message('Save failed. Please try again.', { title: 'Error', type: 'error' });
     * mosaic.message.success('Record saved!');
     * mosaic.message.error('Something went wrong.');
     */
    const message = (msg, options = {}) => {
        const d = DEFAULTS.message;
        const mosaicConfig = {
            type:         'message',
            title:        options.title || '',
            message:      msg,
            message_type: options.type ?? d.message_type,
            buttons:      options.buttons ?? d.buttons,
            overrides:    options.overrides || {},
            ...resolveConfig(options, d, ['show_icon', 'show_buttons', 'enable_markdown', 'submit_on_enter']),
        };
        return execute(options, d, mosaicConfig, 'Message');
    };

    // message type helpers: message.info(), message.success(), message.warning(), message.error(), message.question()
    TYPE_THEMES.forEach(type => {
        message[type] = (msg, opts = {}) => message(msg, { ...opts, type });
    });

    // ── form ──────────────────────────────────────────────────────────────────

    /**
     * Display a form popup with customizable fields.
     *
     * @param {Object} [options={}] - Configuration options
     *
     * ── core ─────────────────────────────────────────────────────────────────
     * @param {string} [options.title] - Form title displayed above fields
     * @param {MosaicFieldConfig[]} [options.fields=[]] - Array of field configurations
     * @param {Object} [options.default_values={}] - Pre-populate fields by name without setting default_value per field: { fieldName: value, ... }
     * @param {Array<string|MosaicButtonConfig>} [options.buttons=['Cancel','Submit']] - Button configuration
     *
     * ── behavior ─────────────────────────────────────────────────────────────
     * @param {boolean} [options.enable_markdown=true] - Enable markdown rendering in description fields and supported labels/content
     * @param {boolean} [options.submit_on_enter=true] - Submit form when Enter key is pressed
     *
     * ── record context ────────────────────────────────────────────────────────
     * @param {string} [options.module] - Zoho CRM module API name (required for file uploads)
     * @param {string} [options.record_id] - Zoho CRM record ID (required for file uploads)
     *
     * ── popup / position ─────────────────────────────────────────────────────
     * @param {MosaicPopupOptions} [options] - Popup size, position, and behavior options
     *
     * ── flyout ───────────────────────────────────────────────────────────────
     * @param {boolean} [options.flyout=false] - Open as a ZDK Flyout instead of popup.
     *   Returns MosaicResponse|null after the flyout sends a response or is dismissed.
     *   See {@link MosaicFlyoutOptions} for flyout-specific sizing and position options.
     *
     * @returns {MosaicResponse|null} - Response object or null if dismissed
     * @returns {Object} - response.data - Field values keyed by field name
     *
     * @example
     * const result = mosaic.form({
     *     title: 'Contact Information',
     *     fields: [
     *         { name: 'name',  label: 'Full Name', type: 'text',  required: true },
     *         { name: 'email', label: 'Email',     type: 'email', required: true },
     *         { name: 'notes', label: 'Notes',     type: 'textarea', rows: 4 }
     *     ]
     * });
     * if (mosaic.utils.isSuccess(result)) {
     *     const { name, email } = mosaic.utils.getData(result);
     * }
     *
     * @example
     * // Picklist + multiselect
     * const result = mosaic.form({
     *     fields: [
     *         { name: 'rating',   label: 'Rating',        type: 'picklist',    options: ['Excellent', 'Good', 'Poor'] },
     *         { name: 'features', label: 'Features Used', type: 'multiselect', options: ['Dashboard', 'Reports', 'API'], min: 1, max: 3 }
     *     ]
     * });
     *
     * @example
     * // Pattern validation
     * const result = mosaic.form({
     *     fields: [{
     *         name: 'code', label: 'Product Code', type: 'text',
     *         pattern: '^[A-Z]{3}-[0-9]{4}$', pattern_message: 'Format must be ABC-1234'
     *     }]
     * });
     *
     * @example
     * // EU data center + dark theme overrides
     * const result = mosaic.form({
     *     fields: [{ name: 'start_date', label: 'Start Date', type: 'date' }],
     *     overrides: { date_format_display: 'dd/MM/yyyy', api_domain: 'https://www.zohoapis.eu', theme: 'dark' }
     * });
     *
     * @example
     * // Flyout mode
     * const result = mosaic.form({ flyout: true, title: 'Quick Edit', fields: [...] });
     * if (mosaic.utils.isSuccess(result)) { ... }
     *
     * @example
     * // Back navigation in a multi-page form - skip validation, return current data
     * const result = mosaic.form({
     *     fields: page2Fields,
     *     default_values: state.page2 ?? {},
     *     buttons: [
     *         { label: 'Back', value: 'back', validate: false },
     *         { label: 'Next', style: 'primary' }
     *     ]
     * });
     * if (mosaic.utils.wasButtonValue(result, 'back')) { state.page2 = result.data; }
     */
    const form = (options = {}) => {
        const d = DEFAULTS.form;
        const mosaicConfig = {
            type:      'form',
            title:     options.title || '',
            buttons:   options.buttons ?? d.buttons,
            overrides: options.overrides || {},
            ...resolveConfig(options, d, ['fields', 'enable_markdown', 'submit_on_enter', 'force_focus']),
            ...pickDefined(options, ['module', 'record_id', 'default_values']),
        };
        return execute(options, d, mosaicConfig, 'Form');
    };

    // ── table ─────────────────────────────────────────────────────────────────

    /**
     * Display a table selection popup with optional search and export functionality.
     *
     * @param {Object} [options={}] - Configuration options
     *
     * ── core ─────────────────────────────────────────────────────────────────
     * @param {string} [options.title] - Table title
     * @param {MosaicTableColumnConfig[]} [options.columns=[]] - Column definitions. Supports links, display formatting, and conditional rules.
     * @param {Array<string|MosaicButtonConfig>} [options.buttons=['Cancel','Submit']] - Button configuration
     * @param {boolean} [options.show_buttons=true] - Show action buttons
     *
     * ── data source ───────────────────────────────────────────────────────────
     * @param {Object} options.source - Data source config (required)
     * @param {'static'|'coql'|'search'} options.source.type - Data source type
     * @param {Array<Object>} [options.source.data] - Row objects (static type only)
     * @param {string} [options.source.query] - COQL query string (coql type only)
     * @param {string} [options.source.module] - CRM module to search (search type only)
     * @param {'word'|'criteria'|'email'|'phone'} [options.source.search_type='word'] - Search type (search type only)
     * @param {Array<string>} [options.source.fields] - Fields to match against (search criteria type only)
     *
     * ── display ──────────────────────────────────────────────────────────────
     * @param {boolean}        [options.show_search=false] - Enable local table filtering (data/coql modes only)
     * @param {boolean}        [options.allow_export=false] - Enable export button (CSV, XLSX, PDF, JSON)
     * @param {string}         [options.search_placeholder] - Placeholder text for search/filter input
     * @param {number}         [options.per_page=10] - Number of records per page
     * @param {'wrap'|'clip'}  [options.overflow_mode='wrap'] - Initial text-overflow mode. 'wrap' wraps long cell values; 'clip' truncates with ellipsis and shows full value on hover
     *
     * ── sorting ──────────────────────────────────────────────────────────────
     * @param {string}           [options.sort_field] - Field name to sort by on load; header sort controls apply to the current page only
     * @param {'asc'|'desc'}     [options.sort_order='desc'] - Initial sort direction
     *
     * ── selection ────────────────────────────────────────────────────────────
     * @param {boolean} [options.selectable=true] - Allow row selection
     * @param {boolean} [options.allow_multiple=true] - Allow multiple row selection (checkbox vs radio)
     *
     * ── record context ────────────────────────────────────────────────────────
     * @param {string} [options.module] - Zoho CRM module API name
     * @param {string} [options.record_id] - Zoho CRM record ID
     *
     * ── popup / position ─────────────────────────────────────────────────────
     * @param {MosaicPopupOptions} [options] - Popup size, position, and behavior options
     *
     * ── flyout ───────────────────────────────────────────────────────────────
     * @param {boolean} [options.flyout=false] - Open as a ZDK Flyout instead of popup.
     *   Returns MosaicResponse|null after the flyout sends a response or is dismissed.
     *   See {@link MosaicFlyoutOptions} for flyout-specific sizing and position options.
     *
     * @returns {MosaicResponse|null} - Response object or null if dismissed
     * @returns {Array<Object>|Object} - response.data - Selected records (array if allow_multiple, single object otherwise)
     *
     * @example
     * // Currency/date formatting and conditional amount styling
     * const result = mosaic.table({
     *     title: 'Policies',
     *     columns: [
     *         { header: 'Deal Name', key: 'Deal_Name', link: { module: 'Deals', id_key: 'id' } },
     *         { header: 'Effective Date', key: 'Effective_Date', format: { type: 'date' } },
     *         {
     *             header: 'Premium',
     *             key: 'Amount',
     *             format: { type: 'currency', currency: 'USD', decimals: 2 },
     *             rules: [
     *                 { operator: 'greater_than', value: 500, style: { color: '#097969' } },
     *                 { operator: 'less_than', value: 0, style: { color: '#c1121f' } }
     *             ]
     *         },
     *         {
     *             header: 'Inactive Date',
     *             key: 'Inactive_Date',
     *             format: { type: 'date', input_date_format: 'yyyy-MM-dd' },
     *             rules: [
     *                 { operator: 'before', value: '2026-01-01', target: 'row', style: { 'background-color': '#fff3f3' } }
     *             ]
     *         }
     *     ],
     *     source: { type: 'static', data: policies }
     * });
     *
     * @example
     * // Static data with local filtering
     * const result = mosaic.table({
     *     title: 'Select Products',
     *     columns: [{ header: 'Name', key: 'name' }, { header: 'Price', key: 'price' }],
     *     source: { type: 'static', data: [{ id: 1, name: 'Widget', price: '$10' }] },
     *     show_search: true
     * });
     *
     * @example
     * // COQL query with export and clickable columns
     * const result = mosaic.table({
     *     columns: [
     *         { header: 'Name',     key: 'Full_Name',    link: { module: 'Contacts', id_key: 'id' } },
     *         { header: 'Email',    key: 'Email' },
     *         { header: 'Proposal', key: 'Proposal_URL', link: { url_key: 'Proposal_URL', text: 'View Proposal' } }
     *     ],
     *     source: { type: 'coql', query: 'select Full_Name, Email, Proposal_URL from Contacts limit 100' },
     *     allow_export: true, show_search: true
     * });
     *
     * @example
     * // API search mode (table starts empty, user types to search)
     * const result = mosaic.table({
     *     columns: [{ header: 'Name', key: 'Full_Name' }, { header: 'Email', key: 'Email' }],
     *     source: { type: 'search', module: 'Contacts', search_type: 'criteria', fields: ['Full_Name', 'Email'] },
     *     search_placeholder: 'Search by name or email...'
     * });
     * if (mosaic.utils.isSuccess(result)) {
     *     mosaic.utils.getData(result).forEach(r => console.log(r.Full_Name));
     * }
     */
    const table = (options = {}) => {
        const d = DEFAULTS.table;
        const mosaicConfig = {
            type:      'table',
            title:     options.title || '',
            buttons:   options.buttons ?? d.buttons,
            overrides: options.overrides || {},
            ...resolveConfig(options, d, [
                'columns', 'required', 'selectable', 'allow_multiple', 'selection_limit',
                'show_buttons', 'per_page', 'show_search', 'allow_export', 'force_focus'
            ]),
            ...pickDefined(options, ['source', 'search_placeholder', 'overflow_mode', 'module', 'record_id']),
        };

        // sort_field pulls sort_order along with it
        if (options.sort_field) {
            mosaicConfig.sort_field = options.sort_field;
            mosaicConfig.sort_order = options.sort_order ?? d.sort_order;
        }

        return execute(options, d, mosaicConfig, 'Table');
    };

    // ── launcher ──────────────────────────────────────────────────────────────

    /**
     * Display a command palette / launcher popup.
     *
     * @param {Array<{actual_value:string, display_value:string, description?:string, icon?:string, status_color?:string}>} items - Items to display
     * @param {Object} [options={}] - Configuration options
     * @param {string} [options.title] - Launcher title
     * @param {boolean} [options.show_search=true] - Show search input
     * @param {'fuzzy'|'contains'|'exact'} [options.match_mode='fuzzy'] - Search matching mode
     * @param {string} [options.placeholder='Type to search...'] - Search placeholder text
     * @param {boolean} [options.show_description=true] - Show item descriptions
     * @param {boolean} [options.show_icons=true] - Show item icons
     * @param {boolean} [options.show_buttons=false] - Show action buttons
     * @param {MosaicPopupOptions} [options] - Popup size, position, and behavior options
     * @param {boolean} [options.flyout=false] - Open as a ZDK Flyout instead of popup.
     *   Returns MosaicResponse|null after the flyout sends a response or is dismissed.
     *   See {@link MosaicFlyoutOptions} for flyout-specific sizing and position options.
     * @returns {MosaicResponse|null}
     * @returns {Object} response.data - The selected item ({ actual_value, display_value, description, icon, status_color, index })
     *                                   or null if closed via a button rather than item selection
     * @example
     * mosaic.launcher([
     *      { actual_value: 'new_deal',    display_value: 'New Deal',         description: 'Create a new deal record', icon: 'fa-plus' },
     *      { actual_value: 'send_email',  display_value: 'Send Email',       description: 'Send email to contact',    icon: 'fa-envelope' },
     *      { actual_value: 'run_report',  display_value: 'Run Sales Report', icon: 'fa-chart-bar' }
     *  ],
     *  {
     *      title: 'Quick Actions',
     *      match_mode: 'fuzzy',        // 'exact' | 'contains' | 'fuzzy' (default)
     *      placeholder: 'Type to search...',
     *      show_description: true,
     *      show_icons: true
     * });
     *
     * @example
     * mosaic.launcher([
     *      { actual_value: 'active',   display_value: 'Active Deals',   status_color: 'success',   icon: 'fa-briefcase' },
     *      { actual_value: 'pending',  display_value: 'Pending Review', status_color: 'warning',   icon: 'fa-hourglass-half' },
     *      { actual_value: 'escalated',display_value: 'Escalated',      status_color: '#D94841', icon: 'fa-triangle-exclamation' },
     *      { actual_value: 'custom',   display_value: 'Custom Queue',   status_color: '03989E',    icon: 'fa-circle-info' }
     * ], {
     *      title: 'Status Actions'
     * });
     *
     */
    const launcher = (items, options = {}) => {
        const d = DEFAULTS.launcher;
        const mosaicConfig = {
            type:      'launcher',
            title:     options.title || '',
            items:     items || d.items,
            buttons:   options.buttons ?? d.buttons,
            overrides: options.overrides || {},
            ...resolveConfig(options, d, [
                'show_search', 'match_mode', 'placeholder',
                'show_description', 'show_icons', 'show_buttons', 'force_focus'
            ]),
        };
        return execute(options, d, mosaicConfig, 'Launcher');
    };

    // ── html ──────────────────────────────────────────────────────────────────

    /**
     * Display an HTML preview popup with optional print and PDF download support.
     *
     * @param {string} content - Raw HTML string to display (auto-decodes URL-encoded, entity-encoded, and JSON-stringified HTML)
     * @param {Object} [options={}] - Configuration options
     *
     * ── core ─────────────────────────────────────────────────────────────────
     * @param {string} [options.title] - Title displayed above the preview
     * @param {string} [options.filename] - Filename for print dialog title and PDF download
     * @param {'preview'|'print'} [options.mode='preview'] - Viewer mode
     * @param {Array<string|MosaicButtonConfig>} [options.buttons=['Close','Print']] - Button configuration.
     *   Set value: 'download' to trigger PDF download, value: 'print' to trigger print; any other value closes and is returned as button_clicked.value.
     * @param {string} [options.writer_connection] - Zoho Writer connection name (for PDF download button; falls back to DEFAULTS.connections.writer)
     *
     * ── content theme ────────────────────────────────────────────────────────
     * @param {'content'|'widget'} [options.content_theme='content'] - Content area theme isolation.
     *   'content' (default): the HTML's own <style> tags fully control appearance, and the preview matches
     *   what the user gets when they Print or Download as PDF.
     *   'widget': content area inherits the widget's light/dark theme - useful for plain unstyled HTML
     *   snippets that should match the widget chrome.
     *
     * ── popup / position ─────────────────────────────────────────────────────
     * @param {MosaicPopupOptions} [options] - Popup size, position, and behavior options
     *
     * ── flyout ───────────────────────────────────────────────────────────────
     * @param {boolean} [options.flyout=false] - Open as a ZDK Flyout instead of popup.
     *   Returns MosaicResponse|null after the flyout sends a response or is dismissed.
     *   See {@link MosaicFlyoutOptions} for flyout-specific sizing and position options.
     *
     * @returns {MosaicResponse|null} - Response object or null if dismissed
     * @returns {Object} response.data - ({ base64, downloaded, printed })
     *
     * @example
     * mosaic.html(invoiceHtml, {
     *     title: 'Invoice Preview',
     *     filename: 'Invoice_2026.pdf',
     *     buttons: ['Close', 'Print', { label: 'Download PDF', style: 'primary' }],
     *     writer_connection: 'writer_connection'
     * });
     *
     * @example
     * // Print directly (no preview, print dialog opens, widget closes)
     * mosaic.html(letterHtml, { filename: 'Welcome_Letter.pdf', mode: 'print' });
     *
     * @example
     * // Inherit widget light/dark theme for plain unstyled HTML
     * mosaic.html(plainHtml, { content_theme: 'widget', title: 'Preview' });
     */
    const html = (content, options = {}) => {
        const d = DEFAULTS.html;
        const mosaicConfig = {
            type:              'html',
            title:             options.title || '',
            html:              content,
            filename:          options.filename || '',
            mode:              options.mode ?? d.mode,
            buttons:           options.buttons ?? d.buttons,
            writer_connection: options.writer_connection || DEFAULTS.connections.writer || '',
            overrides:         options.overrides || {},
            ...pickDefined(options, ['content_theme']),
        };
        return execute(options, d, mosaicConfig, 'HTML');
    };

    // ── pdf ───────────────────────────────────────────────────────────────────

    /**
     * Display a PDF viewer popup with preview, download, and merge support.
     *
     * @param {MosaicPdfSource|null} source - PDF source configuration. Must be a typed source object
     *   ({ type: 'workdrive', id: '...' }, { type: 'base64', content: '...' }, etc.) - never a plain string.
     *   Pass null for merge mode.
     * @param {Object} [options={}]
     *
     * ── core ─────────────────────────────────────────────────────────────────
     * @param {string} [options.title] - Title displayed above the preview (falls back to filename in viewer)
     * @param {string} [options.filename] - Suggested filename for download
     * @param {'preview'|'download'|'merge'|'fill'} [options.mode='preview'] - Viewer mode
     * @param {Array<string|MosaicButtonConfig>} [options.buttons=['Close','Download']] - Button configuration.
     *   Set value: 'download' to trigger download, value: 'print' to trigger print; any other value closes and is returned as button_clicked.value.
     * @param {boolean} [options.show_toolbar=false] - Show the browser's built-in PDF toolbar in preview mode (Chromium-based browsers only). Hidden by default.
     *
     * ── merge mode ───────────────────────────────────────────────────────────
     * @param {MosaicPdfSource[]} [options.sources] - Array of source objects (merge mode)
     *
     * ── connections ──────────────────────────────────────────────────────────
     * @param {string} [options.workdrive_connection] - WorkDrive connection name
     * @param {string} [options.writer_connection] - Writer connection name (for html sources)
     *
     * ── popup / position ─────────────────────────────────────────────────────
     * @param {MosaicPopupOptions} [options]
     *
     * ── flyout ───────────────────────────────────────────────────────────────
     * @param {boolean} [options.flyout=false] - Open as a ZDK Flyout instead of popup.
     *   Returns MosaicResponse|null after the flyout sends a response or is dismissed.
     *   See {@link MosaicFlyoutOptions} for flyout-specific sizing and position options.
     *
     * @returns {MosaicResponse|null}
     * @returns {Object} response.data - ({ base64, downloaded, printed })
     *
     * @example
     * // Preview a WorkDrive PDF
     * mosaic.pdf({ type: 'workdrive', id: 'abc123...' }, { title: 'Invoice', filename: 'Invoice.pdf' });
     *
     * @example
     * // Preview a base64 PDF
     * mosaic.pdf({ type: 'base64', content: pdfBase64String }, { filename: 'Report.pdf' });
     *
     * @example
     * // Preview HTML converted to PDF
     * mosaic.pdf({ type: 'html', content: htmlString }, { filename: 'Letter.pdf', writer_connection: 'writer_conn' });
     *
     * @example
     * // Merge multiple sources with page selection
     * mosaic.pdf(null, {
     *     mode: 'merge',
     *     sources: [
     *         { type: 'workdrive', id: 'abc123', pages: '1-3' },
     *         { type: 'html', content: coverPageHtml, connection: 'writer_conn' },
     *         { type: 'base64', content: appendixBase64 }
     *     ],
     *     filename: 'Combined.pdf'
     * });
     */
    const pdf = (source, options = {}) => {
        const mode = options.mode ?? DEFAULTS.pdf.mode;
        const type_defaults = ['download', 'fill', 'merge'].includes(mode)
            ? { ...DEFAULTS.pdf, height: '200px', width: '350px', buttons: [] }
            : DEFAULTS.pdf;

        const mosaicConfig = {
            type:                 'pdf',
            mode,
            source,
            title:                options.title || '',
            filename:             options.filename || '',
            buttons:              options.buttons ?? type_defaults.buttons,
            writer_connection:    options.writer_connection    || DEFAULTS.connections.writer    || '',
            workdrive_connection: options.workdrive_connection || DEFAULTS.connections.workdrive || '',
            overrides:            options.overrides || {},
            ...pickDefined(options, ['sources', 'fields', 'remove_pages', 'skip_download', 'show_toolbar']),
            ...(options.flatten !== undefined && { flatten: options.flatten }),
        };

        return execute(options, type_defaults, mosaicConfig, 'PDF');
    };

    // ╭──────────────────────────────────────────────────╮
    // │                     wrappers                     │
    // ╰──────────────────────────────────────────────────╯

    // ── input ─────────────────────────────────────────────────────────────────

    /**
     * Quick single-field input popup - a convenience wrapper around `mosaic.form()`.
     * Shorthand methods: `mosaic.input.text()` · `.number()` · `.email()` · `.tel()` / `.phone()` · `.url()`
     *   · `.date()` · `.time()` · `.datetime()` · `.picklist()` · `.multiselect()` · `.checkbox()` · `.radio()` · `.file()`
     *
     * @param {string} label         - Field label (also used as popup title if `options.title` is not set)
     * @param {Object} [options={}]  - Configuration options
     *
     * ── core ─────────────────────────────────────────────────────────────────
     * @param {string} [options.title] - Popup title (defaults to label)
     * @param {'text'|'textarea'|'number'|'email'|'tel'|'url'|'date'|'time'|'datetime-local'|'picklist'|'multiselect'|'checkbox'|'radio'|'file'} [options.type='text'] - Input type
     * @param {boolean} [options.required=true]  - Whether the input is required
     * @param {string}  [options.placeholder]    - Input placeholder text
     * @param {*}       [options.default_value]  - Default input value
     * @param {string}  [options.instructions]   - Help text displayed below the field
     * @param {Array<string|MosaicButtonConfig>} [options.buttons=['Cancel','OK']] - Button configuration
     *
     * ── options / choices ────────────────────────────────────────────────────
     * @param {Array<string|{actual_value:string, display_value:string}>} [options.options] - Options for picklist/multiselect/checkbox/radio types
     * @param {number}  [options.visible_options] - Number of options visible before scrolling
     * @param {number}  [options.rows]            - Number of visible rows for textarea
     * @param {boolean} [options.use_date_input]  - Use native date picker for date type
     *
     * ── validation ───────────────────────────────────────────────────────────
     * @param {number} [options.min]              - Minimum value (number) or minimum selections (multiselect/checkbox)
     * @param {number} [options.max]              - Maximum value (number) or maximum selections (multiselect/checkbox)
     * @param {number} [options.minlength]        - Minimum character length (text/textarea/tel)
     * @param {number} [options.maxlength]        - Maximum character length (text/textarea/tel)
     * @param {string} [options.pattern]          - Regex pattern for validation
     * @param {string} [options.pattern_message]  - Custom error message when pattern validation fails
     * @param {MosaicCondition[]} [options.conditions] - Show the input only when all conditions are met
     *
     * ── file upload ──────────────────────────────────────────────────────────
     * @param {string}                [options.accept]             - Accepted file types (e.g. '.pdf,.doc')
     * @param {string}                [options.filename]           - Filename for file input (ignored when multiple=true)
     * @param {boolean}               [options.multiple=false]     - Allow uploading multiple files.
     * @param {MosaicFileDestination} [options.destination]        - File upload destination configuration
     *
     * ── behavior ─────────────────────────────────────────────────────────────
     * @param {boolean} [options.submit_on_enter=true] - Submit when Enter key is pressed
     *
     * ── record context ────────────────────────────────────────────────────────
     * @param {string} [options.module]     - Zoho CRM module API name (required for file uploads)
     * @param {string} [options.record_id]  - Zoho CRM record ID (required for file uploads)
     *
     * ── popup / position ─────────────────────────────────────────────────────
     * @param {MosaicPopupOptions} [options] - Popup size, position, and behavior options
     *
     * @returns {MosaicResponse|null} Response object or null if dismissed
     * @returns {*} response.data - The unwrapped input value (not wrapped in `{ value: ... }`)
     *
     * @example
     * const result = mosaic.input('Enter your name');
     * if (mosaic.utils.isSuccess(result)) console.log('Name:', result.data);
     *
     * @example
     * const email = mosaic.input.email('Email Address');
     * const count = mosaic.input.number('Quantity', { min: 1, max: 100, default_value: 1 });
     * const code  = mosaic.input.text('Product Code', {
     *     pattern: '^[A-Z]{3}-[0-9]{4}$', pattern_message: 'Format must be ABC-1234'
     * });
     */
    const input = (label, options = {}) => {
        const rawFieldType = options.type || 'text';
        const fieldType    = INPUT_ALIASES[rawFieldType] || rawFieldType;

        const fieldConfig = {
            name:          'value',
            label:         label,
            type:          fieldType,
            required:      options.required ?? DEFAULTS.input.required,
            placeholder:   options.placeholder || '',
            default_value: options.default_value ?? '',
            ...pickDefined(options, ['instructions', ...PASS_THROUGH_KEYS]),
        };

        // options for field types that support them
        if (OPTIONS_FIELD_TYPES.includes(fieldType) && options.options) fieldConfig.options = options.options;

        // file destination config
        if (fieldType === 'file' && options.destination) {
            const d = options.destination;
            fieldConfig.destination = {
                type:              d.type || 'attachment',
                override_existing: d.override_existing !== false,
                ...pickDefined(d, ['field_type', 'field_name', 'folder_id', 'connection']),
            };
        }

        const formOptions = { ...options };
        delete formOptions.type;

        const d = DEFAULTS.input;
        const formConfig = {
            ...formOptions,
            title:  options.title || label,
            fields: [fieldConfig],
            ...resolveConfig(options, d, ['buttons', 'submit_on_enter', 'force_focus', 'close_on_escape', 'close_icon', 'enable_markdown']),
            height: options.height ?? d.height,
            width:  options.width  ?? d.width,
            overrides: options.overrides || {},
        };

        const response = form(formConfig);

        // unwrap { value: ... } to just the value
        if (response?.success && response?.data?.value !== undefined) response.data = response.data.value;

        return response;
    };

    // input type helpers: input.text(), input.textarea(), input.number(), etc.
    INPUT_FIELD_TYPES.forEach(type => { input[type] = (label, opts = {}) => input(label, { ...opts, type }); });

    // aliases: input.datetime → input['datetime-local'], input.phone → input.tel
    Object.entries(INPUT_ALIASES).forEach(([alias, type]) => { input[alias] = input[type]; });

    // ── html2pdf ──────────────────────────────────────────────────────────────

    /**
     * Convert HTML to PDF and download. Convenience wrapper around `mosaic.pdf()` with an html source.
     *
     * @param {string} content - Raw HTML string to convert
     * @param {Object} [options={}]
     * @param {string} [options.filename='document.pdf'] - Output PDF filename
     * @param {string} [options.writer_connection] - Zoho Writer connection name (falls back to DEFAULTS.connections.writer)
     * @returns {MosaicResponse|null}
     *
     * @example
     * mosaic.html2pdf(invoiceHtml, { filename: 'Invoice_2026.pdf', writer_connection: 'writer_connection' });
     */
    const html2pdf = (content, options = {}) => pdf({ type: 'html', content }, {
        ...options,
        mode:              'download',
        filename:          options.filename || 'document.pdf',
        writer_connection: options.writer_connection || DEFAULTS.connections.writer
    });

    // ── pdffiller ─────────────────────────────────────────────────────────────

    /**
     * Fill a PDF form and download. Headless - shows a loader, no interactive UI.
     * Convenience wrapper around `mosaic.pdf()` with `mode: 'fill'`.
     *
     * @param {MosaicPdfSource} source - PDF source. Must be a typed source object
     *   (e.g. { type: 'workdrive', id: '...' }, { type: 'base64', content: '...' }) - never a plain string.
     * @param {Array<{field:string, value:string|boolean}>} fields - PDF form fields to fill
     * @param {Object} [options={}]
     * @param {string} options.filename - Downloaded filename (`.pdf` appended if missing)
     * @param {number[]} [options.remove_pages] - Page numbers to remove before saving
     * @param {boolean} [options.flatten=true] - Flatten the PDF after filling
     * @param {string} [options.workdrive_connection] - WorkDrive connection name
     * @param {boolean} [options.skip_download=false] - Complete silently without triggering a browser download.
     *   The filled PDF is still returned as base64 in response.data; response.data.downloaded will be false.
     * @param {MosaicPopupOptions} [options]
     * @returns {MosaicResponse|null}
     * @returns {Object} response.data - ({ base64, downloaded, printed })
     *
     * @example
     * mosaic.pdffiller(
     *     { type: 'workdrive', id: 'abc123workdriveid' },
     *     [{ field: 'Full_Name', value: 'John Smith' }, { field: 'Date', value: '03/28/2026' }],
     *     { filename: 'Application.pdf' }
     * );
     *
     * @example
     * // Silent fill - get base64 without downloading
     * const result = mosaic.pdffiller(
     *     { type: 'workdrive', id: 'abc123workdriveid' },
     *     [{ field: 'Full_Name', value: 'John Smith' }],
     *     { filename: 'Application.pdf', skip_download: true }
     * );
     * if (mosaic.utils.isSuccess(result)) {
     *     const pdfBase64 = mosaic.utils.getData(result).base64;
     * }
     */
    const pdffiller = (source, fields, options = {}) => pdf(source, {
        ...options,
        mode:          'fill',
        fields:        fields,
        filename:      options.filename || 'document.pdf',
        remove_pages:  options.remove_pages ?? [],
        flatten:       options.flatten !== false,
        skip_download: options.skip_download === true,
    });

    // ── pdfmerge ──────────────────────────────────────────────────────────────

    /**
     * Merge multiple PDF sources and download. Headless - shows a loader, no interactive UI.
     * Convenience wrapper around `mosaic.pdf()` with `mode: 'merge'`.
     *
     * @param {MosaicPdfSource[]} sources - Array of source objects to merge
     * @param {Object} [options={}]
     * @param {string} [options.filename='merged.pdf'] - Downloaded filename
     * @param {string} [options.workdrive_connection] - WorkDrive connection name
     * @param {string} [options.writer_connection] - Writer connection name (for html sources)
     * @param {boolean} [options.skip_download=false] - Complete silently without triggering a browser download.
     *   The merged PDF is still returned as base64 in response.data; response.data.downloaded will be false.
     * @param {MosaicPopupOptions} [options]
     * @returns {MosaicResponse|null}
     * @returns {Object} response.data - ({ base64, downloaded, printed })
     *
     * @example
     * mosaic.pdfmerge([
     *     { type: 'workdrive', id: 'abc123', pages: '1-3' },
     *     { type: 'html', content: coverHtml },
     *     { type: 'base64', content: appendixBase64 }
     * ], { filename: 'Full_Contract.pdf' });
     *
     * @example
     * // Silent merge - get base64 without downloading
     * const result = mosaic.pdfmerge([
     *     { type: 'workdrive', id: 'abc123' },
     *     { type: 'base64', content: appendixBase64 }
     * ], { filename: 'Full_Contract.pdf', skip_download: true });
     * if (mosaic.utils.isSuccess(result)) {
     *     const pdfBase64 = mosaic.utils.getData(result).base64;
     * }
     */
    const pdfmerge = (sources, options = {}) => pdf(null, {
        ...options,
        mode:          'merge',
        sources:       sources,
        filename:      options.filename || 'merged.pdf',
        skip_download: options.skip_download === true,
    });

    // ╭──────────────────────────────────────────────────╮
    // │                    ui utilities                  │
    // ╰──────────────────────────────────────────────────╯

    // ── loader ────────────────────────────────────────────────────────────────

    /**
     * Show or hide a loading indicator.
     * Callable: `mosaic.loader('text')` shows, `mosaic.loader()` (no args) hides.
     * @namespace mosaic.loader
     *
     * @example
     * mosaic.loader('Processing...');
     * mosaic.loader.show('Processing...', { template: 'spinner' });
     * mosaic.loader();       // hide
     * mosaic.loader.hide();
     */
    const loader = Object.assign((...args) => args.length ? loader.show(...args) : loader.hide(), {
        /**
         * Show the loading indicator.
         * @param {string} [message] - Loading message (max 240 characters)
         * @param {Object} [options={}] - Configuration options
         * @param {'spinner'|'vertical-bar'|'standard'} [options.template='spinner'] - Loader style
         */
        show(message, { template = 'spinner' } = {}) {
            const cfg = { type: 'page', template };
            if (message) cfg.message = message.substring(0, 240);
            con.log(`Loader show:`, cfg);
            ZDK.Client.showLoader(cfg);
        },

        /** Hide the loading indicator. */
        hide() {
            con.log(`Loader hide`);
            ZDK.Client.hideLoader();
        }
    });

    // ── splash ────────────────────────────────────────────────────────────────

    /**
     * Display a toast/splash message using ZDK.Client.showMessage.
     * Shorthand methods: `mosaic.splash.info()` · `.success()` · `.warning()` · `.error()`
     *
     * @param {string} msg - Message text (supports limited markdown)
     * @param {Object} [options={}] - Configuration options
     * @param {'info'|'success'|'warning'|'error'} [options.type='info'] - Toast style
     *
     * @example
     * mosaic.splash('Record saved!', { type: 'success' });
     * mosaic.splash.error('Failed to save.');
     */
    const splash = (msg, { type = 'info' } = {}) => {
        con.log(`Splash (${type}):`, msg);
        ZDK.Client.showMessage(msg, { type });
    };

    // splash type helpers: splash.info(), splash.success(), splash.warning(), splash.error()
    TYPE_THEMES.filter(t => t !== 'question').forEach(type => {
        splash[type] = (msg) => splash(msg, { type });
    });

    // ╭──────────────────────────────────────────────────╮
    // │                     helpers                      │
    // ╰──────────────────────────────────────────────────╯

    /**
     * Utility functions for handling widget responses.
     * @namespace mosaic.utils
     */
    const utils = {
        /** @param {MosaicResponse} r @returns {boolean} True if response.success is true */
        isSuccess:        (r) => r?.success === true,

        /** @param {MosaicResponse} r @returns {boolean} True if the response represents a helper/widget error */
        isError:          (r) => r?.error === true,

        /** @param {MosaicResponse} r @returns {string|null} Error message or null */
        getError:         (r) => r?.error_message ?? null,

        /** @param {MosaicResponse} r @returns {boolean} True if cancelled/dismissed, excluding helper/widget errors */
        isCancelled:      (r) => r === null || r?.cancelled === true || (r?.success === false && r?.error !== true),

        /** @param {MosaicResponse} r @returns {string|null} Display label of the clicked button, or null */
        getButtonClicked:  (r) => r?.button_clicked?.label ?? null,

        /** @param {MosaicResponse} r @param {string} label @returns {boolean} True if the button's label matches */
        wasButtonClicked:  (r, label) => r?.button_clicked?.label === label,

        /** @param {MosaicResponse} r @returns {string|null} value of the clicked button, or null */
        getButtonValue:    (r) => r?.button_clicked?.value ?? null,

        /** @param {MosaicResponse} r @param {string} value @returns {boolean} True if the button's value matches */
        wasButtonValue:    (r, value) => r?.button_clicked?.value === value,

        /** @param {MosaicResponse} r @returns {*} Response data or null */
        getData:          (r) => r?.data ?? null,

        /** @param {MosaicResponse} r @returns {boolean} True if response is null (dismissed without action) */
        wasDismissed:     (r) => r === null,

        /** @param {MosaicResponse} r @returns {string|null} Widget type or null */
        getType:          (r) => r?.type ?? null
    };

    // ╭──────────────────────────────────────────────────╮
    // │                init / public api                 │
    // ╰──────────────────────────────────────────────────╯

    con.log(`Mosaic client script helper loaded [version ${VERSION}]`);

    /**
     * Mosaic Widget Library - helper library for Zoho CRM custom widgets
     * @namespace mosaic
     * @version 1.0.0
     */
    return {
        confirmation,
        message,
        form,
        table,
        launcher,
        html,
        pdf,
        input,
        html2pdf,
        pdffiller,
        pdfmerge,
        splash,
        loader,
        utils,
        version: VERSION,
        DEFAULTS,
        OVERRIDES
    };
})();
