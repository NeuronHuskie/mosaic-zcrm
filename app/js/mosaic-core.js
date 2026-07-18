/**
 * ════════════════════════════════════════════════════════════════════════
 *  mosaic - modular zoho crm widget framework
 * ════════════════════════════════════════════════════════════════════════
 */

const mosaic = {

    version: '1.0.0',

    // ── mosaic namespaces ─────────────────────────────────────────────────
    theme: {},
    ui: {},
    form: {},
    table: {},
    html: {},
    pdf: {},
    launcher: {},
    api: {},
    storage: {},
    util: {},
    handlers: {},
    validators: {},
    conditions: {},
    flyout: {},
    relatedlist: {},

    // ── mosaic / zdk config ───────────────────────────────────────────────
    config: {},
    zdkConfig: {},

    // ── cache ─────────────────────────────────────────────────────────────
    cache: {
        orgInfo: null,
        orgInfoPromise: null,
        orgDomainName: null,
        crmModules: null,
        deployment: null,
        apiDomain: null,
        crmDomain: null,
        workDriveDownloadDomain: null,
        user: null,
        userPromise: null,
        phoneCountryCode: null,
        phoneDisplayFormat: null,
        phoneReturnFormat: null,
        userDateFormat: null,
        dateFormatPromise: null,
        userTheme: null,
        userThemePromise: null
    },

    // ── context ───────────────────────────────────────────────────────────
    context: {
        entity:        null,
        entityApiName: null,
        entityId:      null,
        isRelatedList: false,
        isFlyout:      false,
        isPopup:       false
    },

    // ── flags ─────────────────────────────────────────────────────────────
    flags: {
        debug: false,
        enableMarkdown: false
    },

    // ── runtime ───────────────────────────────────────────────────────────
    runtime: {
        form: {
            flatFields: []
        },
        table: {
            currentPage: 1,
            hasMoreRecords: false,
            sourceData: []
        },
        flyout: {
            enabled: false,
            requestId: null,
            responded: false
        }
    },

    // ── overrides ─────────────────────────────────────────────────────────
    overrides: {
        /**
         *  supported overrides in widget config
         *
         *  - date_format_display   - format shown in date inputs e.g. 'MM/dd/yyyy' (default: $Crm.user.date_format)
         *  - date_format_return    - format in submitted data e.g. 'yyyy-MM-dd'
         *  - time_format_display   - format shown in time inputs e.g. 'h:mm AM/PM'
         *  - time_format_return    - format in submitted data e.g. 'HH:mm'
         *  - phone_country_code    - e.g. 'US' | 'GB'
         *  - phone_format_display  - e.g. '(###) ###-####'
         *  - phone_format_return   - 'E164' | 'national' | 'raw' | 'display' (default: 'E164')
         *  - api_domain            - e.g. 'https://www.zohoapis.eu'
         *  - org_domain_name       - e.g. 'yourcompanyname' (default: $Crm.org.domain_name)
         *  - deployment            - e.g. 'US' (default: $Crm.deployment)
         *  - theme                 - 'light' | 'dark'
         *
         */
    },

    // ── ui state ──────────────────────────────────────────────────────────
    uiState: {
        themeInitialized: false,
        statusMessageEl: null
    },

    // ── external library registry ─────────────────────────────────────────
    // urls are version-pinned with subresource integrity hashes - bumping a
    // library version requires updating its sha512 hash to match
    libs: {
        registry: Object.freeze({
            pdfLib: {
                url:       'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js',
                integrity: 'sha512-z8IYLHO8bTgFqj+yrPyIJnzBDf7DDhWwiEsk4sY+Oe6J2M+WQequeGS7qioI5vT6rXgVRb4K1UVQC5ER7MKzKQ=='
            },
            xlsx: {
                url:       'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
                integrity: 'sha512-r22gChDnGvBylk90+2e/ycr3RVrDi8DIOkIGNhJlKfuyQM4tIRAI062MaV8sfjQKYVGjOBaZBOA87z+IhZE9DA=='
            },
            jspdf: {
                url:       'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
                integrity: 'sha512-qZvrmS2ekKPF2mSznTQsxqPgnpkI4DNTlrdUmTzrDgektczlKNRRhy5X5AAOnx5S09ydFYWWNSfcEqDTTHgtNA=='
            },
            jspdfTable: {
                url:       'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js',
                integrity: 'sha512-/cZZTKETbsuutvNXdPji/z8N+9e+LHq9D60JhcBCigq9I5a2VDEcLzml8PdVlVqzmWlVbhZCuTx+9CTi2xb30A=='
            },
            marked: {
                url:       'https://cdnjs.cloudflare.com/ajax/libs/marked/9.1.6/marked.min.js',
                integrity: 'sha512-pmjEJQ7CveksANaAKdCJZMig7eAcCFFzE1b5XnlnxdB/vU3AOStJ5SF7w4tFuqskuU31ETnAaWTYRQOYg2WHKw=='
            },
        }),
        _promises: {}  // deduplication map - key → Promise (prevents double-injection)
    },

    // ── mosaic.core ───────────────────────────────────────────────────────
    core: {

        lifecycle: {
            // ╭──────────────────────────────────────────────────╮
            // │           initialize the mosaic widget           │
            // ╰──────────────────────────────────────────────────╯
            async init(data = {}) {
                const { _zdk_config = {}, debug = false, enable_markdown = false, ...config } = data; // pageload payload (mosaic config + zdk config)
                const isRelatedList = !!(data.related_list && data.Entity && data.EntityId);
                const isFlyout      = config.flyout === true;
                const isPopup       = !isRelatedList && !isFlyout;

                mosaic.zdkConfig = _zdk_config;
                mosaic.flags.debug = debug === true;
                mosaic.flags.enableMarkdown = enable_markdown === true;
                mosaic.overrides = Object.freeze(mosaic.core.config.normalizeOverrides(config.overrides || {}));
                mosaic.config = config;

                mosaic.context = {
                    entity:         data.module || null,
                    entityApiName:  data.Entity || null,
                    entityId:       data.record_id || data.EntityId || null,
                    isRelatedList,
                    isFlyout,
                    isPopup
                };

                // ── mode-specific early init ──────────────────────────────────────
                if (isRelatedList)  await mosaic.relatedlist.lifecycle.init(data);
                if (isFlyout)       mosaic.flyout.lifecycle.init(data, config);

                mosaic.con.groupCollapsed('mosaic.core.lifecycle.init() | Widget loaded with data (normalized)', {
                    data,
                    config: mosaic.config,
                    zdkConfig: mosaic.zdkConfig,
                    context: mosaic.context,
                    flags: mosaic.flags
                });

                // ── shared setup ──────────────────────────────────────────────────
                if (mosaic.flags.enableMarkdown) await mosaic.util.libs.initializeMarkedJs();
                await mosaic.theme.lifecycle.initialize();
                await mosaic.ui.widgets.build();

                setTimeout(() => mosaic.handlers.keyboard.setup(), 200);

                // ── mode-specific post init ───────────────────────────────────────
                if (isRelatedList) await mosaic.relatedlist.lifecycle.postInit();
                if (isFlyout)      mosaic.flyout.lifecycle.postInit();
            }
        },

        response: {
            // ╭──────────────────────────────────────────────────╮
            // │        universal respond / close function        │
            // ╰──────────────────────────────────────────────────╯
            send(response) {
                if (!mosaic.context.isFlyout) {
                    $Client.close(response);
                    return;
                }

                if (mosaic.runtime.flyout.responded) return;

                const requestId = mosaic.runtime.flyout.requestId;
                if (!requestId) {
                    mosaic.con.err('mosaic.core.response.send() | Missing flyout request id', response);
                    $Client.close(response);
                    return;
                }

                mosaic.runtime.flyout.responded = true;
                ZDK.Client.sendResponse(requestId, response);
                try { $Client.close(); } catch (_) {}
            }
        },

        config: {
            // ╭──────────────────────────────────────────────────╮ 
            // │            normalize mosaic overrides            │ 
            // ╰──────────────────────────────────────────────────╯ 
            normalizeOverrides(overrides = {}) {
                return {
                    dateFormatDisplay:  overrides.date_format_display,
                    dateFormatReturn:   overrides.date_format_return,
                    timeFormatDisplay:  overrides.time_format_display,
                    timeFormatReturn:   overrides.time_format_return,
                    phoneCountryCode:   overrides.phone_country_code,
                    phoneFormatDisplay: overrides.phone_format_display,
                    phoneFormatReturn:  overrides.phone_format_return,
                    apiDomain:          overrides.api_domain,
                    orgDomainName:      overrides.org_domain_name,
                    deployment:         overrides.deployment,
                    theme:              overrides.theme
                };
            }
        },

        // ╭──────────────────────────────────────────────────╮ 
        // │          console helper with debug gate          │ 
        // ╰──────────────────────────────────────────────────╯ 
        /**
         * Styled console logging utility
         * All methods are no-ops unless mosaic.flags.debug is true
         * (set via config.debug from the client script)
         */
        con: (() => {
            const snapshot = val => {
                if (val === null || typeof val !== 'object') return val;
                try { return JSON.parse(JSON.stringify(val)); }
                catch { return val; }
            };

            const gated = fn => function() {
                if (!mosaic.flags.debug) return;
                return fn.apply(this, arguments);
            };

            const noop = () => {};
            const bound = (method, color) => mosaic.flags.debug
                ? console[method].bind(console, '%c[MOSAIC]', `color: ${color}; font-weight: bold`)
                : noop;

            return Object.freeze({
                get log()   { return bound('log',   'dodgerblue'); },
                get warn()  { return bound('warn',  'orange'); },
                get err()   { return bound('error', 'tomato'); },
                get info()  { return bound('info',  'mediumseagreen'); },
                get debug() { return bound('debug', 'plum'); },

                table: gated((label, data) => {
                    console.group(`%c[MOSAIC] ${label}`, 'color: dodgerblue; font-weight: bold');
                    console.table(snapshot(data));
                    console.groupEnd();
                }),

                dir: gated((label, obj) => {
                    console.group(`%c[MOSAIC] ${label}`, 'color: violet; font-weight: bold');
                    console.dir(snapshot(obj));
                    console.groupEnd();
                }),

                groupCollapsed: gated((label, ...args) => {
                    console.groupCollapsed(`%c[MOSAIC] ${label}`, 'color: dodgerblue; font-weight: bold');
                    args.forEach(a => console.log(snapshot(a)));
                    console.groupEnd();
                }),

                groupStart: gated((label) => {
                    console.groupCollapsed(`%c[MOSAIC] ${label}`, 'color: dodgerblue; font-weight: bold');
                }),

                groupEnd: gated(() => {
                    console.groupEnd();
                }),

                assert: gated((condition, label, ...args) => {
                    if (!condition) console.assert(false, `[MOSAIC][ASSERT] ${label}`, ...args);
                }),

                trace: gated((label) => {
                    console.groupCollapsed(`%c[MOSAIC] ${label}`, 'color: gray; font-style: italic');
                    console.trace();
                    console.groupEnd();
                }),

                count:      gated(label => console.count(`[MOSAIC] ${label}`)),
                countReset: gated(label => console.countReset(`[MOSAIC] ${label}`)),

                time: gated((label, fn) => {
                    console.time(`[MOSAIC] ${label}`);
                    const result = fn();
                    console.timeEnd(`[MOSAIC] ${label}`);
                    return result;
                }),

                timeAsync: gated(async (label, fn) => {
                    console.time(`[MOSAIC] ${label}`);
                    const result = await fn();
                    console.timeEnd(`[MOSAIC] ${label}`);
                    return result;
                })
            });
        })()
    }

};

mosaic.init = (...args) => mosaic.core.lifecycle.init(...args);
mosaic.respond = (...args) => mosaic.core.response.send(...args);
mosaic._normalizeOverrides = (...args) => mosaic.core.config.normalizeOverrides(...args);
mosaic.con = mosaic.core.con;