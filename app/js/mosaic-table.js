/**
 * ════════════════════════════════════════════════════════════════════════
 *  mosaic.table - table widget management module
 * ════════════════════════════════════════════════════════════════════════
 */

mosaic.table = {

    // ╭──────────────────────────────────────────────────╮
    // │              build the table widget              │
    // ╰──────────────────────────────────────────────────╯
    builder: {
        async build() {
            const contentContainer = document.getElementById('contentContainer');
            const buttonContainer  = document.getElementById('buttonContainer');
            mosaic.ui.container.resetBackground();

            const config        = mosaic.config;
            const source        = config.source;
            const columns       = config.columns       || [];
            const selectable    = config.selectable    !== false;
            const allowMultiple = config.allow_multiple !== false;
            const showButtons   = config.show_buttons  !== false;
            const buttons       = config.buttons       || ['Cancel', 'Submit'];
            const returnType    = allowMultiple ? 'array' : 'object';

            if (!source?.type) {
                mosaic.con.err('[mosaic.table.builder.build() | config.source with a valid type is required.');
                return;
            }

            contentContainer.innerHTML = mosaic.table.render.shell(config);
            contentContainer.classList.add('has-table');
            if (showButtons) buttonContainer.innerHTML = mosaic.ui.buttons.build(buttons, "mosaic.handlers.submit.table('${buttonText}', '${skipMode}', '${value}')", returnType);

            try {
                const initialData = await this.loadSourceData(source);
                mosaic.runtime.table.sort = mosaic.table.sort.getInitialState(config);
                mosaic.runtime.table.sourceData = mosaic.table.sort.applyInitial(initialData, config);

                if (config.show_search && source.type !== 'search') {
                    mosaic.table.data.originalSource = [...mosaic.runtime.table.sourceData];
                }

                if (source.type !== 'search' || initialData.length > 0) {
                    mosaic.runtime.table.currentPage = 1;
                    await mosaic.table.render.rows.render();
                }

            } catch (error) {
                mosaic.con.err('mosaic.table.builder.build() | Build error:', error);
                mosaic.table.render.rows.renderError(error.message, columns.length + (selectable ? 1 : 0));
            }

            mosaic.table.setup.eventListeners();

            const readyPromise = new Promise(resolve => setTimeout(resolve, 50));
            if (config.force_focus !== false) mosaic.ui.focus.force(readyPromise);
        },

        async loadSourceData(source) {
            switch (source.type) {
                case 'static':
                    mosaic.runtime.table.hasMoreRecords = false;
                    return Array.isArray(source.data) ? source.data : [];

                case 'coql': {
                    const response = await mosaic.api.crm.executeCoql(source.query);
                    mosaic.runtime.table.hasMoreRecords = response?.info?.more_records;
                    return response?.data || [];
                }

                case 'search':
                    return [];

                default:
                    mosaic.con.err(`mosaic.table.builder.build() | Unknown source type: "${source.type}"`);
                    return [];
            }
        }
    },

    // ╭──────────────────────────────────────────────────╮
    // │            render - static html builders         │
    // ╰──────────────────────────────────────────────────╯
    render: {

        // builds the entire content shell - title, toolbar, table, pagination
        shell(config) {
            const title       = config.title;
            const toolbarHtml = this.toolbar(config);
            const tableHtml   = this.table(config);
            const perPage     = config.per_page;

            return `
                ${title ? `<h2 class="widget-title">${mosaic.util.string.escapeHtml(title)}</h2>` : ''}
                ${toolbarHtml}
                ${tableHtml}
                ${perPage ? `<div id="tablePaginationContainer"></div>` : ''}`;
        },

        // toolbar containing search input
        toolbar(config) {
            const searchHtml = this.search(config);
            if (!searchHtml) return '';
            return `<div class="table-toolbar">${searchHtml}</div>`;
        },

        // search or filter input html
        search(config) {
            const source     = config.source;
            const isSearch   = source?.type === 'search';
            const showSearch = config.show_search === true;

            if (!isSearch && !showSearch) return '';

            const placeholder = config.search_placeholder
                || (isSearch ? 'Search records...' : 'Filter table...');

            const inputId = isSearch ? 'tableSearchInput' : 'tableFilterInput';

            return `
                <div class="table-search-wrapper">
                    <input type="text" id="${inputId}" placeholder="${mosaic.util.string.escapeHtml(placeholder)}">
                </div>`;
        },

        // table shell with thead - tbody is populated by rows.render()
        table(config) {
            const source        = config.source;
            const columns       = config.columns  || [];
            const selectable    = config.selectable !== false;
            const allowMultiple = config.allow_multiple !== false;
            const colspan       = columns.length + (selectable ? 1 : 0);

            const theadSelectionCell = selectable
                ? `<th>${allowMultiple ? '<input type="checkbox" id="select-all">' : ''}</th>`
                : '';

            const initialMessage = source?.type === 'search'
                ? 'Enter a term and press enter to search...'
                : 'Loading data...';

            return `
                <div class="table-wrapper">
                    <table class="dynamic-table ${selectable ? 'selectable' : ''}">
                        <thead><tr>
                            ${theadSelectionCell}
                            ${columns.map(col => this.sortHeader(col)).join('')}
                        </tr></thead>
                        <tbody id="dynamicTableBody">
                            <tr>
                                <td colspan="${colspan}">
                                    <div class="widget-state-container">${initialMessage}</div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>`;
        },

        sortHeader(col) {
            const header = mosaic.util.string.escapeHtml(col.header ?? col.key ?? '');

            if (col.sortable === false) return `<th><span>${header}</span></th>`;

            const key = mosaic.util.string.escapeJsString(col.key || '');
            const onclick = mosaic.util.string.escapeHtml(`mosaic.table.handlers.sortColumn('${key}')`);
            const icon = mosaic.table.sort.iconFor(col.key);

            return `
                <th>
                    <button type="button"
                            class="table-sort-header"
                            data-sort-field="${mosaic.util.string.escapeHtml(col.key || '')}"
                            onclick="${onclick}"
                            aria-label="Sort by ${header}">
                        <span>${header}</span>
                        <span class="table-sort-icon"><i class="fa-solid ${icon}" aria-hidden="true"></i></span>
                    </button>
                </th>`;
        },

        // pagination controls - called after each rows.render()
        pagination() {
            const controlsContainer = document.getElementById('tablePaginationContainer');
            if (!controlsContainer) return;

            const perPage      = mosaic.config.per_page;
            const totalRecords = mosaic.runtime.table.sourceData.length;

            if (totalRecords <= perPage) {
                controlsContainer.innerHTML = '';
                return;
            }

            const totalPages  = Math.ceil(totalRecords / perPage);
            const startRecord = (mosaic.runtime.table.currentPage - 1) * perPage + 1;
            const endRecord   = Math.min(startRecord + perPage - 1, totalRecords);

            controlsContainer.innerHTML = `
                <div class="pagination-controls">
                    <span class="pagination-text">${startRecord} - ${endRecord} of ${totalRecords}</span>
                    <button class="pagination-arrow"
                            onclick="mosaic.table.handlers.changePage(-1)"
                            ${mosaic.runtime.table.currentPage === 1 ? 'disabled' : ''}>&lt;</button>
                    <button class="pagination-arrow"
                            onclick="mosaic.table.handlers.changePage(1)"
                            ${mosaic.runtime.table.currentPage === totalPages ? 'disabled' : ''}>&gt;</button>
                </div>`;
        },

        // toggle button html — isClip reflects the CURRENT mode (not the target)
        overflowToggle(isClip) {
            const icon  = isClip ? 'fa-ellipsis'   : 'fa-align-left';
            const title = isClip ? 'Switch to wrap text' : 'Switch to clip text';

            return `
                <button type="button"
                        id="tableOverflowToggle"
                        class="table-overflow-toggle"
                        title="${title}"
                        onclick="mosaic.table.handlers.toggleOverflow()">
                    <i class="fa-solid ${icon}" aria-hidden="true"></i>
                </button>`;
        },

        rows: {

        // renders tbody content from current state data, then updates pagination
        async render() {
            const tbody = document.getElementById('dynamicTableBody');
            if (!tbody) return;

            const config     = mosaic.config;
            const columns    = config.columns || [];
            const selectable = config.selectable !== false;
            const colspan    = columns.length + (selectable ? 1 : 0);
            const perPage    = config.per_page;

            if (!mosaic.runtime.table.sourceData || mosaic.runtime.table.sourceData.length === 0) {
                tbody.innerHTML = this.empty(colspan);
                if (perPage) mosaic.table.render.pagination();
                return;
            }

            let dataToRender   = mosaic.runtime.table.sourceData;
            let pageStartIndex = 0;

            if (perPage && mosaic.runtime.table.sourceData.length > perPage) {
                pageStartIndex = (mosaic.runtime.table.currentPage - 1) * perPage;
                dataToRender   = mosaic.runtime.table.sourceData.slice(pageStartIndex, pageStartIndex + perPage);
            }

            let rowsHtml = '';
            for (const [index, row] of dataToRender.entries()) {
                rowsHtml += await this.buildRow(row, columns, selectable, pageStartIndex + index);
            }

            tbody.innerHTML = rowsHtml;
            if (perPage) mosaic.table.render.pagination();

            if (document.querySelector('.table-overflow-toggle-wrapper')) {
                if (document.querySelector('.dynamic-table.text-clip')) {
                    mosaic.table.setup.applyTitleAttributes();
                }
            } else {
                setTimeout(() => {
                    mosaic.table.setup.overflowToggle();
                    if (document.querySelector('.dynamic-table.text-clip')) {
                        mosaic.table.setup.applyTitleAttributes();
                    }
                }, 100);
            }
        },

        // builds a single <tr>
        async buildRow(row, columns, selectable, absoluteIndex) {
            const config        = mosaic.config;
            const allowMultiple = config.allow_multiple !== false;
            const selectionType = allowMultiple ? 'checkbox' : 'radio';

            const rowAttributes = this.buildRowAttributes(row, columns);
            const rowClick = selectable ? ' onclick="mosaic.table.handlers.toggleRowSelection(this, event)"' : '';
            let html = `<tr data-row-index="${absoluteIndex}"${rowClick}${rowAttributes}>`;

            if (selectable) {
                html += `
                    <td>
                        <input type="${selectionType}"
                               name="table_selection"
                               data-record-index="${absoluteIndex}"
                               onchange="mosaic.table.handlers.syncInputSelection(this)">
                    </td>`;
            }

            for (const col of columns) {
                const cell = await this.buildCell(row, col);
                html += `<td${cell.attributes}>${cell.html}</td>`;
            }

            html += `</tr>`;
            return html;
        },

        buildRowAttributes(row, columns) {
            const mergedStyle = {};

            columns.forEach(col => {
                const rawValue = mosaic.util.object.resolveDotNotation(row, col.key);
                Object.assign(mergedStyle, this.resolveRulesStyle(rawValue, col.rules, col, 'row', row));
            });

            const style = this.styleObjectToString(mergedStyle);
            if (!style) return '';
            return ` style="${mosaic.util.string.escapeHtml(style)}"`;
        },

        // builds a single cell payload - resolves dot notation, formats display, generates links if configured
        async buildCell(row, col) {
            const rawValue = mosaic.util.object.resolveDotNotation(row, col.key);
            const displayText = await this.formatValue(rawValue, col);
            const attributes = this.buildCellAttributes(rawValue, col, row);
            let cellHtml = col.raw_html === true ? displayText : mosaic.util.string.escapeHtml(displayText);

            if (col.link) {
                let linkUrl  = null;
                let linkText = mosaic.util.string.escapeHtml(displayText);

                if (col.link.module && col.link.id_key) {
                    // crm record link - async url generation
                    const linkId = mosaic.util.object.resolveDotNotation(row, col.link.id_key);
                    if (linkId) linkUrl = await mosaic.util.data.generateRecordLink(col.link.module, linkId);

                } else if (col.link.url_key) {
                    // dynamic url from row data
                    linkUrl  = mosaic.util.object.resolveDotNotation(row, col.link.url_key) || null;
                    if (col.link.text_key) linkText = mosaic.util.string.escapeHtml(mosaic.util.object.resolveDotNotation(row, col.link.text_key) || displayText);

                } else if (col.link.url) {
                    // static url
                    linkUrl  = col.link.url;
                    if (col.link.text) linkText = mosaic.util.string.escapeHtml(col.link.text);
                }

                // only http(s) urls become links - row data could contain
                // javascript: or other schemes, which must render as plain text
                if (linkUrl && mosaic.util.is.url(linkUrl)) {
                    cellHtml = `<a href="${mosaic.util.string.escapeHtml(linkUrl)}"
                                   class="table-link"
                                   target="_blank"
                                   rel="noopener noreferrer">${linkText}</a>`;
                } else if (linkUrl) {
                    mosaic.con.warn(`mosaic.table.render.rows.buildCell() | Blocked non-http(s) link url for column "${col.key}"`);
                }
            }

            return { html: cellHtml, attributes };
        },

        async formatValue(rawValue, col) {
            if (rawValue === null || rawValue === undefined || rawValue === '') return '–';
            if (!col.format) return rawValue;

            const format = col.format;
            const type   = format.type;

            try {
                if (type === 'currency' || type === 'number') {
                    const number = this.parseNumber(rawValue);
                    if (number === null) return rawValue;

                    const options = {
                        minimumFractionDigits: format.decimals,
                        maximumFractionDigits: format.decimals
                    };

                    if (type === 'currency') {
                        if (!format.currency) {
                            mosaic.con.warn('mosaic.table.render.rows.formatValue() | currency format requires format.currency; using raw value.');
                            return rawValue;
                        }
                        options.style = 'currency';
                        options.currency = format.currency;
                    }

                    return new Intl.NumberFormat(format.locale || undefined, options).format(number);
                }

                if (type === 'date') {
                    const parsed = rawValue instanceof Date
                        ? rawValue
                        : mosaic.util.date.parseSmartDate(String(rawValue), format.input_date_format);

                    if (!parsed) return rawValue;
                    const displayFormat = await mosaic.api.env.getUserDateFormatDisplay();
                    return mosaic.util.date.formatDate(parsed, displayFormat);
                }
            } catch (error) {
                mosaic.con.warn('mosaic.table.render.rows.formatValue() | Format error:', error);
            }

            return rawValue;
        },

        buildCellAttributes(rawValue, col, row) {
            const style = this.resolveStyleRules(rawValue, col.rules, col, 'cell', row);
            if (!style) return '';
            return ` style="${mosaic.util.string.escapeHtml(style)}"`;
        },

        resolveStyleRules(rawValue, rules, col, target = 'cell', row = null) {
            return this.styleObjectToString(this.resolveRulesStyle(rawValue, rules, col, target, row));
        },

        resolveRulesStyle(rawValue, rules, col, target = 'cell', row = null) {
            if (!Array.isArray(rules) || rules.length === 0) return {};

            const mergedStyle = {};

            rules.forEach(rule => {
                const ruleTarget = rule.target || 'cell';
                if (ruleTarget !== target) return;
                if (!this.matchesStyleRule(rawValue, rule, col, row)) return;
                Object.assign(mergedStyle, this.filterStyle(rule.style));
            });

            return mergedStyle;
        },

        matchesStyleRule(rawValue, rule, col, row = null) {
            if (Array.isArray(rule.conditions)) {
                return rule.conditions.every(condition => {
                    const value = condition.key && row
                        ? mosaic.util.object.resolveDotNotation(row, condition.key)
                        : rawValue;
                    return this.evaluateCondition(value, condition, col);
                });
            }
            return this.evaluateCondition(rawValue, rule, col);
        },

        evaluateCondition(rawValue, condition, col) {
            if (!condition?.operator) return false;

            const operator = condition.operator;
            const expected = condition.value;

            switch (operator) {
                case 'not_empty':
                    return rawValue !== null && rawValue !== undefined && String(rawValue).trim() !== '';
                case 'empty':
                    return rawValue === null || rawValue === undefined || String(rawValue).trim() === '';
                case 'equals':
                    return rawValue !== null && rawValue !== undefined
                        && String(rawValue).toLowerCase() === String(expected).toLowerCase();
                case 'not_equals':
                    return rawValue === null || rawValue === undefined
                        || String(rawValue).toLowerCase() !== String(expected).toLowerCase();
                case 'contains':
                    return rawValue !== null && rawValue !== undefined
                        && String(rawValue).toLowerCase().includes(String(expected).toLowerCase());
                case 'greater_than': {
                    const actual = this.parseNumber(rawValue);
                    const target = this.parseNumber(expected);
                    return actual !== null && target !== null && actual > target;
                }
                case 'less_than': {
                    const actual = this.parseNumber(rawValue);
                    const target = this.parseNumber(expected);
                    return actual !== null && target !== null && actual < target;
                }
                case 'before': {
                    const actual = this.parseDateForRule(rawValue, col);
                    const target = this.parseDateForRule(expected, col);
                    return actual !== null && target !== null && actual < target;
                }
                case 'after': {
                    const actual = this.parseDateForRule(rawValue, col);
                    const target = this.parseDateForRule(expected, col);
                    return actual !== null && target !== null && actual > target;
                }
                case 'between': {
                    if (!Array.isArray(expected) || expected.length !== 2) return false;
                    const actual = this.parseNumber(rawValue);
                    const low    = this.parseNumber(expected[0]);
                    const high   = this.parseNumber(expected[1]);
                    if (actual !== null && low !== null && high !== null) return actual >= low && actual <= high;

                    const actualDate = this.parseDateForRule(rawValue, col);
                    const lowDate    = this.parseDateForRule(expected[0], col);
                    const highDate   = this.parseDateForRule(expected[1], col);
                    return actualDate !== null && lowDate !== null && highDate !== null
                        && actualDate >= lowDate && actualDate <= highDate;
                }
                case 'in':
                    return Array.isArray(expected) && rawValue !== null && rawValue !== undefined
                        && expected.some(value => String(value).toLowerCase() === String(rawValue).toLowerCase());
                case 'not_in':
                    return !Array.isArray(expected) || rawValue === null || rawValue === undefined
                        || !expected.some(value => String(value).toLowerCase() === String(rawValue).toLowerCase());
                default:
                    mosaic.con.warn(`mosaic.table.render.rows.evaluateCondition() | Unknown operator: "${operator}"`);
                    return false;
            }
        },

        parseNumber(value) {
            if (value === null || value === undefined || value === '') return null;
            if (typeof value === 'number') return Number.isFinite(value) ? value : null;

            const number = Number(String(value).replace(/[$,\s]/g, ''));
            return Number.isFinite(number) ? number : null;
        },

        parseDateForRule(value, col) {
            if (!value) return null;
            if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.getTime();

            const format = col?.format?.input_date_format;
            const parsed = mosaic.util.date.parseSmartDate(String(value), format);
            return parsed ? parsed.getTime() : null;
        },

        filterStyle(style) {
            const allowed = new Set([
                'color',
                'background-color',
                'font-weight',
                'font-style',
                'text-align',
                'border-left',
                'opacity'
            ]);
            const safeStyle = {};

            if (!style || typeof style !== 'object') return safeStyle;

            Object.keys(style).forEach(key => {
                if (!allowed.has(key)) return;
                if (style[key] === null || style[key] === undefined || style[key] === '') return;
                const value = String(style[key]).trim();
                if (!this.isSafeStyleValue(value)) return;
                safeStyle[key] = value;
            });

            return safeStyle;
        },

        isSafeStyleValue(value) {
            return !/[;{}<>]/.test(value)
                && !/url\s*\(/i.test(value)
                && !/expression\s*\(/i.test(value);
        },

        styleObjectToString(style) {
            return Object.keys(style).map(key => {
                return `${key}: ${style[key]};`;
            }).join(' ');
        },

        // empty state row
        empty(colspan) {
            return `
                <tr>
                    <td colspan="${colspan}">
                        <div class="widget-state-container">No records found.</div>
                    </td>
                </tr>`;
        },

        // error state row
        renderError(message, colspan) {
            const tbody = document.getElementById('dynamicTableBody');
            if (!tbody) return;
            tbody.innerHTML = `
                <tr>
                    <td colspan="${colspan}">
                        <div class="widget-state-container">Error: ${mosaic.util.string.escapeHtml(message)}</div>
                    </td>
                </tr>`;
        }
        }
    },

    // ╭──────────────────────────────────────────────────╮
    // │          data - search and filter layer          │
    // ╰──────────────────────────────────────────────────╯
    data: {

        // stores unfiltered source for local filter reset
        originalSource: [],

        // api search (search type) - triggered by enter key
        async search(searchTerm) {
            const source     = mosaic.config.source;
            const columns    = mosaic.config.columns || [];
            const selectable = mosaic.config.selectable !== false;
            const colspan    = columns.length + (selectable ? 1 : 0);
            const tbody      = document.getElementById('dynamicTableBody');

            if (!searchTerm?.trim()) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="${colspan}">
                            <div class="widget-state-container">Enter a search term to begin</div>
                        </td>
                    </tr>`;
                return;
            }

            tbody.innerHTML = `
                <tr>
                    <td colspan="${colspan}">
                        <div class="widget-state-container">Searching...</div>
                    </td>
                </tr>`;

            try {
                let query = searchTerm;
                const searchType = source.search_type || 'word';

                if (searchType === 'criteria' && Array.isArray(source.fields) && source.fields.length > 0) {
                    query = `(${source.fields.map(f => `(${f}:equals:${searchTerm})`).join('or')})`;
                }

                const results = await mosaic.api.crm.searchRecords(source.module, query, searchType);

                mosaic.runtime.table.sort = mosaic.table.sort.getInitialState(mosaic.config);
                mosaic.runtime.table.sourceData = mosaic.table.sort.applyInitial(results, mosaic.config);
                mosaic.runtime.table.currentPage     = 1;
                await mosaic.table.render.rows.render();

            } catch (error) {
                mosaic.con.err('mosaic.table.search | Search error:', error);
                tbody.innerHTML = `
                    <tr>
                        <td colspan="${colspan}">
                            <div class="widget-state-container">Error: ${mosaic.util.string.escapeHtml(error.message)}</div>
                        </td>
                    </tr>`;
            }
        },

        // local filter (show_search mode) - debounced on input
        async filter(searchTerm) {
            const columns = mosaic.config.columns || [];

            if (!searchTerm?.trim()) {
                mosaic.runtime.table.sourceData = [...this.originalSource];
                mosaic.runtime.table.currentPage     = 1;
                await mosaic.table.render.rows.render();
                return;
            }

            const term = searchTerm.toLowerCase().trim();

            mosaic.runtime.table.sourceData = this.originalSource.filter(row =>
                columns.some(col => {
                    const value = mosaic.util.object.resolveDotNotation(row, col.key);
                    if (value == null) return false;
                    return String(value).toLowerCase().includes(term);
                })
            );

            mosaic.runtime.table.currentPage = 1;
            await mosaic.table.render.rows.render();
        }
    },

    // ╭──────────────────────────────────────────────────╮
    // │       sort - current page table ordering         │
    // ╰──────────────────────────────────────────────────╯
    sort: {

        getInitialState(config = mosaic.config || {}) {
            const field = config.sort_field || null;
            const order = this.normalizeOrder(config.sort_order, field ? 'asc' : null);

            return { field, order };
        },

        getState() {
            const runtimeState = mosaic.runtime.table.sort || {};
            const configState = this.getInitialState(mosaic.config || {});

            return {
                field: runtimeState.field ?? configState.field,
                order: runtimeState.order ?? configState.order
            };
        },

        normalizeOrder(order, fallback = 'asc') {
            const normalized = String(order || '').toLowerCase();
            return ['asc', 'desc'].includes(normalized) ? normalized : fallback;
        },

        applyInitial(data, config = mosaic.config || {}) {
            const state = this.getInitialState(config);
            if (!state.field || !state.order) return Array.isArray(data) ? data : [];

            return mosaic.util.data.sortData(data, state.field, state.order);
        },

        applyCurrentPage(field, order) {
            const data = mosaic.runtime.table.sourceData || [];
            if (!field || data.length === 0) return;

            const normalizedOrder = this.normalizeOrder(order);
            const perPage = mosaic.config.per_page;
            const currentPage = Math.max(1, mosaic.runtime.table.currentPage || 1);
            const start = perPage ? (currentPage - 1) * perPage : 0;
            const end = perPage ? Math.min(start + perPage, data.length) : data.length;
            const sortedPage = mosaic.util.data.sortData(data.slice(start, end), field, normalizedOrder);

            mosaic.runtime.table.sourceData = [
                ...data.slice(0, start),
                ...sortedPage,
                ...data.slice(end)
            ];
        },

        setNextDirection(field) {
            const current = this.getState();
            const nextOrder = current.field === field && current.order === 'asc' ? 'desc' : 'asc';

            mosaic.runtime.table.sort = { field, order: nextOrder };
            return nextOrder;
        },

        iconFor(field) {
            const current = this.getState();
            if (current.field !== field) return 'fa-bars';

            return current.order === 'desc' ? 'fa-arrow-down' : 'fa-arrow-up';
        },

        updateHeaderIcons() {
            document.querySelectorAll?.('.table-sort-header').forEach(button => {
                const icon = button.querySelector?.('.table-sort-icon i');
                const field = button.dataset?.sortField;
                if (!icon || !field) return;

                icon.className = `fa-solid ${this.iconFor(field)}`;
            });
        }
    },

    // ╭──────────────────────────────────────────────────╮
    // │       setup - initialization after render        │
    // ╰──────────────────────────────────────────────────╯
    setup: {

        eventListeners() {
            this.selectAll();
            this.searchInput();
            this.filterInput();
        },

        selectAll() {
            const selectAllCheckbox = document.getElementById('select-all');
            if (!selectAllCheckbox) return;

            selectAllCheckbox.addEventListener('change', (e) => {
                document.querySelectorAll('input[name="table_selection"]')
                    .forEach(cb => {
                        cb.checked = e.target.checked;
                        mosaic.table.handlers.syncInputSelection(cb);
                    });
            });
        },

        searchInput() {
            const searchInput = document.getElementById('tableSearchInput');
            if (!searchInput) return;

            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') mosaic.table.data.search(searchInput.value);
            });
        },

        filterInput() {
            const filterInput = document.getElementById('tableFilterInput');
            if (!filterInput) return;

            const debouncedFilter = mosaic.util.async.debounce(
                (value) => mosaic.table.data.filter(value), 300
            );

            filterInput.addEventListener('input',    (e) => debouncedFilter(e.target.value));
            filterInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') mosaic.table.data.filter(filterInput.value);
            });
        },

        applyTitleAttributes() {
            document.querySelectorAll('#dynamicTableBody td').forEach(td => {
                const text = td.textContent.trim();
                if (text) td.setAttribute('title', text);
            });
        },

        removeTitleAttributes() {
            document.querySelectorAll('#dynamicTableBody td').forEach(td => {
                td.removeAttribute('title');
            });
        },

        overflowToggle() {
            // guard on the wrapper, not the toggle - the toggle is optional but the
            // wrapper is always what gets inserted (it also holds the export button)
            if (document.querySelector('.table-overflow-toggle-wrapper')) return;

            const tableWrapper = document.querySelector('.table-wrapper');
            if (!tableWrapper) return;

            const table = tableWrapper.querySelector('.dynamic-table');
            if (!table) return;

            if (!document.querySelector('#dynamicTableBody tr')) return;

            if (tableWrapper.clientWidth === 0) {
                const ro = new ResizeObserver(() => {
                    if (tableWrapper.clientWidth > 0) {
                        ro.disconnect();
                        mosaic.table.setup.overflowToggle();
                    }
                });
                ro.observe(tableWrapper);
                return;
            }

            const isClip = mosaic.config.overflow_mode === 'clip';
            table.classList.add(isClip ? 'text-clip' : 'text-wrap');

            const toggleHtml = mosaic.config.show_overflow_toggle === false
                ? ''
                : mosaic.table.render.overflowToggle(isClip);
            const exportHtml = mosaic.config.allow_export === true && typeof mosaic.export !== 'undefined'
                ? mosaic.export.controls.buildButton()
                : '';
            tableWrapper.insertAdjacentHTML('beforebegin', `<div class="table-overflow-toggle-wrapper">${exportHtml}${toggleHtml}</div>`);
        }
    },

    // ╭──────────────────────────────────────────────────╮
    // │     handlers - user interaction callbacks        │
    // ╰──────────────────────────────────────────────────╯
    handlers: {

        async changePage(direction) {
            const perPage    = mosaic.config.per_page;
            const totalPages = Math.ceil(mosaic.runtime.table.sourceData.length / perPage);

            mosaic.runtime.table.currentPage = Math.max(1,
                Math.min(mosaic.runtime.table.currentPage + direction, totalPages)
            );

            await mosaic.table.render.rows.render();
        },

        async sortColumn(field) {
            const order = mosaic.table.sort.setNextDirection(field);
            mosaic.table.sort.applyCurrentPage(field, order);
            mosaic.table.sort.updateHeaderIcons();

            await mosaic.table.render.rows.render();
        },

        toggleRowSelection(row, event) {
            if (!row) return;
            if (event?.detail && event.detail > 1) {
                this.cancelPendingRowSelection();
                return;
            }
            if (this.shouldIgnoreRowSelection(event)) return;

            event?.preventDefault?.();
            const input = row.querySelector?.('input[name="table_selection"]');
            if (!input) return;

            const applySelection = () => {
                const wasChecked = input.checked === true;

                if (input.type === 'radio') {
                    document.querySelectorAll?.('input[name="table_selection"]').forEach(other => {
                        if (other === input) return;
                        other.checked = false;
                        this.syncInputSelection(other);
                    });
                }

                input.checked = !wasChecked;
                this.syncRowSelection(row, input);

                const changeEvent = typeof Event === 'function'
                    ? new Event('change', { bubbles: true })
                    : { type: 'change', bubbles: true };

                input.dispatchEvent?.(changeEvent);
            };

            if (event?.detail === 1) {
                this.cancelPendingRowSelection();
                this._pendingRowSelection = setTimeout(() => {
                    this._pendingRowSelection = null;
                    applySelection();
                }, 140);
                return;
            }

            applySelection();
        },

        cancelPendingRowSelection() {
            if (!this._pendingRowSelection) return;

            clearTimeout(this._pendingRowSelection);
            this._pendingRowSelection = null;
        },

        shouldIgnoreRowSelection(event) {
            if (!event) return false;
            if (event.detail && event.detail > 1) return true;
            if (window.getSelection?.().toString()) return true;

            const target = event.target;
            if (!target?.closest) return false;

            return !!target.closest('a, button, input, textarea, select, label');
        },

        syncInputSelection(input) {
            const row = input?.closest?.('tr');
            if (!row) return;

            this.syncRowSelection(row, input);
        },

        syncRowSelection(row, input = null) {
            const selectionInput = input || row?.querySelector?.('input[name="table_selection"]');
            if (!row || !selectionInput) return;

            row.classList?.toggle?.('selected', selectionInput.checked === true);
        },

        toggleOverflow() {
            const table     = document.querySelector('.dynamic-table');
            const toggleBtn = document.getElementById('tableOverflowToggle');
            if (!table || !toggleBtn) return;

            toggleBtn.disabled = true;
            table.classList.add('table-updating');

            setTimeout(() => {
                const willBeClip = !table.classList.contains('text-clip');

                table.classList.toggle('text-clip');
                table.classList.toggle('text-wrap');

                if (willBeClip) {
                    mosaic.table.setup.applyTitleAttributes();
                } else {
                    mosaic.table.setup.removeTitleAttributes();
                }

                const icon = toggleBtn.querySelector('i');
                if (icon) icon.className = `fa-solid ${willBeClip ? 'fa-ellipsis' : 'fa-align-left'}`;
                toggleBtn.title = willBeClip ? 'Switch to wrap text' : 'Switch to clip text';

                toggleBtn.disabled = false;
                table.classList.remove('table-updating');
            }, 200);
        }
    },
};
