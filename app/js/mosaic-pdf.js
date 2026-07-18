/**
 * ════════════════════════════════════════════════════════════════════════
 *  mosaic.pdf - PDF viewer, filler, and merge module
 * ════════════════════════════════════════════════════════════════════════
 *
 * Viewer modes:
 *   preview  - render PDF in an iframe with configurable buttons
 *   download - resolve source, trigger browser download, close widget
 *   merge    - resolve multiple sources, merge via pdf-lib, download, close widget
 *   fill     - resolve source, fill fields via pdf-lib, download, close widget
 */

mosaic.pdf = {

    /** @private transient session state (cleared on close) */
    state: {
        blobUrl:       null,
        currentBlob:   null,
        currentBase64: null,
        hasDownloaded: false,
        hasPrinted:    false,

        reset() {
            this.currentBlob   = null;
            this.currentBase64 = null;
            this.hasDownloaded = false;
            this.hasPrinted    = false;
        },

        revokeBlobUrl() {
            if (this.blobUrl) {
                URL.revokeObjectURL(this.blobUrl);
                this.blobUrl = null;
            }
        },
    },

    builder: {
        async build() {
            const config = mosaic.config;
            const mode   = config.mode || 'preview';

            mosaic.pdf.builder.applyBodyLayout();

            switch (mode) {
                case 'fill':     return mosaic.pdf.builder.fill(config);
                case 'download': return mosaic.pdf.builder.download(config);
                case 'merge':    return mosaic.pdf.builder.merge(config);
                case 'preview':
                default:         return mosaic.pdf.builder.preview(config);
            }
        },

        applyBodyLayout() {
            const wrapper = document.querySelector('.widget-wrapper');
            if (wrapper) wrapper.style.display = 'none';

            document.body.style.height        = '100vh';
            document.body.style.display       = 'flex';
            document.body.style.flexDirection = 'column';
            document.body.style.overflow      = 'hidden';
            document.body.style.margin        = '0';
        },

        /**
         * Headless PDF filler pipeline.
         * Resolves a template, fills form fields via pdf-lib, downloads the result, and closes.
         */
        async fill(config) {
            const source         = config.source;
            const fields         = config.fields;
            const outputFilename = config.filename;
            const removePages    = config.remove_pages ?? [];
            const flatten        = config.flatten;

            if (!fields || !source || !outputFilename) {
                mosaic.ui.errors.show('PDF filler requires source, fields, and filename.');
                return;
            }

            if (typeof source === 'string') {
                mosaic.ui.errors.show('pdffiller: source must be an object (e.g. { type: "workdrive", id: "..." }), not a string.');
                return;
            }

            mosaic.ui.bodyLoader.show('Generating PDF...');

            try {
                await mosaic.util.libs.load('pdfLib');

                const blob           = await mosaic.pdf.sources.resolve(config);
                const templateBase64 = await mosaic.pdf.sources.blobToBase64(blob);
                const filledBlob     = await mosaic.pdf.filler.generate(fields, templateBase64, removePages, flatten);

                if (!filledBlob) {
                    setTimeout(() => mosaic.pdf.actions.close(false, 'fill'), 3000);
                    return;
                }

                const base64Data = await mosaic.pdf.sources.blobToBase64(filledBlob);
                if (!config.skip_download) {
                    mosaic.api.files.downloadBlob(filledBlob, `${mosaic.util.file.stripExtension(outputFilename)}.pdf`);
                    setTimeout(() => {
                        mosaic.pdf.actions.close(true, 'fill', { downloaded: true, base64: base64Data });
                    }, 1000);
                } else {
                    mosaic.pdf.actions.close(true, 'fill', { downloaded: false, base64: base64Data });
                }

            } catch (error) {
                const message = mosaic.api.errors.formatZrcError
                    ? mosaic.api.errors.formatZrcError(error, 'PDF generation failed')
                    : error.message || 'PDF generation failed';
                mosaic.con.err('mosaic.pdf.builder.fill() |', message);
                mosaic.ui.errors.show(message);
                setTimeout(() => mosaic.pdf.actions.close(false, 'fill'), 3000);
            }
        },

        async preview(config) {
            const title   = config.title || config.filename || '';
            const buttons = config.buttons || ['Close', 'Download'];

            const button_html = mosaic.ui.buttons.build(
                buttons,
                "mosaic.handlers.submit.pdf('${buttonText}', '${value}')",
                ''
            );

            document.body.innerHTML = `
                <div class="pdf-header">
                    ${title ? `<div class="pdf-title">${mosaic.util.string.escapeHtml(title)}</div>` : ''}
                    <div class="pdf-actions">${button_html}</div>
                </div>
                <div class="pdf-content" id="pdfContent">
                    <div class="pdf-loading">Loading PDF...</div>
                </div>`;

            try {
                const blob = mosaic.pdf.state.currentBlob || await mosaic.pdf.sources.resolve(config);
                mosaic.pdf.state.currentBlob   = blob;
                mosaic.pdf.state.currentBase64 = await mosaic.pdf.sources.blobToBase64(blob);
                mosaic.pdf.render.displayPdf(blob);
            } catch (error) {
                const formatted = mosaic.api.errors.formatZrcError(error, 'Failed to load PDF');
                mosaic.con.err('mosaic.pdf.builder.preview() | Error', formatted);
                mosaic.ui.errors.show(formatted, document.getElementById('pdfContent'));
            }
        },

        async download(config) {
            mosaic.ui.bodyLoader.show('Downloading PDF...');

            try {
                const blob     = await mosaic.pdf.sources.resolve(config);
                const filename = config.filename || 'document.pdf';
                mosaic.api.files.downloadBlob(blob, filename);
                const base64Data = await mosaic.pdf.sources.blobToBase64(blob);
                mosaic.pdf.actions.close(true, 'download', { downloaded: true, base64: base64Data });
            } catch (error) {
                const formatted = mosaic.api.errors.formatZrcError(error, 'PDF download failed');
                mosaic.con.err('mosaic.pdf.builder.download() |', formatted);
                mosaic.ui.errors.show(formatted);
            }
        },

        /**
         * Merge multiple PDF sources into a single document.
         *
         * config.sources - array of source objects, each extending standard source types with optional `pages`.
         */
        async merge(config) {
            const sources = config.sources;

            if (!sources || !Array.isArray(sources) || sources.length === 0) {
                mosaic.ui.errors.show('Merge mode requires a sources array with at least one entry.');
                return;
            }

            mosaic.ui.bodyLoader.show(`Merging ${sources.length} document${sources.length > 1 ? 's' : ''}...`);

            try {
                const blob       = await mosaic.pdf.merge.sources(config, sources);
                const filename   = config.filename || 'merged.pdf';
                const base64Data = await mosaic.pdf.sources.blobToBase64(blob);
                if (!config.skip_download) mosaic.api.files.downloadBlob(blob, `${mosaic.util.file.stripExtension(filename)}.pdf`);
                mosaic.pdf.actions.close(true, 'merge', { downloaded: !config.skip_download, base64: base64Data });
            } catch (error) {
                const formatted = mosaic.api.errors.formatZrcError(error, 'PDF merge failed');
                mosaic.con.err('mosaic.pdf.builder.merge() |', formatted);
                mosaic.ui.errors.show(formatted);
            }
        },
    },

    render: {
        displayPdf(blob) {
            const container = document.getElementById('pdfContent');
            if (!container) return;
            
            mosaic.pdf.state.revokeBlobUrl();
            mosaic.pdf.state.blobUrl = URL.createObjectURL(blob);

            // hide the built-in pdf viewer toolbar in chromium-based browsers
            const showToolbar = mosaic.config?.show_toolbar === true;
            const src = `${mosaic.pdf.state.blobUrl}${!showToolbar ? '#toolbar=0&navpanes=0' : ''}`;
            container.innerHTML = `<iframe class="pdf-iframe" src="${src}" type="application/pdf"></iframe>`;
            mosaic.con.log('mosaic.pdf.render.displayPdf() | Rendered successfully');
        },
    },

    sources: {
        /**
         * Resolve a PDF source to a Blob.
         *
         * Accepts either an object with a `type` key or a legacy string:
         *   - Object: { type: 'workdrive', id } | { type: 'url', url } | { type: 'base64', content } | { type: 'html', content, connection? }
         *   - String: WorkDrive resource ID or raw base64 string
         */
        async resolve(config, sourceOverride) {
            let source = sourceOverride || config.source;

            if (!source) throw new Error('No PDF source configured.');

            if (typeof source === 'string') {
                if (mosaic.util.is.workDriveId(source)) {
                    source = { type: 'workdrive', id: source };
                } else if (mosaic.pdf.sources.isRawBase64(source)) {
                    source = { type: 'base64', content: source };
                } else {
                    throw new Error('Could not resolve string source. Pass a WorkDrive resource ID or raw base64 string.');
                }
            }

            switch (source.type) {
                case 'workdrive': {
                    const conn = source.connection || config.workdrive_connection;
                    if (!conn) throw new Error('WorkDrive source requires workdrive_connection.');
                    if (!source.id) throw new Error('WorkDrive source requires a resource id.');
                    mosaic.con.log(`mosaic.pdf.sources.resolve() | Downloading from WorkDrive: ${source.id}`);
                    return mosaic.api.workdrive.download(source.id, null, conn);
                }

                case 'url': {
                    if (!source.url) throw new Error('URL source requires a url.');
                    mosaic.con.log(`mosaic.pdf.sources.resolve() | Fetching URL: ${source.url}`);
                    const response = await fetch(source.url);
                    if (!response.ok) throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
                    return response.blob();
                }

                case 'base64': {
                    if (!source.content) throw new Error('Base64 source requires content.');
                    mosaic.con.log('mosaic.pdf.sources.resolve() | Decoding base64 source');
                    const binary = atob(source.content.trim());
                    const bytes  = Uint8Array.from(binary, c => c.charCodeAt(0));
                    return new Blob([bytes], { type: 'application/pdf' });
                }

                case 'html': {
                    if (!source.content) throw new Error('HTML source requires content.');
                    const conn = source.connection || config.writer_connection;
                    if (!conn) throw new Error('HTML source requires writer_connection.');
                    const processed  = mosaic.util.string.processHtml(source.content);
                    const clean_name = mosaic.util.file.stripExtension(source.filename || config.filename || 'document');
                    mosaic.con.log(`mosaic.pdf.sources.resolve() | Converting HTML to PDF: ${clean_name} | Connection: ${conn}`);
                    return mosaic.api.writer.html2pdf(processed, clean_name, conn);
                }

                default:
                    throw new Error(`Unknown PDF source type: "${source.type}"`);
            }
        },

        isRawBase64(value) {
            if (typeof value !== 'string' || value.length < 1000) return false;
            const stripped = value.replace(/\s/g, '');
            return stripped.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(stripped);
        },

        blobToBase64(blob) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64 = reader.result.split(',')[1];
                    resolve(base64);
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        },
    },

    merge: {
        /**
         * @param {Object}   config  - widget config for connection fallbacks
         * @param {Object[]} sources - array of source objects with optional `pages` key
         * @returns {Promise<Blob>} merged PDF blob
         */
        async sources(config, sources) {
            await mosaic.util.libs.load('pdfLib');
            const { PDFDocument } = PDFLib;

            const mergedDoc = await PDFDocument.create();

            for (let i = 0; i < sources.length; i++) {
                const src = sources[i];
                mosaic.con.log(`mosaic.pdf.merge.sources() | Processing source ${i + 1}/${sources.length}: ${src.type}`);

                const blob   = await mosaic.pdf.sources.resolve(config, src);
                const buffer = await blob.arrayBuffer();
                const srcDoc = await PDFDocument.load(new Uint8Array(buffer));

                const total_pages  = srcDoc.getPageCount();
                const page_indices = src.pages
                    ? mosaic.pdf.merge.parsePages(src.pages, total_pages)
                    : Array.from({ length: total_pages }, (_, i) => i);

                mosaic.con.log(`mosaic.pdf.merge.sources() | Source ${i + 1}: ${page_indices.length}/${total_pages} pages`);

                const copiedPages = await mergedDoc.copyPages(srcDoc, page_indices);
                copiedPages.forEach(page => mergedDoc.addPage(page));
            }

            mosaic.con.log(`mosaic.pdf.merge.sources() | Merge complete: ${mergedDoc.getPageCount()} total pages`);
            return new Blob([await mergedDoc.save()], { type: 'application/pdf' });
        },

        /**
         * Parse a page range string into 0-based page indices.
         *
         * Supports: '1-3', '2,5-8', '3', and open-ended ranges like '5-'.
         */
        parsePages(rangeStr, totalPages) {
            const indices = new Set();

            String(rangeStr).split(',').forEach(part => {
                const trimmed = part.trim();
                if (!trimmed) return;

                if (trimmed.includes('-')) {
                    const [startStr, endStr] = trimmed.split('-', 2);
                    const start = parseInt(startStr, 10) || 1;
                    const end   = endStr === '' || endStr === undefined
                        ? totalPages
                        : parseInt(endStr, 10) || totalPages;

                    for (let p = Math.max(1, start); p <= Math.min(totalPages, end); p++) {
                        indices.add(p - 1);
                    }
                } else {
                    const p = parseInt(trimmed, 10);
                    if (p >= 1 && p <= totalPages) indices.add(p - 1);
                }
            });

            return [...indices].sort((a, b) => a - b);
        },
    },

    downloads: {
        async current() {
            const config   = mosaic.config;
            const filename = config.filename || 'document.pdf';

            try {
                mosaic.ui.bodyLoader.show('Preparing download...');
                const blob = mosaic.pdf.state.currentBlob || await mosaic.pdf.sources.resolve(config);
                mosaic.pdf.state.hasDownloaded = true;
                mosaic.api.files.downloadBlob(blob, filename);
            } catch (error) {
                const formatted = mosaic.api.errors.formatZrcError(error, 'PDF download failed');
                mosaic.con.err('mosaic.pdf.downloads.current() |', formatted);
                mosaic.ui.host.splash.show(formatted, 'error');
            }

            await mosaic.pdf.builder.build();
        },

        /**
         * Public helper for external modules to convert a source to PDF and trigger a browser download.
         */
        async convertAndDownload(source, filename) {
            const clean_name = mosaic.util.file.stripExtension(filename || 'document');
            const config     = mosaic.config;

            const blob   = await mosaic.pdf.sources.resolve(config, source);
            const base64 = await mosaic.pdf.sources.blobToBase64(blob);
            mosaic.api.files.downloadBlob(blob, `${clean_name}.pdf`);

            return { blob, base64 };
        },
    },

    filler: {
        /**
         * Fill a PDF form from a base64 template and return the flattened/unflattened result as a Blob.
         *
         * @param {Array<{field: string, value: string|boolean}>} fields - Fields to fill
         * @param {string} templateBase64 - Base64-encoded fillable PDF
         * @param {Boolean} flatten - Whether we should flatten the PDF or not
         * @returns {Promise<Blob|null>} Filled PDF blob, or null on failure
         */
        async generate(fields, templateBase64, removePages, flatten) {
            try {
                const { PDFDocument, PDFCheckBox, PDFRadioGroup, PDFDropdown } = PDFLib;

                const pdfBytes = Uint8Array.from(atob(templateBase64), c => c.charCodeAt(0));
                const pdfDoc   = await PDFDocument.load(pdfBytes);
                const form     = pdfDoc.getForm();

                for (const { field: fieldName, value } of fields) {
                    let pdfField;

                    try {
                        pdfField = form.getField(fieldName);
                    } catch {
                        mosaic.con.warn(`mosaic.pdf.filler.generate() | Field "${fieldName}" not found - skipping`);
                        continue;
                    }

                    try {
                        if (pdfField instanceof PDFCheckBox) {
                            value === true ? pdfField.check() : pdfField.uncheck();
                        } else if (pdfField instanceof PDFRadioGroup || pdfField instanceof PDFDropdown) {
                            if (!value && value !== 0) {
                                mosaic.con.warn(`mosaic.pdf.filler.generate() | Field "${fieldName}" is a choice field but received empty value - skipping`);
                                continue;
                            }
                            pdfField.select(String(value));
                        } else {
                            pdfField.setText(String(value ?? ''));
                        }
                    } catch (fieldError) {
                        const allowed = pdfField.getOptions ? pdfField.getOptions().join(', ') : 'unknown';
                        throw new Error(
                            `Field: ${fieldName} | ` +
                            `Value: "${value}" | ` +
                            `Allowed: [${allowed}] | ` +
                            `Error: ${fieldError.message}`
                        );
                    }
                }

                if (removePages?.length) [...removePages].sort((a, b) => b - a).forEach(page => pdfDoc.removePage(page - 1));

                mosaic.con.debug('mosaic.pdf.filler.generate()', `Generating ${flatten ? 'flattened' : 'unflattened'} PDF...`);
                flatten && form.flatten();
                return new Blob([await pdfDoc.save()], { type: 'application/pdf' });

            } catch (error) {
                mosaic.con.err('mosaic.pdf.filler.generate() | Error:', error);
                mosaic.ui.errors.show(`PDF generation error: ${error.message}`);
                return null;
            }
        },
    },

    actions: {
        close(success, button_clicked, extra = {}) {
            mosaic.pdf.state.revokeBlobUrl();

            const { value, ...dataExtra } = extra;
            const finalData = {
                base64:     mosaic.pdf.state.currentBase64,
                downloaded: mosaic.pdf.state.hasDownloaded,
                printed:    mosaic.pdf.state.hasPrinted,
                ...dataExtra
            };

            mosaic.pdf.state.reset();

            const label = button_clicked || '';
            mosaic.respond({
                success,
                cancelled:      !success,
                type:           'pdf',
                button_clicked: { label, value: value ?? label },
                data:           finalData
            });
        },
    },
};
