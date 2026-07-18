/**
 * ════════════════════════════════════════════════════════════════════════
 *  mosaic.launcher - command palette / quick-action picker module
 * ════════════════════════════════════════════════════════════════════════
 *
 *  widget type: 'launcher'
 *
 *  A searchable list of items with keyboard navigation and optional
 *  fuzzy matching. The user types to filter, arrow-navigates, and
 *  presses Enter to select. The selected item is returned in the response.
 *
 *  config keys:
 *      items               - [{ actual_value, display_value, description?, icon? }, ...]
 *      title               - optional title above the search input
 *      show_search         - true (default) | false
 *      placeholder         - search input placeholder (default: 'Type to search...')
 *      match_mode          - 'fuzzy' (default) | 'contains' | 'exact'
 *      show_description    - show item descriptions (default: true)
 *      show_icons          - show item icons (default: true)
 *      buttons             - footer buttons (default: [])
 *      show_buttons        - show footer button row (default: false)
 */

mosaic.launcher = {

    state: {
        items: [],
        filteredItems: [],
        selectedIndex: 0,
        showSearch: true,
        matchMode: 'fuzzy',
        showDescription: true,
        showIcons: true,
        hasStatusDots: false
    },

    builder: {
        // ╭──────────────────────────────────────────────────╮
        // │            build the launcher widget             │
        // ╰──────────────────────────────────────────────────╯
        async build() {
            const contentContainer = document.getElementById('contentContainer');
            const buttonContainer  = document.getElementById('buttonContainer');
            mosaic.ui.container.resetBackground();

            const config          = mosaic.config;
            const title           = config.title || '';
            const placeholder     = config.placeholder || 'Type to search...';
            const items           = Array.isArray(config.items) ? config.items : Object.values(config.items || {});
            const showIcons       = config.show_icons !== false;
            const showButtons     = config.show_buttons === true;
            const buttons         = config.buttons || [];

            mosaic.launcher.state.items           = this.normalizeItems(items, showIcons);
            mosaic.launcher.state.filteredItems   = [...mosaic.launcher.state.items];
            mosaic.launcher.state.selectedIndex   = 0;
            mosaic.launcher.state.showSearch      = config.show_search !== false;
            mosaic.launcher.state.matchMode       = config.match_mode || 'fuzzy';
            mosaic.launcher.state.showDescription = config.show_description !== false;
            mosaic.launcher.state.showIcons       = showIcons;
            mosaic.launcher.state.hasStatusDots   = mosaic.launcher.state.items.some(
                item => item.status_color && mosaic.launcher.icons.resolveStatusColor(item.status_color) !== null
            );

            contentContainer.innerHTML = mosaic.launcher.render.shell(title, placeholder);
            if (showButtons && buttons.length) {
                buttonContainer.innerHTML = mosaic.ui.buttons.build(
                    buttons, "mosaic.handlers.submit.launcher('${buttonText}', '${skipMode}', '${value}')", ''
                );
            }

            mosaic.launcher.render.items();
            mosaic.launcher.events.setup();

            if (mosaic.config.force_focus !== false) mosaic.ui.focus.force(mosaic.ui.readiness.buildPromise());
        },

        // ╭──────────────────────────────────────────────────╮ 
        // │                 normalize items                  │ 
        // ╰──────────────────────────────────────────────────╯ 
        normalizeItems(items, showIcons) {
            return items.map((item, i) => {
                const { actualValue, displayValue } = mosaic.util.object.normalizeOption(item);
                return {
                    ...item,
                    actual_value:   actualValue,
                    display_value:  displayValue,
                    _originalIndex: i,
                    icon: item.icon || (showIcons ? mosaic.launcher.icons.resolve({ display_value: displayValue, description: item.description }) : null)
                };
            });
        }
    },

    render: {
        // ╭──────────────────────────────────────────────────╮
        // │            shell: title + search + list          │
        // ╰──────────────────────────────────────────────────╯
        shell(title, placeholder) {
            return `
                <div class="launcher-wrapper">
                    ${title ? `<div class="launcher-title">${mosaic.util.string.escapeHtml(title)}</div>` : ''}
                    ${mosaic.launcher.state.showSearch ? `
                        <div class="launcher-search-wrapper">
                            <i class="fa-solid fa-magnifying-glass launcher-search-icon"></i>
                            <input type="text"
                                id="launcher-search"
                                class="launcher-search"
                                placeholder="${mosaic.util.string.escapeHtml(placeholder)}"
                                autocomplete="off"
                                spellcheck="false">
                        </div>` : ''}
                    <div class="launcher-items" id="launcher-items"></div>
                </div>`;
        },

        // ╭──────────────────────────────────────────────────╮
        // │               single item row                    │
        // ╰──────────────────────────────────────────────────╯
        item(item, index, isSelected, showIcons, showDescription, highlights) {
            const selectedClass = isSelected ? ' launcher-item-selected' : '';
            const iconHtml = showIcons && item.icon
                ? `<div class="launcher-item-icon"><i class="fa-solid ${mosaic.util.string.escapeHtml(item.icon)}"></i></div>`
                : '';

            const labelHtml = highlights
                ? highlights
                : mosaic.util.string.escapeHtml(item.display_value);

            const descHtml = showDescription && item.description
                ? `<div class="launcher-item-description">${mosaic.util.string.escapeHtml(item.description)}</div>`
                : '';

            const dotHtml = mosaic.launcher.render.dot(item);

            return `
                <div class="launcher-item${selectedClass}"
                     data-index="${index}"
                     data-item-id="${mosaic.util.string.escapeHtml(item.actual_value || '')}">
                    ${dotHtml}
                    ${iconHtml}
                    <div class="launcher-item-content">
                        <div class="launcher-item-label">${labelHtml}</div>
                        ${descHtml}
                    </div>
                </div>`;
        },

        // ╭──────────────────────────────────────────────────╮
        // │               empty state                        │
        // ╰──────────────────────────────────────────────────╯
        empty() {
            return `<div class="launcher-empty">No matching items</div>`;
        },

        // ╭──────────────────────────────────────────────────╮
        // │          render filtered items to dom            │
        // ╰──────────────────────────────────────────────────╯
        items() {
            const container = document.getElementById('launcher-items');
            if (!container) return;

            if (mosaic.launcher.state.filteredItems.length === 0) {
                container.innerHTML = mosaic.launcher.render.empty();
                return;
            }

            container.innerHTML = mosaic.launcher.state.filteredItems.map((item, index) =>
                mosaic.launcher.render.item(
                    item,
                    index,
                    index === mosaic.launcher.state.selectedIndex,
                    mosaic.launcher.state.showIcons,
                    mosaic.launcher.state.showDescription,
                    item._highlights || null
                )
            ).join('');

            // scroll selected into view
            mosaic.launcher.navigation.scrollSelectedIntoView();
        },

        // ╭──────────────────────────────────────────────────╮ 
        // │                highlight matches                 │ 
        // ╰──────────────────────────────────────────────────╯ 
        highlight(text, strongMatches = [], weakMatches = []) {
            const strongIndices = new Set(strongMatches);
            const weakIndices   = new Set(weakMatches);
            let html = '';
            let currentClass = null;

            for (let i = 0; i < text.length; i++) {
                const cls = strongIndices.has(i) ? 'strong'
                        : weakIndices.has(i)   ? 'weak'
                        : null;

                if (cls !== currentClass) {
                    if (currentClass) html += '</mark>';
                    if (cls) html += `<mark class="launcher-highlight launcher-highlight--${cls}">`;
                    currentClass = cls;
                }
                html += mosaic.util.string.escapeHtml(text[i]);
            }

            if (currentClass) html += '</mark>';
            return html;
        },

        // ╭──────────────────────────────────────────────────╮ 
        // │                    status dot                    │ 
        // ╰──────────────────────────────────────────────────╯ 
        dot(item) {
            if (!mosaic.launcher.state.hasStatusDots) return '';
            const resolved = item.status_color ? mosaic.launcher.icons.resolveStatusColor(item.status_color) : null;
            if (!resolved) return '<div class="launcher-dot launcher-dot--empty"></div>';
            if (resolved.type === 'class') return `<div class="launcher-dot ${resolved.value}"></div>`;
            return `<div class="launcher-dot" style="${mosaic.util.string.escapeHtml(resolved.value)}"></div>`;
        }
    },

    search: {
        // ╭──────────────────────────────────────────────────╮
        // │           filter items by search term            │
        // ╰──────────────────────────────────────────────────╯
        filter(term) {
            if (!term || !term.trim()) {
                mosaic.launcher.state.filteredItems = mosaic.launcher.state.items.map(item => ({ ...item, _highlights: null }));
                mosaic.launcher.state.selectedIndex = 0;
                mosaic.launcher.render.items();
                return;
            }

            const query = term.trim().toLowerCase();

            switch (mosaic.launcher.state.matchMode) {
                case 'exact':
                    mosaic.launcher.state.filteredItems = mosaic.launcher.state.items
                        .filter(item => item.display_value.toLowerCase().startsWith(query))
                        .map(item => ({ ...item, _highlights: mosaic.launcher.search.highlightExact(item.display_value, query) }));
                    break;

                case 'contains':
                    mosaic.launcher.state.filteredItems = mosaic.launcher.state.items
                        .filter(item => item.display_value.toLowerCase().includes(query))
                        .map(item => ({ ...item, _highlights: mosaic.launcher.search.highlightContains(item.display_value, query) }));
                    break;

                case 'fuzzy':
                default:
                    mosaic.launcher.state.filteredItems = mosaic.launcher.state.items
                        .map(item => {
                            const result = mosaic.launcher.search.fuzzyMatch(item.display_value, query);
                            return result ? { ...item, _score: result.score, _highlights: result.highlighted } : null;
                        })
                        .filter(Boolean)
                        .sort((a, b) => b._score - a._score);
                    break;
            }

            mosaic.launcher.state.selectedIndex = 0;
            mosaic.launcher.render.items();
        },

        // ╭──────────────────────────────────────────────────╮
        // │            fuzzy match with scoring              │
        // ╰──────────────────────────────────────────────────╯
        /** @private */
        fuzzyMatch(text, query) {
            const lower = text.toLowerCase();
            let score = 0;
            let strongMatches = [];
            let weakMatches   = [];

            // ── pass 1: greedy scatter (always run) ───────────────────────────
            let queryIdx = 0, lastIdx = -1, greedyMatches = [];

            for (let i = 0; i < lower.length && queryIdx < query.length; i++) {
                if (lower[i] !== query[queryIdx]) continue;
                greedyMatches.push(i);
                score += (lastIdx === i - 1) ? 10 : 5;
                if (i === 0 || /[\s\-_]/.test(text[i - 1])) score += 15;
                if (i === 0) score += 20;
                lastIdx = i;
                queryIdx++;
            }

            if (queryIdx !== query.length) return null;
            score -= (greedyMatches[greedyMatches.length - 1] - greedyMatches[0]) * 2;

            // ── pass 2: find best contiguous run and promote it ───────────────
            const contigIdx = lower.indexOf(query);
            if (contigIdx !== -1) {
                const contigSet = new Set(
                    Array.from({ length: query.length }, (_, i) => contigIdx + i)
                );

                // contiguous indices → strong; greedy-only indices → weak
                strongMatches = [...contigSet];
                weakMatches   = greedyMatches.filter(i => !contigSet.has(i));

                score += 100 + query.length * 10;
                if (contigIdx === 0) score += 20;
                if (contigIdx === 0 || /[\s\-_]/.test(text[contigIdx - 1])) score += 15;
                score -= contigIdx;
            } else {
                // no contiguous run - all greedy matches go through classifier as usual
                strongMatches = greedyMatches;
                weakMatches   = [];
            }

            return {
                score,
                highlighted: mosaic.launcher.render.highlight(text, strongMatches, weakMatches)
            };
        },

        // ╭──────────────────────────────────────────────────╮
        // │          highlight for exact mode                │
        // ╰──────────────────────────────────────────────────╯
        /** @private */
        highlightExact(text, query) {
            const matchLen = query.length;
            return `<mark class="launcher-highlight">${mosaic.util.string.escapeHtml(text.substring(0, matchLen))}</mark>${mosaic.util.string.escapeHtml(text.substring(matchLen))}`;
        },

        // ╭──────────────────────────────────────────────────╮
        // │         highlight for contains mode              │
        // ╰──────────────────────────────────────────────────╯
        /** @private */
        highlightContains(text, query) {
            const lower = text.toLowerCase();
            const start = lower.indexOf(query);
            if (start === -1) return mosaic.util.string.escapeHtml(text);
            const end = start + query.length;
            return mosaic.util.string.escapeHtml(text.substring(0, start))
                + `<mark class="launcher-highlight">${mosaic.util.string.escapeHtml(text.substring(start, end))}</mark>`
                + mosaic.util.string.escapeHtml(text.substring(end));
        },

    },

    navigation: {
        // ╭──────────────────────────────────────────────────╮
        // │          navigate items by direction             │
        // ╰──────────────────────────────────────────────────╯
        navigate(direction) {
            if (mosaic.launcher.state.filteredItems.length === 0) return;

            mosaic.launcher.state.selectedIndex = Math.max(0,
                Math.min(mosaic.launcher.state.selectedIndex + direction, mosaic.launcher.state.filteredItems.length - 1)
            );

            mosaic.launcher.navigation.updateSelection();
        },

        // ╭──────────────────────────────────────────────────╮
        // │           select item by index                   │
        // ╰──────────────────────────────────────────────────╯
        select(index) {
            if (index < 0 || index >= mosaic.launcher.state.filteredItems.length) return;
            mosaic.launcher.state.selectedIndex = index;
            mosaic.launcher.navigation.updateSelection();
        },

        // ╭──────────────────────────────────────────────────╮
        // │         update visual selection state            │
        // ╰──────────────────────────────────────────────────╯
        updateSelection() {
            const container = document.getElementById('launcher-items');
            if (!container) return;

            container.querySelectorAll('.launcher-item').forEach((el, i) => {
                el.classList.toggle('launcher-item-selected', i === mosaic.launcher.state.selectedIndex);
            });

            mosaic.launcher.navigation.scrollSelectedIntoView();
        },

        // ╭──────────────────────────────────────────────────╮
        // │       scroll selected item into view             │
        // ╰──────────────────────────────────────────────────╯
        scrollSelectedIntoView() {
            const container = document.getElementById('launcher-items');
            const selected  = container?.querySelector('.launcher-item-selected');
            if (selected) selected.scrollIntoView({ block: 'nearest' });
        },

    },

    actions: {
        // ╭──────────────────────────────────────────────────╮
        // │       execute (select) the current item          │
        // ╰──────────────────────────────────────────────────╯
        executeSelectedItem() {
            if (mosaic.launcher.state.filteredItems.length === 0) return;

            const item = mosaic.launcher.state.filteredItems[mosaic.launcher.state.selectedIndex];
            if (!item) return;

            mosaic.con.log(`mosaic.launcher.actions.executeSelectedItem()`, item );

            // return clean item (strip internal props)
            const { _highlights, _score, _originalIndex, ...cleanItem } = item;

            mosaic.respond({
                success:        true,
                type:           'launcher',
                button_clicked: { label: 'select', value: 'select' },
                data:           { ...cleanItem, index: _originalIndex }
            });
        },

    },

    icons: {

        /** @private default fallback icon */
        defaultIcon: 'fa-circle-dot',

        /** @private keyword → icon mapping (checked against label + description) */
        keywords: [
            { keywords: ['add', 'new', 'create', 'plus'],                              icon: 'fa-plus' },
            { keywords: ['edit', 'update', 'modify', 'change'],                        icon: 'fa-pen' },
            { keywords: ['delete', 'remove', 'trash'],                                 icon: 'fa-trash' },
            { keywords: ['search', 'find', 'lookup'],                                  icon: 'fa-magnifying-glass' },
            { keywords: ['email', 'mail', 'send'],                                     icon: 'fa-envelope' },
            { keywords: ['call', 'phone', 'dial'],                                     icon: 'fa-phone' },
            { keywords: ['upload'],                                                    icon: 'fa-upload' },
            { keywords: ['download'],                                                  icon: 'fa-download' },
            { keywords: ['print'],                                                     icon: 'fa-print' },
            { keywords: ['report', 'chart', 'analytics'],                              icon: 'fa-chart-bar' },
            { keywords: ['table'],                                                     icon: 'fa-table-cells' },
            { keywords: ['message'],                                                   icon: 'fa-message' },
            { keywords: ['util', 'tool'],                                              icon: 'fa-wrench' },
            { keywords: ['form', 'survey'],                                            icon: 'fa-square-poll-horizontal' },
            { keywords: ['setting', 'config', 'gear', 'preference'],                   icon: 'fa-gear' },
            { keywords: ['user', 'contact', 'person', 'profile'],                      icon: 'fa-user' },
            { keywords: ['calendar', 'schedule', 'event', 'appointment', 'date'],      icon: 'fa-calendar' },
            { keywords: ['number'],                                                    icon: 'fa-hashtag' },
            { keywords: ['note', 'comment', 'memo'],                                   icon: 'fa-note-sticky' },
            { keywords: ['link', 'url', 'website'],                                    icon: 'fa-link' },
            { keywords: ['copy', 'duplicate', 'clone'],                                icon: 'fa-copy' },
            { keywords: ['save'],                                                      icon: 'fa-floppy-disk' },
            { keywords: ['refresh', 'reload', 'sync'],                                 icon: 'fa-rotate' },
            { keywords: ['lock', 'secure'],                                            icon: 'fa-lock' },
            { keywords: ['share'],                                                     icon: 'fa-share-nodes' },
            { keywords: ['money', 'payment', 'invoice', 'billing', 'dollar', 'price'], icon: 'fa-dollar-sign' },
            { keywords: ['home', 'dashboard'],                                         icon: 'fa-house' },
            { keywords: ['list', 'queue', 'workflow', 'multiselect', 'picklist'],      icon: 'fa-list' },
            { keywords: ['tag', 'label', 'category'],                                  icon: 'fa-tag' },
            { keywords: ['clock', 'time', 'history'],                                  icon: 'fa-clock' },
            { keywords: ['map', 'location', 'address'],                                icon: 'fa-location-dot' },
            { keywords: ['image', 'photo', 'picture'],                                 icon: 'fa-image' },
            { keywords: ['pdf'],                                                       icon: 'fa-file-pdf' },
            { keywords: ['excel', 'spreadsheet', 'csv'],                               icon: 'fa-file-excel' },
            { keywords: ['file', 'document', 'attachment'],                            icon: 'fa-file' },
            { keywords: ['folder', 'directory'],                                       icon: 'fa-folder' },
            { keywords: ['approve', 'accept', 'confirm', 'checkbox', 'radio'],         icon: 'fa-circle-check' },
            { keywords: ['reject', 'deny', 'decline'],                                 icon: 'fa-xmark' },
            { keywords: ['warning', 'alert', 'caution'],                               icon: 'fa-triangle-exclamation' },
            { keywords: ['info', 'about', 'help'],                                     icon: 'fa-circle-info' },
            { keywords: ['view', 'preview', 'open', 'show'],                           icon: 'fa-eye' },
            { keywords: ['close', 'exit', 'dismiss'],                                  icon: 'fa-xmark' },
            { keywords: ['log', 'audit', 'activity'],                                  icon: 'fa-clock-rotate-left' },
            { keywords: ['convert', 'transform'],                                      icon: 'fa-right-left' },
            { keywords: ['merge', 'combine'],                                          icon: 'fa-code-merge' },
            { keywords: ['split', 'separate'],                                         icon: 'fa-scissors' },
            { keywords: ['export'],                                                    icon: 'fa-file-export' },
            { keywords: ['import'],                                                    icon: 'fa-file-import' },
            { keywords: ['sort', 'order', 'arrange'],                                  icon: 'fa-arrow-down-a-z' },
            { keywords: ['filter'],                                                    icon: 'fa-filter' },
            { keywords: ['archive'],                                                   icon: 'fa-box-archive' },
            { keywords: ['notification', 'bell', 'remind'],                            icon: 'fa-bell' },
            { keywords: ['star', 'favorite', 'bookmark'],                              icon: 'fa-star' }
        ],

        // ╭──────────────────────────────────────────────────╮
        // │     resolve icon from item label/description     │
        // ╰──────────────────────────────────────────────────╯
        /** @private */
        resolve(item) {
            const text = `${item.display_value  || ''} ${item.description || ''}`.toLowerCase();

            for (const entry of mosaic.launcher.icons.keywords) {
                if (entry.keywords.some(kw => text.includes(kw))) return entry.icon;
            }

            return mosaic.launcher.icons.defaultIcon;
        },

        // ╭──────────────────────────────────────────────────╮
        // │         resolve status_color to render info      │
        // ╰──────────────────────────────────────────────────╯
        /** @private */
        resolveStatusColor(value) {
            if (typeof value !== 'string') return null;
            const named = ['info', 'success', 'warning', 'error', 'question'];
            if (named.includes(value)) return { type: 'class', value: `launcher-dot--${value}` };
            const hex = value.replace(/^#/, '');
            if (/^[0-9a-f]{3}([0-9a-f]{3})?$/i.test(hex)) return { type: 'style', value: `background:#${hex}` };
            return null;
        },

    },

    events: {
        // ╭──────────────────────────────────────────────────╮
        // │          setup all event listeners               │
        // ╰──────────────────────────────────────────────────╯
        setup() {
            const searchInput    = document.getElementById('launcher-search');
            const itemsContainer = document.getElementById('launcher-items');

            // ── search input: filter on input ────────────────────────
            searchInput?.addEventListener('input', () => {
                mosaic.launcher.search.filter(searchInput.value);
            });

            // ── item click ───────────────────────────────────────────
            itemsContainer?.addEventListener('click', (e) => {
                const itemEl = e.target.closest('.launcher-item');
                if (!itemEl) return;

                const index = parseInt(itemEl.dataset.index);
                if (!isNaN(index)) {
                    mosaic.launcher.state.selectedIndex = index;
                    mosaic.launcher.actions.executeSelectedItem();
                }
            });

            // ── item hover ───────────────────────────────────────────
            itemsContainer?.addEventListener('mousemove', (e) => {
                const itemEl = e.target.closest('.launcher-item');
                if (!itemEl) return;

                const index = parseInt(itemEl.dataset.index);
                if (!isNaN(index) && index !== mosaic.launcher.state.selectedIndex) {
                    mosaic.launcher.state.selectedIndex = index;
                    mosaic.launcher.navigation.updateSelection();
                }
            });

            // ── item mouseleave: deselect ────────────────────────────
            itemsContainer?.addEventListener('mouseleave', () => {
                mosaic.launcher.state.selectedIndex = -1;
                mosaic.launcher.navigation.updateSelection();
            });

            // ── keyboard navigation ──────────────────────────────────
            document.addEventListener('keydown', (e) => {
                const { key } = e;

                // ── when search input is focused ─────────────────────
                if (mosaic.launcher.state.showSearch && e.target.id === 'launcher-search') {
                    switch (key) {
                        case 'ArrowDown':
                            e.preventDefault();
                            searchInput.blur();
                            mosaic.launcher.navigation.navigate(1);
                            break;
                        case 'ArrowUp':
                            e.preventDefault();
                            searchInput.blur();
                            mosaic.launcher.navigation.navigate(-1);
                            break;
                        case 'Enter':
                            e.preventDefault();
                            mosaic.launcher.actions.executeSelectedItem();
                            break;
                    }
                    return;
                }

                // ── when items list has focus ─────────────────────────
                switch (key) {
                    case 'ArrowDown':
                        e.preventDefault();
                        mosaic.launcher.navigation.navigate(1);
                        break;
                    case 'ArrowUp':
                        e.preventDefault();
                        mosaic.launcher.navigation.navigate(-1);
                        break;
                    case 'Enter':
                        e.preventDefault();
                        mosaic.launcher.actions.executeSelectedItem();
                        break;
                    case 'Home':
                        e.preventDefault();
                        mosaic.launcher.navigation.select(0);
                        break;
                    case 'End':
                        e.preventDefault();
                        mosaic.launcher.navigation.select(mosaic.launcher.state.filteredItems.length - 1);
                        break;
                    case '/':
                    case ' ':
                        if (mosaic.launcher.state.showSearch && searchInput) {
                            e.preventDefault();
                            searchInput.focus();
                            if (key !== ' ') {
                                searchInput.value = key;
                                mosaic.launcher.search.filter(searchInput.value);
                            }
                        }
                        break;
                    default:
                        if (mosaic.launcher.state.showSearch && searchInput && key.length === 1 && /[a-zA-Z0-9]/.test(key)) {
                            e.preventDefault();
                            searchInput.focus();
                            searchInput.value = key;
                            mosaic.launcher.search.filter(searchInput.value);
                        }
                        break;
                }
            });
        },

    },
};
