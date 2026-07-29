/**
 * ════════════════════════════════════════════════════════════════════════
 *  mosaic.form - form building and field management module
 * ════════════════════════════════════════════════════════════════════════
 */

mosaic.form = {

    // ╭──────────────────────────────────────────────────╮ 
    // │              build the form widget               │ 
    // ╰──────────────────────────────────────────────────╯ 
    builder: {
        async build() {
            const contentContainer = document.getElementById('contentContainer');
            const buttonContainer  = document.getElementById('buttonContainer');
            mosaic.ui.container.resetBackground();

            const title  = mosaic.config.title;
            const fields = this.applyDefaultValues(mosaic.config.fields || [], mosaic.config.default_values || {});
            const flatFields = this.flattenFields(fields);

            // store flattened list on config for validators and conditions
            mosaic.runtime.form.flatFields = flatFields;

            let formHTML = `<div class="form-wrapper">
                ${title ? `<div class="form-title"><h2 class="widget-title">${mosaic.util.string.escapeHtml(title)}</h2></div>` : ''}
                <form id="mosaicForm">`;

            formHTML += mosaic.form.render.fieldList(fields);

            formHTML += `</form><div id="uploadStatusMessage"></div></div>`;
            contentContainer.innerHTML = formHTML;

            const buttons = mosaic.config.buttons || ['Cancel', 'Submit'];
            buttonContainer.innerHTML  = mosaic.ui.buttons.build(buttons, "mosaic.handlers.submit.form('${buttonText}', '${skipMode}', '${value}')", 'array');
            mosaic.uiState.statusMessageEl = document.getElementById('uploadStatusMessage');

            mosaic.form.setup.file.init();
            mosaic.form.setup.picklist.init();
            mosaic.form.setup.multiselect.init();
            mosaic.form.setup.radio.init();

            // one readiness promise shared by live clearing and focus - both wait on the
            // same deferred field setup, and building it twice would refetch user formats
            const ready = mosaic.ui.readiness.buildPromise();

            mosaic.validators.groups.form.setupLiveClearing(document.getElementById('mosaicForm'), flatFields, ready);
            mosaic.conditions.setup.init(document.getElementById('mosaicForm'), flatFields);

            if (mosaic.config.force_focus !== false) mosaic.ui.focus.force(ready);
        },

        flattenFields(fields) {
            const flatFields = [];

            fields.forEach(field => {
                if (field.type === 'group' && Array.isArray(field.fields)) {
                    flatFields.push(field); // the group itself (for conditions on the group)
                    field.fields.forEach(child => flatFields.push(child));
                } else {
                    flatFields.push(field);
                }
            });

            return flatFields;
        },

        applyDefaultValues(fields, defaultValues) {
            if (!Object.keys(defaultValues).length) return fields;
            const NON_DATA_TYPES = new Set(['divider', 'description', 'button']);
            return fields.map(field => {
                if (field.type === 'group' && Array.isArray(field.fields)) {
                    return { ...field, fields: this.applyDefaultValues(field.fields, defaultValues) };
                }
                if (field.name && !NON_DATA_TYPES.has(field.type) && defaultValues[field.name] !== undefined) {
                    return { ...field, default_value: this.coerceDefaultValue(field, defaultValues[field.name]) };
                }
                return field;
            });
        },

        // normalize response-shape values to what field renderers expect:
        //   picklist / radio                 → string (actual_value)
        //   multiselect / checkbox group     → array of strings (actual_value)
        //   everything else                  → passthrough
        // accepts either response shape ({actual_value, display_value}) or already-flat strings.
        coerceDefaultValue(field, value) {
            const isOption = (v) => v && typeof v === 'object' && 'actual_value' in v;
            if (field.type === 'picklist' || field.type === 'radio') {
                return isOption(value) ? value.actual_value : value;
            }
            if (field.type === 'multiselect' || (field.type === 'checkbox' && Array.isArray(field.options))) {
                return Array.isArray(value) ? value.map(v => isOption(v) ? v.actual_value : v) : value;
            }
            return value;
        }
    },

    // ╭──────────────────────────────────────────────────╮ 
    // │                render the fields                 │ 
    // ╰──────────────────────────────────────────────────╯ 
    render: {
        fieldList(fields) {
            let html = '';

            fields.forEach(field => {
                // structural types render their own containers (no .field-group wrapper)
                if (field.type === 'group') {
                    html += mosaic.form.fields.group.build(field);
                    return;
                }
                if (field.type === 'divider') {
                    html += mosaic.form.fields.divider.build(field);
                    return;
                }

                // break_before: inject a zero-height flex break
                if (field.break_before === true) {
                    const breakHidden = (Array.isArray(field.conditions) && field.conditions.length > 0) ? ' display: none;' : '';
                    html += `<div style="flex-basis: 100%; height: 0;${breakHidden}"></div>`;
                }

                const width = field.width || '100%';
                const style = width !== '100%'
                    ? `flex-basis: calc(${width} - (${100 / parseFloat(width) - 1} * var(--gap-form) / ${100 / parseFloat(width)}));`
                    : `flex-basis: 100%;`;

                const extraClass = field.type === 'description' ? ' description-group' : '';
                const conditionClass = (Array.isArray(field.conditions) && field.conditions.length > 0) ? ' condition-hidden' : '';

                html += `<div class="field-group${extraClass}${conditionClass}" data-field-name="${mosaic.util.string.escapeHtml(field.name || '')}" style="${style}">${mosaic.form.fields.build(field)}`;
                if (field.instructions && field.type !== 'description') html += mosaic.form.fields.instructions.build(field.instructions);
                html += `</div>`;
            });

            return html;
        }
    },

    // ╭──────────────────────────────────────────────────╮ 
    // │                  field builders                  │ 
    // ╰──────────────────────────────────────────────────╯ 
    fields: {

        constraints: {
            buildText(min, max) {
                if (min !== undefined && max !== undefined) {
                    return min === max ? ` (select exactly ${min})` : ` (select ${min}-${max})`;
                }
                if (min !== undefined) return ` (select at least ${min})`;
                if (max !== undefined) return ` (select up to ${max})`;
                return '';
            }
        },

        _buildConstraintText(...args) { return mosaic.form.fields.constraints.buildText(...args); },

        // ╭──────────────────────────────────────────────────╮
        // │            build field based on type             │
        // ╰──────────────────────────────────────────────────╯
        build(field) {
            const required    = field.required ? 'required' : '';
            const placeholder = field.placeholder || '';

            switch (field.type) {
                case 'description':     return this.description.build(field);
                case 'button':          return this.button.build(field);
                case 'file':            return this.file.build(field, required);
                case 'checkbox':        return this.checkbox.build(field, required);
                case 'radio':           return this.radio.build(field, required);
                case 'picklist':        return this.picklist.build(field, required);
                case 'multiselect':     return this.multiselect.build(field, required);
                case 'datetime-local':  return this.datetimeLocal.build(field, required);
                case 'textarea':        return this.textarea.build(field, required, placeholder);
                default:                return this.input.build(field, required, placeholder);
            }
        },

        // ╭──────────────────────────────────────────────────╮ 
        // │               instructions builder               │ 
        // ╰──────────────────────────────────────────────────╯ 
        instructions: {
            build(instructionsText) {
                return `<div class="field-instructions">${mosaic.util.string.escapeHtml(instructionsText)}</div>`;
            }
        },

        // ╭──────────────────────────────────────────────────╮ 
        // │            description field builder             │ 
        // ╰──────────────────────────────────────────────────╯ 
        description: {
            build(field) {
                const text        = field.value || field.text || field.label || '';
                const contentHtml = (mosaic.flags.enableMarkdown && typeof marked !== 'undefined')
                    ? marked.parse(text)
                    : `<p>${mosaic.util.string.escapeHtml(text)}</p>`;
                return `<div class="field-description">${contentHtml}</div>`;
            }
        },

        // ╭──────────────────────────────────────────────────╮ 
        // │             inline button field builder          │ 
        // ╰──────────────────────────────────────────────────╯ 
        button: {
            build(field) {
                const style   = field.style || 'primary';
                const btnClass = style === 'primary' ? 'btn' : `btn ${style}`;
                const label   = field.label || field.name || 'Button';
                const action  = field.action ? field.action : `mosaic.handlers.submit.form('${mosaic.util.string.escapeJsString(label)}')`;
                return `<button type="button" class="${btnClass}" onclick="${mosaic.util.string.escapeHtml(action)}">${mosaic.util.string.escapeHtml(label)}</button>`;
            }
        },

        // ╭──────────────────────────────────────────────────╮ 
        // │              group container builder             │ 
        // ╰──────────────────────────────────────────────────╯ 
        group: {
            /**
             * Build a group container that wraps child fields.
             * Called from _buildFieldList - renders its own container element.
             * @param {Object} field - Group field config with nested fields array
             * @param {Object} formRef - Reference to mosaic.form for recursive _buildFieldList
             */
            build(field) {
                const conditionClass = (Array.isArray(field.conditions) && field.conditions.length > 0) ? ' condition-hidden' : '';
                const outlinedClass  = field.style === 'outlined' ? ' outlined' : '';

                const width = field.width || '100%';
                const widthStyle = width !== '100%'
                    ? `flex-basis: calc(${width} - (${100 / parseFloat(width) - 1} * var(--gap-form) / ${100 / parseFloat(width)}));`
                    : `flex-basis: 100%;`;

                let html = '';

                if (field.break_before === true) {
                    const breakHidden = conditionClass ? ' display: none;' : '';
                    html += `<div style="flex-basis: 100%; height: 0;${breakHidden}"></div>`;
                }

                html += `<div class="field-group-container${outlinedClass}${conditionClass}" data-group-name="${mosaic.util.string.escapeHtml(field.name || '')}" style="${widthStyle}">`;

                if (field.label) html += `<div class="field-group-container-label">${mosaic.util.string.escapeHtml(field.label)}</div>`;

                html += mosaic.form.render.fieldList(field.fields || []);
                html += `</div>`;
                return html;
            }
        },

        // ╭──────────────────────────────────────────────────╮ 
        // │                 divider builder                  │ 
        // ╰──────────────────────────────────────────────────╯ 
        divider: {
            /**
             * Build a horizontal divider with optional label.
             * Called from _buildFieldList - renders its own container element.
             * @param {Object} field - Divider field config
             */
            build(field) {
                const conditionClass = (Array.isArray(field.conditions) && field.conditions.length > 0) ? ' condition-hidden' : '';

                let html = '';

                if (field.break_before === true) {
                    const breakHidden = conditionClass ? ' display: none;' : '';
                    html += `<div style="flex-basis: 100%; height: 0;${breakHidden}"></div>`;
                }

                html += `<div class="field-divider${conditionClass}" data-field-name="${mosaic.util.string.escapeHtml(field.name || '')}">`;

                if (field.label) html += `<span class="field-divider-label">${mosaic.util.string.escapeHtml(field.label)}</span>`;

                html += `<hr></div>`;
                return html;
            }
        },

        // ╭──────────────────────────────────────────────────╮ 
        // │            file upload field builder             │ 
        // ╰──────────────────────────────────────────────────╯ 
        file: {
            build(field, required) {
                const requiredHtml = field.required ? ' <span class="required-indicator">*</span>' : '';
                const accept       = field.accept   ? `accept="${field.accept}"` : '';
                const multiple     = field.multiple  ? 'multiple' : '';
                const dataMultiple = field.multiple  ? 'true' : 'false';
                const emptyText    = field.multiple  ? 'Drop files here' : 'Drop a file here';
                const ename        = mosaic.util.string.escapeHtml(field.name || '');

                return `
                    <label>${mosaic.util.string.escapeHtml(field.label ?? '')}${requiredHtml}</label>
                    <div class="file-upload-wrapper" data-field-name="${ename}" data-multiple="${dataMultiple}">
                        <label for="${ename}" class="drag-zone">
                            <i class="fa fa-cloud-upload"></i>
                            <span class="drag-zone-text">${emptyText}, or <span class="browse-link">browse</span></span>
                        </label>
                        <input type="file"
                               id="${ename}"
                               name="${ename}"
                               ${accept}
                               ${multiple}
                               ${required}>
                        <div class="file-list"></div>
                    </div>`;
            }
        },

        // ╭──────────────────────────────────────────────────╮ 
        // │              checkbox field builder              │ 
        // ╰──────────────────────────────────────────────────╯ 
        checkbox: {
            build(field, required) {
                const requiredHtml = field.required ? ' <span class="required-indicator">*</span>' : '';
                const ename        = mosaic.util.string.escapeHtml(field.name || '');

                if (Array.isArray(field.options) && field.options.length > 0) {
                    const defaultValues = Array.isArray(field.default_value) ? field.default_value : [];
                    const minAttr = field.min !== undefined ? `data-min="${field.min}"` : '';
                    const maxAttr = field.max !== undefined ? `data-max="${field.max}"` : '';

                    let labelHtml = `<label class="field-label">${mosaic.util.string.escapeHtml(field.label ?? '')}${requiredHtml}`;

                    if (field.min !== undefined || field.max !== undefined) {
                        labelHtml += `<span class="field-constraint">${mosaic.form.fields.constraints.buildText(field.min, field.max)}</span>`;
                    }

                    labelHtml += `</label>`;

                    let html = `${labelHtml}<div class="checkbox-group" ${minAttr} ${maxAttr}>`;

                    field.options.forEach((opt, index) => {
                        const { actualValue, displayValue } = mosaic.util.object.normalizeOption(opt);
                        const checked  = defaultValues.includes(actualValue) ? 'checked' : '';
                        const eActual  = mosaic.util.string.escapeHtml(actualValue);
                        const eDisplay = mosaic.util.string.escapeHtml(displayValue);
                        html += `
                            <div class="checkbox-item">
                                <input type="checkbox" id="${ename}_${index}" name="${ename}" value="${eActual}" ${checked}>
                                <label for="${ename}_${index}" class="checkbox-label">${eDisplay}</label>
                            </div>`;
                    });

                    return html + `</div>`;
                }

                const checked = field.default_value === true ? 'checked' : '';
                return `
                    <div class="checkbox-item single-checkbox">
                        <input type="checkbox" id="${ename}" name="${ename}" value="${mosaic.util.string.escapeHtml(field.value || 'true')}" ${checked} ${required}>
                        <label for="${ename}" class="checkbox-label">${mosaic.util.string.escapeHtml(field.label ?? '')}${requiredHtml}</label>
                    </div>`;
            }
        },

        // ╭──────────────────────────────────────────────────╮ 
        // │               radio field builder                │ 
        // ╰──────────────────────────────────────────────────╯ 
        radio: {
            build(field, required) {
                const requiredHtml = field.required ? ' <span class="required-indicator">*</span>' : '';
                const defaultValue = field.default_value || '';
                const ename        = mosaic.util.string.escapeHtml(field.name || '');

                let html = `<label class="field-label">${mosaic.util.string.escapeHtml(field.label ?? '')}${requiredHtml}</label><div class="radio-group">`;

                (field.options || []).forEach((opt, index) => {
                    const { actualValue, displayValue } = mosaic.util.object.normalizeOption(opt);
                    const checked  = actualValue === defaultValue ? 'checked' : '';
                    const eActual  = mosaic.util.string.escapeHtml(actualValue);
                    const eDisplay = mosaic.util.string.escapeHtml(displayValue);
                    html += `
                        <div class="radio-item"
                             onpointerdown="mosaic.form.fields.radio.captureState(this)"
                             onclick="mosaic.form.fields.radio.toggle(event, this)">
                            <input type="radio" id="${ename}_${index}" name="${ename}" value="${eActual}" ${checked} ${required}>
                            <label for="${ename}_${index}" class="radio-label">${eDisplay}</label>
                        </div>`;
                });

                return html + `</div>`;
            },

            captureState(card) {
                const input = card?.querySelector?.('input[type="radio"]');
                if (!input) return;

                input.dataset = input.dataset || {};
                input.dataset.wasChecked = input.checked === true ? 'true' : 'false';
            },

            toggle(event, card) {
                if (event) {
                    event.preventDefault?.();
                    event.stopPropagation?.();
                }

                const input = card?.querySelector?.('input[type="radio"]');
                if (!input) return;

                const wasChecked = input.dataset?.wasChecked === undefined
                    ? input.checked === true
                    : input.dataset.wasChecked === 'true';

                if (input.name) {
                    const scope = input.form || document;
                    scope?.querySelectorAll?.(`input[type="radio"]${mosaic.util.fields.nameSelector(input.name)}`)
                        .forEach(radio => {
                            if (radio !== input) radio.checked = false;
                        });
                }

                input.checked = !wasChecked;
                if (input.dataset) delete input.dataset.wasChecked;

                const changeEvent = typeof Event === 'function'
                    ? new Event('change', { bubbles: true })
                    : { type: 'change', bubbles: true };

                input.dispatchEvent?.(changeEvent);
            }
        },

        // ╭──────────────────────────────────────────────────╮ 
        // │              picklist field builder              │ 
        // ╰──────────────────────────────────────────────────╯ 
        picklist: {
            build(field) {
                const options       = field.options || [];
                const defaultValue  = field.default_value || '';
                const searchable    = field.searchable === true;
                const ename         = mosaic.util.string.escapeHtml(field.name || '');
                const fieldId       = `field_${ename}`;
                const requiredHtml  = field.required ? ' <span class="required-indicator">*</span>' : '';
                const defaultOption = options.find(o => mosaic.util.object.normalizeOption(o).actualValue === defaultValue);
                const defaultLabel  = defaultOption ? mosaic.util.object.normalizeOption(defaultOption).displayValue : defaultValue || '';
                const displayText   = defaultLabel || '--';
                const isPlaceholder = !defaultLabel;
                const eDefault      = mosaic.util.string.escapeHtml(defaultValue);
                const eDisplayText  = mosaic.util.string.escapeHtml(displayText);
                const optionsHtml   = options.map(opt => {
                    const { actualValue, displayValue } = mosaic.util.object.normalizeOption(opt);
                    const eActual  = mosaic.util.string.escapeHtml(actualValue);
                    const eDisplay = mosaic.util.string.escapeHtml(displayValue);
                    return `<li class="picklist-option ${actualValue === defaultValue ? 'selected' : ''}"
                                data-value="${eActual}">${eDisplay}</li>`;
                }).join('');

                const searchHtml = searchable
                    ? `<div class="picklist-search-wrapper">
                        <input type="text"
                            class="picklist-search-input"
                            id="search_${fieldId}"
                            placeholder="">
                    </div>`
                    : '';

                return `
                    <label class="field-label">${mosaic.util.string.escapeHtml(field.label || '')}${requiredHtml}</label>
                    <div class="picklist-searchable-wrapper" id="wrapper_${fieldId}">
                        <div class="picklist-display"
                            id="display_${fieldId}"
                            tabindex="0"
                            data-value="${eDefault}"
                            data-field="${ename}">
                            <span class="picklist-display-text ${isPlaceholder ? 'placeholder' : ''}">${eDisplayText}</span>
                        </div>
                        <div class="picklist-dropdown" id="dropdown_${fieldId}">
                            ${searchHtml}
                            <ul class="picklist-options-list" id="options_${fieldId}" tabindex="-1">
                                ${optionsHtml}
                            </ul>
                        </div>
                        <input type="hidden"
                            id="${fieldId}"
                            name="${ename}"
                            value="${eDefault}"
                            ${field.required ? 'required' : ''}>
                    </div>`;
            }
        },

        // ╭──────────────────────────────────────────────────╮ 
        // │            multiselect field builder             │ 
        // ╰──────────────────────────────────────────────────╯ 
        multiselect: {
            build(field, required) {
                const requiredHtml  = field.required ? ' <span class="required-indicator">*</span>' : '';
                const defaultValues = Array.isArray(field.default_value) ? field.default_value : [];
                const minAttr       = field.min !== undefined ? `data-min="${field.min}"` : '';
                const maxAttr       = field.max !== undefined ? `data-max="${field.max}"` : '';
                const ename         = mosaic.util.string.escapeHtml(field.name || '');

                let html = `<label for="${ename}">${mosaic.util.string.escapeHtml(field.label ?? '')}${requiredHtml}`;

                if (field.min !== undefined || field.max !== undefined) {
                    html += `<span class="field-constraint">${mosaic.form.fields.constraints.buildText(field.min, field.max)}</span>`;
                }

                html += `</label>
                    <div class="multiselect-wrapper" data-field-name="${ename}">
                        <div class="multiselect-display" tabindex="0">
                            <div class="multiselect-chips" id="chips_${ename}"></div>
                            <span class="multiselect-placeholder">Click to select...</span>
                        </div>
                        <div class="multiselect-dropdown" id="dropdown_${ename}">`;

                (field.options || []).forEach(opt => {
                    const { actualValue, displayValue } = mosaic.util.object.normalizeOption(opt);
                    const checked  = defaultValues.includes(actualValue) ? 'checked' : '';
                    const eActual  = mosaic.util.string.escapeHtml(actualValue);
                    const eDisplay = mosaic.util.string.escapeHtml(displayValue);
                    html += `
                        <div class="multiselect-option" data-value="${eActual}" tabindex="-1">
                            <input type="checkbox" id="${ename}_opt_${eActual}" ${checked}>
                            <label>${eDisplay}</label>
                        </div>`;
                });

                html += `</div>
                    <select id="${ename}" name="${ename}" multiple style="display: none;" ${required} ${minAttr} ${maxAttr}>`;

                (field.options || []).forEach(opt => {
                    const { actualValue, displayValue } = mosaic.util.object.normalizeOption(opt);
                    const selected = defaultValues.includes(actualValue) ? 'selected' : '';
                    const eActual  = mosaic.util.string.escapeHtml(actualValue);
                    const eDisplay = mosaic.util.string.escapeHtml(displayValue);
                    html += `<option value="${eActual}" ${selected}>${eDisplay}</option>`;
                });

                html += `</select></div>`;
                return html;
            }
        },

        // ╭──────────────────────────────────────────────────╮ 
        // │                  datetime-local                  │ 
        // ╰──────────────────────────────────────────────────╯ 
        datetimeLocal: {
            build(field, required) {
                const requiredHtml = field.required
                    ? ' <span class="required-indicator">*</span>' : '';
                const ename = mosaic.util.string.escapeHtml(field.name || '');

                // native browser picker
                if (field.use_date_input) {
                    const defaultValue = mosaic.form.setup.date.formatDefaultValue(field);
                    return `
                        <label for="${ename}">${mosaic.util.string.escapeHtml(field.label ?? '')}${requiredHtml}</label>
                        <input type="datetime-local"
                            id="${ename}"
                            name="${ename}"
                            value="${mosaic.util.string.escapeHtml(defaultValue)}"
                            ${required}>`;
                }

                // combined smart input with calendar + time popup; the hidden
                // input carries the merged yyyy-MM-ddTHH:mm value for submit
                const isoDefault = mosaic.form.setup.date.formatDefaultValue(field);
                const html = `
                    <label for="${ename}_display">${mosaic.util.string.escapeHtml(field.label ?? '')}${requiredHtml}</label>
                    <input type="text"
                        id="${ename}_display"
                        name="${ename}_display"
                        data-default-iso="${mosaic.util.string.escapeHtml(isoDefault)}"
                        autocomplete="off"
                        ${required}>
                    <input type="hidden"
                        id="${ename}"
                        name="${ename}">`;

                setTimeout(() => {
                    const displayEl = document.getElementById(`${field.name}_display`);
                    const hiddenEl  = document.getElementById(field.name);
                    if (displayEl) mosaic.form.setup.datetime.init(displayEl, hiddenEl, field);
                }, 100);

                return html;
            }
        },

        // ╭──────────────────────────────────────────────────╮ 
        // │              textarea field builder              │ 
        // ╰──────────────────────────────────────────────────╯ 
        textarea: {
            build(field, required, placeholder) {
                const requiredHtml = field.required ? ' <span class="required-indicator">*</span>' : '';
                const ename        = mosaic.util.string.escapeHtml(field.name || '');
                return `
                    <label for="${ename}">${mosaic.util.string.escapeHtml(field.label ?? '')}${requiredHtml}</label>
                    <textarea id="${ename}"
                              name="${ename}"
                              rows="${field.rows || 4}"
                              placeholder="${mosaic.util.string.escapeHtml(placeholder)}"
                              ${required}>${mosaic.util.string.escapeHtml(field.default_value || '')}</textarea>`;
            }
        },

        // ╭──────────────────────────────────────────────────╮ 
        // │               input field builder                │ 
        // ╰──────────────────────────────────────────────────╯ 
        input: {
            build(field, required, placeholder) {
                const requiredHtml   = field.required ? ' <span class="required-indicator">*</span>' : '';
                const ename          = mosaic.util.string.escapeHtml(field.name || '');
                let inputType        = field.type || 'text';
                let defaultValue     = field.default_value || '';
                let finalPlaceholder = placeholder;

                // ── date field ────────────────────────────────────────────────
                if (field.type === 'date') {
                    if (field.use_date_input) {
                        inputType    = 'date';
                        defaultValue = mosaic.form.setup.date.formatDefaultValue(field);
                    } else {
                        inputType        = 'text';
                        defaultValue     = '';
                        finalPlaceholder = field.placeholder
                            ? field.placeholder
                            : mosaic.util.date.formatDate(new Date(), mosaic.cache.userDateFormat || 'MM/dd/yyyy');

                        setTimeout(() => {
                            const input = document.getElementById(field.name);
                            if (input) mosaic.form.setup.date.init(input);
                        }, 100);
                    }
                }

                // ── time field ────────────────────────────────────────────────
                else if (field.type === 'time') {
                    defaultValue = mosaic.form.setup.date.formatDefaultValue(field);

                    setTimeout(() => {
                        const input = document.getElementById(field.name);
                        if (input) mosaic.form.setup.time.init(input);
                    }, 100);
                }

                // ── tel field ─────────────────────────────────────────────────
                else if (field.type === 'tel') {
                    setTimeout(async () => {
                        const input = document.getElementById(field.name);
                        if (input) await mosaic.form.setup.phone.init(input);
                    }, 100);
                }

                // ── smart date iso default ────────────────────────────────────
                const isSmartDate = field.type === 'date' && !field.use_date_input;
                const isoDefault  = isSmartDate ? mosaic.form.setup.date.formatDefaultValue(field) : '';
                const valueAttr   = isSmartDate ? '' : `value="${mosaic.util.string.escapeHtml(String(defaultValue))}"`;
                const isoAttr     = isSmartDate && isoDefault ? `data-default-iso="${mosaic.util.string.escapeHtml(String(isoDefault))}"` : '';

                return `
                    <label for="${ename}">${mosaic.util.string.escapeHtml(field.label ?? '')}${requiredHtml}</label>
                    <input type="${inputType}"
                        id="${ename}"
                        name="${ename}"
                        placeholder="${mosaic.util.string.escapeHtml(finalPlaceholder)}"
                        ${valueAttr}
                        ${isoAttr}
                        autocomplete="off"
                        ${required}>`;
            }
        },
    },

    // ╭──────────────────────────────────────────────────╮ 
    // │            post-render field setup               │ 
    // ╰──────────────────────────────────────────────────╯ 
    setup: {

        // ╭──────────────────────────────────────────────────╮
        // │               date input setup                   │
        // ╰──────────────────────────────────────────────────╯
        date: {
            async init(dateInput) {
                const userFormat  = await mosaic.api.env.getUserDateFormatDisplay();
                const fieldName   = dateInput.getAttribute('name');
                const fieldConfig = (mosaic.config.fields || []).find(f => f.name === fieldName) || {};

                dateInput.placeholder = fieldConfig.placeholder
                    ? fieldConfig.placeholder
                    : mosaic.util.date.formatDate(new Date(), userFormat);

                dateInput.autocomplete = 'off';
                mosaic.datepicker.setup.attach(dateInput, userFormat, fieldConfig);
            },

            formatDefaultValue(field) {
                const value = field.default_value;
                if (!value) return '';

                let dateObj;

                if (field.type === 'date' && value === 'today') {
                    dateObj = new Date();
                } else if (field.type === 'datetime-local' && value === 'now') {
                    const now = new Date();
                    const pad = n => String(n).padStart(2, '0');
                    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
                } else if (field.type === 'time' && value === 'now') {
                    return new Date().toTimeString().slice(0, 5);
                } else if (typeof value === 'string') {
                    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
                        const [y, m, d] = value.split('-');
                        dateObj = new Date(y, m - 1, d);
                    } else if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(value)) {
                        const [m, d, y] = value.split('/');
                        const year = y.length === 2 ? '20' + y : y;
                        dateObj = new Date(year, m - 1, d);
                    } else {
                        dateObj = new Date(value);
                    }
                } else if (value instanceof Date) {
                    dateObj = value;
                } else {
                    dateObj = new Date(value);
                }

                if (!dateObj || isNaN(dateObj.getTime())) {
                    mosaic.con.warn(`mosaic.form.setup.date.formatDefaultValue() | Invalid default_value for field '${field.name}':`, value);
                    return '';
                }

                const pad   = n => String(n).padStart(2, '0');
                const year  = dateObj.getFullYear();
                const month = pad(dateObj.getMonth() + 1);
                const day   = pad(dateObj.getDate());

                switch (field.type) {
                    case 'date':          return `${year}-${month}-${day}`;
                    case 'datetime-local': return `${year}-${month}-${day}T${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}`;
                    case 'time':          return `${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}`;
                    default:              return field.default_value || '';
                }
            },

            getValue(fieldName) {
                return mosaic.util.fields.getValue(document, { name: fieldName, type: 'date' }, { preferStoredValue: true });
            }
        },

        // ╭──────────────────────────────────────────────────╮ 
        // │               time input setup                   │ 
        // ╰──────────────────────────────────────────────────╯ 
        time: {
            init(timeInput) {
                timeInput.type         = 'text';
                timeInput.autocomplete = 'off';
                timeInput.placeholder  = mosaic.util.date.formatTimeDisplay(new Date()); // default while awaiting

                mosaic.api.env.getUserTimeFormatDisplay().then(fmt => {
                    if (!timeInput.value) timeInput.placeholder = mosaic.util.date.formatTimeDisplay(new Date(), fmt);
                    mosaic.datepicker.setup.attachTime(timeInput, fmt);
                });

                timeInput.addEventListener('blur', () => {
                    const raw = timeInput.value.trim();

                    if (!raw) {
                        timeInput.setAttribute('data-time-value', '');
                        timeInput.classList.remove('invalid-date');
                        return;
                    }

                    const parsed = mosaic.util.date.parseSmartTime(raw);
                    if (parsed) {
                        Promise.all([
                            mosaic.api.env.getUserTimeFormatReturn().then(returnFormat => {
                                const returnValue = returnFormat === 'h:mm AM/PM' ? parsed.display : parsed.value;
                                timeInput.setAttribute('data-time-value', returnValue);
                            }),
                            mosaic.api.env.getUserTimeFormatDisplay().then(displayFormat => {
                                timeInput.value = displayFormat === 'HH:mm' ? parsed.value : parsed.display;
                            })
                        ]).then(() => {
                            timeInput.dispatchEvent(new Event('timeSelected'));
                        });
                        
                        timeInput.classList.remove('invalid-date');

                        const fieldGroup = timeInput.closest('.field-group');
                        if (fieldGroup) fieldGroup.classList.remove('invalid-group');
                    } else {
                        timeInput.classList.add('invalid-date');
                        timeInput.setAttribute('data-time-value', '');
                    }
                });
            }
        },

        // ╭──────────────────────────────────────────────────╮ 
        // │            datetime-local input setup            │ 
        // ╰──────────────────────────────────────────────────╯ 
        datetime: {
            async init(displayInput, hiddenInput, field) {
                const userFormat = await mosaic.api.env.getUserDateFormatDisplay();
                const timeFormat = await mosaic.api.env.getUserTimeFormatDisplay();
                const util       = mosaic.util.date;
                const now        = new Date();

                displayInput.placeholder = field.placeholder
                    ? field.placeholder
                    : `${util.formatDate(now, userFormat)} ${util.formatTimeDisplay(now, timeFormat)}`;
                displayInput.autocomplete = 'off';

                // combined calendar + time picker; typed input is parsed by the
                // picker's datetime.parseTypedInput on blur
                mosaic.datepicker.setup.attach(displayInput, userFormat, field, { withTime: true, timeFormat });

                // mirror the picker/typed value (yyyy-MM-ddTHH:mm) into the hidden input
                const sync = () => {
                    hiddenInput.value = displayInput.getAttribute('data-date-formatted-value') || '';
                };
                sync();
                displayInput.addEventListener('blur',         sync);
                displayInput.addEventListener('dateSelected', sync);
            }
        },

        // ╭──────────────────────────────────────────────────╮ 
        // │               phone input setup                  │ 
        // ╰──────────────────────────────────────────────────╯ 
        phone: {
            async init(input) {
                const mask = await mosaic.api.env.getPhoneDisplayFormat();
                this.attachMask(input, mask);
            },

            applyMask(value, mask) {
                if (!mask) return value;
                const digits = value.replace(/\D/g, '');
                let masked     = '';
                let digitIndex = 0;

                for (let i = 0; i < mask.length; i++) {
                    if (digitIndex >= digits.length) break;
                    if (mask[i] === '#') {
                        masked += digits[digitIndex++];
                    } else {
                        masked += mask[i];
                        if (digitIndex < digits.length) continue;
                        break;
                    }
                }
                return masked;
            },

            attachMask(input, mask) {
                if (!mask) return;

                input.addEventListener('input', () => {
                    const cursor = input.selectionStart;
                    const prev   = input.value;
                    const masked = this.applyMask(input.value, mask);
                    input.value  = masked;
                    const added  = masked.length - prev.length;
                    input.setSelectionRange(cursor + added, cursor + added);
                });

                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Backspace') {
                        const cursor = input.selectionStart;
                        const prev   = input.value;
                        if (cursor > 0 && /\D/.test(prev[cursor - 1])) {
                            e.preventDefault();
                            input.value = prev.slice(0, cursor - 1) + prev.slice(cursor);
                            input.value = this.applyMask(input.value, mask);
                            input.setSelectionRange(cursor - 1, cursor - 1);
                        }
                    }
                });

                if (!input.placeholder) input.placeholder = mask.replace(/#/g, '_');
            }
        },

        // ╭──────────────────────────────────────────────────╮ 
        // │                 file field setup                 │ 
        // ╰──────────────────────────────────────────────────╯ 
        file: {
            _renderChips(wrapper, input) {
                const list  = wrapper.querySelector('.file-list');
                const files = Array.from(input.files);
                list.innerHTML = files.map((f, i) => `
                    <div class="file-chip" data-file-index="${i}">
                        <span class="fname">${mosaic.util.string.escapeHtml(f.name)}</span>
                        <span class="fsize">${mosaic.util.file.formatSize(f.size)}</span>
                        <button type="button" class="file-remove" aria-label="Remove file">&#x2715;</button>
                    </div>`).join('');
                const hasFiles = files.length > 0;
                wrapper.classList.toggle('file-selected', hasFiles);
            },

            _updateZoneText(wrapper, input) {
                const isMultiple = wrapper.dataset.multiple === 'true';
                const hasFiles   = input.files.length > 0;
                const text = isMultiple
                    ? (hasFiles ? 'Drop more files, or' : 'Drop files here, or')
                    : (hasFiles ? 'Drop to replace, or' : 'Drop a file here, or');
                wrapper.querySelector('.drag-zone-text').innerHTML =
                    `${text} <span class="browse-link">browse</span>`;
            },

            _mergeFiles(existing, dropped, isMultiple) {
                if (!dropped.length) return existing;
                if (!isMultiple) return [dropped[0]];
                const seen = new Set(existing.map(f => `${f.name}:${f.size}`));
                return [...existing, ...dropped.filter(f => !seen.has(`${f.name}:${f.size}`))];
            },

            _assignFiles(input, files) {
                const dt = new DataTransfer();
                files.forEach(f => dt.items.add(f));
                input.files = dt.files;
                input.dispatchEvent(new Event('change', { bubbles: true }));
            },

            init() {
                document.querySelectorAll('.file-upload-wrapper').forEach(wrapper => {
                    const input      = wrapper.querySelector('input[type="file"]');
                    const dragZone   = wrapper.querySelector('.drag-zone');
                    const fileList   = wrapper.querySelector('.file-list');
                    const isMultiple = wrapper.dataset.multiple === 'true';

                    let currentFiles = [];

                    input.addEventListener('change', (e) => {
                        if (e.isTrusted) {
                            const newlySelected = Array.from(input.files);
                            if (newlySelected.length === 0) {
                                // Cancel in newer browsers fires change with empty files — restore
                                mosaic.form.setup.file._assignFiles(input, currentFiles);
                                return;
                            }
                            if (isMultiple) {
                                // Native picker replaces files; merge with tracked list
                                const merged = mosaic.form.setup.file._mergeFiles(currentFiles, newlySelected, true);
                                mosaic.form.setup.file._assignFiles(input, merged);
                                return;
                            }
                            currentFiles = newlySelected;
                        } else {
                            currentFiles = Array.from(input.files);
                        }
                        mosaic.form.setup.file._renderChips(wrapper, input);
                        mosaic.form.setup.file._updateZoneText(wrapper, input);
                    });

                    dragZone.addEventListener('dragover', e => {
                        e.preventDefault();
                        dragZone.classList.add('drag-over');
                    });

                    dragZone.addEventListener('dragleave', e => {
                        if (dragZone.contains(e.relatedTarget)) return;
                        dragZone.classList.remove('drag-over');
                    });

                    dragZone.addEventListener('drop', e => {
                        e.preventDefault();
                        dragZone.classList.remove('drag-over');
                        const dropped = Array.from(e.dataTransfer.files);
                        if (!dropped.length) return;
                        const merged = mosaic.form.setup.file._mergeFiles(
                            Array.from(input.files), dropped, isMultiple
                        );
                        mosaic.form.setup.file._assignFiles(input, merged);
                    });

                    fileList.addEventListener('click', e => {
                        const btn = e.target.closest('.file-remove');
                        if (!btn) return;
                        const chip  = btn.closest('.file-chip');
                        const index = parseInt(chip.dataset.fileIndex, 10);
                        const files = Array.from(input.files).filter((_, i) => i !== index);
                        mosaic.form.setup.file._assignFiles(input, files);
                    });
                });
            }
        },

        // ╭──────────────────────────────────────────────────╮ 
        // │               picklist field setup               │ 
        // ╰──────────────────────────────────────────────────╯ 
        picklist: {
            init() {
                document.querySelectorAll('.picklist-searchable-wrapper').forEach(wrapper => {
                    const fieldId     = wrapper.id.replace('wrapper_', '');
                    const display     = document.getElementById(`display_${fieldId}`);
                    const dropdown    = document.getElementById(`dropdown_${fieldId}`);
                    const searchInput = document.getElementById(`search_${fieldId}`);
                    const optionsList = document.getElementById(`options_${fieldId}`);
                    const hiddenInput = document.getElementById(fieldId);

                    if (!display || !dropdown) return;

                    // ── set dropdown height based on visible_options config ──────────────────
                    const fieldName   = fieldId.replace('field_', '');
                    const fieldConfig = (mosaic.config.fields || []).find(f => f.name === fieldName) || {};
                    const maxVisible  = fieldConfig.visible_options || 6;
                    const optionEls   = Array.from(optionsList.querySelectorAll('.picklist-option'));
                    const countToUse  = Math.min(maxVisible, optionEls.length);

                    if (countToUse > 0) {
                        const padding      = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--padding-field')) || 8;
                        const optionHeight = (14 * 1.4) + (padding * 2);
                        optionsList.style.maxHeight = `${optionHeight * countToUse}px`;
                    }

                    // ── shared helper: select the keyboard-focused option and collapse ───────
                    const selectFocusedOption = (e) => {
                        const focused = optionsList.querySelector('.picklist-option.keyboard-focus');
                        if (!focused) return false;
                        e.preventDefault();
                        e.stopPropagation();
                        focused.click();
                        display.focus();
                        return true;
                    };

                    // ── shared helper: arrow key navigation within options list ──────────────
                    const navigateOptions = (e) => {
                        const visibleOptions = Array.from(
                            optionsList.querySelectorAll('.picklist-option:not([style*="display: none"])')
                        );
                        if (!visibleOptions.length) return;

                        const focused = optionsList.querySelector('.picklist-option.keyboard-focus');
                        let nextIndex = 0;

                        if (focused) {
                            const currentIndex = visibleOptions.indexOf(focused);
                            focused.classList.remove('keyboard-focus');
                            nextIndex = e.key === 'ArrowDown'
                                ? Math.min(currentIndex + 1, visibleOptions.length - 1)
                                : Math.max(currentIndex - 1, 0);
                        } else {
                            nextIndex = e.key === 'ArrowDown' ? 0 : visibleOptions.length - 1;
                        }

                        visibleOptions[nextIndex].classList.add('keyboard-focus');
                        visibleOptions[nextIndex].scrollIntoView({ block: 'nearest' });
                    };

                    // ── shared open logic ────────────────────────────────────────────────────
                    const openDropdown = () => {
                        dropdown.classList.add('open');
                        display.classList.add('open');
                        if (searchInput) {
                            searchInput.focus();
                        } else {
                            optionsList.focus();
                            const firstOption = optionsList.querySelector('.picklist-option:not([style*="display: none"])');
                            if (firstOption) {
                                firstOption.classList.add('keyboard-focus');
                                firstOption.scrollIntoView({ block: 'nearest' });
                            }
                        }
                    };

                    // ── display: click to open/close ─────────────────────────────────────────
                    display.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const isOpen = dropdown.classList.contains('open');
                        this.closeAll();
                        if (!isOpen) openDropdown();
                    });

                    // ── display keydown ──────────────────────────────────────────────────────
                    display.addEventListener('keydown', (e) => {

                        if (e.key === 'Escape') {
                            if (dropdown.classList.contains('open')) {
                                e.preventDefault();
                                e.stopPropagation();
                                this.close(display, dropdown, searchInput, optionsList);
                                display.focus();
                            }
                            return;
                        }

                        if ((e.key === ' ' || e.key === 'ArrowDown') && !dropdown.classList.contains('open')) {
                            e.preventDefault();
                            this.closeAll();
                            openDropdown();
                            return;
                        }
                    });

                    // ── options list keydown (non-searchable only) ───────────────────────────
                    optionsList.addEventListener('keydown', (e) => {
                        if (!dropdown.classList.contains('open')) return;

                        if (e.key === 'Escape') {
                            e.preventDefault();
                            e.stopPropagation();
                            this.close(display, dropdown, searchInput, optionsList);
                            display.focus();
                            return;
                        }

                        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                            e.preventDefault();
                            navigateOptions(e);
                            return;
                        }

                        if (e.key === 'Enter' || e.key === ' ') {
                            if (selectFocusedOption(e)) return;
                            e.preventDefault();
                            this.close(display, dropdown, searchInput, optionsList);
                            display.focus();
                            return;
                        }

                        if (e.key === 'Tab') {
                            const focused = optionsList.querySelector('.picklist-option.keyboard-focus');
                            if (focused) {
                                e.preventDefault();
                                focused.click();
                                display.focus();
                            } else {
                                this.close(display, dropdown, searchInput, optionsList);
                            }
                            return;
                        }
                    });

                    // ── search input keydown (searchable only) ───────────────────────────────
                    searchInput?.addEventListener('keydown', (e) => {

                        if (e.key === 'Escape') {
                            e.preventDefault();
                            e.stopPropagation();
                            this.close(display, dropdown, searchInput, optionsList);
                            display.focus();
                            return;
                        }

                        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                            e.preventDefault();
                            navigateOptions(e);
                            return;
                        }

                        if (e.key === 'Enter') {
                            if (selectFocusedOption(e)) return;
                            e.preventDefault();
                            e.stopPropagation();
                            this.close(display, dropdown, searchInput, optionsList);
                            display.focus();
                            return;
                        }

                        if (e.key === 'Tab') {
                            const focused = optionsList.querySelector('.picklist-option.keyboard-focus');
                            if (focused) {
                                e.preventDefault();
                                focused.click();
                                display.focus();
                            } else {
                                this.close(display, dropdown, searchInput, optionsList);
                            }
                            return;
                        }
                    });

                    // ── search input: filter options ─────────────────────────────────────────
                    searchInput?.addEventListener('input', (e) => {
                        const term = e.target.value.toLowerCase().trim();
                        optionsList.querySelectorAll('.picklist-option').forEach(li => {
                            li.style.display = (!term || li.textContent.toLowerCase().includes(term)) ? '' : 'none';
                        });
                    });

                    // ── options list: select on click ────────────────────────────────────────
                    optionsList?.addEventListener('click', (e) => {
                        const li = e.target.closest('.picklist-option');
                        if (!li) return;

                        const value       = li.dataset.value;
                        const label       = li.textContent.trim();
                        const displayText = display.querySelector('.picklist-display-text');

                        hiddenInput.value     = value;
                        display.dataset.value = value;

                        if (displayText) {
                            displayText.textContent = label;
                            displayText.classList.toggle('placeholder', value === '');
                        }

                        optionsList.querySelectorAll('.picklist-option').forEach(opt => opt.classList.remove('selected'));
                        li.classList.add('selected');

                        this.close(display, dropdown, searchInput, optionsList);
                        display.focus();

                        hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
                    });

                    // ── close on outside click ───────────────────────────────────────────────
                    document.addEventListener('click', (e) => {
                        if (!wrapper.contains(e.target)) this.close(display, dropdown, searchInput, optionsList);
                    });
                });
            },

            close(display, dropdown, searchInput, optionsList) {
                dropdown.classList.remove('open');
                display.classList.remove('open');
                if (searchInput) {
                    searchInput.value = '';
                    optionsList?.querySelectorAll('.picklist-option').forEach(li => {
                        li.style.display = '';
                        li.classList.remove('keyboard-focus');
                    });
                } else {
                    optionsList?.querySelectorAll('.picklist-option')
                        .forEach(li => li.classList.remove('keyboard-focus'));
                }
            },

            closeAll() {
                document.querySelectorAll('.picklist-dropdown.open').forEach(dd => {
                    const wrapper     = dd.closest('.picklist-searchable-wrapper');
                    const fieldId     = wrapper?.id.replace('wrapper_', '');
                    const display     = fieldId ? document.getElementById(`display_${fieldId}`) : null;
                    const searchInput = fieldId ? document.getElementById(`search_${fieldId}`) : null;
                    const optionsList = fieldId ? document.getElementById(`options_${fieldId}`) : null;
                    if (display) this.close(display, dd, searchInput, optionsList);
                });
            }
        },

        // ╭──────────────────────────────────────────────────╮ 
        // │             multiselect field setup              │ 
        // ╰──────────────────────────────────────────────────╯ 
        multiselect: {
            init() {
                document.querySelectorAll('.multiselect-wrapper').forEach(wrapper => {
                    const display  = wrapper.querySelector('.multiselect-display');
                    const dropdown = wrapper.querySelector('.multiselect-dropdown');
                    const options  = dropdown.querySelectorAll('.multiselect-option');

                    if (!display || !dropdown) return;

                    // ── set dropdown height based on visible_options config ──────────────────
                    const fieldName   = wrapper.getAttribute('data-field-name');
                    const fieldConfig = (mosaic.config.fields || []).find(f => f.name === fieldName) || {};
                    const maxVisible  = fieldConfig.visible_options || 6;
                    const optionEls   = Array.from(options);
                    const actualCount = optionEls.length;
                    const countToUse  = Math.min(maxVisible, actualCount);

                    if (countToUse > 0) {
                        // derive height from the option's padding + line-height rather than
                        // getBoundingClientRect (which returns 0 when dropdown is display:none)
                        const style      = getComputedStyle(document.documentElement);
                        const padding    = parseFloat(style.getPropertyValue('--padding-field')) || 8;
                        const fontSize   = 14;
                        const lineHeight = fontSize * 1.6; // matches typical browser default
                        const optionHeight = lineHeight + (padding * 2);
                        dropdown.style.maxHeight = `${optionHeight * countToUse}px`;
                    }

                    this.updateChips(wrapper);

                    // ── shared helper: get all focusable elements ────────────────────────────
                    const getFocusable = () => Array.from(document.querySelectorAll(
                        'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), button:not([disabled]), .picklist-display, .multiselect-display, [tabindex]:not([tabindex="-1"])'
                    )).filter(el => el.offsetParent !== null);

                    // ── display: click to toggle ─────────────────────────────────────────────
                    display.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const isOpen = wrapper.classList.contains('open');
                        wrapper.classList.toggle('open');
                        if (!isOpen) {
                            const firstOption = dropdown.querySelector('.multiselect-option');
                            if (firstOption) firstOption.focus();
                        }
                    });

                    // ── display keydown: expand on Space/ArrowDown, Tab/Enter/Escape to collapse ──
                    display.addEventListener('keydown', (e) => {
                        if ((e.key === ' ' || e.key === 'ArrowDown') && !wrapper.classList.contains('open')) {
                            e.preventDefault();
                            wrapper.classList.add('open');
                            const firstOption = dropdown.querySelector('.multiselect-option');
                            if (firstOption) firstOption.focus();
                            return;
                        }

                        if (wrapper.classList.contains('open')) {
                            if (e.key === 'Tab') {
                                e.preventDefault();
                                wrapper.classList.remove('open');
                                display.focus();
                                return;
                            }

                            if (e.key === 'Enter') {
                                e.preventDefault();
                                e.stopPropagation();
                                wrapper.classList.remove('open');
                                display.focus();
                                return;
                            }

                            if (e.key === 'Escape') {
                                e.preventDefault();
                                e.stopPropagation();
                                wrapper.classList.remove('open');
                                display.focus();
                                return;
                            }
                        }
                    });

                    // ── dropdown keydown: arrow nav, Space to select, Tab/Enter/Escape to close ──
                    dropdown.addEventListener('keydown', (e) => {
                        const allOptions    = Array.from(dropdown.querySelectorAll('.multiselect-option'));
                        const focusedOption = document.activeElement?.closest('.multiselect-option');

                        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                            e.preventDefault();
                            if (!allOptions.length) return;
                            const currentIdx = focusedOption ? allOptions.indexOf(focusedOption) : -1;
                            const nextIdx    = e.key === 'ArrowDown'
                                ? Math.min(currentIdx + 1, allOptions.length - 1)
                                : Math.max(currentIdx - 1, 0);
                            allOptions[nextIdx].focus();
                            return;
                        }

                        if (e.key === ' ' && focusedOption) {
                            e.preventDefault();
                            const checkbox = focusedOption.querySelector('input[type="checkbox"]');
                            const value    = focusedOption.getAttribute('data-value');
                            if (checkbox) {
                                checkbox.checked = !checkbox.checked;
                                this.updateSelection(wrapper, value, checkbox.checked);
                            }
                            return;
                        }

                        if (e.key === 'Tab') {
                            e.preventDefault();
                            wrapper.classList.remove('open');
                            display.focus();
                            return;
                        }

                        if (e.key === 'Enter') {
                            e.preventDefault();
                            e.stopPropagation();
                            wrapper.classList.remove('open');
                            display.focus();
                            return;
                        }

                        if (e.key === 'Escape') {
                            e.preventDefault();
                            e.stopPropagation();
                            wrapper.classList.remove('open');
                            display.focus();
                        }
                    });

                    // ── option click: toggle selection ───────────────────────────────────────
                    options.forEach(option => {
                        const checkbox = option.querySelector('input[type="checkbox"]');
                        const value    = option.getAttribute('data-value');

                        checkbox.addEventListener('click', (e) => {
                            e.stopPropagation();
                            this.updateSelection(wrapper, value, checkbox.checked);
                        });

                        option.addEventListener('click', (e) => {
                            if (e.target !== checkbox) {
                                checkbox.checked = !checkbox.checked;
                                this.updateSelection(wrapper, value, checkbox.checked);
                            }
                        });
                    });

                    // ── close on outside click ───────────────────────────────────────────────
                    document.addEventListener('click', (e) => {
                        if (!wrapper.contains(e.target)) wrapper.classList.remove('open');
                    });
                });
            },

            updateSelection(wrapper, value, isSelected) {
                const hiddenSelect = wrapper.querySelector('select[multiple]');
                const selectOption = hiddenSelect.querySelector(`option[value="${CSS.escape(value)}"]`);
                if (selectOption) selectOption.selected = isSelected;
                this.updateChips(wrapper);
                hiddenSelect.dispatchEvent(new Event('change', { bubbles: true }));
            },

            updateChips(wrapper) {
                const chipsContainer  = wrapper.querySelector('.multiselect-chips');
                const hiddenSelect    = wrapper.querySelector('select[multiple]');
                const placeholder     = wrapper.querySelector('.multiselect-placeholder');
                const selectedOptions = Array.from(hiddenSelect.selectedOptions);

                chipsContainer.innerHTML  = '';
                placeholder.style.display = selectedOptions.length === 0 ? 'inline' : 'none';

                selectedOptions.forEach(option => {
                    const chip = document.createElement('div');
                    chip.className = 'multiselect-chip';
                    chip.innerHTML = `
                        <span>${mosaic.util.string.escapeHtml(option.text)}</span>
                        <i class="fa fa-times chip-remove" data-value="${mosaic.util.string.escapeHtml(option.value)}"></i>`;

                    chip.querySelector('.chip-remove').addEventListener('click', (e) => {
                        e.stopPropagation();
                        const checkbox = wrapper.querySelector(`.multiselect-option[data-value="${CSS.escape(option.value)}"] input`);
                        if (checkbox) {
                            checkbox.checked = false;
                            this.updateSelection(wrapper, option.value, false);
                        }
                    });

                    chipsContainer.appendChild(chip);
                });
            },

            getValue(fieldName) {
                const select = document.querySelector(`select${mosaic.util.fields.nameSelector(fieldName)}[multiple]`);
                if (!select) return [];
                return Array.from(select.selectedOptions).map(option => ({
                    actual_value:  option.value,
                    display_value: option.text
                }));
            }
        },

        // ╭──────────────────────────────────────────────────╮
        // │              radio field setup                   │
        // ╰──────────────────────────────────────────────────╯
        radio: {
            init() {
                document.querySelectorAll('.radio-item').forEach(item => {
                    item.addEventListener('keydown', (e) => {
                        if (e.key !== ' ') return;
                        e.preventDefault();
                        mosaic.form.fields.radio.captureState(item);
                        mosaic.form.fields.radio.toggle(e, item);
                    });
                });
            }
        }
    },
};
