/**
 * ════════════════════════════════════════════════════════════════════════
 *  mosaic.relatedlist - related list widget mode module
 * ════════════════════════════════════════════════════════════════════════
 *  NOTE: this module is intentionally a template - it is not dead code
 * 
 *  only `lifecycle.init()` and `lifecycle.postinit()` are live
 * 
 *  the commented block below (config / builder / data / columns)
 *  is a worked example you adapt to your own related list
 */

mosaic.relatedlist = {

    lifecycle: {
        // ╭─────────────────────────────────────────────────────────╮ 
        // │                    related list init                    │ 
        // │   called early in mosaic.init() before theme/ui setup   │ 
        // ╰─────────────────────────────────────────────────────────╯ 
        async init(data) {
            mosaic.config = {};
            mosaic.con.log(`mosaic.relatedlist.lifecycle.init() | Related list mode active`, mosaic.context, data);

            // ════════════════════════════════════════════════════════════════════════
            //  example usage
            // ════════════════════════════════════════════════════════════════════════

            // mosaic.relatedlist.config.applyDefaults();
            // await mosaic.relatedlist.builder.build();
        },

        // ╭──────────────────────────────────────────────────╮ 
        // │    post init - called after ui.buildWidget()     │ 
        // ╰──────────────────────────────────────────────────╯ 
        async postInit() {
            document.body.classList.add('is-related-list');
            const readyPromise = mosaic.ui.readiness.buildPromise();
            await mosaic.ui.readiness.wait(readyPromise);
            await mosaic.ui.viewport.fitToContent();
        },
    },

    // █▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀█ 
    // █             example usage - replace definitions as needed              █ 
    // █▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄█ 

/**
    config: {
        defaults() {
            return {
                debug:           true,
                force_focus:     false,
                show_search:     false,
                selectable:      false,
                allow_multiple:  false,
                show_buttons:    false,
                allow_export:    false,
                close_on_escape: false,
                per_page:        10,
                overrides:       {
                    // date_format_display,
                    // date_format_return,
                    // time_format_display,
                    // time_format_return,
                    // phone_country_code,
                    // phone_format_display,
                    // phone_format_return,
                    // api_domain,
                    // org_domain_name,
                    // deployment, theme
                }
            };
        },

        applyDefaults() {
            mosaic.config               = { ...mosaic.config, ...mosaic.relatedlist.config.defaults() };
            mosaic.flags.debug          = mosaic.config.debug === true;
            mosaic.flags.enableMarkdown = mosaic.config.enable_markdown === true;
            mosaic.overrides            = Object.freeze(mosaic.core.config.normalizeOverrides(mosaic.config.overrides || {}));
            mosaic.con.log(`mosaic.relatedlist.config.applyDefaults() | Related list config:`, mosaic.config);
            return mosaic.config;
        },
    },

    builder: {
        async build() {
            mosaic.context.record ??= await mosaic.relatedlist.data.currentRecord();
            mosaic.con.log(`mosaic.relatedlist.builder.build() | Current record`, mosaic.context.record);

            Object.assign(mosaic.config, await mosaic.relatedlist.builder.tableConfig());

            mosaic.con.log(`mosaic.relatedlist.builder.build() | Related records`, mosaic.config.source.data);
            return mosaic.config;
        },

        async tableConfig(options = {}) {
            const relatedList = options.relatedList || 'Deals';
            const columns = options.columns || mosaic.relatedlist.columns.deals();

            return {
                type: 'table',
                source:  {
                    type: 'static',
                    data: await mosaic.relatedlist.data.relatedRecords(mosaic.context.entityApiName, relatedList)
                },
                columns
            };
        },
    },

    data: {
        async currentRecord() {
            return mosaic.context.record || await mosaic.api.crm.getCurrentRecord();
        },

        async relatedRecords(entityApiName = mosaic.context.entityApiName, relatedList = 'Deals') {
            return mosaic.api.crm.getRelatedRecords(entityApiName, relatedList);
        },
    },

    columns: {
        deals() {
            return [
                { key: 'Deal_Name', header: 'Deal Name', link: { module: 'Deals', id_key: 'id' } },
                { key: 'Effective_Date', header: 'Effective Date', format: { type: 'date' } },
                { key: 'Inactive_Date', header: 'Inactive Date', format: { type: 'date' } },
                { key: 'Policy_Number', header: 'Policy Number' },
                { key: 'Amount', header: 'Premium', format: { type: 'currency', currency: 'USD', min_decimals: 2, max_decimals: 2 } },
                { key: 'Owner.name', header: 'Deal Owner' },
                { key: 'Stage', header: 'Stage' },
                { key: 'Agency', header: 'Agency' }
            ];
        },
    },
*/

};
