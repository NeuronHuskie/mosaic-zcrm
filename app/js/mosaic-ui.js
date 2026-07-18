/**
 * ════════════════════════════════════════════════════════════════════════
 *  mosaic.ui - user interface utilities module
 * ════════════════════════════════════════════════════════════════════════
 */

mosaic.ui = {

    widgets: {
        async build() {
            const widgetType = mosaic.config.widget_type || mosaic.config.type;

            switch (widgetType) {
                case 'form':
                    await mosaic.form.builder.build();
                    break;
                case 'table':
                    await mosaic.table.builder.build();
                    break;
                case 'html':
                    await mosaic.html.builder.build();
                    break;
                case 'confirmation':
                    mosaic.ui.widgets.confirmation.build();
                    break;
                case 'message':
                    mosaic.ui.widgets.message.build();
                    break;
                case 'pdf':
                    await mosaic.pdf.builder.build();
                    break;
                case 'launcher':
                    await mosaic.launcher.builder.build();
                    break;
                default:
                    mosaic.con.warn(`mosaic.ui.widgets.build() | Unknown widget type: '${widgetType}'. Defaulting to 'message'.`);
                    mosaic.ui.widgets.message.build();
            }
        },

        message: {
            build() {
                const contentContainer = document.getElementById('contentContainer');
                const buttonContainer = document.getElementById('buttonContainer');
                mosaic.ui.container.resetBackground();

                const messageType = mosaic.config.message_type || 'info';
                const messageText = mosaic.config.message || '';
                const title = mosaic.config.title || '';
                const buttons = mosaic.config.buttons || ['OK'];
                const showButtons = mosaic.config.show_buttons !== false;
                const showIcon = mosaic.config.show_icon !== false;

                const iconMap = {
                    'success':  'fa-circle-check',
                    'error':    'fa-circle-xmark',
                    'warning':  'fa-triangle-exclamation',
                    'info':     'fa-circle-info',
                    'question': 'fa-circle-question'
                };

                const icon = iconMap[messageType] || iconMap.info;

                // support markdown if enabled
                const messageHtml = (mosaic.flags.enableMarkdown && typeof marked !== 'undefined')
                    ? marked.parse(messageText)
                    : `<p>${mosaic.util.string.escapeHtml(messageText)}</p>`;

                // use "message {type}" class structure to match css selectors in _messages.css
                contentContainer.innerHTML = `
                    <div class="message ${messageType}">
                        <div class="message-content">
                            <div class="header-row">
                                ${showIcon ? `<i class="fa-solid ${icon} message-icon"></i>` : ''}
                                ${title ? `<h2 class="widget-title">${mosaic.util.string.escapeHtml(title)}</h2>` : ''}
                            </div>
                            <div class="message-text">${messageHtml}</div>
                        </div>
                    </div>`;

                if (showButtons) buttonContainer.innerHTML = mosaic.ui.buttons.build(buttons, "mosaic.handlers.submit.message('${buttonText}', '${skipMode}', '${value}')", messageType);
            }
        },

        confirmation: {
            build() {
                const contentContainer = document.getElementById('contentContainer');
                const buttonContainer = document.getElementById('buttonContainer');
                mosaic.ui.container.resetBackground();

                const title = mosaic.config.title;
                const message = mosaic.config.message || 'Please confirm your action.';
                const buttons = mosaic.config.buttons || ['Cancel', 'OK'];

                // support markdown if enabled
                const messageHtml = (mosaic.flags.enableMarkdown && typeof marked !== 'undefined')
                    ? marked.parse(message)
                    : `<p>${mosaic.util.string.escapeHtml(message)}</p>`;

                contentContainer.innerHTML = `
                    <div class="message-content">
                        ${title ? `<h2 class="widget-title">${mosaic.util.string.escapeHtml(title)}</h2>` : ''}
                        <div class="message-text">${messageHtml}</div>
                    </div>`;

                buttonContainer.innerHTML = mosaic.ui.buttons.build(
                    buttons,
                    "mosaic.handlers.submit.confirmation('${buttonText}', '${skipMode}', '${value}')",
                    'confirmation'
                );
            }
        },
    },

    alert: {

        show(message) {
            const alertBox = document.querySelector('.alert-box');
            alertBox.classList.remove('alert-error');
            alertBox.style.maxHeight = `${mosaic.ui.viewport.getDimensions().height * 0.75}px`;
            document.getElementById("alertMessage").innerHTML = mosaic.util.string.escapeHtml(String(message ?? ''));
            document.getElementById("customAlert").classList.add("show");
        },

        // ╭──────────────────────────────────────────────────╮
        // │   show validation errors in error-styled alert   │
        // ╰──────────────────────────────────────────────────╯
        /**
         * Show validation errors in error-styled alert
         * @param {Array<string>} errors - Array of error messages in format "Field Label: Error message"
         */
        showValidationErrors(errors) {
            const alertBox = document.querySelector('.alert-box');
            alertBox.classList.add('alert-error');
            alertBox.style.maxHeight = `${mosaic.ui.viewport.getDimensions().height * 0.75}px`;

            // parse errors and build formatted html
            const errorItems = errors.map(error => {
                // split on first colon to separate field name from message
                const colonIndex = error.indexOf(':');
                if (colonIndex > -1) {
                    const fieldName = error.substring(0, colonIndex).trim();
                    const errorMessage = error.substring(colonIndex + 1).trim();
                    return `<li class="alert-error-item">
                        <span class="alert-error-field">${mosaic.util.string.escapeHtml(fieldName)}</span>
                        <span class="alert-error-message">${mosaic.util.string.escapeHtml(errorMessage)}</span>
                    </li>`;
                }
                // fallback if no colon found
                return `<li class="alert-error-item">
                    <span class="alert-error-message">${mosaic.util.string.escapeHtml(error)}</span>
                </li>`;
            }).join('');

            const html = `
                <div class="alert-header">
                    <i class="fa-solid fa-circle-exclamation alert-header-icon"></i>
                    <span class="alert-header-title">Please fix the following:</span>
                </div>
                <ul class="alert-error-list">${errorItems}</ul>
            `;

            document.getElementById("alertMessage").innerHTML = html;
            document.getElementById("customAlert").classList.add("show");
        },

        close() {
            const alertBox = document.querySelector('.alert-box');
            alertBox.classList.remove('alert-error');
            document.getElementById("customAlert").classList.remove("show");
        }
    },

    status: {
        show(message, type = 'info') {
            if (!mosaic.uiState.statusMessageEl) return;
            mosaic.uiState.statusMessageEl.textContent = message;
            mosaic.uiState.statusMessageEl.className = `status-${type}`;
        },

        clear() {
            if (mosaic.uiState.statusMessageEl) {
                mosaic.uiState.statusMessageEl.textContent = '';
                mosaic.uiState.statusMessageEl.className = '';
            }
        }
    },

    host: {
        splash: {
            show(message, type = 'info') {
                mosaic.con.log(`mosaic.ui.host.splash.show() (${type}):`, message);
                ZDK.Client.showMessage(message, { type });
            },
            info: (msg)    => mosaic.ui.host.splash.show(msg, 'info'),
            success: (msg) => mosaic.ui.host.splash.show(msg, 'success'),
            warning: (msg) => mosaic.ui.host.splash.show(msg, 'warning'),
            error: (msg)   => mosaic.ui.host.splash.show(msg, 'error')
        },

        loader: {
            show(message, options = {}) {
                const config = {
                    type: 'page',
                    template: options.template || 'standard'
                };
                if (message) config.message = message.substring(0, 240);
                mosaic.con.log(`mosaic.ui.host.loader.show()`, config);
                ZDK.Client.showLoader(config);
            },
            hide() {
                mosaic.con.log(`mosaic.ui.host.loader.hide()`);
                ZDK.Client.hideLoader();
            }
        },
    },

    buttons: {

        // list of button texts that should be treated as cancel/close actions
        CANCEL_BUTTON_TEXTS: ['cancel', 'close', 'no', 'later', 'dismiss', 'nevermind', 'not now'],

        // list of button texts that should be styled as destructive
        DESTRUCTIVE_BUTTON_TEXTS: ['delete', 'remove', 'discard', 'yes, delete'],

        // ╭───────────────────────────────────────────────────────╮
        // │   check if a button text represents a cancel action   │
        // ╰───────────────────────────────────────────────────────╯
        isCancelButton(buttonText) {
            if (!buttonText) return false;
            const lowerText = buttonText.toLowerCase().trim();
            return this.CANCEL_BUTTON_TEXTS.includes(lowerText);
        },

        // ╭────────────────────────────────────────────────────────────╮
        // │   check if a button text represents a destructive action   │
        // ╰────────────────────────────────────────────────────────────╯
        isDestructiveButton(buttonText) {
            if (!buttonText) return false;
            const lowerText = buttonText.toLowerCase().trim();
            return this.DESTRUCTIVE_BUTTON_TEXTS.includes(lowerText);
        },

        // ╭───────────────────────────────────────────────────────────╮
        // │   build button html from array of button configurations   │
        // ╰───────────────────────────────────────────────────────────╯
        build(buttons, onClickTemplate, typeContext = '') {
            return buttons.map((buttonConfig) => {
                const isObj          = typeof buttonConfig === 'object';
                const buttonText     = String(isObj ? (buttonConfig.label ?? '') : buttonConfig);
                const buttonValue    = String(isObj ? (buttonConfig.value  || '') : '');
                const skipValidation = isObj && buttonConfig.validate === false;
                const explicitStyle  = isObj ? buttonConfig.style : null;

                // skipMode encodes routing intent for the handler:
                //   'capture' → bypass validation, return current form data (validate: false)
                //   'cancel'  → bypass validation, respond cancelled (auto-detected or style: 'cancel')
                //   ''        → normal validation + submit
                const skipMode = skipValidation ? 'capture'
                    : (explicitStyle === 'cancel' || this.isCancelButton(buttonText)) ? 'cancel'
                    : '';

                let onClick = onClickTemplate
                    .replace('${buttonText}', mosaic.util.string.escapeJsString(buttonText))
                    .replace('${skipMode}',   mosaic.util.string.escapeJsString(skipMode))
                    .replace('${value}',      mosaic.util.string.escapeJsString(buttonValue));

                let btnClass = 'btn';
                if (explicitStyle) {
                    if (explicitStyle !== 'primary') btnClass += ` ${explicitStyle}`;
                } else if (this.isCancelButton(buttonText)) {
                    btnClass += ' cancel';
                } else if (this.isDestructiveButton(buttonText)) {
                    btnClass += ' destructive';
                } else if (typeContext && ['success', 'warning', 'error', 'question'].includes(typeContext)) {
                    btnClass += ` ${typeContext}`;
                }
                return `<button class="${btnClass}" onclick="${mosaic.util.string.escapeHtml(onClick)}">${mosaic.util.string.escapeHtml(buttonText)}</button>`;
            }).join('');
        }
    },

    container: {
        resetBackground() {
            const container = document.querySelector('.container');
            if (container) container.className = 'container';
            const contentContainer = document.getElementById('contentContainer');
            if (contentContainer) contentContainer.classList.remove('has-table');
        },
    },

    bodyLoader: {
        show(message) {
            document.body.innerHTML = `
                <div class="mosaic-body-loader">
                    <div class="mosaic-body-spinner"></div>
                    <div class="mosaic-body-loader-text">${mosaic.util.string.escapeHtml(message)}</div>
                </div>`;
        },
        hide() {
            const el = document.querySelector('.mosaic-body-loader');
            if (el) el.remove();
        }
    },

    errors: {
        show(message, container) {
            const html = `<div class="mosaic-body-error">${mosaic.util.string.escapeHtml(message)}</div>`;
            if (container) {
                container.innerHTML = html;
            } else {
                document.body.innerHTML = html;
            }
        },
    },

    readiness: {
        buildPromise() {
            const widgetType = mosaic.config.widget_type || mosaic.config.type;
            if (!['form', 'launcher'].includes(widgetType)) return Promise.resolve();

            const fields            = mosaic.runtime.form.flatFields || mosaic.config.fields || [];
            const hasDateField     = fields.some(f => f.type === 'date' && !f.use_date_input);
            const hasDateTimeField = fields.some(f => f.type === 'datetime-local');
            const hasTimeField     = fields.some(f => f.type === 'time');
            const hasTel           = fields.some(f => f.type === 'tel');
            const needsDateFormats = hasDateField || hasDateTimeField;
            const needsTimeReturn  = hasTimeField || hasDateTimeField;

            if (!needsDateFormats && !needsTimeReturn && !hasTel) return Promise.resolve();

            const promises = [new Promise(resolve => setTimeout(resolve, 150))];

            if (needsDateFormats) {
                mosaic.con.log(`mosaic.ui.readiness.buildPromise() | Config contains date / datetime field(s). Fetching user formats.`);
                promises.push(
                    mosaic.api.env.getUserDateFormatDisplay(),
                    mosaic.api.env.getUserDateFormatReturn()
                );
            }

            if (needsTimeReturn) {
                mosaic.con.log(`mosaic.ui.readiness.buildPromise() | Config contains datetime / time field(s). Fetching user formats.`);
                promises.push(
                    mosaic.api.env.getUserTimeFormatDisplay(),
                    mosaic.api.env.getUserTimeFormatReturn()
                );
            }

            if (hasTel) {
                mosaic.con.log(`mosaic.ui.readiness.buildPromise() | Config contains tel / phone field(s). Fetching user formats.`);
                promises.push(mosaic.api.env.getPhoneDisplayFormat());
            }

            return Promise.all(promises);
        },

        async wait(readyPromise = Promise.resolve()) {
            await readyPromise;
        },
    },

    focus: {
        force(readyPromise = Promise.resolve(), maxWait = 1500) {
            const focusableSelectors = [
                'input[type="text"]:not([type="hidden"])',
                'input[type="email"]',
                'input[type="tel"]',
                'input[type="number"]',
                'input[type="date"]',
                'input[type="file"]',
                'input[type="checkbox"]',
                'input[type="radio"]',
                '.picklist-display',
                '.multiselect-display',
                'textarea',
                'launcher-item'
            ].join(', ');

            mosaic.ui.readiness.wait(readyPromise).then(() => {
                const start = Date.now();

                const attempt = () => {
                    const candidates = Array.from(document.querySelectorAll(focusableSelectors));
                    const firstInput = candidates.find(el =>
                        el.offsetParent !== null &&
                        !el.disabled &&
                        el.type !== 'hidden' &&
                        getComputedStyle(el).display !== 'none' &&
                        getComputedStyle(el).visibility !== 'hidden'
                    );

                    if (firstInput) {
                        firstInput.focus();
                        mosaic.con.log(`mosaic.ui.focus.force() | Focused: ${firstInput.name || firstInput.id || firstInput.type}`);
                        firstInput.addEventListener('blur', (e) => {
                            if (e.relatedTarget === null) setTimeout(() => firstInput.focus(), 50);
                        }, { once: true });
                        return;
                    }

                    if (Date.now() - start < maxWait) setTimeout(attempt, 50);
                    else mosaic.con.warn(`mosaic.ui.focus.force() | No focusable element found within ${maxWait} ms`);
                };

                setTimeout(attempt, 50);
            });
        },

        restore() {
            const widgetType = mosaic.config.widget_type || mosaic.config.type;
            if (widgetType === 'form' || widgetType === 'table') mosaic.ui.focus.force();
        },
    },

    viewport: {
        getDimensions() {
            return {
                width:  window.innerWidth,
                height: window.innerHeight
            };
        },

        async resize(h, w) {
            mosaic.con.log(`mosaic.ui.viewport.resize() | Attempting resize`, { h, w });
            try {
                const resp = await ZOHO.CRM.UI.Resize({
                    height: h,
                    width: w
                });

                if (resp.success) mosaic.con.log(`mosaic.ui.viewport.resize() | Widget resized`, resp.success);
            } catch (e) {
                mosaic.con.err('mosaic.ui.viewport.resize() | Resize error', e);
            }
        },

        async fitToContent() {
            const container = document.querySelector('.container');
            if (!container) {
                mosaic.con.err('mosaic.ui.viewport.fitToContent() | .container element not found');
                return;
            }

            const finalHeight = container.scrollHeight + 10;
            await mosaic.ui.viewport.resize(finalHeight, window.innerWidth);
            mosaic.con.log(`mosaic.ui.viewport.fitToContent() | Resized height to: ${finalHeight}px`);
        }
    },
};

// signatures match the cscript/mosaic.js helper API
mosaic.splash = Object.assign((msg, { type = 'info' } = {}) => mosaic.ui.host.splash.show(msg, type), mosaic.ui.host.splash);
mosaic.loader = Object.assign((...args) => args.length ? mosaic.ui.host.loader.show(...args) : mosaic.ui.host.loader.hide(), mosaic.ui.host.loader);
mosaic.alert  = Object.assign((...args) => mosaic.ui.alert.show(...args), mosaic.ui.alert);
