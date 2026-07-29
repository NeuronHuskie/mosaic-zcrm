const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');

function createClassList() {
    const classes = new Set();
    return {
        add: (...names) => names.forEach(name => classes.add(name)),
        remove: (...names) => names.forEach(name => classes.delete(name)),
        contains: name => classes.has(name)
    };
}

function createDocument() {
    const elements = {
        alertMessage: { innerHTML: '', textContent: '' },
        customAlert: { classList: createClassList() },
        alertBox: { classList: createClassList(), style: {} }
    };
    const appendedScripts = [];

    return {
        elements,
        appendedScripts,
        getElementById(id) {
            return elements[id] || null;
        },
        addEventListener() {},
        querySelector(selector) {
            if (selector === '.alert-box') return elements.alertBox;
            return null;
        },
        createElement(tagName) {
            return { tagName, src: '', onload: null, onerror: null };
        },
        head: {
            appendChild(script) {
                appendedScripts.push(script);
            }
        },
        body: { innerHTML: '', className: '', classList: createClassList() }
    };
}

function createLocalStorage() {
    const store = new Map();

    return {
        get length() {
            return store.size;
        },
        getItem(key) {
            return store.has(key) ? store.get(key) : null;
        },
        setItem(key, value) {
            store.set(key, String(value));
        },
        removeItem(key) {
            store.delete(key);
        },
        key(index) {
            return [...store.keys()][index] || null;
        }
    };
}

function loadMosaic() {
    const document = createDocument();
    const context = {
        console,
        document,
        window: { innerWidth: 800, innerHeight: 600 },
        ZOHO: {
            CRM: {
                CONFIG: {
                    GetCurrentEnvironment: async () => ({ deployment: 'EU' })
                }
            }
        },
        ZDK: { Client: { showMessage() {}, showLoader() {}, hideLoader() {} } },
        zrc: { createInstance() {} },
        localStorage: createLocalStorage(),
        Event: class Event { constructor(type) { this.type = type; } },
        URL,
        setTimeout,
        clearTimeout
    };

    vm.createContext(context);

    const core = fs.readFileSync(path.join(root, 'app/js/mosaic-core.js'), 'utf8');
    vm.runInContext(`${core}\nglobalThis.mosaic = mosaic;`, context);
    for (const file of ['mosaic-flyout.js', 'mosaic-relatedlist.js', 'mosaic-util.js', 'mosaic-ui.js', 'mosaic-api.js', 'mosaic-storage.js', 'mosaic-theme.js', 'mosaic-form.js', 'mosaic-export.js', 'mosaic-table.js', 'mosaic-pdf.js', 'mosaic-html.js', 'mosaic-launcher.js', 'mosaic-handlers.js', 'mosaic-conditions.js', 'mosaic-datepicker.js', 'mosaic-validators.js']) {
        const source = fs.readFileSync(path.join(root, 'app/js', file), 'utf8');
        vm.runInContext(source, context);
    }

    return context;
}

async function test(name, fn) {
    try {
        await fn();
        console.log(`PASS ${name}`);
    } catch (error) {
        console.error(`FAIL ${name}`);
        console.error(error.stack || error.message);
        process.exitCode = 1;
    }
}

(async () => {
    await test('getDeployment uses mosaic.cache instead of undefined mosaic.state', async () => {
        const { mosaic } = loadMosaic();
        assert.strictEqual(mosaic.state, undefined);

        const deployment = await mosaic.api.env.getDeployment();

        assert.deepStrictEqual(deployment, { deployment: 'EU' });
        assert.deepStrictEqual(mosaic.cache.deployment, { deployment: 'EU' });
    });

    await test('app modules do not read from removed mosaic.state', () => {
        const jsDir = path.join(root, 'app/js');
        const references = fs.readdirSync(jsDir)
            .filter(file => file.endsWith('.js'))
            .flatMap(file => {
                const source = fs.readFileSync(path.join(jsDir, file), 'utf8');
                return source.includes('mosaic.state') ? [file] : [];
            });

        assert.deepStrictEqual(references, []);
    });

    await test('alert.show treats messages as text by default', () => {
        const { mosaic, document } = loadMosaic();

        mosaic.ui.alert.show('<img src=x onerror=alert(1)>');

        assert.strictEqual(
            document.elements.alertMessage.innerHTML,
            '&lt;img src=x onerror=alert(1)&gt;'
        );
    });

    await test('showValidationErrors escapes field names and messages', () => {
        const { mosaic, document } = loadMosaic();

        mosaic.ui.alert.showValidationErrors(['Name <script>: Bad <img>']);

        assert(document.elements.alertMessage.innerHTML.includes('Name &lt;script&gt;'));
        assert(document.elements.alertMessage.innerHTML.includes('Bad &lt;img&gt;'));
    });

    await test('escapeJsString prepares values for single-quoted inline arguments', () => {
        const { mosaic } = loadMosaic();

        assert.strictEqual(
            mosaic.util.string.escapeJsString("Bob's \\ file\r\nnext"),
            "Bob\\'s \\\\ file\\r\\nnext"
        );
    });

    await test('formatDate renders named-month formats without corrupting month names', () => {
        const { mosaic } = loadMosaic();
        const dec5  = new Date(2026, 11, 5);
        const dec15 = new Date(2026, 11, 15);
        const mar7  = new Date(2026, 2, 7);

        // December is the regression case: the month name contains a 'D'
        assert.strictEqual(mosaic.util.date.formatDate(dec5,  'MMMM d, yyyy'), 'December 5, 2026');
        assert.strictEqual(mosaic.util.date.formatDate(dec5,  'MMM d, yyyy'),  'Dec 5, 2026');
        assert.strictEqual(mosaic.util.date.formatDate(dec15, 'dd MMM yyyy'),  '15 Dec 2026');
        assert.strictEqual(mosaic.util.date.formatDate(dec15, 'MMMM dd, yy'),  'December 15, 26');

        // non-December named month and numeric formats keep working
        assert.strictEqual(mosaic.util.date.formatDate(mar7,  'MMMM d, yyyy'), 'March 7, 2026');
        assert.strictEqual(mosaic.util.date.formatDate(dec5,  'MM/dd/yyyy'),   '12/05/2026');
        assert.strictEqual(mosaic.util.date.formatDate(dec5,  'dd.MM.yyyy'),   '05.12.2026');
    });

    await test('date validators treat yyyy-MM-dd as a local date', () => {
        const { mosaic } = loadMosaic();
        const todayLocal = mosaic.util.date.toApiFormat(new Date());

        // "today" must validate as both future-or-today and past-or-today,
        // regardless of the machine's utc offset
        assert.strictEqual(mosaic.validators.groups.date.future(todayLocal, 'Due').valid, true);
        assert.strictEqual(mosaic.validators.groups.date.past(todayLocal, 'Due').valid, true);
        assert.strictEqual(mosaic.validators.groups.date.range(todayLocal, todayLocal, todayLocal, 'Due').valid, true);

        // the shared parser reads iso dates as local midnight
        const parsed = mosaic.util.date.parseLocalDate('2026-06-10T14:30');
        assert.strictEqual(parsed.getFullYear(), 2026);
        assert.strictEqual(parsed.getMonth(), 5);
        assert.strictEqual(parsed.getDate(), 10);
        assert.strictEqual(mosaic.util.date.parseLocalDate('2026-06-10').getHours(), 0);
        assert.strictEqual(mosaic.util.date.parseLocalDate('not a date'), null);
    });

    await test('datetime-local default "now" uses the local date for its iso default', () => {
        const context = loadMosaic();
        const { mosaic } = context;
        const RealDate = Date;

        // freeze "now" at 23:30 local - on machines west of utc the utc date
        // is already tomorrow, which is exactly the bug this test guards
        context.Date = class extends RealDate {
            constructor(...args) {
                args.length === 0 ? super(2026, 0, 1, 23, 30, 0) : super(...args);
            }
        };

        const html = mosaic.form.fields.datetimeLocal.build(
            { name: 'Meet', label: 'Meet', type: 'datetime-local', default_value: 'now' }, ''
        );

        assert(html.includes('data-default-iso="2026-01-01T23:30"'));
    });

    await test('datetime-local renders a single combined input, or a native input with use_date_input', () => {
        const { mosaic } = loadMosaic();

        const combined = mosaic.form.fields.datetimeLocal.build(
            { name: 'Meet', label: 'Meet', type: 'datetime-local' }, ''
        );
        assert(combined.includes('id="Meet_display"'));
        assert(combined.includes('type="hidden"'));
        assert(!combined.includes('Meet_time'));

        const native = mosaic.form.fields.datetimeLocal.build(
            { name: 'Meet', label: 'Meet', type: 'datetime-local', use_date_input: true, default_value: '2026-03-05T09:15' }, ''
        );
        assert(native.includes('type="datetime-local"'));
        assert(native.includes('value="2026-03-05T09:15"'));
        assert(!native.includes('type="hidden"'));

        // time-list labels honor the time display format
        assert.strictEqual(mosaic.datepicker.datetime.timeLabel({ h: 14, m: 30 }, 'HH:mm'), '14:30');
        assert.strictEqual(mosaic.datepicker.datetime.timeLabel({ h: 14, m: 30 }, 'h:mm AM/PM'), '2:30 PM');

        // iso round-trip used by the combined picker
        const dt = mosaic.datepicker.datetime.fromIso('2026-03-05T09:15');
        assert.strictEqual(dt.getHours(), 9);
        assert.strictEqual(
            mosaic.datepicker.datetime.toIso({ selectedDate: dt, selectedTime: { h: 9, m: 15 } }),
            '2026-03-05T09:15'
        );
    });

    await test('combined picker blur re-parses its own display format and keeps state mid-selection', () => {
        const { mosaic } = loadMosaic();

        const makeInput = value => ({
            value,
            attrs: { 'data-date-formatted-value': 'stale' },
            getAttribute(n) { return this.attrs[n] ?? null; },
            setAttribute(n, v) { this.attrs[n] = v; },
            closest: () => null,
            dispatchEvent() {},
            classList: createClassList()
        });
        const makeContext = (input, popupHidden) => ({
            dateInput: input,
            userFormat: 'MM/dd/yyyy',
            timeFormat: 'h:mm AM/PM',
            withTime: true,
            popup: { classList: { contains: () => popupHidden } },
            state: { selectedDate: new Date(2026, 6, 15), selectedTime: { h: 13, m: 30 } }
        });

        // the display format the picker itself writes must survive a blur re-parse
        const input = makeInput('07/15/2026 1:30 PM');
        mosaic.datepicker.datetime.parseTypedInput(makeContext(input, true));
        assert.strictEqual(input.attrs['data-date-formatted-value'], '2026-07-15T13:30');
        assert(!input.classList.contains('invalid-date'));

        // bare-digit and 24h time tokens also split correctly
        const military = makeInput('07/15/2026 130pm');
        mosaic.datepicker.datetime.parseTypedInput(makeContext(military, true));
        assert.strictEqual(military.attrs['data-date-formatted-value'], '2026-07-15T13:30');

        // empty input + open popup (blur from clicking a card) keeps the picked state
        const empty = makeInput('');
        const openCtx = makeContext(empty, false);
        mosaic.datepicker.datetime.parseTypedInput(openCtx);
        assert(openCtx.state.selectedDate instanceof Date);
        assert.deepStrictEqual(openCtx.state.selectedTime, { h: 13, m: 30 });

        // empty input + closed popup clears the state
        const cleared = makeInput('');
        const closedCtx = makeContext(cleared, true);
        mosaic.datepicker.datetime.parseTypedInput(closedCtx);
        assert.strictEqual(closedCtx.state.selectedDate, null);
        assert.strictEqual(closedCtx.state.selectedTime, null);
    });

    await test('typed-but-unblurred time fields honor the time return format override', async () => {
        const { mosaic } = loadMosaic();

        mosaic.overrides = Object.freeze({ timeFormatReturn: 'h:mm AM/PM' });
        mosaic.runtime.form.flatFields = [{ name: 'Start', label: 'Start', type: 'time' }];

        const timeEl = {
            value: '230pm',
            attrs: {},
            getAttribute(name) { return this.attrs[name] ?? null; },
            setAttribute(name, value) { this.attrs[name] = value; },
            closest: () => null,
            classList: createClassList()
        };
        const form = {
            querySelector(selector) {
                return selector.includes('Start') ? timeEl : null;
            },
            querySelectorAll: () => [],
            classList: createClassList()
        };

        const result = await mosaic.validators.groups.form.validate(form, mosaic.runtime.form.flatFields);

        assert.strictEqual(result.valid, true);
        // must match what the blur handler would have stored for this override
        assert.strictEqual(result.data.Start, '2:30 PM');
        assert.strictEqual(timeEl.attrs['data-time-value'], '2:30 PM');
    });

    await test('theme toggle preserves unrelated body classes', () => {
        const { mosaic, document } = loadMosaic();

        document.body.classList.add('is-related-list');

        mosaic.theme.mode.apply('light');
        assert(document.body.classList.contains('light-mode'));

        mosaic.theme.mode.toggle();
        assert(document.body.classList.contains('dark-mode'));
        assert(!document.body.classList.contains('light-mode'));
        assert(document.body.classList.contains('is-related-list'));
    });

    await test('field builders escape labels, placeholders, and titles', () => {
        const { mosaic } = loadMosaic();
        const evil    = '<b>"x"</b>';
        const escaped = '&lt;b&gt;&quot;x&quot;&lt;/b&gt;';
        const evilPlaceholder = '"><img src=x>';

        const input = mosaic.form.fields.input.build({ name: 'F', label: evil, type: 'text' }, '', evilPlaceholder);
        assert(input.includes(escaped));
        assert(!input.includes(evil));
        assert(!input.includes(evilPlaceholder));

        const textarea = mosaic.form.fields.textarea.build({ name: 'F', label: evil, rows: 2 }, '', evilPlaceholder);
        assert(textarea.includes(escaped));
        assert(!textarea.includes(evilPlaceholder));

        assert(mosaic.form.fields.checkbox.build({ name: 'F', label: evil, options: ['a'] }, '').includes(escaped));
        assert(mosaic.form.fields.checkbox.build({ name: 'F', label: evil }, '').includes(escaped));
        assert(mosaic.form.fields.radio.build({ name: 'F', label: evil, options: ['a'] }, '').includes(escaped));
        assert(mosaic.form.fields.picklist.build({ name: 'F', label: evil, options: ['a'] }).includes(escaped));
        assert(mosaic.form.fields.multiselect.build({ name: 'F', label: evil, options: ['a'] }, '').includes(escaped));
        assert(mosaic.form.fields.datetimeLocal.build({ name: 'F', label: evil, type: 'datetime-local' }, '').includes(escaped));
        assert(mosaic.form.fields.file.build({ name: 'F', label: evil }, '').includes(escaped));
        assert(mosaic.form.fields.button.build({ label: evil }).includes(escaped));

        const shell = mosaic.table.render.shell({ title: evil, columns: [], source: { type: 'static', data: [] } });
        assert(shell.includes(escaped));
        assert(!shell.includes(evil));

        // the form title is interpolated inside builder.build - source-level guard
        const formSrc = fs.readFileSync(path.join(root, 'app/js/mosaic-form.js'), 'utf8');
        assert(!formSrc.includes('>${title}<'));
    });

    await test('attribute selectors interpolate only escaped values', () => {
        const jsDir = path.join(root, 'app/js');
        const offenders = [];

        for (const file of fs.readdirSync(jsDir).filter(f => f.endsWith('.js'))) {
            const lines = fs.readFileSync(path.join(jsDir, file), 'utf8').split(/\r?\n/);
            lines.forEach((line, index) => {
                if (line.includes('String(fieldName).replace')) return; // nameSelector itself
                if (/\[(?:name|value|data-value)="\$\{(?!CSS\.escape\()/.test(line)) {
                    offenders.push(`${file}:${index + 1}: ${line.trim()}`);
                }
            });
        }

        assert.deepStrictEqual(offenders, []);
    });

    await test('field helpers apply and clear invalid state consistently', () => {
        const { mosaic } = loadMosaic();
        const fieldGroup = { classList: createClassList(), querySelector: () => picklistDisplay, querySelectorAll: () => [fieldElement, picklistDisplay] };
        const fieldElement = { classList: createClassList(), closest: () => fieldGroup };
        const picklistDisplay = { classList: createClassList() };
        const form = {
            querySelector(selector) {
                if (selector === '[name="Status"]') return fieldElement;
                return null;
            }
        };

        mosaic.util.fields.applyInvalidState(form, 'Status', true);

        assert(fieldGroup.classList.contains('invalid-group'));
        assert(fieldElement.classList.contains('invalid-field'));
        assert(fieldElement.classList.contains('invalid-date'));
        assert(picklistDisplay.classList.contains('invalid-field'));

        mosaic.util.fields.clearFieldInvalidState(form, 'Status', fieldElement);

        assert(!fieldGroup.classList.contains('invalid-group'));
        assert(!fieldElement.classList.contains('invalid-field'));
        assert(!fieldElement.classList.contains('invalid-date'));
        assert(!picklistDisplay.classList.contains('invalid-field'));
    });

    await test('live clearing marks empty required fields and clears them once filled', async () => {
        const { mosaic } = loadMosaic();

        const fieldGroup = { classList: createClassList(), querySelector: () => null, querySelectorAll: () => [] };
        const listeners = {};
        const input = {
            value: '',
            classList: createClassList(),
            closest: () => fieldGroup,
            addEventListener: (event, handler) => { listeners[event] = handler; }
        };
        const form = {
            querySelector: selector => (selector === '[name="Company"]' ? input : null),
            querySelectorAll: () => []
        };

        await mosaic.validators.groups.form.setupLiveClearing(form, [
            { name: 'Company', label: 'Company', type: 'text', required: true }
        ]);

        // seeded at setup - empty required field starts highlighted
        assert(fieldGroup.classList.contains('required-empty'));

        input.value = 'Acme';
        listeners.input();
        assert(!fieldGroup.classList.contains('required-empty'));

        // emptied again - highlight returns
        input.value = '';
        listeners.input();
        assert(fieldGroup.classList.contains('required-empty'));
    });

    await test('live clearing leaves optional fields unmarked', async () => {
        const { mosaic } = loadMosaic();

        const fieldGroup = { classList: createClassList(), querySelector: () => null, querySelectorAll: () => [] };
        const input = { value: '', classList: createClassList(), closest: () => fieldGroup, addEventListener: () => {} };
        const form = {
            querySelector: selector => (selector === '[name="Notes"]' ? input : null),
            querySelectorAll: () => []
        };

        await mosaic.validators.groups.form.setupLiveClearing(form, [
            { name: 'Notes', label: 'Notes', type: 'text' }
        ]);

        assert(!fieldGroup.classList.contains('required-empty'));
    });

    await test('live clearing defers seeding until deferred field setup has run', async () => {
        const { mosaic } = loadMosaic();

        const fieldGroup = { classList: createClassList(), querySelector: () => null, querySelectorAll: () => [] };
        // smart date fields render with no value attribute - the default is written in
        // later by the datepicker, so seeding early would wrongly mark them unfilled
        const input = { value: '', classList: createClassList(), closest: () => fieldGroup, addEventListener: () => {} };
        const form = {
            querySelector: selector => (selector === '[name="Close_Date"]' ? input : null),
            querySelectorAll: () => []
        };

        const ready = new Promise(resolve => setTimeout(resolve, 5));
        const seeded = mosaic.validators.groups.form.setupLiveClearing(
            form,
            [{ name: 'Close_Date', label: 'Close Date', type: 'date', required: true }],
            ready
        );

        // datepicker writes the default in while the readiness promise is still pending
        input.value = '07/29/2026';

        await seeded;
        assert(!fieldGroup.classList.contains('required-empty'));
    });

    await test('field helpers read raw and processed radio values', () => {
        const { mosaic } = loadMosaic();
        const checked = { value: 'A', nextElementSibling: { textContent: 'Alpha' } };
        const form = {
            querySelector(selector) {
                if (selector === '[name="Choice"]') return checked;
                if (selector === 'input[name="Choice"]:checked') return checked;
                return null;
            },
            querySelectorAll() {
                return [];
            }
        };

        assert.strictEqual(
            mosaic.util.fields.getValue(form, { name: 'Choice', type: 'radio' }),
            'A'
        );
        const processed = mosaic.util.fields.getProcessedValue(form, { name: 'Choice', type: 'radio' });
        assert.strictEqual(processed.actual_value, 'A');
        assert.strictEqual(processed.display_value, 'Alpha');
    });

    await test('field helpers keep raw and stored date values explicit', () => {
        const { mosaic } = loadMosaic();
        const dateInput = {
            value: 'typed value',
            getAttribute(name) {
                return name === 'data-date-formatted-value' ? '2026-05-02' : null;
            }
        };
        const form = {
            querySelector(selector) {
                if (selector === '[name="Start_Date"]') return dateInput;
                return null;
            }
        };
        const field = { name: 'Start_Date', type: 'date' };

        assert.strictEqual(mosaic.util.fields.getValue(form, field), 'typed value');
        assert.strictEqual(
            mosaic.util.fields.getValue(form, field, { preferStoredValue: true }),
            '2026-05-02'
        );
    });

    await test('buttons.build escapes visible labels and JS onclick values', () => {
        const { mosaic } = loadMosaic();

        const html = mosaic.ui.buttons.build(
            [{ label: "Bob's <script>", validate: false, value: "value's" }],
            "mosaic.handlers.submit.message('${buttonText}', '${skipMode}', '${value}')",
            'message'
        );

        assert(html.includes("Bob&#039;s &lt;script&gt;"));
        assert(!html.includes("Bob's <script>"));
        assert(html.includes("Bob\\&#039;s &lt;script&gt;"));
        assert(html.includes("&#039;capture&#039;"));
        assert(html.includes("value\\&#039;s"));
    });

    await test('cdn libs load with subresource integrity', async () => {
        const { mosaic, document } = loadMosaic();

        const load = mosaic.util.libs.load('marked');
        const script = document.appendedScripts[0];

        assert.strictEqual(script.src, mosaic.libs.registry.marked.url);
        assert.match(script.integrity, /^sha512-[A-Za-z0-9+/]+={0,2}$/);
        assert.strictEqual(script.crossOrigin, 'anonymous');

        script.onload();
        await load;

        // every registry entry ships a pinned cdnjs url + sha512 hash
        Object.values(mosaic.libs.registry).forEach(entry => {
            assert.match(entry.url, /^https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\//);
            assert.match(entry.integrity, /^sha512-/);
        });
    });

    await test('font-awesome stylesheet is loaded with subresource integrity', () => {
        const html = fs.readFileSync(path.join(root, 'app/widget.html'), 'utf8');
        const faTag = html.match(/<link[^>]*font-awesome[^>]*>/)?.[0] || '';

        assert(faTag.includes('integrity="sha512-'));
        assert(faTag.includes('crossorigin="anonymous"'));
    });

    await test('loadLib clears a failed promise so a later retry can create a fresh script', async () => {
        const { mosaic, document } = loadMosaic();

        const firstLoad = mosaic.util.libs.load('marked');
        document.appendedScripts[0].onerror();
        await assert.rejects(firstLoad, /Failed to load/);

        assert.strictEqual(mosaic.libs._promises.marked, undefined);

        const secondLoad = mosaic.util.libs.load('marked');
        assert.strictEqual(document.appendedScripts.length, 2);
        document.appendedScripts[1].onload();
        await secondLoad;
    });

    await test('generateRecordLink uses the org domain returned by api overrides', async () => {
        const { mosaic } = loadMosaic();

        mosaic.overrides = Object.freeze({ orgDomainName: 'acmeorg' });
        mosaic.cache.orgDomainName = null;

        const link = await mosaic.util.data.generateRecordLink('Contacts', '1234567890');

        // the test harness environment reports an EU deployment
        assert.strictEqual(link, 'https://crm.zoho.eu/crm/acmeorg/tab/Contacts/1234567890');
    });

    await test('generateRecordLink builds data-center-specific CRM hosts', async () => {
        const linkFor = async (deployment) => {
            const { mosaic } = loadMosaic();
            mosaic.overrides = Object.freeze({ orgDomainName: 'acmeorg', deployment });
            return mosaic.util.data.generateRecordLink('Contacts', '123');
        };

        assert.strictEqual(await linkFor('US'), 'https://crm.zoho.com/crm/acmeorg/tab/Contacts/123');
        assert.strictEqual(await linkFor('IN'), 'https://crm.zoho.in/crm/acmeorg/tab/Contacts/123');
        assert.strictEqual(await linkFor('AU'), 'https://crm.zoho.com.au/crm/acmeorg/tab/Contacts/123');
        assert.strictEqual(await linkFor('CA'), 'https://crm.zohocloud.ca/crm/acmeorg/tab/Contacts/123');
        // unknown deployments fall back to the US host
        assert.strictEqual(await linkFor('XX'), 'https://crm.zoho.com/crm/acmeorg/tab/Contacts/123');
    });

    await test('table cell links reject unsafe urls and escape hrefs', async () => {
        const { mosaic } = loadMosaic();
        const col = { key: 'Name', link: { url_key: 'Url' } };

        // javascript: scheme from row data → rendered as plain text, no anchor
        let cell = await mosaic.table.render.rows.buildCell(
            { Name: 'Click', Url: 'javascript:alert(1)' }, col
        );
        assert(!cell.html.includes('<a '));
        assert(cell.html.includes('Click'));

        // attribute breakout in the url is escaped
        cell = await mosaic.table.render.rows.buildCell(
            { Name: 'Click', Url: 'https://example.com/?q="><img src=x onerror=alert(1)>' }, col
        );
        assert(cell.html.includes('<a '));
        assert(!cell.html.includes('"><img'));

        // normal https url still renders as a link
        cell = await mosaic.table.render.rows.buildCell(
            { Name: 'Click', Url: 'https://example.com/x' }, col
        );
        assert(cell.html.includes('href="https://example.com/x"'));
        assert(cell.html.includes('rel="noopener noreferrer"'));
    });

    await test('exportData uses the org domain returned by api overrides in filenames', async () => {
        const { mosaic } = loadMosaic();
        let exportedFilename;

        mosaic.overrides = Object.freeze({ orgDomainName: 'acmeorg' });
        mosaic.cache.orgDomainName = null;
        mosaic.config.columns = [{ key: 'Name', header: 'Name' }];
        mosaic.runtime.table.sourceData = [{ Name: 'Ada Lovelace' }];
        mosaic.export.formats.csv = (_data, filename) => {
            exportedFilename = filename;
        };

        await mosaic.export.run.exportData('csv');

        assert(exportedFilename.startsWith('zcrm-acmeorg-'));
    });

    await test('record field upload helper attaches file and image fields through one flow', async () => {
        const { mosaic } = loadMosaic();
        const attached = [];

        assert.strictEqual(typeof mosaic.handlers.uploads.toRecordField, 'function');

        mosaic.ui.status.show = () => {};
        mosaic.api.files.uploadZrc = async () => ({
            data: { data: [{ code: 'SUCCESS', details: { id: 'file-123' } }] }
        });
        mosaic.api.files.attachToField = async (fileId, fieldName, connection) => {
            attached.push({ type: 'file', fileId, fieldName, connection });
        };
        mosaic.api.files.attachImageToField = async (fileId, fieldName, connection) => {
            attached.push({ type: 'image', fileId, fieldName, connection });
        };

        await mosaic.handlers.uploads.toFileField(
            { name: 'contract.pdf' },
            { destination: { field_name: 'Upload_Field', connection: 'crm_conn' } }
        );
        await mosaic.handlers.uploads.toImageField(
            { name: 'headshot.png' },
            { destination: { field_name: 'Image_Field', connection: 'crm_conn' } }
        );

        assert.deepStrictEqual(attached, [
            { type: 'file', fileId: 'file-123', fieldName: 'Upload_Field', connection: 'crm_conn' },
            { type: 'image', fileId: 'file-123', fieldName: 'Image_Field', connection: 'crm_conn' }
        ]);
    });

    await test('attachAssetToField reports CRM field upload limits without legacy fallback', async () => {
        const { mosaic, zrc, ZOHO, console: testConsole } = loadMosaic();
        let legacyInvoked = false;
        let loggedError;

        mosaic.context.entity = 'Logs';
        mosaic.context.entityId = '1000000000000000001';
        mosaic.flags.debug = true;
        const originalLog = testConsole.log;
        const originalWarn = testConsole.warn;
        const originalError = testConsole.error;
        testConsole.log = () => {};
        testConsole.warn = (...args) => {
            loggedError = args[args.length - 1];
        };
        testConsole.error = () => {};
        zrc.put = async () => {
            throw {
                name: 'API_ERROR',
                message: 'Request failed',
                response: {
                    status: 400,
                    data: {
                        data: [{
                            code: 'LIMIT_EXCEEDED',
                            details: {
                                api_name: 'File_Upload_Field',
                                maximum_length: 1
                            },
                            message: 'Record insertion limit for File upload field has been exceeded',
                            status: 'error'
                        }]
                    }
                }
            };
        };
        ZOHO.CRM.CONNECTION = {
            invoke: async () => {
                legacyInvoked = true;
            }
        };

        try {
            await assert.rejects(
                () => mosaic.api.files.attachAssetToField('file-123', 'File_Upload_Field', 'crm_conn', 'file_id'),
                error => {
                    assert.strictEqual(error.code, 'LIMIT_EXCEEDED');
                    assert.strictEqual(error.fieldName, 'File_Upload_Field');
                    assert.strictEqual(
                        error.userMessage,
                        'File_Upload_Field is full. Remove an existing upload from this record before attaching another file.'
                    );
                    return true;
                }
            );

            assert.strictEqual(legacyInvoked, false);
            assert.strictEqual(loggedError.response.data.data[0].code, 'LIMIT_EXCEEDED');
        } finally {
            testConsole.log = originalLog;
            testConsole.warn = originalWarn;
            testConsole.error = originalError;
        }
    });

    await test('record field uploads show one widget alert when the target field is full', async () => {
        const { mosaic, console: testConsole } = loadMosaic();
        let alertMessage;
        let consoleErrors = 0;

        mosaic.flags.debug = true;
        mosaic.ui.status.show = () => {};
        mosaic.ui.alert.show = message => {
            alertMessage = message;
        };
        const originalError = testConsole.error;
        const originalLog = testConsole.log;
        testConsole.log = () => {};
        testConsole.error = () => {
            consoleErrors++;
        };
        mosaic.api.files.uploadZrc = async () => ({
            data: { data: [{ code: 'SUCCESS', details: { id: 'file-123' } }] }
        });
        mosaic.api.files.attachToField = async () => {
            const error = new Error('File_Upload_Field is full.');
            error.code = 'LIMIT_EXCEEDED';
            error.userMessage = 'File_Upload_Field is full. Remove an existing upload from this record before attaching another file.';
            throw error;
        };

        try {
            await assert.rejects(
                () => mosaic.handlers.uploads.toFileField(
                    { name: 'contract.pdf' },
                    { destination: { field_name: 'File_Upload_Field', connection: 'crm_conn' } }
                ),
                error => {
                    assert.strictEqual(error.code, 'LIMIT_EXCEEDED');
                    assert.strictEqual(error.userNotified, true);
                    return true;
                }
            );
        } finally {
            testConsole.log = originalLog;
            testConsole.error = originalError;
        }

        assert.strictEqual(
            alertMessage,
            'File_Upload_Field is full. Remove an existing upload from this record before attaching another file.'
        );
        assert.strictEqual(consoleErrors, 0);
    });

    await test('form submit does not echo notified upload limit errors into status or validation alerts', async () => {
        const context = loadMosaic();
        const { mosaic, document, console: testConsole } = context;
        const statusMessages = [];
        let validationAlertCount = 0;
        let consoleErrors = 0;

        mosaic.flags.debug = true;
        mosaic.config.fields = [{
            name: 'Upload',
            label: 'Upload',
            type: 'file',
            destination: { type: 'field', field_name: 'File_Upload_Field', connection: 'crm_conn' }
        }];
        mosaic.runtime.form.flatFields = mosaic.config.fields;
        document.elements.mosaicForm = {
            querySelector(selector) {
                if (selector === 'input[name="Upload"]') {
                    return { files: [{ name: 'contract.pdf', type: 'application/pdf' }] };
                }
                return null;
            }
        };
        document.elements.buttonContainer = {
            querySelectorAll() {
                return [{ textContent: 'Save', disabled: false }];
            }
        };
        context.File = class File {
            constructor(_parts, name, options = {}) {
                this.name = name;
                this.type = options.type || '';
            }
        };
        mosaic.validators.groups.form.validate = async () => ({ valid: true, data: {} });
        mosaic.handlers.uploads.route = async () => {
            const error = new Error('File_Upload_Field is full.');
            error.code = 'LIMIT_EXCEEDED';
            error.userMessage = 'File_Upload_Field is full. Remove an existing upload from this record before attaching another file.';
            error.userNotified = true;
            throw error;
        };
        mosaic.ui.status.show = message => {
            statusMessages.push(message);
        };
        mosaic.ui.status.clear = () => {
            statusMessages.push('');
        };
        mosaic.ui.alert.showValidationErrors = () => {
            validationAlertCount++;
        };
        const originalError = testConsole.error;
        testConsole.error = () => {
            consoleErrors++;
        };

        try {
            await mosaic.handlers.submit.form('Save');
        } finally {
            testConsole.error = originalError;
        }

        assert(!statusMessages.includes('File_Upload_Field is full. Remove an existing upload from this record before attaching another file.'));
        assert.strictEqual(validationAlertCount, 0);
        assert.strictEqual(consoleErrors, 0);
    });

    await test('api exposes organized subnamespaces', () => {
        const { mosaic } = loadMosaic();

        assert.strictEqual(typeof mosaic.api.zrc.getInstance, 'function');
        assert.strictEqual(typeof mosaic.api.env.getOrgInfo, 'function');
        assert.strictEqual(typeof mosaic.api.crm.getCurrentRecord, 'function');
        assert.strictEqual(typeof mosaic.api.files.downloadBlob, 'function');
        assert.strictEqual(typeof mosaic.api.workdrive.upload, 'function');
        assert.strictEqual(typeof mosaic.api.writer.html2pdf, 'function');
        assert.strictEqual(typeof mosaic.api.errors.formatZrcError, 'function');
        assert.strictEqual(mosaic.api.errors.cloneForConsole, undefined);
    });

    await test('util and validator helpers expose grouped namespaces', () => {
        const { mosaic } = loadMosaic();

        assert.strictEqual(typeof mosaic.util.string.escapeHtml, 'function');
        assert.strictEqual(typeof mosaic.util.string.escapeJsString, 'function');
        assert.strictEqual(typeof mosaic.util.object.deepClone, 'function');
        assert.strictEqual(typeof mosaic.util.object.resolveDotNotation, 'function');
        assert.strictEqual(typeof mosaic.util.async.debounce, 'function');
        assert.strictEqual(typeof mosaic.util.libs.load, 'function');

        assert.strictEqual(typeof mosaic.validators.rules.email, 'function');
        assert.strictEqual(typeof mosaic.validators.patterns.phone, 'object');
        assert.strictEqual(typeof mosaic.validators.groups.phone.validate, 'function');
        assert.strictEqual(typeof mosaic.validators.groups.date.validate, 'function');
        assert.strictEqual(typeof mosaic.validators.groups.file.size, 'function');
    });

    await test('upload handlers expose grouped aliases', () => {
        const { mosaic } = loadMosaic();

        assert.strictEqual(mosaic.uploads, undefined);
        assert.strictEqual(mosaic.handlers.buttons, undefined); // moved to mosaic.ui.buttons
        assert.strictEqual(typeof mosaic.handlers.submit.form, 'function');
        assert.strictEqual(typeof mosaic.handlers.submit.table, 'function');
        assert.strictEqual(typeof mosaic.handlers.submit.dialog, 'function');
        assert.strictEqual(typeof mosaic.handlers.submit.confirmation, 'function');
        assert.strictEqual(typeof mosaic.handlers.submit.message, 'function');
        assert.strictEqual(typeof mosaic.handlers.submit.html, 'function');
        assert.strictEqual(typeof mosaic.handlers.submit.pdf, 'function');
        assert.strictEqual(typeof mosaic.handlers.submit.launcher, 'function');
        assert.strictEqual(typeof mosaic.handlers.uploads.route, 'function');
        assert.strictEqual(typeof mosaic.handlers.uploads.toAttachment, 'function');
        assert.strictEqual(typeof mosaic.handlers.uploads.toWorkDrive, 'function');
        assert.strictEqual(typeof mosaic.handlers.uploads.toFileField, 'function');
        assert.strictEqual(typeof mosaic.handlers.uploads.toImageField, 'function');
        assert.strictEqual(typeof mosaic.handlers.keyboard.setup, 'function');
    });

    await test('ui helpers expose grouped aliases', () => {
        const { mosaic } = loadMosaic();

        assert.strictEqual(typeof mosaic.ui.widgets.build, 'function');
        assert.strictEqual(typeof mosaic.ui.widgets.message.build, 'function');
        assert.strictEqual(typeof mosaic.ui.widgets.confirmation.build, 'function');
        assert.strictEqual(typeof mosaic.ui.buttons.build, 'function');
        assert.strictEqual(typeof mosaic.ui.buttons.isCancelButton, 'function');
        assert.strictEqual(typeof mosaic.ui.buttons.isDestructiveButton, 'function');
        assert.strictEqual(typeof mosaic.ui.host.splash.show, 'function');
        assert.strictEqual(typeof mosaic.ui.host.loader.show, 'function');
        assert.strictEqual(typeof mosaic.ui.errors.show, 'function');
        assert.strictEqual(typeof mosaic.ui.readiness.buildPromise, 'function');
        assert.strictEqual(typeof mosaic.ui.readiness.wait, 'function');
        assert.strictEqual(typeof mosaic.ui.focus.force, 'function');
        assert.strictEqual(typeof mosaic.ui.focus.restore, 'function');
        assert.strictEqual(typeof mosaic.ui.viewport.getDimensions, 'function');
        assert.strictEqual(typeof mosaic.ui.viewport.resize, 'function');
        assert.strictEqual(typeof mosaic.ui.viewport.fitToContent, 'function');
    });

    await test('condition helpers expose grouped aliases', () => {
        const { mosaic } = loadMosaic();

        assert.strictEqual(typeof mosaic.conditions.state, 'object');
        assert.strictEqual(typeof mosaic.conditions.setup.init, 'function');
        assert.strictEqual(typeof mosaic.conditions.setup.attachSourceListeners, 'function');
        assert.strictEqual(typeof mosaic.conditions.evaluation.all, 'function');
        assert.strictEqual(typeof mosaic.conditions.evaluation.condition, 'function');
        assert.strictEqual(typeof mosaic.conditions.operators.equals, 'function');
        assert.strictEqual(typeof mosaic.conditions.values.normalize, 'function');
        assert.strictEqual(typeof mosaic.conditions.values.getFieldValue, 'function');
        assert.strictEqual(typeof mosaic.conditions.values.parseDate, 'function');
        assert.strictEqual(typeof mosaic.conditions.visibility.setField, 'function');
        assert.strictEqual(typeof mosaic.conditions.visibility.toggleBreakBefore, 'function');
        assert.strictEqual(typeof mosaic.conditions.visibility.isHidden, 'function');
    });

    await test('datepicker helpers expose grouped aliases', () => {
        const { mosaic } = loadMosaic();

        assert.strictEqual(typeof mosaic.datepicker.setup.attach, 'function');
        assert.strictEqual(typeof mosaic.datepicker.dom.createPopup, 'function');
        assert.strictEqual(typeof mosaic.datepicker.dom.wrapInput, 'function');
        assert.strictEqual(typeof mosaic.datepicker.state.create, 'function');
        assert.strictEqual(typeof mosaic.datepicker.defaults.apply, 'function');
        assert.strictEqual(typeof mosaic.datepicker.render.calendar, 'function');
        assert.strictEqual(typeof mosaic.datepicker.render.dayCell, 'function');
        assert.strictEqual(typeof mosaic.datepicker.actions.selectDay, 'function');
        assert.strictEqual(typeof mosaic.datepicker.actions.navigate, 'function');
        assert.strictEqual(typeof mosaic.datepicker.actions.open, 'function');
        assert.strictEqual(typeof mosaic.datepicker.actions.close, 'function');
        assert.strictEqual(typeof mosaic.datepicker.actions.parseTypedInput, 'function');
        assert.strictEqual(typeof mosaic.datepicker.events.bind, 'function');
    });

    await test('export helpers expose grouped aliases', () => {
        const { mosaic } = loadMosaic();

        assert.strictEqual(typeof mosaic.export.state, 'object');
        assert.strictEqual(typeof mosaic.export.dropdown.toggle, 'function');
        assert.strictEqual(typeof mosaic.export.dropdown.close, 'function');
        assert.strictEqual(typeof mosaic.export.dropdown.initClickOutsideListener, 'function');
        assert.strictEqual(typeof mosaic.export.data.getCurrentTableData, 'function');
        assert.strictEqual(typeof mosaic.export.run.exportData, 'function');
        assert.strictEqual(typeof mosaic.export.formats.csv, 'function');
        assert.strictEqual(typeof mosaic.export.formats.xlsx, 'function');
        assert.strictEqual(typeof mosaic.export.formats.pdf, 'function');
        assert.strictEqual(typeof mosaic.export.formats.json, 'function');
        assert.strictEqual(typeof mosaic.export.files.download, 'function');
        assert.strictEqual(typeof mosaic.export.controls.buildButton, 'function');
    });

    await test('flyout helpers expose grouped aliases', () => {
        const { mosaic } = loadMosaic();

        assert.strictEqual(typeof mosaic.flyout.lifecycle.init, 'function');
        assert.strictEqual(typeof mosaic.flyout.lifecycle.postInit, 'function');
        assert.strictEqual(typeof mosaic.flyout.requests.setRequest, 'function');
        assert.strictEqual(typeof mosaic.flyout.state.isEnabled, 'function');
        assert.strictEqual(typeof mosaic.flyout.responses.buildDismissResponse, 'function');
        assert.strictEqual(typeof mosaic.flyout.ui.renderCloseButton, 'function');
    });

    await test('form, table, and launcher expose coordinated builder and render namespaces', () => {
        const { mosaic } = loadMosaic();

        assert.strictEqual(typeof mosaic.form.builder.build, 'function');
        assert.strictEqual(typeof mosaic.form.builder.flattenFields, 'function');
        assert.strictEqual(typeof mosaic.form.render.fieldList, 'function');
        assert.strictEqual(typeof mosaic.form.fields.constraints.buildText, 'function');

        assert.strictEqual(typeof mosaic.table.builder.build, 'function');
        assert.strictEqual(typeof mosaic.table.builder.loadSourceData, 'function');
        assert.strictEqual(typeof mosaic.table.render.rows.render, 'function');
        assert.strictEqual(typeof mosaic.table.render.rows.formatValue, 'function');
        assert.strictEqual(typeof mosaic.table.sort.applyCurrentPage, 'function');
        assert.strictEqual(typeof mosaic.table.handlers.toggleRowSelection, 'function');

        assert.strictEqual(typeof mosaic.launcher.builder.build, 'function');
        assert.strictEqual(typeof mosaic.launcher.builder.normalizeItems, 'function');
        assert.strictEqual(typeof mosaic.launcher.state, 'object');
        assert.strictEqual(typeof mosaic.launcher.render.items, 'function');
        assert.strictEqual(typeof mosaic.launcher.render.highlight, 'function');
        assert.strictEqual(typeof mosaic.launcher.search.filter, 'function');
        assert.strictEqual(typeof mosaic.launcher.search.fuzzyMatch, 'function');
        assert.strictEqual(typeof mosaic.launcher.navigation.navigate, 'function');
        assert.strictEqual(typeof mosaic.launcher.actions.executeSelectedItem, 'function');
        assert.strictEqual(typeof mosaic.launcher.icons.resolve, 'function');
        assert.strictEqual(typeof mosaic.launcher.events.setup, 'function');
    });

    await test('html helpers expose grouped aliases', () => {
        const { mosaic } = loadMosaic();

        assert.strictEqual(typeof mosaic.html.state, 'object');
        assert.strictEqual(typeof mosaic.html.state.reset, 'function');
        assert.strictEqual(typeof mosaic.html.builder.build, 'function');
        assert.strictEqual(typeof mosaic.html.render.preview, 'function');
        assert.strictEqual(typeof mosaic.html.render.displayHtml, 'function');
        assert.strictEqual(typeof mosaic.html.render.applyBodyLayout, 'function');
        assert.strictEqual(typeof mosaic.html.print.openWindow, 'function');
        assert.strictEqual(typeof mosaic.html.print.prepareHtml, 'function');
        assert.strictEqual(typeof mosaic.html.downloads.asPdf, 'function');
        assert.strictEqual(typeof mosaic.html.actions.close, 'function');
    });

    await test('pdf helpers expose grouped aliases', () => {
        const { mosaic } = loadMosaic();

        assert.strictEqual(typeof mosaic.pdf.state, 'object');
        assert.strictEqual(typeof mosaic.pdf.state.reset, 'function');
        assert.strictEqual(typeof mosaic.pdf.state.revokeBlobUrl, 'function');
        assert.strictEqual(typeof mosaic.pdf.builder.build, 'function');
        assert.strictEqual(typeof mosaic.pdf.builder.applyBodyLayout, 'function');
        assert.strictEqual(typeof mosaic.pdf.builder.preview, 'function');
        assert.strictEqual(typeof mosaic.pdf.builder.download, 'function');
        assert.strictEqual(typeof mosaic.pdf.builder.merge, 'function');
        assert.strictEqual(typeof mosaic.pdf.builder.fill, 'function');
        assert.strictEqual(typeof mosaic.pdf.render.displayPdf, 'function');
        assert.strictEqual(typeof mosaic.pdf.sources.resolve, 'function');
        assert.strictEqual(typeof mosaic.pdf.sources.isRawBase64, 'function');
        assert.strictEqual(typeof mosaic.pdf.sources.blobToBase64, 'function');
        assert.strictEqual(typeof mosaic.pdf.merge.sources, 'function');
        assert.strictEqual(typeof mosaic.pdf.merge.parsePages, 'function');
        assert.strictEqual(typeof mosaic.pdf.downloads.current, 'function');
        assert.strictEqual(typeof mosaic.pdf.downloads.convertAndDownload, 'function');
        assert.strictEqual(typeof mosaic.pdf.filler.generate, 'function');
        assert.strictEqual(typeof mosaic.pdf.actions.close, 'function');
    });

    await test('relatedlist helpers expose grouped aliases', () => {
        const { mosaic } = loadMosaic();

        assert.strictEqual(typeof mosaic.relatedlist.lifecycle.init, 'function');
        assert.strictEqual(typeof mosaic.relatedlist.lifecycle.postInit, 'function');
        // config/builder/data/columns are shipped as a commented-out example
        // block - they must NOT exist on the live object
        assert.strictEqual(mosaic.relatedlist.config, undefined);
        assert.strictEqual(mosaic.relatedlist.builder, undefined);
    });

    await test('theme helpers expose grouped aliases', () => {
        const { mosaic } = loadMosaic();

        assert.strictEqual(typeof mosaic.theme.lifecycle.preload, 'function');
        assert.strictEqual(typeof mosaic.theme.lifecycle.initialize, 'function');
        assert.strictEqual(typeof mosaic.theme.mode.apply, 'function');
        assert.strictEqual(typeof mosaic.theme.mode.set, 'function');
        assert.strictEqual(typeof mosaic.theme.mode.toggle, 'function');
        assert.strictEqual(typeof mosaic.theme.preferences.getSaved, 'function');
        assert.strictEqual(typeof mosaic.theme.preferences.save, 'function');
        assert.strictEqual(typeof mosaic.theme.preferences.getCrm, 'function');
    });

    await test('storage helpers expose grouped aliases', () => {
        const { mosaic } = loadMosaic();

        assert.strictEqual(typeof mosaic.storage.keys, 'object');
        assert.strictEqual(typeof mosaic.storage.keys.PREFIX, 'string');
        assert.strictEqual(typeof mosaic.storage.keys.prefixed, 'function');
        assert.strictEqual(typeof mosaic.storage.keys.clean, 'function');
        assert.strictEqual(typeof mosaic.storage.keys.isMosaicKey, 'function');
        assert.strictEqual(typeof mosaic.storage.values.set, 'function');
        assert.strictEqual(typeof mosaic.storage.values.get, 'function');
        assert.strictEqual(typeof mosaic.storage.values.remove, 'function');
        assert.strictEqual(typeof mosaic.storage.collection.clear, 'function');
        assert.strictEqual(typeof mosaic.storage.collection.getAll, 'function');
        assert.strictEqual(typeof mosaic.storage.availability.check, 'function');
    });

    await test('radio cards select and deselect from the full option row', () => {
        const { mosaic } = loadMosaic();
        const dispatched = [];
        const input = {
            checked: false,
            dispatchEvent(event) {
                dispatched.push(event.type);
            }
        };
        const card = {
            querySelector(selector) {
                return selector === 'input[type="radio"]' ? input : null;
            }
        };
        const event = {
            preventDefaultCalled: false,
            stopPropagationCalled: false,
            preventDefault() { this.preventDefaultCalled = true; },
            stopPropagation() { this.stopPropagationCalled = true; }
        };

        mosaic.form.fields.radio.toggle(event, card);
        assert.strictEqual(input.checked, true);
        assert.strictEqual(event.preventDefaultCalled, true);
        assert.strictEqual(event.stopPropagationCalled, true);

        mosaic.form.fields.radio.toggle(event, card);
        assert.strictEqual(input.checked, false);
        assert.deepStrictEqual(dispatched, ['change', 'change']);

        const html = mosaic.form.fields.radio.build({
            name: 'Sport',
            label: 'Sport',
            options: ['Soccer']
        }, '');
        assert(html.includes('onpointerdown="mosaic.form.fields.radio.captureState(this)"'));
        assert(html.includes('onclick="mosaic.form.fields.radio.toggle(event, this)"'));
    });

    await test('radio circle clicks preserve the pre-click checked state', () => {
        const { mosaic } = loadMosaic();
        const input = {
            checked: false,
            dataset: {},
            dispatchEvent() {}
        };
        const card = {
            querySelector(selector) {
                return selector === 'input[type="radio"]' ? input : null;
            }
        };

        mosaic.form.fields.radio.captureState(card);
        input.checked = true;
        mosaic.form.fields.radio.toggle({ preventDefault() {}, stopPropagation() {} }, card);

        assert.strictEqual(input.checked, true);
        assert.strictEqual(input.dataset.wasChecked, undefined);
    });

    await test('table row clicks toggle selection while preserving links text and controls', () => {
        const { mosaic, window } = loadMosaic();
        const selectedRows = [];
        const input = {
            type: 'checkbox',
            checked: false,
            dispatchEvent() {}
        };
        const row = {
            classList: {
                add(name) { selectedRows.push(name); },
                remove(name) { selectedRows.push(`-${name}`); },
                toggle(name, force) { selectedRows.push(force ? name : `-${name}`); }
            },
            querySelector(selector) {
                return selector === 'input[name="table_selection"]' ? input : null;
            },
            closest() { return null; }
        };
        const plainTarget = { closest: () => null };

        mosaic.table.handlers.toggleRowSelection(row, { target: plainTarget });
        assert.strictEqual(input.checked, true);

        mosaic.table.handlers.toggleRowSelection(row, { target: plainTarget });
        assert.strictEqual(input.checked, false);

        input.checked = false;
        mosaic.table.handlers.toggleRowSelection(row, { target: { closest: selector => selector.includes('a') ? {} : null } });
        assert.strictEqual(input.checked, false);

        window.getSelection = () => ({ toString: () => 'selected text' });
        mosaic.table.handlers.toggleRowSelection(row, { target: plainTarget });
        assert.strictEqual(input.checked, false);
        assert(selectedRows.includes('selected'));

        window.getSelection = () => ({ toString: () => '' });
        mosaic.table.handlers.toggleRowSelection(row, { target: plainTarget, detail: 2 });
        assert.strictEqual(input.checked, false);
    });

    await test('table double clicks cancel the pending row selection', async () => {
        const { mosaic, window } = loadMosaic();
        window.getSelection = () => ({ toString: () => '' });

        const input = {
            type: 'checkbox',
            checked: false,
            dispatchEvent() {}
        };
        const row = {
            classList: { toggle() {} },
            querySelector(selector) {
                return selector === 'input[name="table_selection"]' ? input : null;
            }
        };
        const target = { closest: () => null };

        mosaic.table.handlers.toggleRowSelection(row, { target, detail: 1, preventDefault() {} });
        mosaic.table.handlers.toggleRowSelection(row, { target, detail: 2, preventDefault() {} });

        await new Promise(resolve => setTimeout(resolve, 180));
        assert.strictEqual(input.checked, false);

        mosaic.table.handlers.toggleRowSelection(row, { target, detail: 1, preventDefault() {} });
        await new Promise(resolve => setTimeout(resolve, 180));
        assert.strictEqual(input.checked, true);
    });

    await test('table sorting cycles asc desc asc and only reorders the current page', () => {
        const { mosaic } = loadMosaic();
        mosaic.config = { per_page: 2 };
        mosaic.runtime.table.currentPage = 2;
        mosaic.runtime.table.sourceData = [
            { Name: 'Zulu' },
            { Name: 'Alpha' },
            { Name: 'Delta' },
            { Name: 'Charlie' }
        ];

        mosaic.table.sort.applyCurrentPage('Name', 'asc');
        assert.deepStrictEqual(
            [...mosaic.runtime.table.sourceData.map(row => row.Name)],
            ['Zulu', 'Alpha', 'Charlie', 'Delta']
        );

        mosaic.table.sort.applyCurrentPage('Name', 'desc');
        assert.deepStrictEqual(
            [...mosaic.runtime.table.sourceData.map(row => row.Name)],
            ['Zulu', 'Alpha', 'Delta', 'Charlie']
        );

        mosaic.table.sort.setNextDirection('Name');
        assert.strictEqual(mosaic.runtime.table.sort.field, 'Name');
        assert.strictEqual(mosaic.runtime.table.sort.order, 'asc');
        mosaic.table.sort.setNextDirection('Name');
        assert.strictEqual(mosaic.runtime.table.sort.order, 'desc');
        mosaic.table.sort.setNextDirection('Name');
        assert.strictEqual(mosaic.runtime.table.sort.order, 'asc');

        const initiallySorted = mosaic.table.sort.applyInitial(
            [{ Name: 'Alpha' }, { Name: 'Zulu' }],
            { sort_field: 'Name', sort_order: 'desc' }
        );
        assert.deepStrictEqual(
            [...initiallySorted.map(row => row.Name)],
            ['Zulu', 'Alpha']
        );
    });

    await test('table headers render sort icons from configured sort state', () => {
        const { mosaic } = loadMosaic();
        mosaic.config = {
            sort_field: 'Amount',
            sort_order: 'desc',
            source: { type: 'static', data: [] },
            columns: [
                { key: 'Name', header: 'Name' },
                { key: 'Amount', header: 'Amount' }
            ]
        };

        const tableHtml = mosaic.table.render.table(mosaic.config);
        assert(tableHtml.includes('mosaic.table.handlers.sortColumn(&#039;Name&#039;)'));
        assert(tableHtml.includes('fa-bars'));
        assert(tableHtml.includes('mosaic.table.handlers.sortColumn(&#039;Amount&#039;)'));
        assert(tableHtml.includes('fa-arrow-down'));
        assert(!tableHtml.includes('fa-arrow-up'));
    });

    await test('core does not predeclare uploads namespace placeholder', () => {
        const core = fs.readFileSync(path.join(root, 'app/js/mosaic-core.js'), 'utf8');
        assert(!core.includes('uploads: {}'));
    });

    await test('core helpers are namespaced with root compatibility aliases', () => {
        const { mosaic } = loadMosaic();
        const overrides = {
            date_format_display:  'MM/dd/yyyy',
            date_format_return:   'yyyy-MM-dd',
            time_format_display:  'h:mm AM/PM',
            time_format_return:   'HH:mm',
            phone_country_code:   'US',
            phone_format_display: '(###) ###-####',
            phone_format_return:  'E164',
            api_domain:           'https://www.zohoapis.com',
            org_domain_name:      'example',
            deployment:           'US',
            theme:                'dark'
        };

        assert.strictEqual(typeof mosaic.core.lifecycle.init, 'function');
        assert.strictEqual(typeof mosaic.core.response.send, 'function');
        assert.strictEqual(typeof mosaic.core.config.normalizeOverrides, 'function');
        assert.strictEqual(mosaic.core.con, mosaic.con);
        assert.strictEqual(typeof mosaic.init, 'function');
        assert.strictEqual(typeof mosaic.respond, 'function');
        assert.strictEqual(typeof mosaic._normalizeOverrides, 'function');
        assert.deepStrictEqual(
            mosaic._normalizeOverrides(overrides),
            mosaic.core.config.normalizeOverrides(overrides)
        );
    });

    await test('api env and file methods are callable', async () => {
        const { mosaic } = loadMosaic();
        const org = { domain_name: 'patched' };
        const blob = { size: 10 };
        let downloadedFilename;

        mosaic.api.env.getOrgInfo = async () => org;
        mosaic.api.files.downloadBlob = (_blob, filename) => {
            downloadedFilename = filename;
        };

        assert.strictEqual(await mosaic.api.env.getOrgInfo(), org);
        mosaic.api.files.downloadBlob(blob, 'patched.pdf');
        assert.strictEqual(downloadedFilename, 'patched.pdf');
    });

    await test('api namespaces are defined inside the mosaic.api object literal', () => {
        const source = fs.readFileSync(path.join(root, 'app/js/mosaic-api.js'), 'utf8');
        const apiStart = source.indexOf('mosaic.api = {');
        const apiEnd = source.lastIndexOf('\n};');
        const apiObject = source.slice(apiStart, apiEnd);

        assert(apiObject.includes('zrc: {'));
        assert(apiObject.includes('env: {'));
        assert(apiObject.includes('crm: {'));
        assert(apiObject.includes('files: {'));
        assert(!source.includes('mosaic.api.zrc ='));
        assert(!source.includes('mosaic.api.env ='));
    });

    await test('grouped namespace method bodies are not flat private implementations', () => {
        const api = fs.readFileSync(path.join(root, 'app/js/mosaic-api.js'), 'utf8');
        const util = fs.readFileSync(path.join(root, 'app/js/mosaic-util.js'), 'utf8');
        const validators = fs.readFileSync(path.join(root, 'app/js/mosaic-validators.js'), 'utf8');

        assert(!api.includes('Impl('));
        assert(!api.includes('return mosaic.api._'));
        assert(!util.includes('const util = mosaic.util'));
        assert(!util.includes('const impl = {}'));
        assert(!validators.includes('const validators = mosaic.validators'));
        assert(!validators.includes('const impl = {}'));
    });

    await test('util and validator namespaces are defined inside their object literals', () => {
        const util = fs.readFileSync(path.join(root, 'app/js/mosaic-util.js'), 'utf8');
        const validators = fs.readFileSync(path.join(root, 'app/js/mosaic-validators.js'), 'utf8');
        const handlers = fs.readFileSync(path.join(root, 'app/js/mosaic-handlers.js'), 'utf8');
        const ui = fs.readFileSync(path.join(root, 'app/js/mosaic-ui.js'), 'utf8');
        const conditions = fs.readFileSync(path.join(root, 'app/js/mosaic-conditions.js'), 'utf8');
        const datepicker = fs.readFileSync(path.join(root, 'app/js/mosaic-datepicker.js'), 'utf8');
        const exportModule = fs.readFileSync(path.join(root, 'app/js/mosaic-export.js'), 'utf8');
        const flyout = fs.readFileSync(path.join(root, 'app/js/mosaic-flyout.js'), 'utf8');
        const form = fs.readFileSync(path.join(root, 'app/js/mosaic-form.js'), 'utf8');
        const table = fs.readFileSync(path.join(root, 'app/js/mosaic-table.js'), 'utf8');
        const launcher = fs.readFileSync(path.join(root, 'app/js/mosaic-launcher.js'), 'utf8');
        const html = fs.readFileSync(path.join(root, 'app/js/mosaic-html.js'), 'utf8');
        const pdf = fs.readFileSync(path.join(root, 'app/js/mosaic-pdf.js'), 'utf8');
        const relatedlist = fs.readFileSync(path.join(root, 'app/js/mosaic-relatedlist.js'), 'utf8');
        const theme = fs.readFileSync(path.join(root, 'app/js/mosaic-theme.js'), 'utf8');
        const storage = fs.readFileSync(path.join(root, 'app/js/mosaic-storage.js'), 'utf8');

        assert(util.includes('string: {'));
        assert(util.includes('object: {'));
        assert(util.includes('async: {'));
        assert(util.includes('libs: {'));
        assert(!util.includes('mosaic.util.string ='));
        assert(!util.includes('mosaic.util.object ='));

        assert(validators.includes('rules: {'));
        assert(validators.includes('groups: {'));
        assert(!validators.includes('mosaic.validators.rules ='));
        assert(!validators.includes('mosaic.validators.groups ='));

        assert(!handlers.includes('buttons: {')); // buttons live in mosaic.ui
        assert(handlers.includes('submit: {'));
        assert(handlers.includes('uploads: {'));
        assert(handlers.includes('keyboard: {'));
        assert(!handlers.includes('    async submitForm('));
        assert(!handlers.includes('    async submitConfirmation('));
        assert(!handlers.includes('    async submitMessage('));
        assert(!handlers.includes('    async _submitDialog('));
        assert(!handlers.includes('mosaic.uploads ='));
        assert(!handlers.includes('const handlers = mosaic.handlers'));

        assert(ui.includes('widgets: {'));
        assert(ui.includes('buttons: {'));
        assert(ui.includes('host: {'));
        assert(ui.includes('errors: {'));
        assert(ui.includes('readiness: {'));
        assert(ui.includes('focus: {'));
        assert(ui.includes('viewport: {'));
        assert(!ui.includes('    async buildWidget('));
        assert(!ui.includes('    showError(message'));
        assert(!ui.includes('    buildReadyPromise()'));
        assert(!ui.includes('    forceFocus(readyPromise'));
        assert(!ui.includes('    async resizeWidget('));

        assert(conditions.includes('state: {'));
        assert(conditions.includes('setup: {'));
        assert(conditions.includes('evaluation: {'));
        assert(conditions.includes('operators: {'));
        assert(conditions.includes('values: {'));
        assert(conditions.includes('visibility: {'));
        assert(!/^    init\(form, fieldConfigs\)/m.test(conditions));
        assert(!/^    evaluate\(\)/m.test(conditions));
        assert(!/^    isHidden\(fieldName\)/m.test(conditions));
        assert(!/^    _evaluateCondition\(condition\)/m.test(conditions));

        assert(datepicker.includes('setup: {'));
        assert(datepicker.includes('dom: {'));
        assert(datepicker.includes('state: {'));
        assert(datepicker.includes('defaults: {'));
        assert(datepicker.includes('render: {'));
        assert(datepicker.includes('actions: {'));
        assert(datepicker.includes('events: {'));
        assert(!/^    attach\(dateInput, userFormat, fieldConfig = \{\}\)/m.test(datepicker));

        assert(exportModule.includes('state: {'));
        assert(exportModule.includes('dropdown: {'));
        assert(exportModule.includes('data: {'));
        assert(exportModule.includes('run: {'));
        assert(exportModule.includes('formats: {'));
        assert(exportModule.includes('files: {'));
        assert(exportModule.includes('controls: {'));
        assert(!/^    async exportData\(format\)/m.test(exportModule));
        assert(!/^    toCSV\(data, filename\)/m.test(exportModule));
        assert(!/^    buildExportButton\(\)/m.test(exportModule));

        assert(flyout.includes('lifecycle: {'));
        assert(flyout.includes('requests: {'));
        assert(flyout.includes('state: {'));
        assert(flyout.includes('responses: {'));
        assert(flyout.includes('ui: {'));
        assert(!/^    init\(data, config\)/m.test(flyout));
        assert(!/^    setRequest\(data = \{\}\)/m.test(flyout));

        assert(form.includes('builder: {'));
        assert(form.includes('render: {'));
        assert(form.includes('constraints: {'));
        assert(!/^    async build\(\)/m.test(form));
        assert(!/^    _buildFieldList\(fields\)/m.test(form));

        assert(table.includes('builder: {'));
        assert(table.includes('rows: {'));
        assert(!/^    async build\(\)/m.test(table));
        assert(!/^    rows: \{/m.test(table));

        assert(launcher.includes('builder: {'));
        assert(launcher.includes('state: {'));
        assert(launcher.includes('render: {'));
        assert(launcher.includes('search: {'));
        assert(launcher.includes('navigation: {'));
        assert(launcher.includes('actions: {'));
        assert(launcher.includes('icons: {'));
        assert(launcher.includes('events: {'));
        assert(!/^    async build\(\)/m.test(launcher));
        assert(!/^    _renderItems\(\)/m.test(launcher));
        assert(!/^    _filterItems\(term\)/m.test(launcher));

        assert(html.includes('state: {'));
        assert(html.includes('builder: {'));
        assert(html.includes('render: {'));
        assert(html.includes('print: {'));
        assert(html.includes('downloads: {'));
        assert(html.includes('actions: {'));
        assert(!/^    async build\(\)/m.test(html));
        assert(!/^    _displayHtml\(html\)/m.test(html));
        assert(!/^    async downloadAsPdf\(\)/m.test(html));

        assert(pdf.includes('state: {'));
        assert(pdf.includes('builder: {'));
        assert(pdf.includes('render: {'));
        assert(pdf.includes('sources: {'));
        assert(pdf.includes('merge: {'));
        assert(pdf.includes('downloads: {'));
        assert(pdf.includes('filler: {'));
        assert(pdf.includes('actions: {'));
        assert(!/^    async build\(\)/m.test(pdf));
        assert(!/^    async _fill\(config\)/m.test(pdf));
        assert(!/^    async _buildPreview\(config\)/m.test(pdf));
        assert(!/^    async _resolveSource\(config, sourceOverride\)/m.test(pdf));

        assert(relatedlist.includes('lifecycle: {'));
        assert(relatedlist.includes('config: {'));
        assert(relatedlist.includes('builder: {'));
        assert(relatedlist.includes('data: {'));
        assert(relatedlist.includes('columns: {'));
        assert(!/^    async init\(data\)/m.test(relatedlist));
        assert(!/^    async postInit\(\)/m.test(relatedlist));
        assert(!/^    async build\(\)/m.test(relatedlist));
        assert(!/^    _config\(\)/m.test(relatedlist));

        assert(theme.includes('lifecycle: {'));
        assert(theme.includes('mode: {'));
        assert(theme.includes('preferences: {'));
        assert(!/^    set\(theme\)/m.test(theme));
        assert(!/^    get\(\)/m.test(theme));
        assert(!/^    toggle\(\)/m.test(theme));
        assert(!/^    preload\(\)/m.test(theme));
        assert(!/^    async initialize\(\)/m.test(theme));

        assert(storage.includes('keys: {'));
        assert(storage.includes('values: {'));
        assert(storage.includes('collection: {'));
        assert(storage.includes('availability: {'));
        assert(!/^    set\(key, value\)/m.test(storage));
        assert(!/^    get\(key, defaultValue = null\)/m.test(storage));
        assert(!/^    remove\(key\)/m.test(storage));
        assert(!/^    clear\(\)/m.test(storage));
        assert(!/^    isAvailable\(\)/m.test(storage));
        assert(!/^    getAll\(\)/m.test(storage));
    });

    await test('export styles live in their own css component', () => {
        const styleCss = fs.readFileSync(path.join(root, 'app/css/style.css'), 'utf8');
        const tableCss = fs.readFileSync(path.join(root, 'app/css/components/_tables.css'), 'utf8');
        const exportCss = fs.readFileSync(path.join(root, 'app/css/components/_export.css'), 'utf8');

        assert(styleCss.includes('@import "./components/_export.css";'));
        assert(exportCss.includes('.export-container'));
        assert(!tableCss.includes('.export-container'));
    });

    await test('radio controls use card-style rows with existing color variables', () => {
        const formsCss = fs.readFileSync(path.join(root, 'app/css/components/_forms.css'), 'utf8');
        const sectionStart = formsCss.indexOf('checkbox & radio');
        const sectionEnd = formsCss.indexOf('conditional field visibility');
        const radioSection = formsCss.slice(
            sectionStart,
            sectionEnd
        );

        assert(sectionStart > -1);
        assert(sectionEnd > sectionStart);
        assert(radioSection.includes('.radio-item:has(input[type="radio"]:checked)'));
        assert(radioSection.includes('min-height: 30px;'));
        assert(radioSection.includes('padding: 4px 20px 4px 42px;'));
        assert(radioSection.includes('border-radius: var(--radius-default);'));
        assert(radioSection.includes('background: var(--color-surface-light);'));
        assert(radioSection.includes('background: var(--color-primary);'));
        assert(radioSection.includes('border: 2px solid var(--color-border-input-tint);'));
        assert(radioSection.includes('width: 14px;'));
        assert(radioSection.includes('height: 14px;'));
        assert(radioSection.includes('display: inline-flex;'));
        assert(radioSection.includes('pointer-events: none;'));
        assert(!/#[0-9a-f]{3,8}\b/i.test(radioSection));
    });

    await test('table sort icons use rounded hover backgrounds instead of blue hover color', () => {
        const tableCss = fs.readFileSync(path.join(root, 'app/css/components/_tables.css'), 'utf8');
        const sectionStart = tableCss.indexOf('.table-sort-header');
        const sectionEnd = tableCss.indexOf('.dynamic-table tbody tr');
        const sortSection = tableCss.slice(sectionStart, sectionEnd);

        assert(sectionStart > -1);
        assert(sectionEnd > sectionStart);
        assert(sortSection.includes('gap: 10px;'));
        assert(!sortSection.includes('color: var(--color-primary);'));
        assert(sortSection.includes('.table-sort-header:hover .table-sort-icon'));
        assert(sortSection.includes('background-color: var(--color-surface-light);'));
        assert(sortSection.includes('border-radius: 50%;'));
        assert(sortSection.includes('line-height: 1;'));
        assert(sortSection.includes('.table-sort-icon i'));
    });

    await test('dead helpers and leftover globals stay removed', () => {
        const launcher = fs.readFileSync(path.join(root, 'app/js/mosaic-launcher.js'), 'utf8');
        const table    = fs.readFileSync(path.join(root, 'app/js/mosaic-table.js'), 'utf8');
        const handlers = fs.readFileSync(path.join(root, 'app/js/mosaic-handlers.js'), 'utf8');

        // unused byte-for-byte duplicates of render.highlight / render.dot
        assert(!launcher.includes('buildHighlightHtml'));
        assert(!launcher.includes('buildDotHtml'));

        // leftover global - pagination calls mosaic.table.handlers.changePage directly
        assert(!table.includes('window.changeTablePage'));

        // unimported zoho puvi font file (project reverted to inter)
        assert(!fs.existsSync(path.join(root, 'app/css/components/_fonts.css')));

        // table submit handler logs under its own name, not submit.form()
        assert(!handlers.includes('mosaic.handlers.submit.form() | Selected data'));

        // enter-to-submit must not click inline form buttons - footer only
        assert(handlers.includes("querySelector('#buttonContainer .btn:not(.cancel):not(.secondary):not(.destructive)')"));
    });

    await test('flyout requests arriving after the response are ignored, not buffered', () => {
        const { mosaic } = loadMosaic();

        mosaic.runtime.flyout = { enabled: true, requestId: null, responded: true };
        mosaic.flyout.requests.setRequest({ id: 'too-late' });

        assert.strictEqual(mosaic.flyout.requests._preInitRequest, null);
        assert.strictEqual(mosaic.runtime.flyout.requestId, null);
    });

    await test('core widget version matches README widget version', () => {
        const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
        const core = fs.readFileSync(path.join(root, 'app/js/mosaic-core.js'), 'utf8');

        const readmeVersion = readme.match(/Widget:\s+\*\*([^*]+)\*\*/)?.[1];
        const coreVersion = core.match(/version:\s+'([^']+)'/)?.[1];

        assert.strictEqual(coreVersion, readmeVersion);
    });

    await test('client helper defaults and examples match current documented options', () => {
        const helper = fs.readFileSync(path.join(root, 'cscript/mosaic.js'), 'utf8');
        const launcher = fs.readFileSync(path.join(root, 'cscript/mosaic-tests.js'), 'utf8');

        assert(helper.includes("confirmation:           { height: '350px', width: '420px',  buttons: ['Cancel', 'OK'],      close_icon: true, close_on_escape: false, submit_on_enter: false, enable_markdown: true }"));
        assert(helper.includes("message:                { height: '350px', width: '420px',  buttons: ['OK'],                close_icon: true, close_on_escape: true,  submit_on_enter: true,  enable_markdown: true"));
        assert(helper.includes("form:                   { height: '70vh',  width: '600px',  buttons: ['Cancel', 'Submit'],  close_icon: true, close_on_escape: false, submit_on_enter: true, enable_markdown: true"));
        assert(helper.includes("input:                  { height: '350px', width: '400px',  buttons: ['Cancel', 'OK'],      close_icon: true, close_on_escape: false, submit_on_enter: true, force_focus: true, required: true, enable_markdown: true }"));

        assert(!/\bmin_decimals\b/.test(helper));
        assert(!/\bmax_decimals\b/.test(helper));
        assert(!/(^|[^\w])date_format:\s*['"]/.test(helper));

        assert(!/\bmin_decimals\b/.test(launcher));
        assert(!/\bmax_decimals\b/.test(launcher));
        assert(!/(^|[^\w])date_format:\s*['"]/.test(launcher));
        assert(!/\bdefault_filename\b/.test(launcher));
    });
})();
