/**
 * ════════════════════════════════════════════════════════════════════════
 *  mosaic.storage - storage management module
 * ════════════════════════════════════════════════════════════════════════
 */

mosaic.storage = {

    keys: {
        PREFIX: 'zoho-mosaic-widget-',

        prefixed(key) {
            return `${this.PREFIX}${key}`;
        },

        clean(key) {
            return String(key).replace(this.PREFIX, '');
        },

        isMosaicKey(key) {
            return Boolean(key && String(key).startsWith(this.PREFIX));
        },
    },

    values: {
        /**
         * Set a value in localStorage
         * @param {String} key - Storage key
         * @param {*} value - Value to store
         * @returns {Boolean} - Success status
         */
        set(key, value) {
            try {
                const prefixedKey = mosaic.storage.keys.prefixed(key);
                const serialized = JSON.stringify(value);
                localStorage.setItem(prefixedKey, serialized);
                return true;
            } catch (e) {
                mosaic.con.warn(`mosaic.storage.values.set() | Failed to save to storage (${key}):`, e);
                return false;
            }
        },

        /**
         * Get a value from localStorage
         * @param {String} key - Storage key
         * @param {*} defaultValue - Default value if not found
         * @returns {*} - Stored value or default
         */
        get(key, defaultValue = null) {
            try {
                const prefixedKey = mosaic.storage.keys.prefixed(key);
                const stored = localStorage.getItem(prefixedKey);
                return stored ? JSON.parse(stored) : defaultValue;
            } catch (e) {
                mosaic.con.warn(`mosaic.storage.values.get() | Failed to retrieve from storage (${key}):`, e);
                return defaultValue;
            }
        },

        /**
         * Remove a value from localStorage
         * @param {String} key - Storage key
         * @returns {Boolean} - Success status
         */
        remove(key) {
            try {
                localStorage.removeItem(mosaic.storage.keys.prefixed(key));
                return true;
            } catch (e) {
                mosaic.con.warn(`mosaic.storage.values.remove() | Failed to remove from storage (${key}):`, e);
                return false;
            }
        },
    },

    collection: {
        /**
         * Clear all mosaic storage
         * @returns {Boolean} - Success status
         */
        clear() {
            try {
                const keysToRemove = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (mosaic.storage.keys.isMosaicKey(key)) keysToRemove.push(key);
                }
                keysToRemove.forEach(key => localStorage.removeItem(key));
                return true;
            } catch (e) {
                mosaic.con.warn('mosaic.storage.collection.clear() | Failed to clear storage:', e);
                return false;
            }
        },

        /**
         * Get all stored mosaic values
         * @returns {Object}
         */
        getAll() {
            const result = {};
            try {
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (mosaic.storage.keys.isMosaicKey(key)) {
                        const cleanKey = mosaic.storage.keys.clean(key);
                        result[cleanKey] = mosaic.storage.values.get(cleanKey);
                    }
                }
            } catch (e) {
                mosaic.con.warn('mosaic.storage.collection.getAll() | Failed to get all storage:', e);
            }
            return result;
        },
    },

    availability: {
        /**
         * Check if storage is available
         * @returns {Boolean}
         */
        check() {
            try {
                const test = '__storage_test__';
                localStorage.setItem(test, test);
                localStorage.removeItem(test);
                return true;
            } catch (e) {
                return false;
            }
        },
    },
};
