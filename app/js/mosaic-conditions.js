/**
 * ════════════════════════════════════════════════════════════════════════
 *  mosaic.conditions - conditional field visibility module
 * ════════════════════════════════════════════════════════════════════════
 *
 *  Evaluates conditions on form fields and toggles visibility.
 *  Fields with unmet conditions are hidden from the layout and
 *  excluded from validation and response data.
 *
 *  Condition format:
 *      { field: 'field_name', operator: 'equals', value: 'Yes' }
 *
 *  Multiple conditions per field are AND-joined (all must pass).
 *
 *  Supported operators:
 *      not_empty, empty, equals, not_equals, contains,
 *      greater_than, less_than, between,
 *      before, after,
 *      in, not_in
 */

mosaic.conditions = {

    state: {
        conditionalFields: [],
        form: null,
        fieldConfigs: []
    },

    setup: {
        init(form, fieldConfigs) {
            mosaic.conditions.state.form = form;
            mosaic.conditions.state.fieldConfigs = fieldConfigs;
            mosaic.conditions.state.conditionalFields = fieldConfigs.filter(f => Array.isArray(f.conditions) && f.conditions.length > 0);

            if (mosaic.conditions.state.conditionalFields.length === 0) return;

            mosaic.con.log(`mosaic.conditions.setup.init() | ${mosaic.conditions.state.conditionalFields.length} conditional field(s) found`);

            // ── collect all source field names referenced by conditions ───
            const sourceFieldNames = new Set();
            mosaic.conditions.state.conditionalFields.forEach(f => {
                f.conditions.forEach(c => sourceFieldNames.add(c.field));
            });

            // ── attach listeners to source fields ────────────────────────
            sourceFieldNames.forEach(name => {
                const sourceConfig = fieldConfigs.find(f => f.name === name);
                if (!sourceConfig) {
                    mosaic.con.warn(`mosaic.conditions.setup.init() | Source field "${name}" not found in config`);
                    return;
                }
                mosaic.conditions.setup.attachSourceListeners(name, sourceConfig.type || 'text');
            });

            // ── initial evaluation ───────────────────────────────────────
            mosaic.conditions.evaluation.all();
        },

        attachSourceListeners(fieldName, fieldType) {
            const handler = () => mosaic.conditions.evaluation.all();
            const ns = mosaic.util.fields.nameSelector(fieldName);
            const form = mosaic.conditions.state.form;

            switch (fieldType) {
                case 'checkbox':
                case 'radio': {
                    const inputs = form.querySelectorAll(`input${ns}`);
                    inputs.forEach(el => el.addEventListener('change', handler));
                    break;
                }
                case 'picklist': {
                    // hidden input receives change event from picklist setup
                    const hidden = form.querySelector(`input${ns}`);
                    if (hidden) hidden.addEventListener('change', handler);
                    break;
                }
                case 'multiselect': {
                    const select = form.querySelector(`select${ns}`);
                    if (select) select.addEventListener('change', handler);
                    break;
                }
                case 'date': {
                    const dateEl = form.querySelector(`input${ns}`);
                    if (dateEl) {
                        dateEl.addEventListener('change', handler);
                        dateEl.addEventListener('dateSelected', handler);
                        dateEl.addEventListener('blur', handler);
                    }
                    break;
                }
                case 'datetime-local': {
                    const dtDisplay = form.querySelector(`input${mosaic.util.fields.nameSelector(`${fieldName}_display`)}`);
                    const dtHidden  = form.querySelector(`input${ns}`);
                    if (dtDisplay) {
                        dtDisplay.addEventListener('dateSelected', handler);
                        dtDisplay.addEventListener('blur', handler);
                    }
                    if (dtHidden) dtHidden.addEventListener('change', handler);
                    break;
                }
                case 'time': {
                    const timeEl = form.querySelector(`input${ns}`);
                    if (timeEl) {
                        timeEl.addEventListener('blur', handler);
                        timeEl.addEventListener('timeSelected', handler);
                    }
                    break;
                }
                case 'file': {
                    const fileEl = form.querySelector(`input${ns}`);
                    if (fileEl) fileEl.addEventListener('change', handler);
                    break;
                }
                default: {
                    // text, textarea, number, email, tel, url
                    const el = form.querySelector(ns);
                    if (el) {
                        el.addEventListener('input', handler);
                        el.addEventListener('change', handler);
                    }
                }
            }
        }
    },

    evaluation: {
        all() {
            const fields = mosaic.conditions.state.conditionalFields;

            mosaic.con.groupStart(`mosaic.conditions.evaluation.all() | ${fields.length} field(s)`);

            fields.forEach(fieldConfig => {
                const allMet = fieldConfig.conditions.every(c => mosaic.conditions.evaluation.condition(c));

                mosaic.con.groupStart(`  ${fieldConfig.name} → ${allMet ? 'visible' : 'hidden'}`);
                if (mosaic.flags.debug) {
                    fieldConfig.conditions.forEach(c => {
                        const sourceConfig = mosaic.conditions.state.fieldConfigs.find(f => f.name === c.field);
                        const sourceType   = sourceConfig?.type || 'text';
                        const actual       = mosaic.conditions.values.getFieldValue(c.field, sourceType);
                        mosaic.con.log(`    ${c.field} ${c.operator} ${JSON.stringify(c.value)}`, { actual, sourceType });
                    });
                }
                mosaic.con.groupEnd();

                mosaic.conditions.visibility.setField(fieldConfig.name, allMet);
            });

            mosaic.con.groupEnd();
        },

        condition(condition) {
            const { field: sourceName, operator, value: expected } = condition;
            const sourceConfig = mosaic.conditions.state.fieldConfigs.find(f => f.name === sourceName);
            const sourceType   = sourceConfig?.type || 'text';
            const actual       = mosaic.conditions.values.getFieldValue(sourceName, sourceType);

            if (!mosaic.conditions.operators[operator]) {
                mosaic.con.warn(`mosaic.conditions.evaluation.condition() | Unknown operator: "${operator}"`);
                return false;
            }

            return mosaic.conditions.operators[operator](actual, expected, sourceType);
        }
    },

    operators: {

        // ── presence ─────────────────────────────────────
        not_empty(actual) {
            if (Array.isArray(actual)) return actual.length > 0;
            if (actual === null || actual === undefined || actual === false) return false;
            return String(actual).trim() !== '';
        },

        empty(actual) {
            return !this.not_empty(actual);
        },

        // ── equality ─────────────────────────────────────
        equals(actual, expected) {
            if (actual === null || actual === undefined) return false;

            if (Array.isArray(actual)) {
                return actual.some(v =>
                    mosaic.conditions.values.normalize(v) === mosaic.conditions.values.normalize(expected)
                );
            }

            return mosaic.conditions.values.normalize(actual) === mosaic.conditions.values.normalize(expected);
        },

        not_equals(actual, expected) {
            return !this.equals(actual, expected);
        },

        // ── string / selected-value matching ─────────────
        contains(actual, expected) {
            if (actual === null || actual === undefined) return false;

            if (Array.isArray(actual)) {
                return actual.some(v =>
                    mosaic.conditions.values.normalize(v).includes(mosaic.conditions.values.normalize(expected))
                );
            }

            return mosaic.conditions.values.normalize(actual).includes(mosaic.conditions.values.normalize(expected));
        },

        // ── set membership ───────────────────────────────
        in(actual, expected) {
            if (!Array.isArray(expected)) return false;
            if (actual === null || actual === undefined) return false;

            const expectedValues = expected.map(v => mosaic.conditions.values.normalize(v));

            if (Array.isArray(actual)) {
                return actual.some(v => expectedValues.includes(mosaic.conditions.values.normalize(v)));
            }

            return expectedValues.includes(mosaic.conditions.values.normalize(actual));
        },

        not_in(actual, expected) {
            return !this.in(actual, expected);
        },

        // ── date comparisons ─────────────────────────────
        before(actual, expected) {
            const d = mosaic.conditions.values.parseDate(actual);
            const e = mosaic.conditions.values.parseDate(expected);
            if (!d || !e) return false;
            return d < e;
        },

        after(actual, expected) {
            const d = mosaic.conditions.values.parseDate(actual);
            const e = mosaic.conditions.values.parseDate(expected);
            if (!d || !e) return false;
            return d > e;
        },

        // ── numeric comparisons ──────────────────────────
        greater_than(actual, expected) {
            const a = parseFloat(actual);
            const b = parseFloat(expected);
            if (isNaN(a) || isNaN(b)) return false;
            return a > b;
        },

        less_than(actual, expected) {
            const a = parseFloat(actual);
            const b = parseFloat(expected);
            if (isNaN(a) || isNaN(b)) return false;
            return a < b;
        },

        // ── range comparisons ────────────────────────────
        between(actual, expected, sourceType) {
            if (!Array.isArray(expected) || expected.length !== 2) return false;
            const [lo, hi] = expected;

            if (sourceType === 'date' || sourceType === 'datetime-local') {
                const d = mosaic.conditions.values.parseDate(actual);
                const dLo = mosaic.conditions.values.parseDate(lo);
                const dHi = mosaic.conditions.values.parseDate(hi);
                if (!d || !dLo || !dHi) return false;
                return d >= dLo && d <= dHi;
            }

            const a = parseFloat(actual);
            const bLo = parseFloat(lo);
            const bHi = parseFloat(hi);
            if (isNaN(a) || isNaN(bLo) || isNaN(bHi)) return false;
            return a >= bLo && a <= bHi;
        }
    },

    values: {
        normalize(value) {
            return String(value ?? '').trim().toLowerCase();
        },

        getFieldValue(fieldName, fieldType) {
            if (!mosaic.conditions.state.form) return null;

            const config = mosaic.conditions.state.fieldConfigs.find(f => f.name === fieldName) || {};
            return mosaic.util.fields.getValue(mosaic.conditions.state.form, {
                ...config,
                name: fieldName,
                type: fieldType || config.type
            }, { preferStoredValue: true });
        },

        parseDate(value) {
            return mosaic.util.date.parseLocalDate(value);
        }
    },

    visibility: {
        setField(fieldName, visible) {
            if (!fieldName) {
                mosaic.con.warn('mosaic.conditions.visibility.setField() | Missing fieldName');
                return;
            }

            // find the target element - could be a field-group, a group container, or a divider
            const escapedName = String(fieldName).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
            const form = mosaic.conditions.state.form;
            let target =
                form.querySelector(`.field-group-container[data-group-name="${escapedName}"]`) ||
                form.querySelector(`.field-divider[data-field-name="${escapedName}"]`) ||
                form.querySelector(`.field-group[data-field-name="${escapedName}"]`);

            // fall back to standard field-group via named element
            if (!target) {
                const el = form.querySelector(mosaic.util.fields.nameSelector(fieldName));
                target = el?.closest('.field-group');
            }

            if (!target) {
                mosaic.con.warn(`mosaic.conditions.visibility.setField() | Target field "${fieldName}" not found`);
                return;
            }

            const isCurrentlyHidden = target.classList.contains('condition-hidden');

            if (visible && isCurrentlyHidden) {
                target.classList.remove('condition-hidden');
                mosaic.conditions.visibility.toggleBreakBefore(target, true);
            } else if (!visible && !isCurrentlyHidden) {
                target.classList.add('condition-hidden');
                mosaic.conditions.visibility.toggleBreakBefore(target, false);
                mosaic.util.fields.clearInvalidState(target);
            }
        },

        toggleBreakBefore(fieldGroup, visible) {
            const prev = fieldGroup.previousElementSibling;
            if (prev && prev.style.flexBasis === '100%' && prev.style.height === '0px') {
                prev.style.display = visible ? '' : 'none';
            }
        },

        isHidden(fieldName) {
            if (!mosaic.conditions.state.form) return false;

            // check if the field itself is hidden (individual condition)
            const el = mosaic.conditions.state.form.querySelector(mosaic.util.fields.nameSelector(fieldName));
            const fieldGroup = el?.closest('.field-group');
            if (fieldGroup?.classList.contains('condition-hidden')) return true;

            // check if the field is inside a hidden group container
            const groupContainer = el?.closest('.field-group-container');
            if (groupContainer?.classList.contains('condition-hidden')) return true;

            return false;
        }
    },
};
