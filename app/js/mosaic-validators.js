/**
 * ════════════════════════════════════════════════════════════════════════
 *  mosaic.validators - centralized form validation module
 * ════════════════════════════════════════════════════════════════════════
 *
 * All validation logic is consolidated here. Other modules should call
 * these validators rather than implementing their own validation logic.
 *
 * Key principle: If a field has a value (is populated), it should be
 * validated for format correctness even if the field is not required.
 * Empty non-required fields are skipped.
 */

mosaic.validators = {
    patterns: {
        phone: {
            US: {
                pattern: /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/,
                example: '555-123-4567',
                description: '10-digit phone number',
                display_format: '(###) ###-####',  // mask pattern
                return_format: 'E164'
            },
            CA: {
                pattern: /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/,
                example: '555-123-4567',
                description: '10-digit phone number',
                display_format: '(###) ###-####',
                return_format: 'E164'
            },
            GB: {
                pattern: /^(\+44\s?|0)(\d{2,4}\s?\d{3,4}\s?\d{3,4})$/,
                example: '020 7123 4567',
                description: 'UK phone number',
                display_format: null, // no mask for GB formats
                return_format: 'E164'
            },
            AU: {
                pattern: /^(\+61\s?|0)?[2-478](\s?\d{4}\s?\d{4}|\d{8})$/,
                example: '0412 345 678',
                description: 'Australian phone number',
                display_format: '#### ### ###',
                return_format: 'E164'
            },
            DE: {
                pattern: /^(\+49\s?|0)(\d{2,4}[-.\s]?\d{3,}[-.\s]?\d{2,})$/,
                example: '030 12345678',
                description: 'German phone number',
                display_format: '#### ########',
                return_format: 'E164'
            },
            FR: {
                pattern: /^(\+33\s?|0)[1-9](\s?\d{2}){4}$/,
                example: '01 23 45 67 89',
                description: 'French phone number',
                display_format: '## ## ## ## ##',
                return_format: 'E164'
            },
            IN: {
                pattern: /^(\+91\s?|0)?[6-9]\d{9}$/,
                example: '98765 43210',
                description: '10-digit Indian mobile number',
                display_format: '##### #####',
                return_format: 'E164'
            },
            JP: {
                pattern: /^(\+81\s?|0)(\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{4})$/,
                example: '03-1234-5678',
                description: 'Japanese phone number',
                display_format: '##-####-####',
                return_format: 'E164'
            },
            CN: {
                pattern: /^(\+86\s?|0)?1[3-9]\d{9}$/,
                example: '138 0013 8000',
                description: 'Chinese mobile number',
                display_format: '### #### ####',
                return_format: 'E164'
            },
            DEFAULT: {
                pattern: /^[\d\s\-\.\(\)\+]{7,20}$/,
                example: '+1 555-123-4567',
                description: 'phone number (7-20 digits)',
                display_format: null, // no mask for unknown formats
                return_format: 'E164'
            }
        },
    },

    rules: {
        createResult(valid, message = '', fieldName = '') {
            return { valid, message, fieldName };
        },

        email(email, fieldLabel = 'Email') {
            if (!email || !email.trim()) return mosaic.validators.rules.createResult(true); // empty handled by required

            const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const isValid = re.test(email.trim());

            return mosaic.validators.rules.createResult(
                isValid,
                isValid ? '' : `${fieldLabel}: Please enter a valid email address`
            );
        },

        url(url, fieldLabel = 'URL') {
            if (!url || !url.trim()) return mosaic.validators.rules.createResult(true);  // empty handled by required

            try {
                new URL(url.trim());
                return mosaic.validators.rules.createResult(true);
            } catch (error) {
                return mosaic.validators.rules.createResult(
                    false,
                    `${fieldLabel}: Please enter a valid URL (include http:// or https://)`
                );
            }
        },

        isEmpty(value) {
            if (value === null || value === undefined) return true;
            if (typeof value === 'string') return value.trim() === '';
            if (Array.isArray(value)) return value.length === 0;
            if (typeof value === 'object') return Object.keys(value).length === 0;
            return false;
        },

        required(value, fieldLabel = 'Field') {
            const isValid = !mosaic.validators.rules.isEmpty(value);
            return mosaic.validators.rules.createResult(
                isValid,
                isValid ? '' : `${fieldLabel}: This field is required`
            );
        },

        minLength(value, minLength, fieldLabel = 'Field') {
            if (!value) return mosaic.validators.rules.createResult(true); // empty handled by required

            const isValid = value.length >= minLength;
            return mosaic.validators.rules.createResult(
                isValid,
                isValid ? '' : `${fieldLabel}: Must be at least ${minLength} characters`
            );
        },

        maxLength(value, maxLength, fieldLabel = 'Field') {
            if (!value) return mosaic.validators.rules.createResult(true); // empty handled by required

            const isValid = value.length <= maxLength;
            return mosaic.validators.rules.createResult(
                isValid,
                isValid ? '' : `${fieldLabel}: Must be no more than ${maxLength} characters`
            );
        },

        pattern(value, pattern, fieldLabel = 'Field', patternDescription = '') {
            if (!value) return mosaic.validators.rules.createResult(true); // empty handled by required

            const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
            const isValid = regex.test(value);

            const errorMsg = patternDescription
                ? `${fieldLabel}: ${patternDescription}`
                : `${fieldLabel}: Invalid format`;

            return mosaic.validators.rules.createResult(isValid, isValid ? '' : errorMsg);
        },

        range(value, min, max, fieldLabel = 'Field') {
            if (value === '' || value === null || value === undefined) return mosaic.validators.rules.createResult(true); // empty handled by required

            const num = parseFloat(value);

            if (isNaN(num)) return mosaic.validators.rules.createResult(false, `${fieldLabel}: Must be a valid number`);

            if (num < min || num > max) {
                return mosaic.validators.rules.createResult(
                    false,
                    `${fieldLabel}: Must be between ${min} and ${max}`
                );
            }

            return mosaic.validators.rules.createResult(true);
        },

        numeric(value, fieldLabel = 'Field') {
            if (value === '' || value === null || value === undefined) return mosaic.validators.rules.createResult(true); // empty handled by required

            const isValid = !isNaN(parseFloat(value)) && isFinite(value);
            return mosaic.validators.rules.createResult(
                isValid,
                isValid ? '' : `${fieldLabel}: Must be a valid number`
            );
        },

        integer(value, fieldLabel = 'Field') {
            if (value === '' || value === null || value === undefined) return mosaic.validators.rules.createResult(true);

            const isValid = Number.isInteger(Number(value));
            return mosaic.validators.rules.createResult(
                isValid,
                isValid ? '' : `${fieldLabel}: Must be a whole number`
            );
        },

        selectionCount(config = {}) {
            const {
                min,
                max,
                selectedCount = 0,
                label = 'Field'
            } = config;

            const hasMin = min !== undefined && min !== null && min !== '';
            const hasMax = max !== undefined && max !== null && max !== '';

            if (!hasMin && !hasMax) return mosaic.validators.rules.createResult(true);

            const minNum = hasMin ? Number(min) : null;
            const maxNum = hasMax ? Number(max) : null;

            if (hasMin && !Number.isFinite(minNum)) {
                return mosaic.validators.rules.createResult(false, `${label}: Invalid minimum selection constraint`);
            }

            if (hasMax && !Number.isFinite(maxNum)) {
                return mosaic.validators.rules.createResult(false, `${label}: Invalid maximum selection constraint`);
            }

            if (minNum !== null && selectedCount < minNum) {
                return mosaic.validators.rules.createResult(false, `${label}: Please select at least ${minNum} option(s). Currently selected: ${selectedCount}`);
            }

            if (maxNum !== null && selectedCount > maxNum) {
                return mosaic.validators.rules.createResult(false, `${label}: Please select no more than ${maxNum} option(s). Currently selected: ${selectedCount}`);
            }

            return mosaic.validators.rules.createResult(true);
        },
    },

    groups: {
        phone: {

            async validate(phone, fieldLabel = 'Phone') {
                if (!phone || !phone.trim()) return mosaic.validators.rules.createResult(true);

                const raw     = phone;          // original input preserved for display
                const cleaned = phone.trim();
                const country = await mosaic.api.env.getPhoneCountryCode();
                const config  = mosaic.validators.patterns.phone[country] || mosaic.validators.patterns.phone.DEFAULT;

                if (!config.pattern.test(cleaned)) {
                    return mosaic.validators.rules.createResult(
                        false,
                        `${fieldLabel}: Please enter a valid ${config.description} (e.g., ${config.example})`
                    );
                }

                const returnFormat = await mosaic.api.env.getPhoneReturnFormat();
                let returnValue;

                switch (returnFormat) {
                    case 'national':
                        const code = mosaic.util.phone.CALLING_CODES[country] || '1';
                        returnValue = cleaned.replace(/\D/g, '').replace(new RegExp(`^${code}`), '');
                        break;
                    case 'raw':
                        returnValue = cleaned;
                        break;
                    case 'display':
                        returnValue = raw;
                        break;
                    case 'E164':
                    default:
                        returnValue = mosaic.util.phone.formatE164(cleaned, country);
                        break;
                }

                return { ...mosaic.validators.rules.createResult(true), formattedPhone: returnValue };
            },
        },

        date: {
            validate(input, displayFormat, returnFormat, fieldLabel) {
                const parsed = mosaic.util.date.parseSmartDate(input, displayFormat);
                if (!parsed) return mosaic.validators.rules.createResult(false, `${fieldLabel}: Invalid date format...`);
                const formattedDate = returnFormat && returnFormat !== 'yyyy-MM-dd'
                    ? mosaic.util.date.formatDate(parsed, returnFormat)
                    : mosaic.util.date.toApiFormat(parsed);
                return { valid: true, message: '', formattedDate };
            },

            range(dateValue, minDate, maxDate, fieldLabel = 'Date') {
                if (!dateValue) return mosaic.validators.rules.createResult(true);

                const date = mosaic.util.date.parseLocalDate(dateValue);
                const min = minDate ? mosaic.util.date.parseLocalDate(minDate) : null;
                const max = maxDate ? mosaic.util.date.parseLocalDate(maxDate) : null;

                if (!date) {
                    return mosaic.validators.rules.createResult(false, `${fieldLabel}: Invalid date`);
                }

                if (min && date < min) {
                    return mosaic.validators.rules.createResult(
                        false,
                        `${fieldLabel}: Date must be on or after ${min.toLocaleDateString()}`
                    );
                }

                if (max && date > max) {
                    return mosaic.validators.rules.createResult(
                        false,
                        `${fieldLabel}: Date must be on or before ${max.toLocaleDateString()}`
                    );
                }

                return mosaic.validators.rules.createResult(true);
            },

            future(dateValue, fieldLabel = 'Date') {
                if (!dateValue) return mosaic.validators.rules.createResult(true);

                const date = mosaic.util.date.parseLocalDate(dateValue);
                if (!date) return mosaic.validators.rules.createResult(false, `${fieldLabel}: Invalid date`);

                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const isValid = date >= today;
                return mosaic.validators.rules.createResult(
                    isValid,
                    isValid ? '' : `${fieldLabel}: Date must be today or in the future`
                );
            },

            past(dateValue, fieldLabel = 'Date') {
                if (!dateValue) return mosaic.validators.rules.createResult(true);

                const date = mosaic.util.date.parseLocalDate(dateValue);
                if (!date) return mosaic.validators.rules.createResult(false, `${fieldLabel}: Invalid date`);

                const today = new Date();
                today.setHours(23, 59, 59, 999);

                const isValid = date <= today;
                return mosaic.validators.rules.createResult(
                    isValid,
                    isValid ? '' : `${fieldLabel}: Date must be today or in the past`
                );
            },
        },

        file: {
            size(file, maxSizeInBytes, fieldLabel = 'File') {
                if (!file) return mosaic.validators.rules.createResult(true);

                const isValid = file.size <= maxSizeInBytes;
                const maxSizeMB = (maxSizeInBytes / (1024 * 1024)).toFixed(1);
                const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);

                return mosaic.validators.rules.createResult(
                    isValid,
                    isValid ? '' : `${fieldLabel}: File size (${fileSizeMB}MB) exceeds maximum allowed (${maxSizeMB}MB)`
                );
            },

            type(file, allowedTypes, fieldLabel = 'File') {
                if (!file || !Array.isArray(allowedTypes) || allowedTypes.length === 0) {
                    return mosaic.validators.rules.createResult(true);
                }

                const isValid = allowedTypes.includes(file.type);
                return mosaic.validators.rules.createResult(
                    isValid,
                    isValid ? '' : `${fieldLabel}: File type "${file.type}" is not allowed. Accepted types: ${allowedTypes.join(', ')}`
                );
            },

            extension(file, allowedExtensions, fieldLabel = 'File') {
                if (!file || !Array.isArray(allowedExtensions) || allowedExtensions.length === 0) {
                    return mosaic.validators.rules.createResult(true);
                }

                const ext = file.name.split('.').pop().toLowerCase();
                const normalizedAllowed = allowedExtensions.map(e => e.toLowerCase().replace(/^\./, ''));
                const isValid = normalizedAllowed.includes(ext);

                return mosaic.validators.rules.createResult(
                    isValid,
                    isValid ? '' : `${fieldLabel}: File extension ".${ext}" is not allowed. Accepted: ${normalizedAllowed.map(e => '.' + e).join(', ')}`
                );
            },
        },

        multiselect: {
            constraints(selectElementOrConfig, fieldLabel = null) {
                let min, max, selectedCount, label;

                if (selectElementOrConfig instanceof HTMLElement) {
                    // handle HTMLSelectElement
                    const selectElement = selectElementOrConfig;
                    min = selectElement.getAttribute('data-min');
                    max = selectElement.getAttribute('data-max');
                    selectedCount = selectElement.selectedOptions.length;

                    // get field label from DOM if not provided
                    if (!fieldLabel) {
                        const fieldGroup = selectElement.closest('.field-group');
                        const labelElement = fieldGroup?.querySelector('label, .field-label');
                        label = labelElement?.textContent?.replace(/\s*\*\s*$/, '').replace(/\s*\(.*\)\s*$/, '').trim() || 'Field';
                    } else {
                        label = fieldLabel;
                    }
                } else {
                    // handle config object: { min, max, selectedCount, label }
                    min = selectElementOrConfig.min;
                    max = selectElementOrConfig.max;
                    selectedCount = selectElementOrConfig.selectedCount || 0;
                    label = fieldLabel || selectElementOrConfig.label || 'Field';
                }

                return mosaic.validators.rules.selectionCount({ min, max, selectedCount, label });
            },
        },

        form: {
            async validate(form, fieldConfigs, options = {}) {
                const errors = [];
                const invalidFields = [];
                const validatedData = {};

                // use flattened field list if available (groups contribute their children)
                const fields           = mosaic.runtime.form.flatFields || fieldConfigs;
                // ── check fields to determine if there are any date/datetime/time fields ──
                const hasDateField     = fields.some(f => f.type === 'date' && !f.use_date_input);
                const hasDateTimeField = fields.some(f => f.type === 'datetime-local');
                const hasTimeField     = fields.some(f => f.type === 'time');
                const needsDateFormats = hasDateField || hasDateTimeField;
                const needsTimeReturn  = hasTimeField || hasDateTimeField;
                // ── only fetch user formats if relevant fields are present ────────────
                const userDateFormatDisplay = needsDateFormats ? await mosaic.api.env.getUserDateFormatDisplay() : null;
                const userDateFormatReturn  = needsDateFormats ? await mosaic.api.env.getUserDateFormatReturn()  : null;
                const userTimeFormatReturn  = needsTimeReturn  ? await mosaic.api.env.getUserTimeFormatReturn()  : null;

                // clear previous validation states
                mosaic.util.fields.clearInvalidState(form);

                for (const field of fields) {
                    const { name, type, label, required } = field;

                    if (type === 'description' || type === 'button' || type === 'group' || type === 'divider') continue;

                    // ── skip fields hidden by conditions ─────────────────────
                    if (mosaic.conditions.visibility.isHidden(name)) continue;

                    const ns = mosaic.util.fields.nameSelector(name);
                    const fieldElement = form.querySelector(ns);
                    const fieldGroup = fieldElement?.closest('.field-group');

                    const markInvalid = (errorMessage, addDateClass = false) => {
                        errors.push(errorMessage);
                        invalidFields.push(name);
                        mosaic.util.fields.applyInvalidState(form, name, addDateClass);
                    };

                    let fieldValue = mosaic.validators.groups.form.getFieldValue(form, field);

                    // ═══════════════════════════════════════════════════════════
                    //      required validation
                    // ═══════════════════════════════════════════════════════════
                    if (required) {
                        let isEmpty = false;

                        if (type === 'file') {
                            isEmpty = !fieldElement?.files?.length;
                        } else if (type === 'multiselect') {
                            isEmpty = !fieldElement?.selectedOptions?.length;
                        } else if (type === 'checkbox' && field.options) {
                            isEmpty = !form.querySelectorAll(`input${ns}:checked`).length;
                        } else if (type === 'checkbox') {
                            isEmpty = !fieldElement?.checked;
                        } else if (type === 'radio') {
                            isEmpty = !form.querySelector(`input${ns}:checked`);
                        } else if (type === 'picklist') {
                            isEmpty = !fieldElement?.value;
                        } else {
                            isEmpty = mosaic.validators.rules.isEmpty(fieldValue);
                        }

                        if (isEmpty) {
                            markInvalid(`${label}: This field is required`);
                            validatedData[name] = null;
                            continue;
                        }
                    }

                    const hasValue = !mosaic.validators.rules.isEmpty(fieldValue);

                    // ───────────────────────────────────────────────────────
                    //      email validation
                    // ───────────────────────────────────────────────────────
                    if (type === 'email' && hasValue) {
                        const emailResult = mosaic.validators.rules.email(fieldValue, label);
                        if (!emailResult.valid) {
                            markInvalid(emailResult.message);
                            validatedData[name] = fieldValue;
                            continue;
                        }
                    }

                    // ───────────────────────────────────────────────────────
                    //      phone validation
                    // ───────────────────────────────────────────────────────
                    if (type === 'tel' && hasValue) {
                        const phoneResult = await mosaic.validators.groups.phone.validate(fieldValue, label);
                        if (!phoneResult.valid) {
                            markInvalid(phoneResult.message);
                            validatedData[name] = fieldValue;
                            continue;
                        }
                        validatedData[name] = phoneResult.formattedPhone || fieldValue; // use formatted return value if available
                        continue; // add continue so it doesn't fall through to _getProcessedFieldValue
                    }

                    // ───────────────────────────────────────────────────────
                    //      date validation
                    // ───────────────────────────────────────────────────────
                    if (type === 'date' && hasValue) {

                        // native date picker (use_date_input: true) stores value
                        // as yyyy-MM-dd already - validate format and store directly
                        if (field.use_date_input) {
                            const isoRe = /^\d{4}-\d{2}-\d{2}$/;
                            if (!isoRe.test(fieldValue)) {
                                markInvalid(`${label}: Invalid date format`, true);
                                validatedData[name] = null;
                            } else {
                                validatedData[name] = fieldValue;
                            }
                            continue;
                        }

                        // smart text input - check for stored formatted value first
                        const storedValue = fieldElement?.getAttribute('data-date-formatted-value');
                        if (storedValue) {
                            validatedData[name] = storedValue;
                            continue;
                        }

                        // no stored value means user typed but didn't blur - parse now
                        const dateResult = mosaic.validators.groups.date.validate(fieldValue, userDateFormatDisplay, userDateFormatReturn, label);
                        if (!dateResult.valid) {
                            markInvalid(dateResult.message, true);
                            validatedData[name] = null;
                            continue;
                        }
                        validatedData[name] = dateResult.formattedDate;
                        continue;
                    }

                    // ───────────────────────────────────────────────────────
                    //      datetime-local validation
                    // ───────────────────────────────────────────────────────
                    if (type === 'datetime-local' && hasValue) {
                        // value is "yyyy-MM-ddTHH:MM" from the hidden merged field
                        const isoRe = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
                        if (!isoRe.test(fieldValue)) {
                            markInvalid(`${label}: Please enter a valid date and time`);
                            validatedData[name] = null;
                            continue;
                        }
                        validatedData[name] = fieldValue;
                        continue;
                    }

                    // ───────────────────────────────────────────────────────
                    //      time validation
                    // ───────────────────────────────────────────────────────
                    if (type === 'time' && hasValue) {
                        const storedValue = fieldElement?.getAttribute('data-time-value');
                        if (storedValue) {
                            validatedData[name] = storedValue;
                            continue;
                        }
                        // user typed but didn't blur - attempt parse now
                        const parsed = mosaic.util.date.parseSmartTime(fieldValue);
                        if (!parsed) {
                            markInvalid(`${label}: Invalid time format`, true);
                            validatedData[name] = null;
                            continue;
                        }
                        // mirror the blur handler: honor the configured return format
                        const timeReturnValue = userTimeFormatReturn === 'h:mm AM/PM' ? parsed.display : parsed.value;
                        fieldElement.value = parsed.display;
                        fieldElement.setAttribute('data-time-value', timeReturnValue);
                        validatedData[name] = timeReturnValue;
                        continue;
                    }

                    // ───────────────────────────────────────────────────────
                    //      url validation
                    // ───────────────────────────────────────────────────────
                    if (type === 'url' && hasValue) {
                        const urlResult = mosaic.validators.rules.url(fieldValue, label);
                        if (!urlResult.valid) {
                            markInvalid(urlResult.message);
                            validatedData[name] = fieldValue;
                            continue;
                        }
                    }

                    // ───────────────────────────────────────────────────────
                    //      number validation
                    // ───────────────────────────────────────────────────────
                    if (type === 'number' && hasValue) {
                        const numResult = mosaic.validators.rules.numeric(fieldValue, label);
                        if (!numResult.valid) {
                            markInvalid(numResult.message);
                            validatedData[name] = fieldValue;
                            continue;
                        }

                        if (field.min !== undefined || field.max !== undefined) {
                            const rangeResult = mosaic.validators.rules.range(
                                fieldValue,
                                field.min ?? -Infinity,
                                field.max ?? Infinity,
                                label
                            );
                            if (!rangeResult.valid) {
                                markInvalid(rangeResult.message);
                                validatedData[name] = fieldValue;
                                continue;
                            }
                        }
                    }

                    // ───────────────────────────────────────────────────────
                    //      multiselect constraints
                    // ───────────────────────────────────────────────────────
                    if (type === 'multiselect' && fieldElement) {
                        const msResult = mosaic.validators.groups.multiselect.constraints(fieldElement, label);
                        if (!msResult.valid) {
                            markInvalid(msResult.message);
                            validatedData[name] = mosaic.form.setup.multiselect.getValue(name);
                            continue;
                        }
                    }

                    // ───────────────────────────────────────────────────────
                    //      checkbox group constraints
                    // ───────────────────────────────────────────────────────
                    if (type === 'checkbox' && Array.isArray(field.options) && field.options.length > 0) {
                        const selectedCount = Array.isArray(fieldValue) ? fieldValue.length : 0;
                        const checkboxResult = mosaic.validators.rules.selectionCount({
                            min: field.min,
                            max: field.max,
                            selectedCount,
                            label
                        });
                        if (!checkboxResult.valid) {
                            markInvalid(checkboxResult.message);
                            validatedData[name] = mosaic.validators.groups.form.getProcessedFieldValue(form, field, userDateFormatReturn);
                            continue;
                        }
                    }

                    // ───────────────────────────────────────────────────────
                    //      custom pattern validation
                    // ───────────────────────────────────────────────────────
                    if (field.pattern && hasValue) {
                        const patternResult = mosaic.validators.rules.pattern(
                            fieldValue,
                            field.pattern,
                            label,
                            field.pattern_message || 'Invalid format'
                        );
                        if (!patternResult.valid) {
                            markInvalid(patternResult.message);
                            validatedData[name] = fieldValue;
                            continue;
                        }
                    }

                    // ───────────────────────────────────────────────────────
                    //      min/max length validation
                    // ───────────────────────────────────────────────────────
                    if (field.minlength && hasValue) {
                        const minResult = mosaic.validators.rules.minLength(fieldValue, field.minlength, label);
                        if (!minResult.valid) {
                            markInvalid(minResult.message);
                            validatedData[name] = fieldValue;
                            continue;
                        }
                    }

                    if (field.maxlength && hasValue) {
                        const maxResult = mosaic.validators.rules.maxLength(fieldValue, field.maxlength, label);
                        if (!maxResult.valid) {
                            markInvalid(maxResult.message);
                            validatedData[name] = fieldValue;
                            continue;
                        }
                    }

                    // ───────────────────────────────────────────────────────
                    //      store validated value
                    // ───────────────────────────────────────────────────────
                    validatedData[name] = mosaic.validators.groups.form.getProcessedFieldValue(form, field, userDateFormatReturn);
                }

                return {
                    valid: errors.length === 0,
                    errors,
                    invalidFields,
                    data: validatedData
                };
            },

            setupLiveClearing(form, fieldConfigs, readyPromise = Promise.resolve()) {
                const seeds = [];

                fieldConfigs.forEach(field => {
                    if (field.type === 'description' || field.type === 'button' || field.type === 'group' || field.type === 'divider') return;

                    const ns = mosaic.util.fields.nameSelector(field.name);

                    // syncs both states: clears invalid-group once filled, and toggles
                    // required-empty so unfilled required fields carry a red border
                    const syncFieldState = (element) => {
                        const fieldGroup = element?.closest('.field-group');
                        if (!fieldGroup) return;
                        if (!field.required && !fieldGroup.classList.contains('invalid-group')) return;

                        let hasValue = false;

                        switch (field.type) {
                            case 'file':
                                hasValue = element.files?.length > 0;
                                break;
                            case 'checkbox': {
                                if (field.options) {
                                    const count = form.querySelectorAll(`input${ns}:checked`).length;
                                    hasValue = count > 0 && mosaic.validators.rules.selectionCount({
                                        min: field.min,
                                        max: field.max,
                                        selectedCount: count,
                                        label: field.label
                                    }).valid;
                                } else {
                                    hasValue = element.checked;
                                }
                                break;
                            }
                            case 'radio':
                                hasValue = !!form.querySelector(`input${ns}:checked`);
                                break;
                            case 'multiselect': {
                                const count = element.selectedOptions?.length || 0;
                                hasValue = count > 0 && mosaic.validators.rules.selectionCount({
                                    min: field.min,
                                    max: field.max,
                                    selectedCount: count,
                                    label: field.label
                                }).valid;
                                break;
                            }
                            default:
                                hasValue = !!element.value?.trim();
                        }

                        if (hasValue) {
                            fieldGroup.classList.remove('required-empty');
                            mosaic.util.fields.clearFieldInvalidState(form, field.name, element);
                        } else if (field.required) {
                            fieldGroup.classList.add('required-empty');
                        }
                    };

                    switch (field.type) {
                        case 'checkbox':
                        case 'radio': {
                            form.querySelectorAll(`input${ns}`)
                                .forEach(el => el.addEventListener('change', () => syncFieldState(el)));
                            break;
                        }
                        case 'file': {
                            const fileEl = form.querySelector(`input${ns}`);
                            if (fileEl) fileEl.addEventListener('change', () => syncFieldState(fileEl));
                            break;
                        }
                        case 'multiselect': {
                            const selectEl = form.querySelector(`select${ns}`);
                            if (selectEl) selectEl.addEventListener('change', () => syncFieldState(selectEl));
                            break;
                        }
                        case 'date': {
                            const dateEl = form.querySelector(`input${ns}`);
                            if (dateEl) {
                                dateEl.addEventListener('input',  () => syncFieldState(dateEl));
                                dateEl.addEventListener('change', () => syncFieldState(dateEl));
                            }
                            break;
                        }
                        case 'datetime-local': {
                            const displayEl = form.querySelector(`input${mosaic.util.fields.nameSelector(`${field.name}_display`)}`);
                            const hiddenEl  = form.querySelector(`input${ns}`);

                            // native picker (use_date_input: true) - single input holds the value
                            if (!displayEl) {
                                if (hiddenEl) hiddenEl.addEventListener('change', () => syncFieldState(hiddenEl));
                                break;
                            }

                            const syncFromHidden = () => syncFieldState(hiddenEl);
                            displayEl.addEventListener('blur', syncFromHidden);
                            displayEl.addEventListener('dateSelected', syncFromHidden);
                            break;
                        }
                        case 'picklist': {
                            const el = form.querySelector(ns);
                            if (el) el.addEventListener('change', () => syncFieldState(el));
                            break;
                        }
                        default: {
                            const el = form.querySelector(ns);
                            if (el) el.addEventListener('input', () => syncFieldState(el));
                        }
                    }

                    // seed initial state so unfilled required fields start marked
                    if (field.required) seeds.push(() => syncFieldState(form.querySelector(ns)));
                });

                // date / datetime / time / tel fields are rendered empty and have their
                // default written in by deferred setup (setTimeout in the field builders),
                // so seeding synchronously would mark a defaulted date as unfilled. wait on
                // the same readiness signal the focus handler uses - it resolves immediately
                // when the form has no such fields.
                return Promise.resolve(readyPromise)
                    .catch(() => {})
                    .then(() => seeds.forEach(seed => seed()));
            },

            getFieldValue(form, field) {
                return mosaic.util.fields.getValue(form, field);
            },

            getProcessedFieldValue(form, field, dateFormatReturn = 'yyyy-MM-dd') {
                return mosaic.util.fields.getProcessedValue(form, field, dateFormatReturn);
            },
        },
    },

};
