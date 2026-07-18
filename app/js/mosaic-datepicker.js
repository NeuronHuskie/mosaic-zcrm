/**
 * ════════════════════════════════════════════════════════════════════════
 *  mosaic.datepicker - lightweight calendar popup component
 * ════════════════════════════════════════════════════════════════════════
 */

mosaic.datepicker = {

    dom: {
        createPopup(withTime = false, timeOnly = false) {
            const popup = document.createElement('div');
            popup.className = 'mosaic-calendar-popup is-hidden';

            const timePaneHtml = `
                <div class="mcp-pane mcp-pane--time">
                    <div class="mcp-time-head">
                        <span class="mcp-time-title"></span>
                        <button type="button" class="mcp-time-x">&#10005;</button>
                    </div>
                    <div class="mcp-time-list"></div>
                </div>`;

            if (timeOnly) {
                popup.innerHTML = timePaneHtml;
                return popup;
            }

            const cardsHtml = !withTime ? '' : `
                <div class="mcp-pane mcp-pane--cards">
                    <button type="button" class="mcp-card mcp-card--date">
                        <span class="mcp-card-body">
                            <span class="mcp-card-lbl">Date</span>
                            <span class="mcp-card-val"></span>
                        </span>
                        <span class="mcp-card-chev">&#8250;</span>
                    </button>
                    <button type="button" class="mcp-card mcp-card--time">
                        <span class="mcp-card-body">
                            <span class="mcp-card-lbl">Time</span>
                            <span class="mcp-card-val"></span>
                        </span>
                        <span class="mcp-card-chev">&#8250;</span>
                    </button>
                    <button type="button" class="mcp-apply" disabled>Apply</button>
                </div>`;
            const timeHtml = !withTime ? '' : timePaneHtml;
            popup.innerHTML = `
                ${cardsHtml}
                <div class="mcp-pane mcp-pane--cal">
                    <div class="mcp-header">
                        <button type="button" class="mcp-nav mcp-prev">&#8249;</button>
                        <button type="button" class="mcp-month-label"></button>
                        <button type="button" class="mcp-nav mcp-next">&#8250;</button>
                    </div>
                    <div class="mcp-weekdays">
                        <div>S</div><div>M</div><div>T</div>
                        <div>W</div><div>T</div><div>F</div><div>S</div>
                    </div>
                    <div class="mcp-days-grid"></div>
                </div>
                ${timeHtml}`;
            return popup;
        },

        wrapInput(dateInput, popup) {
            const wrapper = document.createElement('div');
            wrapper.className = 'date-input-wrapper';
            dateInput.parentNode.insertBefore(wrapper, dateInput);
            wrapper.appendChild(dateInput);
            wrapper.appendChild(popup);
            return wrapper;
        },
    },

    state: {
        create() {
            return {
                selectedDate: null,
                selectedTime: null,   // { h, m } - datetime mode only
                pane: 'cards',        // 'cards' | 'cal' | 'time' - datetime mode only
                view: 'days',
                currentMonth: new Date().getMonth(),
                currentYear: new Date().getFullYear(),
                months: [
                    'January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'
                ]
            };
        },
    },

    defaults: {
        apply(context) {
            const { dateInput, userFormat, state } = context;
            const isoDefault = dateInput.getAttribute('data-default-iso');

            if (context.withTime) {
                if (!isoDefault || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(isoDefault)) return;
                const dt = mosaic.datepicker.datetime.fromIso(isoDefault);
                state.selectedDate = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
                state.selectedTime = { h: dt.getHours(), m: dt.getMinutes() };
                state.currentMonth = dt.getMonth();
                state.currentYear  = dt.getFullYear();
                mosaic.datepicker.datetime.writeValue(context);
                return;
            }

            if (!isoDefault || !/^\d{4}-\d{2}-\d{2}$/.test(isoDefault)) return;

            const [y, m, d] = isoDefault.split('-').map(Number);
            state.selectedDate = new Date(y, m - 1, d);
            state.currentMonth = state.selectedDate.getMonth();
            state.currentYear = state.selectedDate.getFullYear();
            dateInput.value = mosaic.util.date.formatDate(state.selectedDate, userFormat);

            // store default in the configured return format (not raw ISO)
            mosaic.api.env.getUserDateFormatReturn().then(returnFormat => {
                const storedVal = returnFormat && returnFormat !== 'yyyy-MM-dd'
                    ? mosaic.util.date.formatDate(state.selectedDate, returnFormat)
                    : isoDefault;
                dateInput.setAttribute('data-date-formatted-value', storedVal);
            });
        },
    },

    // first year of the 12-year block containing `year` (e.g. 2026 -> 2016)
    yearBlockStart(year) {
        return year - (year % 12);
    },

    // ── datetime (combined date + time) mode helpers ──────────────────────
    datetime: {
        pad(n) { return String(n).padStart(2, '0'); },

        fromIso(iso) {
            const [d, t] = iso.split('T');
            const [y, mo, day] = d.split('-').map(Number);
            const [h, mi] = t.split(':').map(Number);
            return new Date(y, mo - 1, day, h, mi);
        },

        toIso(state) {
            const p = mosaic.datepicker.datetime.pad;
            const d = state.selectedDate, t = state.selectedTime;
            return `${mosaic.util.date.toApiFormat(d)}T${p(t.h)}:${p(t.m)}`;
        },

        timeLabel(t, timeFormat) {
            return mosaic.util.date.formatTimeDisplay(new Date(2000, 0, 1, t.h, t.m), timeFormat);
        },

        // sync input display + stored value from state (both parts picked)
        writeValue(context) {
            const { dateInput, userFormat, state } = context;
            dateInput.value =
                `${mosaic.util.date.formatDate(state.selectedDate, userFormat)} ` +
                mosaic.datepicker.datetime.timeLabel(state.selectedTime, context.timeFormat);
            dateInput.setAttribute('data-date-formatted-value', mosaic.datepicker.datetime.toIso(state));
        },

        showPane(context, pane) {
            context.state.pane = pane;
            ['cards', 'cal', 'time'].forEach(p => {
                const el = context.popup.querySelector(`.mcp-pane--${p}`);
                if (el) el.classList.toggle('is-hidden', p !== pane);
            });
            if (pane === 'cards') mosaic.datepicker.datetime.renderCards(context);
            if (pane === 'cal')   mosaic.datepicker.render.calendar(context);
            if (pane === 'time')  mosaic.datepicker.datetime.renderTimeList(context);
        },

        renderCards(context) {
            const { popup, userFormat, state } = context;
            const dateVal = popup.querySelector('.mcp-card--date .mcp-card-val');
            const timeVal = popup.querySelector('.mcp-card--time .mcp-card-val');

            dateVal.textContent = state.selectedDate
                ? mosaic.util.date.formatDate(state.selectedDate, userFormat)
                : 'Select date';
            dateVal.classList.toggle('mcp-card-val--empty', !state.selectedDate);

            timeVal.textContent = state.selectedTime
                ? mosaic.datepicker.datetime.timeLabel(state.selectedTime, context.timeFormat)
                : 'Select time';
            timeVal.classList.toggle('mcp-card-val--empty', !state.selectedTime);

            popup.querySelector('.mcp-apply').disabled =
                !(state.selectedDate && state.selectedTime);
        },

        renderTimeList(context) {
            const { popup, state } = context;
            const title = popup.querySelector('.mcp-time-title');
            title.textContent = state.selectedTime
                ? mosaic.datepicker.datetime.timeLabel(state.selectedTime, context.timeFormat)
                : 'Select time';
            title.classList.toggle('mcp-time-title--empty', !state.selectedTime);

            const list = popup.querySelector('.mcp-time-list');
            list.innerHTML = '';

            for (let mins = 0; mins < 24 * 60; mins += 30) {
                const h = Math.floor(mins / 60), m = mins % 60;
                const row = document.createElement('button');
                row.type = 'button';
                row.className = 'mcp-time-row';
                row.textContent = mosaic.datepicker.datetime.timeLabel({ h, m }, context.timeFormat);
                if (state.selectedTime && state.selectedTime.h === h && state.selectedTime.m === m) {
                    row.classList.add('mcp-time-row--selected');
                }
                row.addEventListener('click', (e) => {
                    e.stopPropagation();
                    state.selectedTime = { h, m };
                    if (context.timeOnly) {
                        mosaic.datepicker.datetime.commitTime(context);
                    } else {
                        mosaic.datepicker.datetime.showPane(context, 'cards');
                    }
                });
                list.appendChild(row);
            }

            // center the selected row, or the next upcoming 30-min slot when
            // nothing is picked yet (instead of always starting at 12:00 AM)
            let target = list.querySelector('.mcp-time-row--selected');
            if (!target) {
                const now = new Date();
                const slot = Math.min(47, Math.ceil((now.getHours() * 60 + now.getMinutes()) / 30));
                target = list.children[slot];
            }
            if (target) list.scrollTop = target.offsetTop - (list.clientHeight - target.clientHeight) / 2;
        },

        // time-only mode: picking a row commits immediately (no Apply step)
        commitTime(context) {
            const { dateInput, state } = context;
            const t = state.selectedTime;
            const p = mosaic.datepicker.datetime.pad;

            dateInput.value = mosaic.datepicker.datetime.timeLabel(t, context.timeFormat);

            const value24  = `${p(t.h)}:${p(t.m)}`;
            const display12 = mosaic.util.date.formatTimeDisplay(new Date(2000, 0, 1, t.h, t.m));
            mosaic.api.env.getUserTimeFormatReturn().then(returnFormat => {
                dateInput.setAttribute('data-time-value',
                    returnFormat === 'h:mm AM/PM' ? display12 : value24);
                dateInput.dispatchEvent(new Event('timeSelected'));
            });

            dateInput.classList.remove('invalid-date');
            const fieldGroup = dateInput.closest('.field-group');
            if (fieldGroup) fieldGroup.classList.remove('invalid-group');

            mosaic.datepicker.actions.close(context);
        },

        apply(context) {
            const { dateInput, state } = context;
            if (!state.selectedDate || !state.selectedTime) return;
            mosaic.datepicker.datetime.writeValue(context);
            dateInput.classList.remove('invalid-date');
            const fieldGroup = dateInput.closest('.field-group');
            if (fieldGroup) fieldGroup.classList.remove('invalid-group');
            dateInput.dispatchEvent(new Event('dateSelected'));
            mosaic.datepicker.actions.close(context);
        },

        // typed "date time" entry, e.g. "3/5/2026 1:30 pm"
        parseTypedInput(context) {
            const { dateInput, userFormat, state } = context;
            const raw = dateInput.value.trim();

            if (!raw) {
                dateInput.setAttribute('data-date-formatted-value', '');
                dateInput.classList.remove('invalid-date');
                // clicking into the popup blurs the (empty) input mid-selection;
                // only forget the picked date/time when the popup is closed
                if (context.popup.classList.contains('is-hidden')) {
                    state.selectedDate = null;
                    state.selectedTime = null;
                }
                return;
            }

            // trailing time token: "1:30 PM", "130pm", "13:30", "1330"
            const timeMatch  = raw.match(/\s+(\d{1,4}(?::\d{2})?\s*(?:am|pm)|\d{1,2}:\d{2}|\d{3,4})\s*$/i);
            const datePart   = timeMatch ? raw.slice(0, timeMatch.index).trim() : raw;
            const timePart   = timeMatch ? timeMatch[1] : '';
            const parsedDate = mosaic.util.date.parseSmartDate(datePart, userFormat);
            const parsedTime = mosaic.util.date.parseSmartTime(timePart);

            if (parsedDate && parsedTime) {
                const [h, m] = parsedTime.value.split(':').map(Number);
                state.selectedDate = parsedDate;
                state.selectedTime = { h, m };
                state.currentMonth = parsedDate.getMonth();
                state.currentYear  = parsedDate.getFullYear();
                mosaic.datepicker.datetime.writeValue(context);
                dateInput.classList.remove('invalid-date');
                const fieldGroup = dateInput.closest('.field-group');
                if (fieldGroup) fieldGroup.classList.remove('invalid-group');
                dateInput.dispatchEvent(new Event('dateSelected'));
            } else {
                dateInput.classList.add('invalid-date');
                dateInput.setAttribute('data-date-formatted-value', '');
            }
        },
    },

    render: {
        calendar(context) {
            const { popup, state } = context;
            const view = state.view || 'days';

            popup.classList.toggle('mcp-view-days', view === 'days');
            popup.querySelector('.mcp-weekdays').style.display =
                view === 'days' ? '' : 'none';

            const grid = popup.querySelector('.mcp-days-grid');
            grid.classList.toggle('mcp-grid--wide', view !== 'days');
            grid.innerHTML = '';

            if (view === 'months') return mosaic.datepicker.render.months(context, grid);
            if (view === 'years') return mosaic.datepicker.render.years(context, grid);
            mosaic.datepicker.render.days(context, grid);
        },

        days(context, grid) {
            const { popup, state } = context;

            popup.querySelector('.mcp-month-label').textContent =
                `${state.months[state.currentMonth]} ${state.currentYear}`;

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const firstDay = new Date(state.currentYear, state.currentMonth, 1).getDay();
            const daysInMonth = new Date(state.currentYear, state.currentMonth + 1, 0).getDate();

            for (let i = 0; i < firstDay; i++) {
                const blank = document.createElement('div');
                blank.className = 'mcp-day mcp-day--empty';
                grid.appendChild(blank);
            }

            for (let day = 1; day <= daysInMonth; day++) {
                grid.appendChild(mosaic.datepicker.render.dayCell(context, day, today));
            }
        },

        months(context, grid) {
            const { popup, state } = context;
            popup.querySelector('.mcp-month-label').textContent = String(state.currentYear);
            const now = new Date();

            state.months.forEach((name, idx) => {
                const cell = document.createElement('div');
                cell.className = 'mcp-day mcp-day--cell';
                cell.textContent = name.slice(0, 3);
                if (idx === now.getMonth() && state.currentYear === now.getFullYear()) {
                    cell.classList.add('mcp-day--today');
                }
                if (state.selectedDate &&
                    idx === state.selectedDate.getMonth() &&
                    state.currentYear === state.selectedDate.getFullYear()) {
                    cell.classList.add('mcp-day--selected');
                }
                cell.addEventListener('click', (e) => {
                    e.stopPropagation();
                    state.currentMonth = idx;
                    state.view = 'days';
                    mosaic.datepicker.render.calendar(context);
                });
                grid.appendChild(cell);
            });
        },

        years(context, grid) {
            const { popup, state } = context;
            const start = mosaic.datepicker.yearBlockStart(state.currentYear);
            popup.querySelector('.mcp-month-label').textContent = `${start} - ${start + 11}`;
            const nowYear = new Date().getFullYear();

            for (let y = start; y <= start + 11; y++) {
                const cell = document.createElement('div');
                cell.className = 'mcp-day mcp-day--cell';
                cell.textContent = y;
                if (y === nowYear) cell.classList.add('mcp-day--today');
                if (state.selectedDate && y === state.selectedDate.getFullYear()) {
                    cell.classList.add('mcp-day--selected');
                }
                cell.addEventListener('click', (e) => {
                    e.stopPropagation();
                    state.currentYear = y;
                    state.view = 'months';
                    mosaic.datepicker.render.calendar(context);
                });
                grid.appendChild(cell);
            }
        },

        dayCell(context, day, today) {
            const { disablePastDates, state } = context;
            const cell = document.createElement('div');
            cell.className = 'mcp-day';
            cell.textContent = day;

            const date = new Date(state.currentYear, state.currentMonth, day);

            if (date.getTime() === today.getTime()) {
                cell.classList.add('mcp-day--today');
            }

            if (state.selectedDate &&
                date.getTime() === new Date(
                    state.selectedDate.getFullYear(),
                    state.selectedDate.getMonth(),
                    state.selectedDate.getDate()
                ).getTime()) {
                cell.classList.add('mcp-day--selected');
            }

            if (disablePastDates && date < today) {
                cell.classList.add('mcp-day--disabled');
            } else {
                cell.addEventListener('click', () => mosaic.datepicker.actions.selectDay(context, day));
            }

            return cell;
        },
    },

    actions: {
        selectDay(context, day) {
            const { dateInput, userFormat, state } = context;
            state.selectedDate = new Date(state.currentYear, state.currentMonth, day);

            // datetime mode: picking the date returns to the summary cards
            if (context.withTime) {
                mosaic.datepicker.datetime.showPane(context, 'cards');
                return;
            }

            mosaic.api.env.getUserDateFormatReturn().then(returnFormat => {
                const storedVal = returnFormat && returnFormat !== 'yyyy-MM-dd'
                    ? mosaic.util.date.formatDate(state.selectedDate, returnFormat)
                    : mosaic.util.date.toApiFormat(state.selectedDate);
                dateInput.setAttribute('data-date-formatted-value', storedVal);
                dateInput.dispatchEvent(new Event('dateSelected'));
            });

            dateInput.value = mosaic.util.date.formatDate(state.selectedDate, userFormat);
            dateInput.classList.remove('invalid-date');

            const fieldGroup = dateInput.closest('.field-group');
            if (fieldGroup) fieldGroup.classList.remove('invalid-group');

            mosaic.datepicker.actions.close(context);
            mosaic.datepicker.render.calendar(context);
        },

        navigate(context, direction) {
            const { state } = context;
            if (state.view === 'months') {
                state.currentYear += direction;
            } else if (state.view === 'years') {
                state.currentYear += direction * 12;
            } else {
                state.currentMonth += direction;
                if (state.currentMonth > 11) { state.currentMonth = 0; state.currentYear++; }
                if (state.currentMonth < 0) { state.currentMonth = 11; state.currentYear--; }
            }
            mosaic.datepicker.render.calendar(context);
        },

        // header click drills up: days -> months -> years
        drillUp(context) {
            const { state } = context;
            if (state.view === 'days') state.view = 'months';
            else if (state.view === 'months') state.view = 'years';
            mosaic.datepicker.render.calendar(context);
        },

        open(context) {
            const { popup, state } = context;
            state.view = 'days';
            if (state.selectedDate) {
                state.currentMonth = state.selectedDate.getMonth();
                state.currentYear = state.selectedDate.getFullYear();
            }
            if (context.withTime) {
                mosaic.datepicker.datetime.showPane(context, 'cards');
            } else {
                mosaic.datepicker.render.calendar(context);
            }
            popup.classList.remove('is-hidden');
        },

        close(context) {
            context.popup.classList.add('is-hidden');
        },

        parseTypedInput(context) {
            if (context.withTime) return mosaic.datepicker.datetime.parseTypedInput(context);

            const { dateInput, userFormat, state } = context;
            const raw = dateInput.value.trim();

            if (!raw) {
                dateInput.setAttribute('data-date-formatted-value', '');
                dateInput.classList.remove('invalid-date');
                state.selectedDate = null;
                return;
            }

            const parsed = mosaic.util.date.parseSmartDate(raw, userFormat);
            if (parsed) {
                state.selectedDate = parsed;
                state.currentMonth = parsed.getMonth();
                state.currentYear = parsed.getFullYear();
                dateInput.value = mosaic.util.date.formatDate(parsed, userFormat);

                mosaic.api.env.getUserDateFormatReturn().then(returnFormat => {
                    const storedVal = returnFormat && returnFormat !== 'yyyy-MM-dd'
                        ? mosaic.util.date.formatDate(parsed, returnFormat)
                        : mosaic.util.date.toApiFormat(parsed);
                    dateInput.setAttribute('data-date-formatted-value', storedVal);
                    dateInput.dispatchEvent(new Event('dateSelected'));
                });

                dateInput.classList.remove('invalid-date');

                const fieldGroup = dateInput.closest('.field-group');
                if (fieldGroup) fieldGroup.classList.remove('invalid-group');
            } else {
                dateInput.classList.add('invalid-date');
                dateInput.setAttribute('data-date-formatted-value', '');
            }
        },
    },

    events: {
        bind(context) {
            const { dateInput, popup, wrapper } = context;

            dateInput.addEventListener('click', (e) => {
                e.stopPropagation();
                popup.classList.contains('is-hidden')
                    ? mosaic.datepicker.actions.open(context)
                    : mosaic.datepicker.actions.close(context);
            });

            dateInput.addEventListener('keydown', (e) => {
                // Escape closes the picker only; swallow it so it doesn't bubble
                // up to the form's close_on_escape handler
                if (e.key === 'Escape' && !popup.classList.contains('is-hidden')) {
                    e.stopPropagation();
                    e.preventDefault();
                    mosaic.datepicker.actions.close(context);
                    return;
                }

                if (e.key === 'Tab') {
                    mosaic.datepicker.actions.close(context);
                }
            });

            if (context.withTime) {
                popup.querySelector('.mcp-card--date').addEventListener('click', (e) => {
                    e.stopPropagation();
                    context.state.view = 'days';
                    if (context.state.selectedDate) {
                        context.state.currentMonth = context.state.selectedDate.getMonth();
                        context.state.currentYear  = context.state.selectedDate.getFullYear();
                    }
                    mosaic.datepicker.datetime.showPane(context, 'cal');
                });
                popup.querySelector('.mcp-card--time').addEventListener('click', (e) => {
                    e.stopPropagation();
                    mosaic.datepicker.datetime.showPane(context, 'time');
                });
                popup.querySelector('.mcp-time-x').addEventListener('click', (e) => {
                    e.stopPropagation();
                    mosaic.datepicker.datetime.showPane(context, 'cards');
                });
                popup.querySelector('.mcp-apply').addEventListener('click', (e) => {
                    e.stopPropagation();
                    mosaic.datepicker.datetime.apply(context);
                });
            }

            popup.querySelector('.mcp-month-label').addEventListener('click', (e) => {
                e.stopPropagation();
                mosaic.datepicker.actions.drillUp(context);
            });

            popup.querySelector('.mcp-prev').addEventListener('click', (e) => {
                e.stopPropagation();
                mosaic.datepicker.actions.navigate(context, -1);
            });

            popup.querySelector('.mcp-next').addEventListener('click', (e) => {
                e.stopPropagation();
                mosaic.datepicker.actions.navigate(context, 1);
            });

            popup.addEventListener('keydown', (e) => {
                if (e.key === 'Tab') {
                    e.preventDefault();
                    mosaic.datepicker.actions.close(context);

                    const focusable = Array.from(document.querySelectorAll(
                        'input, select, textarea, button:not([disabled]), [tabindex]:not([tabindex="-1"])'
                    )).filter(el => !wrapper.contains(el) && el.offsetParent !== null);

                    const nextEl = focusable[0];
                    if (nextEl) nextEl.focus();
                }
            });

            document.addEventListener('click', (e) => {
                if (!wrapper.contains(e.target)) mosaic.datepicker.actions.close(context);
            });

            dateInput.addEventListener('blur', () => {
                mosaic.datepicker.actions.parseTypedInput(context);
            });
        },
    },

    setup: {
        /**
         * Attach a calendar popup to a text date input
         * @param {HTMLInputElement} dateInput - The text input element
         * @param {string} userFormat - User's date format from mosaic.cache.userDateFormat
         * @param {object} fieldConfig - The field config object from mosaic.config.fields
         * @param {object} opts - { withTime: true, timeFormat } for combined
         *                        date + time (datetime-local)
         */
        attach(dateInput, userFormat, fieldConfig = {}, opts = {}) {
            const withTime = opts.withTime === true;
            const popup = mosaic.datepicker.dom.createPopup(withTime);
            const wrapper = mosaic.datepicker.dom.wrapInput(dateInput, popup);
            const context = {
                dateInput,
                userFormat,
                fieldConfig,
                popup,
                wrapper,
                withTime,
                timeFormat: opts.timeFormat || 'h:mm AM/PM',
                state: mosaic.datepicker.state.create(),
                disablePastDates: fieldConfig.disable_past_dates === true
            };

            mosaic.datepicker.defaults.apply(context);
            mosaic.datepicker.render.calendar(context);
            mosaic.datepicker.events.bind(context);

            dateInput._mosaicPicker = {
                open: () => mosaic.datepicker.actions.open(context),
                close: () => mosaic.datepicker.actions.close(context),
                render: () => mosaic.datepicker.render.calendar(context)
            };

            return dateInput._mosaicPicker;
        },

        /**
         * Attach a time-list popup to a text time input (time fields).
         * Picking a row commits immediately; typed entry is still parsed by
         * the input's own blur handler (mosaic.form.setup.time).
         * @param {HTMLInputElement} timeInput - The text input element
         * @param {string} timeFormat - User's time display format ('h:mm AM/PM' | 'HH:mm')
         */
        attachTime(timeInput, timeFormat) {
            const popup = mosaic.datepicker.dom.createPopup(false, true);
            const wrapper = mosaic.datepicker.dom.wrapInput(timeInput, popup);
            const context = {
                dateInput: timeInput,
                popup,
                wrapper,
                timeOnly: true,
                timeFormat: timeFormat || 'h:mm AM/PM',
                state: mosaic.datepicker.state.create()
            };

            const open = () => {
                // seed the list from whatever is typed in the input
                const parsed = mosaic.util.date.parseSmartTime(timeInput.value.trim());
                if (parsed) {
                    const [h, m] = parsed.value.split(':').map(Number);
                    context.state.selectedTime = { h, m };
                }
                // unhide before rendering: the scroll-to-slot math needs layout
                popup.classList.remove('is-hidden');
                mosaic.datepicker.datetime.renderTimeList(context);
            };

            timeInput.addEventListener('click', (e) => {
                e.stopPropagation();
                popup.classList.contains('is-hidden')
                    ? open()
                    : mosaic.datepicker.actions.close(context);
            });

            timeInput.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && !popup.classList.contains('is-hidden')) {
                    e.stopPropagation();
                    e.preventDefault();
                    mosaic.datepicker.actions.close(context);
                    return;
                }
                if (e.key === 'Tab') mosaic.datepicker.actions.close(context);
            });

            popup.querySelector('.mcp-time-x').addEventListener('click', (e) => {
                e.stopPropagation();
                mosaic.datepicker.actions.close(context);
            });

            document.addEventListener('click', (e) => {
                if (!wrapper.contains(e.target)) mosaic.datepicker.actions.close(context);
            });

            timeInput._mosaicPicker = {
                open,
                close: () => mosaic.datepicker.actions.close(context)
            };

            return timeInput._mosaicPicker;
        },
    },
};
