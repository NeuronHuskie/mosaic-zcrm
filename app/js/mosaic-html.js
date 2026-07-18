/**
 * ════════════════════════════════════════════════════════════════════════
 *  mosaic.html - html preview and print module
 * ════════════════════════════════════════════════════════════════════════
 *
 *  modes:
 *      'preview'         - (default) render html with configurable buttons
 *      'print'           - show loader, open print dialog, close widget immediately
 *
 *  config keys:
 *      html              - raw html string to display/print
 *      filename          - optional filename (used for print title and pdf download)
 *      mode              - 'preview' | 'print'
 *      title             - widget title (header inside the popup)
 *      buttons           - button array, default ['Close', 'Print']
 *      content_theme     - 'content' (default) | 'widget' - 'content' isolates the html area
 *                          so the content's own CSS controls appearance; 'widget' inherits the
 *                          widget light/dark theme
 *      writer_connection - Zoho Writer connection name (for pdf download delegation)
 *
 *  notes:
 *      pdf conversion and download are delegated to mosaic.pdf via
 *      mosaic.pdf.downloads.convertAndDownload(). the html module no longer owns
 *      any pdf generation logic.
 *
 *      html decoding/unescaping is handled by mosaic.util.string.processHtml(),
 *      shared across both mosaic.html and mosaic.pdf.
 *
 */

mosaic.html = {

    state: {
        rawHtml: null,
        printWindow: null,
        currentBase64: null,
        hasDownloaded: false,
        hasPrinted: false,

        reset() {
            this.currentBase64 = null;
            this.hasDownloaded = false;
            this.hasPrinted    = false;
        }
    },

    builder: {
        async build() {
            const config   = mosaic.config;
            const html     = config.html || '';
            const mode     = config.mode || 'preview';
            const title    = config.title || '';
            const buttons  = config.buttons || ['Close', 'Print'];

            mosaic.html.render.applyBodyLayout();

            // print: loader -> print dialog -> close
            if (mode === 'print') {
                mosaic.ui.bodyLoader.show('Preparing print...');

                if (html) {
                    mosaic.html.state.rawHtml = mosaic.util.string.processHtml(html);
                    setTimeout(() => {
                        mosaic.html.print.openWindow();
                        mosaic.html.state.hasPrinted = true;
                        setTimeout(() => mosaic.html.actions.close(true, 'print'), 1000);
                    }, 500);
                } else {
                    mosaic.ui.errors.show('No HTML content provided.');
                }
                return;
            }

            mosaic.html.render.preview(html, title, buttons, config);
        }
    },

    render: {
        applyBodyLayout() {
            // bypass the standard mosaic container layout; the html viewer needs
            // body as a direct flex column.
            const wrapper = document.querySelector('.widget-wrapper');
            if (wrapper) wrapper.style.display = 'none';

            document.body.style.height        = '100vh';
            document.body.style.display       = 'flex';
            document.body.style.flexDirection = 'column';
            document.body.style.overflow      = 'hidden';
            document.body.style.margin        = '0';
        },

        preview(html, title, buttons, config) {
            const button_html = mosaic.ui.buttons.build(
                buttons,
                "mosaic.handlers.submit.html('${buttonText}', '${value}')",
                ''
            );

            const contentClass = config.content_theme === 'widget'
                ? 'html-content'
                : 'html-content html-content--raw';

            document.body.innerHTML = `
                <div class="html-header">
                    ${title ? `<div class="html-title">${mosaic.util.string.escapeHtml(title)}</div>` : ''}
                    <div class="html-actions">${button_html}</div>
                </div>
                <div class="${contentClass}" id="htmlContent">
                    <div class="html-loading">Loading preview...</div>
                </div>`;

            if (html) {
                this.displayHtml(html);
            } else {
                mosaic.ui.errors.show('No HTML content provided.', document.getElementById('htmlContent'));
            }
        },

        displayHtml(html) {
            const container = document.getElementById('htmlContent');
            if (!container) return;

            try {
                const processed = mosaic.util.string.processHtml(html);
                mosaic.html.state.rawHtml = processed;
                container.innerHTML = processed;
                mosaic.con.log(`mosaic.html.render.displayHtml() | Rendered successfully (length -> ${processed.length})`);
            } catch (error) {
                mosaic.con.err('mosaic.html.render.displayHtml() | Error:', error);
                mosaic.ui.errors.show('Error displaying HTML content: ' + error.message, container);
            }
        }
    },

    downloads: {
        /**
         * Convert the currently displayed HTML to PDF and trigger a browser download.
         * Delegates all PDF conversion logic to mosaic.pdf.downloads.convertAndDownload().
         */
        async asPdf() {
            const config = mosaic.config;

            if (!mosaic.html.state.rawHtml) {
                mosaic.con.err('mosaic.html.downloads.asPdf() | No HTML content available');
                mosaic.ui.host.splash.show('No HTML content to download.', 'error');
                return;
            }

            try {
                mosaic.ui.bodyLoader.show('Converting to PDF...');

                const source = {
                    type:       'html',
                    content:    mosaic.html.state.rawHtml,
                    connection: config.writer_connection
                };

                const result = await mosaic.pdf.downloads.convertAndDownload(source, config.filename);

                mosaic.html.state.hasDownloaded = true;
                mosaic.html.state.currentBase64 = result.base64;

                mosaic.con.log('mosaic.html.downloads.asPdf() | Download complete');
            } catch (error) {
                const formatted = mosaic.api.errors.formatZrcError(error, 'PDF conversion failed');
                mosaic.con.err('mosaic.html.downloads.asPdf() |', formatted);
                mosaic.ui.host.splash.show(formatted, 'error');
            }

            // re-render preview (loader overlay gets cleared)
            await mosaic.html.builder.build();
        }
    },

    print: {
        openWindow() {
            if (!mosaic.html.state.rawHtml) {
                mosaic.con.err('mosaic.html.print.openWindow() | No HTML content available');
                return;
            }

            const html_to_write = this.prepareHtml(mosaic.html.state.rawHtml);
            const print_window  = window.open('', '_blank');

            if (!print_window) {
                mosaic.con.err('mosaic.html.print.openWindow() | Popup blocked');
                mosaic.ui.host.splash.show('Popup blocked - please allow popups for this site.', 'error');
                return;
            }

            mosaic.html.state.printWindow = print_window;

            // parse into a real document and inject into the blank window
            const parser     = new DOMParser();
            const parsed_doc = parser.parseFromString(html_to_write, 'text/html');

            // ensure charset for unicode
            if (!parsed_doc.querySelector('meta[charset]')) {
                const meta = parsed_doc.createElement('meta');
                meta.setAttribute('charset', 'UTF-8');
                parsed_doc.head.prepend(meta);
            }

            print_window.document.replaceChild(
                print_window.document.importNode(parsed_doc.documentElement, true),
                print_window.document.documentElement
            );

            // trigger print after content settles
            let print_triggered = false;

            const trigger_print = () => {
                if (print_triggered) return;
                print_triggered = true;
                mosaic.con.log('mosaic.html.print.openWindow() | Triggering print');
                print_window.focus();
                print_window.print();
                print_window.onafterprint = () => print_window.close();
            };

            setTimeout(trigger_print, 500);
        },

        prepareHtml(html) {
            let output   = html;
            const config = mosaic.config;
            const filename = config.filename;

            if (!filename) return output;

            const clean_name = mosaic.util.string.escapeHtml(filename.replace(/\.pdf$/i, ''));
            mosaic.con.log('mosaic.html.print.prepareHtml() | Filename:', clean_name);

            if (/<title>.*?<\/title>/i.test(output)) {
                output = output.replace(/<title>.*?<\/title>/i, `<title>${clean_name}</title>`);
            } else if (/<head>/i.test(output)) {
                output = output.replace(/<head>/i, `<head><title>${clean_name}</title>`);
            } else {
                output = `<!DOCTYPE html><html><head><title>${clean_name}</title></head><body>${html}</body></html>`;
            }

            return output;
        }
    },

    actions: {
        close(success, button_clicked, extra = {}) {
            const { value, ...dataExtra } = extra;
            const finalData = {
                base64:     mosaic.html.state.currentBase64,
                downloaded: mosaic.html.state.hasDownloaded,
                printed:    mosaic.html.state.hasPrinted,
                ...dataExtra
            };

            mosaic.html.state.reset();

            const label = button_clicked || '';
            mosaic.respond({
                success,
                cancelled:      !success,
                type:           'html',
                button_clicked: { label, value: value ?? label },
                data:           finalData
            });
        }
    },
};
