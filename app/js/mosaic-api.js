/**
 * ════════════════════════════════════════════════════════════════════════
 *  mosaic.api - zoho crm api integration module
 * ════════════════════════════════════════════════════════════════════════
 */

mosaic.api = {

    zrc: {
        // ── cache for zrc instances ───────────────────────────────────────────
        _instances: {},

        // ╭──────────────────────────────────────────────────────────╮ 
        // │   get or create a zrc instance for an external service   │ 
        // ╰──────────────────────────────────────────────────────────╯ 
        /**
         * Get or create a ZRC instance for an external service
         * @param {string} service - Service name (e.g., 'workdrive', 'books', 'projects')
         * @param {string} connection - Connection link name
         * @param {string} baseUrl - Optional custom base URL (uses default if not provided)
         * @returns {Object} ZRC instance for the service
         */
        getInstance(service, connection, baseUrl = null) {
            const cacheKey = `${service}_${connection}`;

            // return cached instance if exists
            if (this._instances[cacheKey]) return this._instances[cacheKey];

            // default base urls for zoho services
            const serviceBaseUrls = {
                'workdrive': 'https://www.zohoapis.com/workdrive/api/v1',
                'books': 'https://www.zohoapis.com/books/v3',
                'projects': 'https://www.zohoapis.com/projects/v3',
                'desk': 'https://desk.zoho.com/api/v1',
                'mail': 'https://mail.zoho.com/api',
                'analytics': 'https://analyticsapi.zoho.com/api',
                'creator': 'https://www.zohoapis.com/creator/v2.1',
                'sign': 'https://sign.zoho.com/api/v1',
                'inventory': 'https://www.zohoapis.com/inventory/v1',
                'writer': 'https://www.zohoapis.com/writer/api/v1'
            };

            const url = baseUrl || serviceBaseUrls[service];

            if (!url) throw new Error(`Unknown service "${service}" and no baseUrl provided`);

            mosaic.con.log(`mosaic.api.zrc.getInstance() | Creating ZRC instance for ${service} with connection: ${connection}`);

            // create and cache the instance
            this._instances[cacheKey] = zrc.createInstance({
                baseUrl: url,
                connection: connection
            });

            return this._instances[cacheKey];
        },

        // ╭──────────────────────────────────────────────────╮ 
        // │            clear cached zrc instances            │ 
        // ╰──────────────────────────────────────────────────╯ 
        /**
         * Clear cached ZRC instances (useful for connection changes)
         * @param {string} service - Optional service name to clear specific instance
         */
        clearInstances(service = null) {
            if (service) { // clear instances for specific service
                Object.keys(this._instances).forEach(key => {
                    if (key.startsWith(`${service}_`)) {
                        delete this._instances[key];
                    }
                });
            } else { // clear all instances
                this._instances = {};
            }
            mosaic.con.log(`mosaic.api.zrc.clearInstances() | ZRC instances cleared`, service || 'all');
        }
    },

    env: {
        // ╭──────────────────────────────────────────────────╮ 
        // │           get organization information           │ 
        // ╰──────────────────────────────────────────────────╯ 
        async getOrgInfo() {
            if (mosaic.cache.orgInfo) return mosaic.cache.orgInfo;
            if (mosaic.cache.orgInfoPromise) return mosaic.cache.orgInfoPromise;

            mosaic.cache.orgInfoPromise = (async () => {
                try {
                    const response = await zrc.get('/crm/v8/org');
                    mosaic.cache.orgInfo = response.data.org[0];
                    mosaic.con.log(`mosaic.api.env.getOrgInfo()`, mosaic.cache.orgInfo);
                    return mosaic.cache.orgInfo;
                } catch (error) {
                    mosaic.con.err(`mosaic.api.env.getOrgInfo() | Error`, error);
                    mosaic.cache.orgInfoPromise = null; // clear on error so it can retry
                    throw error;
                }
            })();

            return mosaic.cache.orgInfoPromise;
        },

        // ╭──────────────────────────────────────────────────╮ 
        // │           get organization domain name           │ 
        // ╰──────────────────────────────────────────────────╯ 
        async getOrgDomainName() {
            try {
                if (mosaic.overrides.orgDomainName) return mosaic.overrides.orgDomainName;
                if (mosaic.cache.orgDomainName) return mosaic.cache.orgDomainName;
                const orgInfo = await mosaic.api.env.getOrgInfo();
                mosaic.cache.orgDomainName = orgInfo?.domain_name || null;
                mosaic.con.log(`mosaic.api.env.getOrgDomainName()`, mosaic.cache.orgDomainName);
                return mosaic.cache.orgDomainName;
            } catch (error) {
                mosaic.con.err(`mosaic.api.env.getOrgDomainName() | Error getting org domain name`, error);
                throw error;
            }
        },

        // ╭──────────────────────────────────────────────────╮ 
        // │           get current user information           │ 
        // ╰──────────────────────────────────────────────────╯ 
        async getCurrentUser() {
            if (mosaic.cache.user) return mosaic.cache.user;
            if (mosaic.cache.userPromise) return mosaic.cache.userPromise;

            mosaic.cache.userPromise = (async () => {
                try {
                    const response = await zrc.get('/crm/v8/users?type=CurrentUser');
                    mosaic.cache.user = response?.data?.users?.[0];
                    mosaic.con.log(`mosaic.api.env.getCurrentUser()`, mosaic.cache.user);
                    return mosaic.cache.user;
                } catch (error) {
                    mosaic.con.err(`mosaic.api.env.getCurrentUser() | Error`, error);
                    mosaic.cache.userPromise = null; // clear on error so it can retry
                    throw error;
                }
            })();

            return mosaic.cache.userPromise;
        },

        // ╭──────────────────────────────────────────────────╮ 
        // │           get user's theme preference            │ 
        // ╰──────────────────────────────────────────────────╯ 
        async getUserThemePreference() {
            if (mosaic.overrides.theme) return mosaic.overrides.theme;
            if (mosaic.cache.userTheme) return mosaic.cache.userTheme;
            if (mosaic.cache.userThemePromise) return mosaic.cache.userThemePromise;

            mosaic.cache.userThemePromise = (async () => {
                try {
                    const pref = await ZOHO.CRM.CONFIG.getUserPreference();
                    mosaic.cache.userTheme = pref?.mode === 'night' ? 'dark' : 'light';
                    mosaic.con.log(`mosaic.api.env.getUserThemePreference()`, mosaic.cache.userTheme);
                    return mosaic.cache.userTheme;
                } catch (e) {
                    mosaic.con.warn(`mosaic.api.env.getUserThemePreference() | Failed`, e);
                    mosaic.cache.userTheme = 'light';
                    return mosaic.cache.userTheme;
                } finally {
                    mosaic.cache.userThemePromise = null;
                }
            })();

            return mosaic.cache.userThemePromise;
        },

        // ╭───────────────────────────────────────────────────────────────────────────────────╮ 
        // │      get date display format from widget config or users date format setting      │ 
        // ╰───────────────────────────────────────────────────────────────────────────────────╯ 
        async getUserDateFormatDisplay() {
            if (mosaic.overrides.dateFormatDisplay) return mosaic.overrides.dateFormatDisplay;
            if (mosaic.cache.userDateFormat) return mosaic.cache.userDateFormat;
            if (mosaic.cache.dateFormatPromise) return mosaic.cache.dateFormatPromise;

            mosaic.cache.dateFormatPromise = (async () => {
                try {
                    const currentUser = await mosaic.api.env.getCurrentUser();
                    mosaic.cache.userDateFormat = currentUser?.date_format || 'MM/dd/yyyy';
                    return mosaic.cache.userDateFormat;
                } catch (error) {
                    mosaic.cache.userDateFormat = 'MM/dd/yyyy';
                    return mosaic.cache.userDateFormat;
                } finally {
                    mosaic.cache.dateFormatPromise = null;
                }
            })();

            return mosaic.cache.dateFormatPromise;
        },

        // ╭───────────────────────────────────────────────────────────────────────────────╮ 
        // │        get date return format from overrides - default to yyyy-MM-dd          │ 
        // ╰───────────────────────────────────────────────────────────────────────────────╯ 
        async getUserDateFormatReturn() {
            if (mosaic.overrides.dateFormatReturn) return mosaic.overrides.dateFormatReturn;
            return 'yyyy-MM-dd';
        },

        // ╭────────────────────────────────────────────────────────────────────╮ 
        // │   get time display format from overrides - default to h:mm AM/PM   │ 
        // ╰────────────────────────────────────────────────────────────────────╯ 
        async getUserTimeFormatDisplay() {
            if (mosaic.overrides.timeFormatDisplay) return mosaic.overrides.timeFormatDisplay;
            return 'h:mm AM/PM'; // default display
        },

        // ╭────────────────────────────────────────────────────────────────────╮ 
        // │       get time return format from overrides - default to HH:mm     │ 
        // ╰────────────────────────────────────────────────────────────────────╯ 
        async getUserTimeFormatReturn() {
            if (mosaic.overrides.timeFormatReturn) return mosaic.overrides.timeFormatReturn;
            return 'HH:mm'; // 24hr for api storage
        },

        // ╭──────────────────────────────────────────────────╮ 
        // │              get current deployment              │ 
        // ╰──────────────────────────────────────────────────╯
        async getDeployment() {
            try {
                if (mosaic.overrides.deployment) return mosaic.overrides.deployment;
                if (mosaic.cache.deployment) return mosaic.cache.deployment;
                const response = await ZOHO.CRM.CONFIG.GetCurrentEnvironment();
                mosaic.cache.deployment = response;
                mosaic.con.log(`mosaic.api.env.getDeployment()`, mosaic.cache.deployment);
                return response;
            } catch (error) {
                mosaic.con.warn(`mosaic.api.env.getDeployment() | Error getting current environment`, error);
                return { deployment: 'US' };
            }
        },

        // ╭──────────────────────────────────────────────────╮
        // │       get api domain based on data center        │
        // ╰──────────────────────────────────────────────────╯
        async getApiDomain() {
            if (mosaic.overrides.apiDomain) return mosaic.overrides.apiDomain;
            if (mosaic.cache.apiDomain) return mosaic.cache.apiDomain;

            const DATA_CENTERS = {
                'US': 'https://www.zohoapis.com',
                'AU': 'https://www.zohoapis.com.au',
                'EU': 'https://www.zohoapis.eu',
                'IN': 'https://www.zohoapis.in',
                'CN': 'https://www.zohoapis.com.cn',
                'JP': 'https://www.zohoapis.jp',
                'CA': 'https://www.zohoapis.ca'
            };

            const countryCode = mosaic.api.env.extractCountryCode(await mosaic.api.env.getDeployment());

            mosaic.cache.apiDomain = DATA_CENTERS[countryCode] || DATA_CENTERS.US;

            mosaic.con.log('mosaic.api.env.getApiDomain()', countryCode, mosaic.cache.apiDomain);

            return mosaic.cache.apiDomain;
        },

        // ╭──────────────────────────────────────────────────╮
        // │     get crm web app domain based on data center  │
        // ╰──────────────────────────────────────────────────╯
        async getCrmDomain() {
            if (mosaic.cache.crmDomain) return mosaic.cache.crmDomain;

            const CRM_DOMAINS = {
                'US': 'https://crm.zoho.com',
                'AU': 'https://crm.zoho.com.au',
                'EU': 'https://crm.zoho.eu',
                'IN': 'https://crm.zoho.in',
                'CN': 'https://crm.zoho.com.cn',
                'JP': 'https://crm.zoho.jp',
                'SA': 'https://crm.zoho.sa',
                'CA': 'https://crm.zohocloud.ca'
            };

            const countryCode = mosaic.api.env.extractCountryCode(await mosaic.api.env.getDeployment());

            mosaic.cache.crmDomain = CRM_DOMAINS[countryCode] || CRM_DOMAINS.US;

            mosaic.con.log('mosaic.api.env.getCrmDomain()', countryCode, mosaic.cache.crmDomain);

            return mosaic.cache.crmDomain;
        },

        // ╭──────────────────────────────────────────────────╮
        // │                 get country code                 │
        // ╰──────────────────────────────────────────────────╯
        async getPhoneCountryCode() {
            if (mosaic.overrides.phoneCountryCode) return mosaic.overrides.phoneCountryCode;
            if (mosaic.cache.phoneCountryCode) return mosaic.cache.phoneCountryCode;

            try {
                const orgInfo = await mosaic.api.env.getOrgInfo();
                mosaic.cache.phoneCountryCode = orgInfo?.country_code?.toUpperCase() || 'US';
            } catch (error) {
                mosaic.con.warn('mosaic.api.env.getPhoneCountryCode() | Error:', error);
                mosaic.cache.phoneCountryCode = 'US';
            }

            mosaic.con.log('mosaic.api.env.getPhoneCountryCode()', mosaic.cache.phoneCountryCode);
            return mosaic.cache.phoneCountryCode;
        },

        // ╭──────────────────────────────────────────────────╮ 
        // │             get phone display format             │ 
        // ╰──────────────────────────────────────────────────╯ 
        async getPhoneDisplayFormat() {
            if (mosaic.overrides.phoneFormatDisplay) return mosaic.overrides.phoneFormatDisplay;
            if (mosaic.cache.phoneDisplayFormat) return mosaic.cache.phoneDisplayFormat;

            const country = await mosaic.api.env.getPhoneCountryCode();
            mosaic.cache.phoneDisplayFormat = mosaic.validators.patterns.phone[country]?.display_format
                || mosaic.validators.patterns.phone.DEFAULT.display_format
                || null;
            return mosaic.cache.phoneDisplayFormat;
        },

        // ╭──────────────────────────────────────────────────╮ 
        // │             get phone return format              │ 
        // ╰──────────────────────────────────────────────────╯ 
        async getPhoneReturnFormat() {
            if (mosaic.overrides.phoneFormatReturn) return mosaic.overrides.phoneFormatReturn;
            if (mosaic.cache.phoneReturnFormat) return mosaic.cache.phoneReturnFormat;

            const country = await mosaic.api.env.getPhoneCountryCode();
            mosaic.cache.phoneReturnFormat = mosaic.validators.patterns.phone[country]?.return_format || 'E164';
            return mosaic.cache.phoneReturnFormat;
        },

        // ╭──────────────────────────────────────────────────╮ 
        // │           extract country code helper            │ 
        // ╰──────────────────────────────────────────────────╯ 
        extractCountryCode(response) {
            const deployment = response?.deployment ?? response;
            return deployment?.includes('(') ? deployment.split('(')[0] : deployment;
        },
    },

    crm: {
        // ╭──────────────────────────────────────────────────╮ 
        // │          get zoho crm modules metadata           │ 
        // ╰──────────────────────────────────────────────────╯ 
        async getModules() {
            try {
                if (mosaic.cache.crmModules) return mosaic.cache.crmModules;
                const response = await zrc.get('/crm/v8/settings/modules');
                mosaic.cache.crmModules = response?.data?.modules || null;
                mosaic.con.log('mosaic.api.crm.getModules()', mosaic.cache.crmModules);
                return mosaic.cache.crmModules;
            } catch (error) {
                mosaic.con.err('mosaic.api.crm.getModules() | Error getting CRM modules:', error);
            }
        },

        // ╭──────────────────────────────────────────────────╮ 
        // │        get zoho crm custommodule api name        │ 
        // ╰──────────────────────────────────────────────────╯ 
        async getCustomModuleApiName(customModule) {
            try {
                const modules = await mosaic.api.crm.getModules();
                if (!modules?.length) throw new Error('No modules data available');

                const matchedModule = modules.find(module => module.module_name === customModule);
                if (!matchedModule) throw new Error(`Module "${customModule}" not found`);

                customModule === mosaic.context.entity && (mosaic.context.entityApiName = matchedModule.api_name);
                mosaic.con.log(`mosaic.api.crm.getCustomModuleApiName() | ${customModule}`, matchedModule.api_name);
                return matchedModule.api_name;
            } catch (error) {
                mosaic.con.err(`mosaic.api.crm.getCustomModuleApiName() | Error getting CRM custom module (${customModule}) API name:`, error);
            }
        },

        // ╭──────────────────────────────────────────────────╮ 
        // │            get mosaic.entity api name            │ 
        // ╰──────────────────────────────────────────────────╯ 
        async getEntityApiName() {
            if (!mosaic.context.entityApiName) {
                mosaic.context.entity.includes('CustomModule')
                    ? await mosaic.api.crm.getCustomModuleApiName(mosaic.context.entity)
                    : mosaic.context.entityApiName = mosaic.context.entity;
            }
            mosaic.con.log(`mosaic.api.crm.getEntityApiName()`, mosaic.context.entityApiName);
            return mosaic.context.entityApiName;
        },

        // ╭──────────────────────────────────────────────────╮ 
        // │            get current record details            │ 
        // ╰──────────────────────────────────────────────────╯ 
        async getCurrentRecord() {
            await mosaic.api.crm.getEntityApiName(mosaic.context.entity);

            try {
                const response = await zrc.get(`/crm/v8/${mosaic.context.entityApiName}/${mosaic.context.entityId}`);
                return response?.data?.data?.[0];
            } catch (error) {
                mosaic.con.err('mosaic.api.crm.getCurrentRecord() | Error getting current record', error);
                throw error;
            }
        },

        // ╭──────────────────────────────────────────────────╮ 
        // │              update current record               │ 
        // ╰──────────────────────────────────────────────────╯ 
        async updateCurrentRecord(data) {
            try {
                const response = await ZOHO.CRM.API.updateRecord({
                    Entity: mosaic.context.entity,
                    APIData: {
                        id: mosaic.context.entityId,
                        ...data
                    }
                });
                return response;
            } catch (error) {
                mosaic.con.err('mosaic.api.crm.updateCurrentRecord() | Error updating record:', error);
                throw error;
            }
        },
    
        // ╭──────────────────────────────────────────────────╮ 
        // │                execute coql query                │ 
        // ╰──────────────────────────────────────────────────╯
        async executeCoql(query) {
            try {
                const response = await zrc.post('/crm/v8/coql', {select_query: query});
                mosaic.con.log(`mosaic.api.crm.executeCoql() | COQL response:`, response);
                return response?.data;
            } catch (error) {
                mosaic.con.err('mosaic.api.crm.executeCoql() | Error executing COQL:', error);
                throw error;
            }
        },

        // ╭──────────────────────────────────────────────────╮ 
        // │                  search records                  │ 
        // ╰──────────────────────────────────────────────────╯ 
        async searchRecords(module, query, type = 'word') {
            try {
                const apiPayload = {
                    Entity: module,
                    Type: type,
                    Query: query
                };

                const response = await ZOHO.CRM.API.searchRecord(apiPayload);
                mosaic.con.log(`mosaic.api.crm.searchRecords() | Search records response:`, response);
                return response.data || [];
            } catch (error) {
                mosaic.con.warn('mosaic.api.crm.searchRecords() | Error searching records:', error);
                return [];
            }
        },

        // ╭──────────────────────────────────────────────────╮ 
        // │               get related records                │ 
        // ╰──────────────────────────────────────────────────╯ 
        async getRelatedRecords(module, relatedModule) {
            try {
                const response = await ZOHO.CRM.API.getRelatedRecords({
                    Entity: module,
                    RecordID: mosaic.context.entityId,
                    RelatedList: relatedModule
                });
                return response.data || [];
            } catch (error) {
                mosaic.con.err('mosaic.api.crm.getRelatedRecords() | Error getting related records:', error);
                return [];
            }
        },
    },

    files: {
        // ╭──────────────────────────────────────────────────╮ 
        // │      upload file to zfs (zoho file system)       │ 
        // ╰──────────────────────────────────────────────────╯ 
        async upload(file) {
            try {
                const response = await ZOHO.CRM.API.uploadFile({
                    CONTENT_TYPE: "multipart",
                    PARTS: [{
                        headers: {
                            "Content-Disposition": "file;"
                        },
                        content: "__FILE__"
                    }],
                    FILE: {
                        fileParam: "content",
                        file: file
                    }
                });
                return response;
            } catch (error) {
                mosaic.con.err('mosaic.api.files.upload() | Error uploading file:', error);
                throw error;
            }
        },

        // ╭──────────────────────────────────────────────────╮ 
        // │              upload file using zrc               │ 
        // ╰──────────────────────────────────────────────────╯ 
        async uploadZrc(file) {
            try {
                const formData = new FormData();
                formData.append("file", file);
                const response = await zrc.post('/crm/v8/files', formData);
                return response;
            } catch (error) {
                mosaic.con.err('mosaic.api.files.uploadZrc() | Error uploading file via ZRC:', error);
                throw error;
            }
        },

        // ╭──────────────────────────────────────────────────╮ 
        // │          trigger browser file download           │ 
        // ╰──────────────────────────────────────────────────╯ 
        downloadBlob(blob, filename) {
            const url  = URL.createObjectURL(blob);
            const link = Object.assign(document.createElement('a'), {
                href:     url,
                download: filename
            });
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            mosaic.con.log(`mosaic.api.files.downloadBlob() | Downloaded: ${filename}`);
        },

        // ╭──────────────────────────────────────────────────╮ 
        // │   upload file as attachment to current record    │ 
        // ╰──────────────────────────────────────────────────╯ 
        async uploadAsAttachment(file) {
            await mosaic.api.crm.getEntityApiName(mosaic.context.entity);

            try {
                // try zrc first
                const formData = new FormData();
                formData.append("file", file, file.name);

                const uploadRes = await zrc.post(
                    `/crm/v8/${mosaic.context.entityApiName}/${mosaic.context.entityId}/Attachments`,
                    formData
                );

                mosaic.con.log(`mosaic.api.files.uploadAsAttachment() | ZRC response:`, uploadRes.data);
                return uploadRes;

            } catch (error) {
                mosaic.con.warn(`mosaic.api.files.uploadAsAttachment() | ZRC attachment upload failed, falling back to legacy method:`, error);

                try {
                    const attachConfig = {
                        Entity: mosaic.context.entityApiName,
                        RecordID: mosaic.context.entityId,
                        File: {
                            Name: file.name,
                            Content: file
                        }
                    };

                    const legacyRes = await ZOHO.CRM.API.attachFile(attachConfig);
                    mosaic.con.log(`mosaic.api.files.uploadAsAttachment() | Legacy response:`, legacyRes);
                    return legacyRes;

                } catch (fallbackError) {
                    mosaic.con.err(`mosaic.api.files.uploadAsAttachment() | Both ZRC and legacy attachment upload failed:`, fallbackError);
                    throw fallbackError;
                }
            }
        },

        // ╭──────────────────────────────────────────────────╮
        // │      attach asset to record field (shared)       │
        // ╰──────────────────────────────────────────────────╯
        async attachAssetToField(fileId, fieldName, connection, legacyFieldKey) {
            await mosaic.api.crm.getEntityApiName(mosaic.context.entity);

            try {
                try {
                    const response = await zrc.put(`/crm/v8/${mosaic.context.entityApiName}`, {
                        data: [{
                            id: mosaic.context.entityId,
                            [fieldName]: [{ File_Id__s: fileId }]
                        }]
                    });
                    mosaic.con.log(`mosaic.api.files.attachAssetToField() | ZRC response:`, response);
                    return response;
                } catch (zrcError) {
                    const zrcErrorSnapshot = mosaic.util.object.deepClone(zrcError);
                    const limitError = mosaic.api.errors.getLimitExceededError(zrcError, fieldName);

                    if (limitError) {
                        mosaic.con.warn(`mosaic.api.files.attachAssetToField() | Field limit exceeded:`, zrcErrorSnapshot);
                        throw limitError;
                    }

                    mosaic.con.warn(`mosaic.api.files.attachAssetToField() | ZRC failed, using legacy method:`, zrcErrorSnapshot);

                    if (!connection) throw new Error(`'destination.connection' is required for legacy file upload`);

                    const apiDomain = await mosaic.api.env.getApiDomain();
                    const req_data = {
                        method: "PUT",
                        url: `${apiDomain}/crm/v2.1/${mosaic.context.entityApiName}`,
                        param_type: 2,
                        parameters: {
                            data: [{
                                id: mosaic.context.entityId,
                                [fieldName]: [{ [legacyFieldKey]: fileId }]
                            }]
                        }
                    };

                    const legacyRes = await ZOHO.CRM.CONNECTION.invoke(connection, req_data);
                    mosaic.con.log(`mosaic.api.files.attachAssetToField() | Legacy response:`, legacyRes);
                    return legacyRes;
                }
            } catch (error) {
                if (error.code !== 'LIMIT_EXCEEDED') {
                    mosaic.con.err(`mosaic.api.files.attachAssetToField() | Error:`, error);
                }
                throw error;
            }
        },

        // ╭──────────────────────────────────────────────────╮ 
        // │              attach upload to field              │ 
        // ╰──────────────────────────────────────────────────╯ 
        async attachToField(fileId, fieldName, connection) {
            return mosaic.api.files.attachAssetToField(fileId, fieldName, connection, 'file_id');
        },

        // ╭──────────────────────────────────────────────────╮ 
        // │           attach upload to image field           │ 
        // ╰──────────────────────────────────────────────────╯ 
        async attachImageToField(fileId, fieldName, connection) {
            return mosaic.api.files.attachAssetToField(fileId, fieldName, connection, 'Encrypted_Id');
        },

        // ╭──────────────────────────────────────────────────╮ 
        // │             validate upload response             │ 
        // ╰──────────────────────────────────────────────────╯ 
        validateUploadResponse(response, destType, fileName) {
            if (destType === 'workdrive') {
                const responseData = response?.data?.data?.[0];
                if (!responseData?.attributes?.resource_id) {
                    throw new Error(`Failed to upload ${fileName} to WorkDrive`);
                }
                return {
                    destination: 'workdrive',
                    resource_id: responseData.attributes.resource_id,
                    file_name: responseData.attributes.FileName,
                    permalink: responseData.attributes.Permalink,
                    parent_id: responseData.attributes.parent_id
                };
            } else {
                let responseData = response?.data?.data?.[0]
                    || response?.data?.[0]
                    || response?.details?.statusMessage?.data?.[0];

                if (!responseData || (responseData.code !== "SUCCESS" && responseData.status !== "success")) {
                    throw new Error(responseData?.message || `Failed to upload ${fileName}`);
                }

                return {
                    destination: destType,
                    code: responseData.code,
                    status: responseData.status,
                    message: responseData.message,
                    details: responseData.details
                };
            }
        },
    },

    workdrive: {
        // ╭──────────────────────────────────────────────────╮ 
        // │   get workdrive download domain based on dc      │ 
        // ╰──────────────────────────────────────────────────╯ 
        async getDownloadDomain() {
            if (mosaic.cache.workDriveDownloadDomain) return mosaic.cache.workDriveDownloadDomain;

            const DOWNLOAD_DOMAINS = {
                'US': 'https://download.zoho.com',
                'AU': 'https://download.zoho.com.au',
                'EU': 'https://download.zoho.eu',
                'IN': 'https://download.zoho.in',
                'CN': 'https://download.zoho.com.cn',
                'JP': 'https://download.zoho.jp',
                'CA': 'https://download.zohocloud.ca'
            };

            const countryCode = mosaic.api.env.extractCountryCode(await mosaic.api.env.getDeployment());

            mosaic.cache.workDriveDownloadDomain = DOWNLOAD_DOMAINS[countryCode] || DOWNLOAD_DOMAINS.US;

            mosaic.con.log('mosaic.api.workdrive.getDownloadDomain()', { countryCode, workDriveDownloadDomain: mosaic.cache.workDriveDownloadDomain });

            return mosaic.cache.workDriveDownloadDomain;
        },

        // ╭──────────────────────────────────────────────────╮ 
        // │             upload file to workdrive             │ 
        // ╰──────────────────────────────────────────────────╯ 
        async upload(file, folderId, connection, options = {}) {
            try {
                const workDriveZrc = mosaic.api.zrc.getInstance('workdrive', connection);

                // wrap file in blob
                const fileBlob = new Blob([file], { type: file.type });

                // build formdata
                const formData = new FormData();
                formData.append("filename", file.name);
                formData.append("override-name-exist", options.override_existing !== false ? "true" : "false");
                formData.append("parent_id", String(folderId).trim());
                formData.append("content", fileBlob);

                const response = await workDriveZrc.post("/upload", formData, {
                    headers: {
                        "Content-Type": "multipart/form-data"
                    }
                });

                mosaic.con.log(`mosaic.api.workdrive.upload() | ZRC response:`, response);
                return response;
            } catch (error) {
                mosaic.con.err(`mosaic.api.workdrive.upload() | Error uploading to WorkDrive:`, error);
                throw error;
            }
        },

        // ╭──────────────────────────────────────────────────╮ 
        // │            download file from workdrive          │ 
        // ╰──────────────────────────────────────────────────╯ 
        async download(resourceId, filename, connection, options = {}) {
            try {
                const downloadDomain = await mosaic.api.workdrive.getDownloadDomain();
                const downloadZrc    = mosaic.api.zrc.getInstance('workdrive_download', connection, downloadDomain);
                const responseType   = options.responseType || 'blob';

                mosaic.con.log(`mosaic.api.workdrive.download() | Downloading resource: ${resourceId} from ${downloadDomain}`);

                const response = await downloadZrc.get(`/v1/workdrive/download/${resourceId}`, {
                    responseType: responseType
                });

                mosaic.con.log(`mosaic.api.workdrive.download() | Download successful`, filename);
                // auto-trigger browser download if filename is provided
                if (filename) mosaic.api.files.downloadBlob(response.data, filename);
                return response.data;

            } catch (error) {
                mosaic.con.err(`mosaic.api.workdrive.download() | Error downloading from WorkDrive:`, error);
                throw error;
            }
        },

        // ╭──────────────────────────────────────────────────╮
        // │         list files/folders inside a folder       │
        // ╰──────────────────────────────────────────────────╯
        /**
         * List files and folders inside a WorkDrive folder
         * @param {string} folderId - The unique ID of the folder
         * @param {string} connection - Connection link name (requires WorkDrive.files.READ scope)
         * @param {Object} options - Optional query parameters
         * @param {string} options.filter_type - Filter by resource type (e.g. 'allfiles')
         * @param {string} options.filter_extension - Filter by file extension (e.g. 'docx,jpeg')
         * @param {string} options.filter_external_upload - Set 'false' to exclude externally uploaded folders
         * @param {number} options.page_limit - Number of items to return (max 50)
         * @param {number} options.page_offset - Offset for offset-based pagination
         * @param {string} options.page_next - Cursor token for cursor-based pagination
         * @param {string} options.fields - Comma-separated list of fields to include in the response
         * @param {string} options.sort - Field to sort by. Prefix with '-' for descending (e.g. '-name')
         * @returns {Array} Array of file/folder attribute objects
         */
        async listFiles(folderId, connection, options = {}) {
            try {
                const workDriveZrc = mosaic.api.zrc.getInstance('workdrive', connection);

                const params = {};
                if (options.filter_type)             params['filter[type]']             = options.filter_type;
                if (options.filter_extension)        params['filter[extension]']        = options.filter_extension;
                if (options.filter_external_upload)  params['filter[externalUpload]']   = options.filter_external_upload;
                if (options.page_limit)              params['page[limit]']              = options.page_limit;
                if (options.page_offset !== undefined) params['page[offset]']           = options.page_offset;
                if (options.page_next !== undefined)   params['page[next]']             = options.page_next;
                if (options.fields)                  params['fields[files]']            = options.fields;
                if (options.sort)                    params['sort']                     = options.sort;

                const response = await workDriveZrc.get(`/files/${folderId}/files`, { params });

                mosaic.con.log(`mosaic.api.workdrive.listFiles() | Folder: ${folderId}`, response?.data?.data);
                return response?.data?.data || [];

            } catch (error) {
                mosaic.con.err(`mosaic.api.workdrive.listFiles() | Error listing files for folder ${folderId}:`, error);
                throw error;
            }
        },
    },

    writer: {
        // ╭──────────────────────────────────────────────────╮ 
        // │       convert html to pdf via zoho writer        │ 
        // ╰──────────────────────────────────────────────────╯
        async html2pdf(html, filename, connection) {
            const clean_name = mosaic.util.file.stripExtension(filename || 'document');
            const writerZrc  = mosaic.api.zrc.getInstance('writer', connection);
            const blob       = new Blob([html], { type: 'text/html' });
            const formData   = new FormData();

            formData.append('content',  blob, `${clean_name}.html`);
            formData.append('format',   'pdf');
            formData.append('filename', clean_name);

            mosaic.con.log('mosaic.api.writer.html2pdf() | Converting to PDF:', clean_name);

            const response = await writerZrc.post('/documents/convert', formData, {
                headers:      { 'Content-Type': 'multipart/form-data' },
                responseType: 'blob'
            });

            mosaic.con.log('mosaic.api.writer.html2pdf() | Conversion successful');
            return response.data;
        },
    },

    connection: {
        // ╭──────────────────────────────────────────────────╮ 
        // │            invoke zoho crm connection            │ 
        // ╰──────────────────────────────────────────────────╯ 
        async invoke(connectionName, requestData) {
            try {
                const response = await ZOHO.CRM.CONNECTION.invoke(connectionName, requestData);
                return response;
            } catch (error) {
                mosaic.con.err('mosaic.api.connection.invoke() | Error invoking connection:', error);
                throw error;
            }
        },
    },

    errors: {
        getLimitExceededError(error, fieldName) {
            const errorItems = error?.response?.data?.data;
            if (!Array.isArray(errorItems)) return null;

            const limitItem = errorItems.find(item => {
                if (item?.code !== 'LIMIT_EXCEEDED') return false;
                const apiName = item?.details?.api_name;
                return !apiName || !fieldName || apiName === fieldName;
            });
            if (!limitItem) return null;

            const apiName = limitItem?.details?.api_name || fieldName || 'Upload field';
            const limitError = new Error(`${apiName} is full.`);
            limitError.name = 'MosaicFieldLimitError';
            limitError.code = 'LIMIT_EXCEEDED';
            limitError.fieldName = apiName;
            limitError.details = limitItem.details || {};
            limitError.responseError = limitItem;
            limitError.userMessage = `${apiName} is full. Remove an existing upload from this record before attaching another file.`;
            return limitError;
        },

        // ╭──────────────────────────────────────────────────╮ 
        // │           format zrc error for display           │ 
        // ╰──────────────────────────────────────────────────╯ 
        formatZrcError(error, context) {
            // build detailed error message based on error type
            let errorDetail;

            switch (error.name) {
                case 'ZrcValidationError':
                    errorDetail = `Validation error - ${error.message}`;
                    break;
                case 'ApiError':
                    errorDetail = `API error (${error.status || 'unknown'}) - ${error.message}`;
                    if (error.details) {
                        mosaic.con.err('mosaic.api.errors.formatZrcError() | API Error details:', error.details);
                    }
                    break;
                case 'ConnectionError':
                    errorDetail = `Connection error - ${error.message}. Verify the connection name exists and has required scopes.`;
                    break;
                case 'ZrcError':
                    errorDetail = `Request setup error - ${error.message}`;
                    break;
                default:
                    errorDetail = error.message || 'Unknown error';
            }

            return `${context}: ${errorDetail}`;
        },
    },

};
