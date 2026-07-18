/**
 * ════════════════════════════════════════════════════════════════════════
 *  mosaic.flyout - flyout widget mode module
 * ════════════════════════════════════════════════════════════════════════
 */

mosaic.flyout = {

    lifecycle: {
        // called early in mosaic.init() before theme/UI
        init(data, config) {
            const preInit = mosaic.flyout.requests._preInitRequest;
            mosaic.flyout.requests._preInitRequest = null;
            mosaic.runtime.flyout = {
                enabled:    config.flyout === true,
                requestId:  preInit?.requestId || null,
                responded:  false
            };
            if (preInit) mosaic.con.groupCollapsed('mosaic.flyout.lifecycle.init() | Consumed pre-init flyout request', { requestId: preInit.requestId });
        },

        // called after ui.buildWidget()
        postInit() {
            if (!mosaic.flyout.state.isEnabled() || !mosaic.config.close_icon) return;
            mosaic.flyout.ui.renderCloseButton();
        }
    },

    requests: {
        _preInitRequest: null,

        // called by ZOHO.embeddedApp.on("NotifyAndWait")
        setRequest(data = {}) {
            const requestId = data.id || null;
            if (!mosaic.runtime.flyout.enabled) {
                // widget not yet initialized as a flyout - buffer for lifecycle.init()
                this._preInitRequest = { requestId };
                mosaic.con.groupCollapsed('mosaic.flyout.requests.setRequest() | Flyout request buffered (pre-init)', { requestId, data });
            } else if (mosaic.runtime.flyout.responded) {
                mosaic.con.warn('mosaic.flyout.requests.setRequest() | Request received after response was sent - ignoring', { requestId });
            } else {
                mosaic.runtime.flyout.requestId = requestId;
                mosaic.con.groupCollapsed('mosaic.flyout.requests.setRequest() | Flyout request received', { requestId, data });
            }
        }
    },

    state: {
        isEnabled() {
            return mosaic.runtime.flyout.enabled === true;
        }
    },

    responses: {
        buildDismissResponse() {
            return { __mosaic_dismissed: true };
        }
    },

    ui: {
        renderCloseButton() {
            mosaic.con.log('mosaic.flyout.ui.renderCloseButton() | Rendering flyout X button');
            const btn = document.createElement('button');
            btn.className = 'flyout-x-btn';
            btn.setAttribute('aria-label', 'Close');
            btn.tabIndex = -1;
            const icon = document.createElement('i');
            icon.className = 'fa-solid fa-xmark';
            icon.setAttribute('aria-hidden', 'true');
            btn.appendChild(icon);
            btn.addEventListener('click', () => mosaic.respond(mosaic.flyout.responses.buildDismissResponse()));
            document.body.prepend(btn);
        }
    },

};
