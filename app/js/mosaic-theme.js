/**
 * ════════════════════════════════════════════════════════════════════════
 *  mosaic.theme - theme management module
 * ════════════════════════════════════════════════════════════════════════
 */

mosaic.theme = {

    lifecycle: {
        preload() {
            const savedTheme = mosaic.theme.preferences.getSaved();
            if (savedTheme) {
                mosaic.theme.mode.apply(savedTheme);
                mosaic.uiState.themeInitialized = true;
                return;
            }

            mosaic.theme.mode.apply('light');
        },

        async initialize() {
            if (mosaic.uiState.themeInitialized && !mosaic.overrides.theme) return;

            const theme = await mosaic.theme.preferences.getCrm();
            mosaic.con.log('mosaic.theme.lifecycle.initialize() | Zoho CRM theme:', theme);
            mosaic.theme.mode.set(theme);
            mosaic.uiState.themeInitialized = true;
        },
    },

    mode: {
        apply(theme) {
            // swap only the theme classes - the body may carry other state
            // classes (e.g. is-related-list) that must survive a toggle
            document.body.classList.remove('light-mode', 'dark-mode');
            document.body.classList.add(`${theme}-mode`);
        },

        /**
         * Set the theme (light or dark)
         * @param {String} theme - 'light' or 'dark'
         */
        set(theme) {
            mosaic.theme.mode.apply(theme);
            if (mosaic.overrides.theme) return;
            mosaic.theme.preferences.save(theme);
        },

        toggle() {
            const newTheme = document.body.classList.contains('dark-mode') ? 'light' : 'dark';
            return mosaic.theme.mode.set(newTheme);
        },
    },

    preferences: {
        save(theme) {
            try {
                return mosaic.storage.values.set('theme', theme);
            } catch (e) {
                mosaic.con.warn('mosaic.theme.preferences.save() | Could not save theme preference:', e);
                return false;
            }
        },

        /**
         * Get the current theme from localStorage
         * @returns {String|null} - 'light', 'dark', or null
         */
        getSaved() {
            try {
                return mosaic.storage.values.get('theme');
            } catch (e) {
                mosaic.con.warn('mosaic.theme.preferences.getSaved() | Could not retrieve theme preference:', e);
                return null;
            }
        },

        getCrm() {
            return mosaic.api.env.getUserThemePreference();
        },
    },
};

mosaic.theme.lifecycle.preload();
