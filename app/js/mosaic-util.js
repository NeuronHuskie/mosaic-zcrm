/**
 * ════════════════════════════════════════════════════════════════════════
 *  mosaic.util - utility functions module
 * ════════════════════════════════════════════════════════════════════════
 */

mosaic.util = {

    // ╭──────────────────────────────────────────────────╮
    // │                  fields utils                    │
    // ╰──────────────────────────────────────────────────╯

    fields: {

        // ── name selector ──────────────────────────────────────────────────────

        nameSelector(fieldName) {
            return `[name="${String(fieldName).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"]`;
        },

        // ── get element ───────────────────────────────────────────────────────

        getElement(form, fieldName) {
            return form?.querySelector?.(this.nameSelector(fieldName)) || null;
        },

        // ── get field group ───────────────────────────────────────────────────

        getGroup(form, fieldName, element = null) {
            return element?.closest?.('.field-group') ||
                form?.querySelector?.(`.field-group[data-field-name="${CSS.escape(fieldName)}"]`) ||
                null;
        },

        // ── clear invalid state ───────────────────────────────────────────────

        clearInvalidState(scope) {
            if (!scope) return;
            scope.classList?.remove('invalid-group', 'invalid-field', 'invalid-date');
            scope.querySelectorAll?.('.invalid-group, .invalid-field, .invalid-date')
                .forEach(el => el.classList.remove('invalid-group', 'invalid-field', 'invalid-date'));
        },

        // ── clear invalid state from specific field or group ──────────────────

        clearFieldInvalidState(form, fieldName, element = null) {
            const fieldElement = element || this.getElement(form, fieldName);
            const fieldGroup = this.getGroup(form, fieldName, fieldElement);

            if (fieldGroup) {
                this.clearInvalidState(fieldGroup);
            } else {
                this.clearInvalidState(fieldElement);
            }
        },

        // ── apply invalid state to field ──────────────────────────────────────

        applyInvalidState(form, fieldName, addDateClass = false) {
            const fieldElement = this.getElement(form, fieldName);
            const fieldGroup = this.getGroup(form, fieldName, fieldElement);

            fieldGroup?.classList.add('invalid-group');
            fieldElement?.classList.add('invalid-field');
            if (addDateClass) fieldElement?.classList.add('invalid-date');

            const picklistDisplay = fieldGroup?.querySelector('.picklist-display');
            picklistDisplay?.classList.add('invalid-field');

            return { fieldElement, fieldGroup };
        },

        // ── get raw field value from form ─────────────────────────────────────

        getValue(form, field, options = {}) {
            const { name, type } = field;
            const element = this.getElement(form, name);
            const preferStoredValue = options.preferStoredValue === true;
            const ns = this.nameSelector(name);

            switch (type) {
                case 'checkbox':
                    if (field.options) {
                        return Array.from(form.querySelectorAll(`input${ns}:checked`))
                            .map(cb => cb.value);
                    }
                    return element ? element.checked : false;

                case 'radio': {
                    const selected = form.querySelector(`input${ns}:checked`);
                    return selected ? selected.value : null;
                }

                case 'picklist': {
                    const hidden = form.querySelector(`input${ns}`);
                    return hidden ? hidden.value : null;
                }

                case 'multiselect': {
                    const select = form.querySelector(`select${ns}`);
                    if (!select) return [];
                    return Array.from(select.selectedOptions).map(opt => opt.value);
                }

                case 'date':
                    if (!element) return null;
                    return preferStoredValue
                        ? element.getAttribute?.('data-date-formatted-value') || element.value || null
                        : element.value || null;

                case 'datetime-local': {
                    const hidden = form.querySelector(`input${ns}`);
                    return hidden ? hidden.value || null : null;
                }

                case 'time':
                    if (!element) return null;
                    return preferStoredValue
                        ? element.getAttribute?.('data-time-value') || element.value || null
                        : element.value || null;

                case 'file': {
                    const fileEl = form.querySelector(`input${ns}`);
                    return fileEl?.files?.length > 0 ? fileEl.files : null;
                }

                default:
                    return element ? element.value : null;
            }
        },

        // ── get processed field value with proper structure for form data ─────

        getProcessedValue(form, field, dateFormatReturn = 'yyyy-MM-dd') {
            const { name, type } = field;
            const element = this.getElement(form, name);

            if (!element) return null;

            switch (type) {
                case 'picklist': {
                    if (!element.value) return null;
                    const optionEl = form.querySelector(
                        `#options_field_${CSS.escape(field.name)} [data-value="${CSS.escape(element.value)}"]`
                    );
                    return {
                        actual_value:  element.value,
                        display_value: optionEl?.textContent.trim() || element.value
                    };
                }

                case 'multiselect':
                    return mosaic.form.setup.multiselect.getValue(name);

                case 'checkbox':
                    if (field.options) {
                        const ns = this.nameSelector(name);
                        return Array.from(form.querySelectorAll(`input${ns}:checked`))
                            .map(cb => ({
                                actual_value:  cb.value,
                                display_value: cb.nextElementSibling?.textContent || cb.value
                            }));
                    }
                    return element.checked;

                case 'radio': {
                    const ns = this.nameSelector(name);
                    const selected = form.querySelector(`input${ns}:checked`);
                    return selected ? {
                        actual_value:  selected.value,
                        display_value: selected.nextElementSibling?.textContent || selected.value
                    } : null;
                }

                case 'date': {
                    const storedValue = element.getAttribute('data-date-formatted-value');
                    if (storedValue) return storedValue;

                    const parseResult = mosaic.validators.groups.date.validate(element.value, mosaic.cache.userDateFormat, dateFormatReturn);
                    return parseResult.valid ? parseResult.formattedDate : '';
                }

                case 'file':
                    return null;

                default:
                    return element.value;
            }
        }
    },

    // ╭──────────────────────────────────────────────────╮
    // │                    date utils                    │
    // ╰──────────────────────────────────────────────────╯

    date: {

        // ╭──────────────────────────────────────────────────╮
        // │   normalize zoho format tokens to uppercase      │
        // ╰──────────────────────────────────────────────────╯
        // Zoho mixes case: 'MM/dd/yyyy' → normalize to 'MM/DD/YYYY' before any token replacement logic runs
        normalizeFormat(format) {
            if (!format) return 'MM/DD/YYYY';
            return format
                .replace(/yyyy/g, 'YYYY')
                .replace(/yy/g,   'YY')
                .replace(/dd/g,   'DD')
                .replace(/d(?!D)/g, 'D');  // lowercase d not followed by D
        },

        // ╭───────────────────────────────────────────────────────╮
        // │   classify the user's zoho format into a descriptor   │
        // ╰───────────────────────────────────────────────────────╯
        analyzeFormat(format) {
            const f = this.normalizeFormat(format);

            // detect separator (space-based formats need special care)
            const sep = f.includes('-') ? '-'
                    : f.includes('/') ? '/'
                    : f.includes('.') ? '.'
                    : f.includes(' ') ? ' '
                    : '';

            // detect year position
            const yearFirst  = /^Y/i.test(f);
            const yearLast   = /Y$/i.test(f) || /Y[^A-Z]*$/i.test(f);

            // detect month representation
            const monthNamed = /MMMM/i.test(f);   // February
            const monthAbbr  = /MMM/i.test(f) && !monthNamed;  // Feb
            const monthNum   = !monthNamed && !monthAbbr;

            // detect day/month order when both are numeric
            const dayFirst   = /^D/i.test(f);     // DD-MM or D-M
            const monthFirst = /^M/i.test(f);     // MM-DD

            // detect 2-digit vs 4-digit year
            const twoDigitYear = /(?<![Y])YY(?![Y])/i.test(f) && !/YYYY/i.test(f);

            // detect trailing dot (e.g. DD.MM.YYYY.)
            const trailingDot = f.trimEnd().endsWith('.');

            // detect CJK
            const isCjk = f.includes('年') || f.includes('月') || f.includes('日');

            return { sep, yearFirst, yearLast, dayFirst, monthFirst,
                    monthNamed, monthAbbr, monthNum, twoDigitYear,
                    trailingDot, isCjk, raw: f };
        },

        // ╭──────────────────────────────────────────────────╮
        // │     format a js date → user's display format     │
        // ╰──────────────────────────────────────────────────╯
        formatDate(date, format) {
            if (!date) return '';
            const normalizedFormat = this.normalizeFormat(format);

            const y4 = date.getFullYear();
            const y2 = String(y4).slice(2);
            const m0 = date.getMonth();
            const m  = m0 + 1;
            const d  = date.getDate();
            const DD = String(d).padStart(2, '0');
            const MM = String(m).padStart(2, '0');

            // single regex pass so replacements never re-match each other
            // (e.g. the 'D' in 'December' must not consume the day token)
            return normalizedFormat.replace(/MMMM|MMM|YYYY|YY|MM|M|DD|D/g, token => {
                switch (token) {
                    case 'MMMM': return this.MONTH_FULL[m0];
                    case 'MMM':  return this.MONTH_ABBR[m0];
                    case 'YYYY': return y4;
                    case 'YY':   return y2;
                    case 'MM':   return MM;
                    case 'M':    return m;
                    case 'DD':   return DD;
                    case 'D':    return d;
                }
            });
        },

        // ╭──────────────────────────────────────────────────────╮
        // │   format a Date object's time portion as "1:30 PM"   │
        // ╰──────────────────────────────────────────────────────╯
        formatTimeDisplay(date, format = 'h:mm AM/PM') {
            const h  = date.getHours();
            const m  = date.getMinutes();

            if (format === 'HH:mm') return this.formatTime24(date);

            const period   = h >= 12 ? 'PM' : 'AM';
            const displayH = h % 12 || 12;
            return `${displayH}:${String(m).padStart(2, '0')} ${period}`;
        },

        // ╭───────────────────────────────────────────────────────────╮
        // │   format a Date object's time portion as "HH:MM" (24hr)   │
        // ╰───────────────────────────────────────────────────────────╯
        formatTime24(date) {
            return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        },

        // ╭──────────────────────────────────────────────────╮
        // │    convert date to yyyy-MM-dd for api storage    │
        // ╰──────────────────────────────────────────────────╯
        toApiFormat(date) {
            if (!date) return '';
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        },

        // ╭──────────────────────────────────────────────────╮
        // │      safe date constructor with validation       │
        // ╰──────────────────────────────────────────────────╯
        buildDate(year, month0, day) {
            if (year < 100) year += year < 50 ? 2000 : 1900;
            if (month0 < 0 || month0 > 11) return null;
            if (day   < 1 || day   > 31)   return null;

            const d = new Date(year, month0, day);

            // reject dates that JS silently normalizes (e.g. Feb 30)
            if (d.getFullYear() !== year  ||
                d.getMonth()    !== month0 ||
                d.getDate()     !== day)   return null;

            return d;
        },

        // ╭──────────────────────────────────────────────────╮
        // │   parse a date value as LOCAL time (not utc)     │
        // ╰──────────────────────────────────────────────────╯
        // new Date('yyyy-MM-dd') parses as UTC midnight, which shifts the
        // day for users west of utc - read the date parts explicitly instead
        parseLocalDate(value) {
            if (!value) return null;
            if (value instanceof Date) return isNaN(value.getTime()) ? null : value;

            const s = String(value).trim();

            // iso date with optional time suffix: yyyy-MM-dd / yyyy-MM-ddTHH:mm
            const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/);
            if (isoMatch) {
                const d = new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
                return isNaN(d.getTime()) ? null : d;
            }

            const d = new Date(s);
            return isNaN(d.getTime()) ? null : d;
        },

        // ╭──────────────────────────────────────────────────╮
        // │    parse any reasonable date string → js date    │
        // ╰──────────────────────────────────────────────────╯
        parseSmartDate(input, format) {
            if (!input || !input.trim()) return null;

            // strip trailing punctuation and whitespace
            let s = input.trim().replace(/[.,\s]+$/, '').trim();

            // strip leading weekday prefix: "Fri, " or "Friday " etc.
            s = s.replace(/^(?:Sun(?:day)?|Mon(?:day)?|Tue(?:sday)?|Wed(?:nesday)?|Thu(?:rsday)?|Fri(?:day)?|Sat(?:urday)?)[,\s]+/i, '').trim();

            const desc = format ? this.analyzeFormat(format) : null;

            // ── named month (abbr or full) ────────────────────────────────
            // "15 Aug 2026"   "15-Aug-26"    "15 Aug, 2026"
            // "Aug 15, 2026"  "August 15,26" "August 15 2026"
            const namedRe = /^(\d{1,2})[\s\-]+([A-Za-z]+)[,\s\-]+(\d{2,4})$|^([A-Za-z]+)[,\s\-]+(\d{1,2})[,\s\-]+(\d{2,4})$/;
            const namedMatch = s.match(namedRe);
            if (namedMatch) {
                let day, monthStr, year;
                if (namedMatch[1]) {
                    [, day, monthStr, year] = namedMatch;
                } else {
                    [,,,, monthStr, day, year] = namedMatch;
                }
                const m0 = this.monthFromName(monthStr);
                if (m0 === -1) return null;
                return this.buildDate(parseInt(year), m0, parseInt(day));
            }

            // ── CJK ───────────────────────────────────────────────────────
            const cjkMatch = s.match(/^(\d{2,4})[年](\d{1,2})[月](\d{1,2})[日]?$/);
            if (cjkMatch) {
                return this.buildDate(
                    parseInt(cjkMatch[1]),
                    parseInt(cjkMatch[2]) - 1,
                    parseInt(cjkMatch[3])
                );
            }

            // ── numeric: split on - / . or space ─────────────────────────
            const parts = s.split(/[\-\/\.\s]+/).filter(Boolean);
            if (parts.length !== 3) return null;
            if (parts.some(p => /[A-Za-z]/.test(p))) return null;

            const nums = parts.map(Number);
            if (nums.some(isNaN)) return null;
            const [a, b, c] = nums;

            // ── use format descriptor when available ──────────────────────
            if (desc && !desc.isCjk && !desc.monthNamed && !desc.monthAbbr) {
                let year, month0, day;

                if (desc.yearFirst) {
                    year = a; month0 = b - 1; day = c;
                } else if (desc.dayFirst) {
                    day = a; month0 = b - 1; year = c;
                } else {
                    month0 = a - 1; day = b; year = c;
                }

                if (year < 100) year += year < 50 ? 2000 : 1900;
                return this.buildDate(year, month0, day);
            }

            // ── heuristic fallback ────────────────────────────────────────

            // 4-digit first → year first: 2026-02-19, 2026/08/15, 2026/2/18
            if (parts[0].length === 4) {
                return this.buildDate(a, b - 1, c);
            }

            // 4-digit last → year last
            if (parts[2].length === 4) {
                if (a > 12) return this.buildDate(c, b - 1, a);  // day first
                if (b > 12) return this.buildDate(c, a - 1, b);  // month first
                return this.buildDate(c, a - 1, b);               // ambiguous → MM-DD
            }

            // 2-digit year: first part > 31 → YY-MM-DD
            if (a > 31) {
                const y = a < 50 ? 2000 + a : 1900 + a;
                return this.buildDate(y, b - 1, c);
            }

            // first part > 12 → day first: DD-MM-YY
            if (a > 12) {
                const y = c < 50 ? 2000 + c : 1900 + c;
                return this.buildDate(y, b - 1, a);
            }

            // default → MM-DD-YY
            const y = c < 50 ? 2000 + c : 1900 + c;
            return this.buildDate(y, a - 1, b);
        },

        // ╭──────────────────────────────────────────────────╮
        // │                 parse smart time                 │
        // ╰──────────────────────────────────────────────────╯
        parseSmartTime(input) {
            if (!input || !input.trim()) return null;

            const raw = input.trim().toLowerCase().replace(/\s/g, '');

            // ── explicit am/pm with colon: 1:30pm, 12:00am, 1:30 PM ─────
            const colonAmPm = raw.match(/^(\d{1,2}):(\d{2})(am|pm)$/);
            if (colonAmPm) {
                let h = parseInt(colonAmPm[1]);
                const min = parseInt(colonAmPm[2]);
                const period = colonAmPm[3];
                if (h < 1 || h > 12 || min > 59) return null;
                if (period === 'pm' && h !== 12) h += 12;
                if (period === 'am' && h === 12) h = 0;
                return this._buildTimeResult(h, min);
            }

            // ── colon only, no am/pm: 13:00, 1:30, 9:00 ─────────────────
            // treat as 24hr if h > 12, otherwise 12hr ambiguous → use inference
            const colonOnly = raw.match(/^(\d{1,2}):(\d{2})$/);
            if (colonOnly) {
                const h = parseInt(colonOnly[1]);
                const min = parseInt(colonOnly[2]);
                if (h > 23 || min > 59) return null;
                if (h > 12) return this._buildTimeResult(h, min); // unambiguous 24hr
                return this._buildTimeResult(this._inferAmPm(h), min);
            }

            // ── explicit am/pm no colon: 130pm, 1pm, 1230am ──────────────
            const noColonAmPm = raw.match(/^(\d{1,2})(\d{2})?(am|pm)$/);
            if (noColonAmPm) {
                let h = parseInt(noColonAmPm[1]);
                const min = parseInt(noColonAmPm[2] || '0');
                const period = noColonAmPm[3];
                if (h < 1 || h > 12 || min > 59) return null;
                if (period === 'pm' && h !== 12) h += 12;
                if (period === 'am' && h === 12) h = 0;
                return this._buildTimeResult(h, min);
            }

            // ── 4-digit military: 1430, 0900, 2000 ───────────────────────
            const military = raw.match(/^(\d{2})(\d{2})$/);
            if (military) {
                const h = parseInt(military[1]);
                const min = parseInt(military[2]);
                if (h > 23 || min > 59) return null;
                return this._buildTimeResult(h, min);
            }

            // ── 3-digit: 111, 930, 115 ────────────────────────────────────
            // interpret as H:MM - first digit is hour, last two are minutes
            const threeDigit = raw.match(/^(\d)(\d{2})$/);
            if (threeDigit) {
                const h = parseInt(threeDigit[1]);
                const min = parseInt(threeDigit[2]);
                if (h > 9 || min > 59) return null;
                return this._buildTimeResult(this._inferAmPm(h), min);
            }

            // ── bare hour: 9, 14 ─────────────────────────────────────────
            const bareHour = raw.match(/^(\d{1,2})$/);
            if (bareHour) {
                const h = parseInt(bareHour[1]);
                if (h > 23) return null;
                if (h > 12) return this._buildTimeResult(h, 0); // unambiguous 24hr
                return this._buildTimeResult(this._inferAmPm(h), 0);
            }

            return null;
        },

        // ── am/pm inference for ambiguous hours ──────────────────────────
        // 12-6  → PM (noon through early evening, most common business hours)
        // 7-11  → AM (morning)
        // 0     → midnight (AM)
        _inferAmPm(h) {
            if (h === 0)                return 0;   // midnight, already 24hr
            if (h === 12)               return 12;  // noon
            if (h >= 1 && h <= 6)      return h + 12; // 1-6 → PM
            return h;                               // 7-11 → AM as-is
        },

        // ── build standardized time result object ────────────────────────
        _buildTimeResult(h24, min) {
            const hh     = String(h24).padStart(2, '0');
            const mm     = String(min).padStart(2, '0');
            const period = h24 >= 12 ? 'PM' : 'AM';
            const h12    = h24 % 12 || 12;
            return {
                value:   `${hh}:${mm}`,
                display: `${h12}:${mm} ${period}`
            };
        },

        // ╭──────────────────────────────────────────────────╮
        // │                month name lookups                │
        // ╰──────────────────────────────────────────────────╯
        MONTH_ABBR:  ['Jan','Feb','Mar','Apr','May','Jun',
                        'Jul','Aug','Sep','Oct','Nov','Dec'],

        MONTH_FULL:  ['January','February','March','April','May','June',
                        'July','August','September','October','November','December'],

        // ╭──────────────────────────────────────────────────╮
        // │               get month from name                │
        // ╰──────────────────────────────────────────────────╯
        monthFromName(str) {
            const s = str.trim().toLowerCase();
            const abbr = this.MONTH_ABBR.findIndex(m => m.toLowerCase() === s);
            if (abbr > -1) return abbr;
            const full = this.MONTH_FULL.findIndex(m => m.toLowerCase() === s);
            return full; // returns -1 if not found
        },

        // ╭──────────────────────────────────────────────────╮
        // │    check if form config contains date fields     │
        // ╰──────────────────────────────────────────────────╯
        hasDateFields(config) {
            return config?.fields?.some(field =>
                field.type === 'date' ||
                field.type === 'datetime-local' ||
                field.type === 'time'
            ) || false;
        }

    },

    // ╭──────────────────────────────────────────────────╮
    // │                   phone utils                    │
    // ╰──────────────────────────────────────────────────╯

    phone: {

        CALLING_CODES: {
            US: '1', CA: '1', GB: '44', AU: '61',
            DE: '49', FR: '33', IN: '91', JP: '81',
            CN: '86'
        },

        // ╭──────────────────────────────────────────────────╮
        // │           format phone to e164 format            │
        // ╰──────────────────────────────────────────────────╯
        formatE164(phone, countryCode) {
            const digits = phone.replace(/\D/g, '');
            const code   = this.CALLING_CODES[countryCode] || '1';

            // if digits already start with country code, assume full international
            if (digits.startsWith(code) && digits.length > 10) return `+${digits}`;

            // strip leading trunk prefix '0' for countries outside NANP (US/CA)
            const nanp = ['US', 'CA'];
            const stripped = (!nanp.includes(countryCode) && digits.startsWith('0'))
                ? digits.slice(1)
                : digits;

            return `+${code}${stripped}`;
        }

    },

    // ╭──────────────────────────────────────────────────╮
    // │                    file utils                    │
    // ╰──────────────────────────────────────────────────╯

    file: {

        // ╭──────────────────────────────────────────────────╮
        // │             get extension from filename          │
        // ╰──────────────────────────────────────────────────╯
        /**
         * Extract the file extension from a filename, including the dot
         * Returns '' if no extension is found
         * @param {string} filename - e.g. 'report.pdf' → '.pdf'
         * @returns {string}
         */
        getExtension(filename) {
            if (!filename) return '';
            const idx = filename.lastIndexOf('.');
            return idx > 0 ? filename.slice(idx).toLowerCase() : '';
        },

        // ╭──────────────────────────────────────────────────╮
        // │              clean a filename stem               │
        // ╰──────────────────────────────────────────────────╯
        /**
         * Strip the extension from a filename and return just the stem
         * @param {string} filename - e.g. 'report.pdf' → 'report'
         * @returns {string}
         */
        stripExtension(filename) {
            if (!filename) return '';
            const idx = filename.lastIndexOf('.');
            return idx > 0 ? filename.slice(0, idx) : filename;
        },

        // ╭──────────────────────────────────────────────────╮
        // │                 format file size                 │
        // ╰──────────────────────────────────────────────────╯
        formatSize(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k     = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i     = Math.floor(Math.log(bytes) / Math.log(k));
            return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
        },

    },

    // ╭──────────────────────────────────────────────────╮
    // │        type and format detection helpers         │
    // ╰──────────────────────────────────────────────────╯

    is: {

        // ╭──────────────────────────────────────────────────╮
        // │          check if a string is a url              │
        // ╰──────────────────────────────────────────────────╯
        url(value) {
            if (typeof value !== 'string') return false;
            try {
                const parsed = new URL(value);
                return parsed.protocol === 'https:' || parsed.protocol === 'http:';
            } catch {
                return false;
            }
        },

        // ╭──────────────────────────────────────────────────╮
        // │     check if a string is a workdrive resource id │
        // ╰──────────────────────────────────────────────────╯
        workDriveId(value) {
            return typeof value === 'string' && /^[a-z0-9]{32,40}$/.test(value);
        },

    },

    string: {
        escapeJsString(value) {
            return String(value ?? '')
                .replace(/\\/g, '\\\\')
                .replace(/'/g, "\\'")
                .replace(/\r/g, '\\r')
                .replace(/\n/g, '\\n');
        },

        escapeHtml(text) {
            if (typeof text !== 'string') return text;
            const map = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            };
            return text.replace(/[&<>"']/g, m => map[m]);
        },

        processHtml(html) {
            let processed = html;

            // json-stringified wrapper
            if (typeof processed === 'string' && processed.startsWith('"') && processed.endsWith('"')) {
                try { processed = JSON.parse(processed); }
                catch (_) { /* not json, use as-is */ }
            }

            // url-encoded
            if (typeof processed === 'string' && processed.includes('%')) {
                try { processed = decodeURIComponent(processed); }
                catch (_) { /* malformed encoding, use as-is */ }
            }

            // html-entity encoded
            if (typeof processed === 'string' && processed.includes('&lt;')) {
                processed = processed
                    .replace(/&lt;/g,  '<')
                    .replace(/&gt;/g,  '>')
                    .replace(/&quot;/g, '"')
                    .replace(/&#39;/g, "'")
                    .replace(/&#0?39;/g, "'")
                    .replace(/&amp;/g, '&');
            }

            return processed;
        },

        renderMarkdown(text) {
            if (typeof marked !== 'undefined' && mosaic.flags.enableMarkdown) {
                return marked.parse(text);
            }
            return text;
        },

        truncate(text, maxLength, suffix = '...') {
            if (!text || text.length <= maxLength) return text;
            return text.substr(0, maxLength - suffix.length) + suffix;
        },

        toTitleCase(str) {
            if (!str) return '';
            return str.replace(/\w\S*/g, txt =>
                txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
            );
        },
    },

    object: {
        normalizeOption(opt) {
            if (typeof opt !== 'object' || opt === null) return { actualValue: opt, displayValue: opt };
            return {
                actualValue:  opt.actual_value  ?? opt.value ?? opt,
                displayValue: opt.display_value ?? opt.text  ?? opt.label ?? opt
            };
        },

        resolveDotNotation(obj, path, fallback = null) {
            if (!path) return obj;
            if (obj && Object.prototype.hasOwnProperty.call(obj, path)) return obj[path];
            const result = path.split('.').reduce((acc, part) => acc && acc[part], obj);
            return result ?? fallback;
        },

        deepClone(obj) {
            return JSON.parse(JSON.stringify(obj));
        },
    },

    async: {
        debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },

        async poll(fn, options = {}) {
            const interval = options.interval || 2000;
            const timeout  = options.timeout  || 60000;
            const label    = options.label    || 'mosaic.util.async.poll()';
            const deadline = Date.now() + timeout;
            let   attempt  = 0;

            while (Date.now() < deadline) {
                const result = await fn(++attempt);
                if (result !== undefined && result !== null && result !== false) return result;
                await mosaic.util.async.wait(interval);
            }

            throw new Error(`[MOSAIC] ${label} | Timed out after ${timeout}ms`);
        },

        wait(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        },
    },

    libs: {
        async initializeMarkedJs() {
            mosaic.flags.enableMarkdown = true;
            if (typeof marked === 'undefined') await mosaic.util.libs.load('marked');
            marked.setOptions({ breaks: true, gfm: true });
            mosaic.con.log('mosaic.util.libs.initializeMarkedJs() | Marked.js initialized for markdown rendering');
        },

        async load(key) {
            if (mosaic.libs._promises[key]) return mosaic.libs._promises[key];

            const entry = mosaic.libs.registry[key];
            if (!entry) throw new Error(`mosaic.util.libs.load() | Unknown lib key: "${key}"`);

            mosaic.con.log(`mosaic.util.libs.load() | Loading "${key}" from CDN...`);

            mosaic.libs._promises[key] = new Promise((resolve, reject) => {
                const script       = document.createElement('script');
                script.src         = entry.url;
                script.integrity   = entry.integrity;
                script.crossOrigin = 'anonymous';
                script.onload  = () => {
                    mosaic.con.log(`mosaic.util.libs.load() | "${key}" loaded successfully`);
                    resolve();
                };
                script.onerror = () => {
                    delete mosaic.libs._promises[key];
                    reject(new Error(`mosaic.util.libs.load() | Failed to load "${key}" from CDN`));
                };
                document.head.appendChild(script);
            });

            return mosaic.libs._promises[key];
        },
    },

    browser: {
        async getParentUrl() {
            if (mosaic.context.url) return mosaic.context.url;
            if (typeof self._getAppSDK !== "function") throw new Error("Zoho SDK is not initialized yet. Call this after ZOHO.embeddedApp.init().");
            const sdk = self._getAppSDK();
            return await sdk.getContext().Event.Trigger("CRM_EVENT", { category: "GET_PARENT_URL" }, true);
        },

        async getContextFromUrl(url) {
            url = url ? url : (mosaic.context.url ? mosaic.context.url : await mosaic.util.browser.getParentUrl());
            url = url.split('?')[0].replace(/\/$/, '');

            const pattern = /^https:\/\/(crm|crmsandbox)\.zoho\.(com|eu|in|com\.au|jp|sa|com\.cn)\/crm\/[^/]+\/(?:tab\/(?<module>[^/]+)(?:\/(?:(?<workqueue_id>\d+)\/queue\/(?<workqueue_cvid>\d+)|(?<id>\d+)(?:\/canvas\/\d+|\/edit)?|custom-view\/(?<cvid>\d+)\/list|(?<page_type>list|begin)))?|settings\/(?<settings_page>.+))$/;

            const match = url.match(pattern);

            if (!match?.groups) return { context: 'unknown', url };

            const g = match.groups;

            const ctx = {
                module:        g.module         || null,
                id:            g.id             || null,
                cvid:          g.cvid           || null,
                page_type:     g.page_type      || null,
                queue_id:      g.workqueue_id   || null,
                queue_view_id: g.workqueue_cvid || null,
                settings_page: g.settings_page  || null,
                url,
            };

            if (ctx.settings_page)                      ctx.context = 'settings';
            else if (ctx.queue_id && ctx.queue_view_id) ctx.context = 'workqueue';
            else if (ctx.id)                            ctx.context = 'record';
            else if (ctx.cvid)                          ctx.context = 'list';
            else if (ctx.page_type === 'list')          ctx.context = 'list';
            else if (ctx.page_type === 'begin')         ctx.context = 'begin';
            else if (ctx.module)                        ctx.context = 'list';
            else                                        ctx.context = 'unknown';

            return ctx;
        },

        async copyToClipboard(text) {
            try {
                await navigator.clipboard.writeText(text);
                return true;
            } catch (err) {
                mosaic.con.err('mosaic.util.clipboard.copyToClipboard() | Failed to copy to clipboard:', err);
                return false;
            }
        },
    },

    ids: {
        generateId(prefix = 'mosaic') {
            return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        },

        generateTimestamp() {
           return new Date().toISOString().slice(0, 19).replace(/[:\-T]/g, '');
        },
    },

    data: {
        sortData(data, field, order = 'asc') {
            if (!data || !Array.isArray(data)) return data;

            return [...data].sort((a, b) => {
                const aVal = mosaic.util.object.resolveDotNotation(a, field);
                const bVal = mosaic.util.object.resolveDotNotation(b, field);

                if (aVal === bVal) return 0;
                const comparison = aVal < bVal ? -1 : 1;
                return order === 'asc' ? comparison : -comparison;
            });
        },

        async generateRecordLink(module, recordId) {
            try {
                const orgDomainName = await mosaic.api.env.getOrgDomainName();

                if (!orgDomainName) {
                    mosaic.con.warn('mosaic.util.data.generateRecordLink() |  Organization domain not available');
                    return null;
                }

                const crmDomain = await mosaic.api.env.getCrmDomain();
                return `${crmDomain}/crm/${orgDomainName}/tab/${module}/${recordId}`;
            } catch (error) {
                mosaic.con.err('mosaic.util.data.generateRecordLink() | Error fetching organization domain name:', error);
                return null;
            }
        },
    },

};
