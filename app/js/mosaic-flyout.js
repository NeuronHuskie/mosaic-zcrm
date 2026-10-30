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
        _waiters: [],

        // called by ZOHO.embeddedApp.on("NotifyAndWait") and requests.capture() - either may fire, or both
        setRequest(data = {}) {
            const requestId = data.id || null;
            if (!requestId) return;
            if (!mosaic.runtime.flyout.enabled) {
                // widget not yet initialized as a flyout - buffer for lifecycle.init()
                mosaic.flyout.requests._preInitRequest = { requestId };
                mosaic.con.groupCollapsed('mosaic.flyout.requests.setRequest() | Flyout request buffered (pre-init)', { requestId, data });
            } else if (mosaic.runtime.flyout.responded) {
                mosaic.con.warn('mosaic.flyout.requests.setRequest() | Request received after response was sent - ignoring', { requestId });
            } else {
                mosaic.runtime.flyout.requestId = requestId;
                mosaic.con.groupCollapsed('mosaic.flyout.requests.setRequest() | Flyout request received', { requestId, data });
                mosaic.flyout.requests.flushWaiters(requestId);
            }
        },

        // NotifyAndWait read straight off the wire - the client script calls notify() as soon as
        // open() returns, so it races the widget's load, and the sdk drops every message that lands
        // before ZOHO.embeddedApp.init(). attached when this file loads (in <head>, after the sdk)
        capture(event) {
            if (event.source !== window.parent) return;
            let message = event.data;
            if (typeof message === 'string') {
                try { message = JSON.parse(message); } catch (_) { return; }
            }
            if (message?.type !== 'FRAMEWORK.EVENT' || message.eventName !== 'NotifyAndWait') return;
            mosaic.flyout.requests.setRequest(message.data);
        },

        // calls fn(requestId) once the flyout can answer - straight away if the id is here, fn(null) on timeout
        whenReady(fn, timeoutMs = 3000) {
            const requestId = mosaic.runtime.flyout.requestId;
            if (requestId) {
                fn(requestId);
                return;
            }

            mosaic.con.log('mosaic.flyout.requests.whenReady() | Waiting for flyout request id', { timeoutMs });
            const waiter = (id) => {
                clearTimeout(timer);
                fn(id);
            };
            const timer = setTimeout(() => {
                mosaic.flyout.requests._waiters = mosaic.flyout.requests._waiters.filter(w => w !== waiter);
                fn(null);
            }, timeoutMs);
            mosaic.flyout.requests._waiters.push(waiter);
        },

        flushWaiters(requestId) {
            const waiters = mosaic.flyout.requests._waiters;
            mosaic.flyout.requests._waiters = [];
            waiters.forEach(waiter => waiter(requestId));
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

window.addEventListener('message', mosaic.flyout.requests.capture);
