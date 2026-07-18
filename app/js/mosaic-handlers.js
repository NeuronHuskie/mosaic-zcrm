/**
 * ════════════════════════════════════════════════════════════════════════
 *  mosaic.handlers - event handlers and submission logic module
 * ════════════════════════════════════════════════════════════════════════
 */

mosaic.handlers = {

    submit: {
        // ╭──────────────────────────────────────────────────╮
        // │               submit form handler                │
        // ╰──────────────────────────────────────────────────╯
        async form(clickedButtonText, skipMode = '', value = '') {
            const returnType = mosaic.config.allow_multiple !== false ? 'array' : 'object';

            // ───────────────────────────────────────────────────────────────
            //      handle cancel action
            // ───────────────────────────────────────────────────────────────
            if (skipMode === 'cancel') {
                mosaic.respond({
                    success: false,
                    cancelled: true,
                    type: mosaic.config.type,
                    button_clicked: { label: clickedButtonText, value: value || clickedButtonText },
                    data: returnType === 'array' ? [] : {}
                });
                return;
            }

            const form = document.getElementById('mosaicForm');
            if (!form) {
                mosaic.con.err(`mosaic.handlers.submit.form() | Form element not found.`);
                return;
            }

            // ───────────────────────────────────────────────────────────────
            //      handle capture (back navigation in multi-page forms)
            // ───────────────────────────────────────────────────────────────
            if (skipMode === 'capture') {
                const result = await mosaic.validators.groups.form.validate(form, mosaic.config.fields, {
                    userDateFormat: mosaic.cache.userDateFormat
                });
                mosaic.respond({
                    success: true,
                    type: 'form',
                    button_clicked: { label: clickedButtonText, value: value || clickedButtonText },
                    data: result.data
                });
                return;
            }

            mosaic.ui.status.clear();

            // ───────────────────────────────────────────────────────────────
            //      manage button state
            // ───────────────────────────────────────────────────────────────
            const allButtons = document.getElementById('buttonContainer').querySelectorAll('button');
            const primaryButton = Array.from(allButtons).find(btn => btn.textContent === clickedButtonText);

            const setButtonsDisabled = (disabled, processingText = null) => {
                allButtons.forEach(btn => btn.disabled = disabled);
                if (primaryButton && processingText) {
                    primaryButton.textContent = processingText;
                } else if (primaryButton && !disabled) {
                    primaryButton.textContent = clickedButtonText;
                }
            };

            // ───────────────────────────────────────────────────────────────
            //      validate form fields
            // ───────────────────────────────────────────────────────────────
            const validationResult = await mosaic.validators.groups.form.validate(form, mosaic.config.fields, {
                userDateFormat: mosaic.cache.userDateFormat
            });

            if (!validationResult.valid) {
                mosaic.ui.alert.showValidationErrors(validationResult.errors);
                return;
            }

            const data = validationResult.data;

            // ───────────────────────────────────────────────────────────────
            //      collect files for upload
            // ───────────────────────────────────────────────────────────────
            const filesToUpload = [];
            for (const field of mosaic.runtime.form.flatFields) {
                if (field.type === 'file') {
                    const fileInput = form.querySelector(`input${mosaic.util.fields.nameSelector(field.name)}`);
                    if (fileInput?.files.length > 0) {
                        Array.from(fileInput.files).forEach(file => filesToUpload.push({
                            fieldConfig: field,
                            file
                        }));
                    }
                }
            }

            // ───────────────────────────────────────────────────────────────
            //      validate required files
            // ───────────────────────────────────────────────────────────────
            const missingFileFields = mosaic.runtime.form.flatFields.filter(field => {
                if (field.type !== 'file' || !field.required) return false;
                return !filesToUpload.some(f => f.fieldConfig.name === field.name);
            }).map(field => field.label);

            if (missingFileFields.length > 0) {
                const fileErrors = missingFileFields.map(label => `${label}: Please select a file`);
                mosaic.ui.alert.showValidationErrors(fileErrors);
                return;
            }

            setButtonsDisabled(true, filesToUpload.length > 0 ? 'Processing...' : null);

            try {
                // ───────────────────────────────────────────────────────────────
                //      handle file uploads
                // ───────────────────────────────────────────────────────────────
                const fileResultMap = {};
                for (const { fieldConfig, file: originalFile } of filesToUpload) {
                    const filenameSpecified = fieldConfig.filename && !fieldConfig.multiple;
                    if (fieldConfig.filename && fieldConfig.multiple) {
                        mosaic.con.warn(`mosaic.handlers.submit.form() | filename ignored when multiple=true (field: ${fieldConfig.name})`);
                    }
                    const extension      = mosaic.util.file.getExtension(originalFile.name);
                    const outputFilename = filenameSpecified
                        ? fieldConfig.filename + extension
                        : originalFile.name;
                    const finalFile      = new File([originalFile], outputFilename, { type: originalFile.type });

                    mosaic.ui.status.show(`Processing ${finalFile.name}...`, 'info');

                    const destType    = fieldConfig.destination?.type || 'attachment';
                    const response    = await mosaic.handlers.uploads.route(finalFile, fieldConfig);
                    mosaic.con.log(`mosaic.handlers.submit.form() | uploadFileHandler response`, response);
                    const uploadResult = mosaic.api.files.validateUploadResponse(response, destType, finalFile.name);

                    if (fieldConfig.multiple) {
                        fileResultMap[fieldConfig.name] ??= [];
                        fileResultMap[fieldConfig.name].push(uploadResult);
                    } else {
                        fileResultMap[fieldConfig.name] = uploadResult;
                    }
                }
                Object.assign(data, fileResultMap);

                if (filesToUpload.length > 0) {
                    const uploadedFileNames = filesToUpload.map(f => {
                        const useDefault = f.fieldConfig.filename && !f.fieldConfig.multiple;
                        const ext = mosaic.util.file.getExtension(f.file.name);
                        return useDefault ? f.fieldConfig.filename + ext : f.file.name;
                    });
                    mosaic.ui.status.show(`Successfully processed: ${uploadedFileNames.join(', ')}`, 'success');
                    await new Promise(resolve => setTimeout(resolve, 1500));
                }

                // ───────────────────────────────────────────────────────────────
                //      submit form
                // ───────────────────────────────────────────────────────────────
                mosaic.ui.status.clear();
                mosaic.con.log(`mosaic.handlers.submit.form() | Form data prepared`, data);

                mosaic.respond({
                    type: 'form',
                    data: data,
                    success: true,
                    button_clicked: { label: clickedButtonText, value: value || clickedButtonText },
                    files_uploaded: filesToUpload.length > 0
                });

            } catch (error) {
                if (error.userMessage) {
                    if (!error.userNotified) mosaic.ui.alert.show(error.userMessage);
                    mosaic.ui.status.clear();
                    setButtonsDisabled(false);
                    return;
                }

                mosaic.con.err(`mosaic.handlers.submit.form() | Error during form submission`, error);
                mosaic.ui.status.show(error.message || "An error occurred during submission", 'error');
                setButtonsDisabled(false);
            }
        },

        // ╭──────────────────────────────────────────────────╮
        // │               submit table handler               │
        // ╰──────────────────────────────────────────────────╯
        async table(clickedButtonText, skipMode = '', value = '') {
            const returnType = mosaic.config.allow_multiple !== false ? 'array' : 'object';

            // ───────────────────────────────────────────────────────────────
            //      handle cancel action
            // ───────────────────────────────────────────────────────────────
            if (skipMode === 'cancel') {
                mosaic.respond({
                    success: false,
                    cancelled: true,
                    type: mosaic.config.type,
                    button_clicked: { label: clickedButtonText, value: value || clickedButtonText },
                    data: returnType === 'array' ? [] : {}
                });
                return;
            }

            const selectedInputs = document.querySelectorAll('input[name="table_selection"]:checked');

            // ───────────────────────────────────────────────────────────────
            //      validate selection limit
            // ───────────────────────────────────────────────────────────────
            if (mosaic.config.selection_limit > 0 && selectedInputs.length > mosaic.config.selection_limit) {
                mosaic.ui.alert.show(`You can select a maximum of ${mosaic.config.selection_limit} record(s).`);
                return;
            }

            // ───────────────────────────────────────────────────────────────
            //      validate required selection
            // ───────────────────────────────────────────────────────────────
            if (mosaic.config.required && selectedInputs.length === 0) {
                mosaic.ui.alert.show("Please select at least one record.");
                return;
            }

            // ───────────────────────────────────────────────────────────────
            //      get selected data
            // ───────────────────────────────────────────────────────────────
            let selectedData;
            if (returnType === 'array') {
                selectedData = Array.from(selectedInputs).map(input => {
                    const rowIndex = parseInt(input.getAttribute('data-record-index'));
                    return mosaic.runtime.table.sourceData[rowIndex];
                });
            } else {
                if (selectedInputs.length > 0) {
                    const rowIndex = parseInt(selectedInputs[0].getAttribute('data-record-index'));
                    selectedData = mosaic.runtime.table.sourceData[rowIndex];
                } else {
                    selectedData = null;
                }
            }

            mosaic.con.log(`mosaic.handlers.submit.table() | Selected data`, selectedData);

            // ───────────────────────────────────────────────────────────────
            //      submit table
            // ───────────────────────────────────────────────────────────────
            mosaic.respond({
                success: true,
                type: mosaic.config.type,
                data: selectedData,
                button_clicked: { label: clickedButtonText, value: value || clickedButtonText }
            });
        },

        // ╭──────────────────────────────────────────────────╮
        // │   submit dialog handler [confirmation/message]   │
        // ╰──────────────────────────────────────────────────╯
        async dialog(clickedButtonText, skipMode = '', value = '') {
            const returnType = mosaic.config.allow_multiple !== false ? 'array' : 'object';

            if (skipMode === 'cancel') {
                mosaic.respond({
                    success: false,
                    cancelled: true,
                    type: mosaic.config.type,
                    button_clicked: { label: clickedButtonText, value: value || clickedButtonText },
                    data: returnType === 'array' ? [] : {}
                });
            } else {
                mosaic.respond({
                    success: true,
                    type: mosaic.config.type,
                    button_clicked: { label: clickedButtonText, value: value || clickedButtonText },
                    data: []
                });
            }
        },

        // ╭──────────────────────────────────────────────────╮
        // │           submit confirmation handler            │
        // ╰──────────────────────────────────────────────────╯
        async confirmation(clickedButtonText, skipMode = '', value = '') {
            mosaic.con.log(`mosaic.handlers.submit.confirmation() | Button clicked: ${clickedButtonText}`);
            return mosaic.handlers.submit.dialog(clickedButtonText, skipMode, value);
        },

        // ╭──────────────────────────────────────────────────╮
        // │              submit message handler              │
        // ╰──────────────────────────────────────────────────╯
        async message(clickedButtonText, skipMode = '', value = '') {
            mosaic.con.log(`mosaic.handlers.submit.message() | Button clicked: ${clickedButtonText}`);
            return mosaic.handlers.submit.dialog(clickedButtonText, skipMode, value);
        },

        // ╭──────────────────────────────────────────────────╮
        // │               submit html handler                │
        // ╰──────────────────────────────────────────────────╯
        async html(clickedButtonText, value = '') {
            mosaic.con.log('mosaic.handlers.submit.html() | Button clicked:', { label: clickedButtonText, value: value || '(auto)' });

            if (value === 'download') { await mosaic.html.downloads.asPdf(); return; }
            if (value === 'print')    { mosaic.html.print.openWindow(); mosaic.html.state.hasPrinted = true; return; }
            if (value)                { mosaic.html.actions.close(true, clickedButtonText, { value }); return; }

            const btn_lower = clickedButtonText.toLowerCase();

            // ── download pdf (delegated to mosaic.pdf) ───────────────────
            if (btn_lower.includes('download') || btn_lower.includes('pdf')) {
                await mosaic.html.downloads.asPdf();
                return;
            }

            // ── print ────────────────────────────────────────────────────
            if (btn_lower.includes('print')) {
                mosaic.html.print.openWindow();
                mosaic.html.state.hasPrinted = true;
                return;
            }

            // ── close (or any other terminal button) ─────────────────────
            mosaic.html.actions.close(true, clickedButtonText);
        },

        // ╭──────────────────────────────────────────────────╮
        // │                submit pdf handler                │
        // ╰──────────────────────────────────────────────────╯
        async pdf(clickedButtonText, value = '') {
            mosaic.con.log('mosaic.handlers.submit.pdf() | Button clicked:', { label: clickedButtonText, value: value || '(auto)' });

            if (value === 'download') { await mosaic.pdf.downloads.current(); return; }
            if (value === 'print') {
                mosaic.pdf.state.hasPrinted = true;
                const iframe = document.querySelector('.pdf-iframe');
                if (iframe?.contentWindow) iframe.contentWindow.print();
                return;
            }
            if (value) { mosaic.pdf.actions.close(true, clickedButtonText, { value }); return; }

            const btn_lower = clickedButtonText.toLowerCase();

            // ── download pdf ──────────────────────────────────────────────────────
            if (btn_lower.includes('download') || btn_lower.includes('save')) {
                await mosaic.pdf.downloads.current();
                return;
            }

            // ── print ─────────────────────────────────────────────────────────────
            if (btn_lower.includes('print')) {
                mosaic.pdf.state.hasPrinted = true;
                const iframe = document.querySelector('.pdf-iframe');
                if (iframe?.contentWindow) iframe.contentWindow.print();
                return;
            }

            // ── close (or any other terminal button) ─────────────────────
            mosaic.pdf.actions.close(true, clickedButtonText);
        },

        // ╭──────────────────────────────────────────────────╮
        // │             submit launcher handler              │
        // ╰──────────────────────────────────────────────────╯
        async launcher(clickedButtonText, skipMode = '', value = '') {
            mosaic.con.debug(`mosaic.handlers.submit.launcher()`, `Button clicked: ${clickedButtonText}`);

            if (skipMode === 'cancel') {
                mosaic.respond({
                    success: false,
                    cancelled: true,
                    type: 'launcher',
                    button_clicked: { label: clickedButtonText, value: value || clickedButtonText },
                    data: null
                });
                return;
            }

            mosaic.respond({
                success: true,
                type: 'launcher',
                button_clicked: { label: clickedButtonText, value: value || clickedButtonText },
                data: null
            });
        },
    },

    uploads: {
        async route(file, fieldConfig) {
            const destType = fieldConfig.destination?.type || 'attachment';

            switch (destType) {
                case 'workdrive':
                    return await mosaic.handlers.uploads.toWorkDrive(file, fieldConfig);
                case 'field':
                    // check field_type for image vs file upload
                    return fieldConfig.destination?.field_type === 'image' ?
                        await mosaic.handlers.uploads.toImageField(file, fieldConfig) :
                        await mosaic.handlers.uploads.toFileField(file, fieldConfig);
                case 'attachment':
                default:
                    return await mosaic.handlers.uploads.toAttachment(file, fieldConfig);
            }
        },

        async toFileField(file, fieldConfig) {
            return await mosaic.handlers.uploads.toRecordField(file, fieldConfig, {
                fieldKind: 'file',
                attach: mosaic.api.files.attachToField.bind(mosaic.api.files),
                missingFieldMessage: 'destination.field_name is required for field uploads',
                uploadFailureMessage: 'Failed to upload file',
                logContext: 'mosaic.handlers.uploads.toFileField()',
                errorMessage: `Failed to upload ${file.name}`
            });
        },

        async toImageField(file, fieldConfig) {
            return await mosaic.handlers.uploads.toRecordField(file, fieldConfig, {
                fieldKind: 'image',
                attach: mosaic.api.files.attachImageToField.bind(mosaic.api.files),
                missingFieldMessage: 'destination.field_name is required for image uploads',
                uploadFailureMessage: 'Failed to upload image',
                logContext: 'mosaic.handlers.uploads.toImageField()',
                errorMessage: `Failed to upload image ${file.name}`
            });
        },

        async toRecordField(file, fieldConfig, options) {
            mosaic.ui.status.show(`Uploading ${file.name}...`, 'info');

            const targetField = fieldConfig.destination?.field_name;
            if (!targetField) throw new Error(options.missingFieldMessage);

            const connection = fieldConfig.destination?.connection;

            try {
                const uploadResponse = await mosaic.api.files.uploadZrc(file);
                mosaic.con.log(`${options.logContext} | Upload response`, uploadResponse);
                const fileData = uploadResponse?.data?.data?.[0];
                const fileId = fileData?.details?.id;

                if (!fileId || fileData?.code !== "SUCCESS") throw new Error(fileData?.message || options.uploadFailureMessage);
                mosaic.con.log(`${options.logContext} | ${options.fieldKind} uploaded - File ID: ${fileId}`);

                mosaic.ui.status.show(`Attaching ${file.name} to record...`, 'info');
                await options.attach(fileId, targetField, connection);
                mosaic.ui.status.show(`${file.name} uploaded successfully`, 'success');
                return uploadResponse;
            } catch (error) {
                if (error.userMessage) {
                    if (!error.userNotified) mosaic.ui.alert.show(error.userMessage);
                    error.userNotified = true;
                    throw error;
                }

                mosaic.con.err(`${options.logContext} | ${options.fieldKind} upload error:`, error);
                throw new Error(mosaic.api.errors.formatZrcError(error, options.errorMessage));
            }
        },

        async toAttachment(file, fieldConfig) {
            mosaic.ui.status.show(`Attaching ${file.name}...`, 'info');

            try {
                const uploadRes = await mosaic.api.files.uploadAsAttachment(file);
                mosaic.ui.status.show(`${file.name} attached successfully`, 'success');
                return uploadRes;
            } catch (error) {
                mosaic.con.err('mosaic.handlers.uploads.toAttachment() | File attachment error:', error);
                throw new Error(mosaic.api.errors.formatZrcError(error, `Failed to attach ${file.name}`));
            }
        },

        async toWorkDrive(file, fieldConfig) {
            try {
                mosaic.ui.status.show(`Uploading ${file.name} to WorkDrive...`, 'info');

                const folderId = fieldConfig.destination?.folder_id;
                const connection = fieldConfig.destination?.connection;

                if (!folderId) throw new Error("destination.folder_id is required for WorkDrive uploads");
                if (!connection) throw new Error("destination.connection is required for WorkDrive uploads");

                mosaic.con.log('mosaic.handlers.uploads.toWorkDrive() | WorkDrive upload config:', {
                    fileName: file.name,
                    folderId,
                    connection,
                    fileType: file.type,
                    fileSize: file.size
                });

                const uploadRes = await mosaic.api.workdrive.upload(file, folderId, connection, {
                    override_existing: fieldConfig.destination.override_existing
                });

                mosaic.con.log('mosaic.handlers.uploads.toWorkDrive() | WorkDrive upload response:', uploadRes);

                const fileData = uploadRes?.data?.data?.[0];

                if (!fileData || !fileData.attributes) {
                    mosaic.con.err('mosaic.handlers.uploads.toWorkDrive() | Invalid WorkDrive response structure:', uploadRes);
                    throw new Error("Failed to upload file to WorkDrive - invalid response");
                }

                const resourceId = fileData.attributes.resource_id;
                const fileName = fileData.attributes.FileName;
                const permalink = fileData.attributes.Permalink;

                mosaic.con.log(`mosaic.handlers.uploads.toWorkDrive() | File uploaded to WorkDrive.`, {
                    resourceId,
                    fileName,
                    permalink
                });
                mosaic.ui.status.show(`${file.name} uploaded to WorkDrive`, 'success');

                return uploadRes;

            } catch (error) {
                mosaic.con.err('mosaic.handlers.uploads.toWorkDrive() | WorkDrive upload error:', error);
                throw new Error(mosaic.api.errors.formatZrcError(error, `Failed to upload ${file.name} to WorkDrive`));
            }
        },
    },

    keyboard: {
        setup() {
            document.addEventListener('keydown', (e) => {
                const {
                    key,
                    target,
                    altKey,
                    shiftKey
                } = e;

                // ── alert box handling (blocking priority) ────────────────────────────
                if ((key === 'Escape' || key === 'Enter') && document.getElementById("customAlert")?.classList.contains("show")) {
                    e.preventDefault();
                    e.stopPropagation();
                    mosaic.ui.alert.close();
                    mosaic.ui.focus.restore();
                    return;
                }

                // ── button navigation ─────────────────────────────────────────────────
                if (key.startsWith('Arrow')) {
                    const btnContainer = document.getElementById('buttonContainer');
                    const activeEl = document.activeElement;

                    // only proceed if focus is on a button inside our container
                    if (activeEl.tagName === 'BUTTON' && btnContainer?.contains(activeEl)) {
                        e.preventDefault();
                        const buttons = Array.from(btnContainer.querySelectorAll('button:not([disabled])'));

                        if (buttons.length) {
                            const currIndex = buttons.indexOf(activeEl);
                            const direction = (key === 'ArrowRight' || key === 'ArrowDown') ? 1 : -1;
                            const nextIndex = (currIndex + direction + buttons.length) % buttons.length;
                            buttons[nextIndex].focus();
                        }
                    }
                    return;
                }

                // ── general shortcuts ─────────────────────────────────────────────────
                switch (key) {
                    // toggle dark mode
                    case 'd':
                    case 'D':
                        if (altKey) {
                            e.preventDefault();
                            mosaic.theme.mode.toggle();
                        }
                        break;

                    // ── submit form ───────────────────────────────────────────────────────
                    case 'Enter':
                        if (!shiftKey && mosaic.config.submit_on_enter) {
                            // ignore specific elements where enter has native meaning
                            if (['TEXTAREA', 'BUTTON'].includes(target.tagName) || target.id === 'tableSearchInput') return;
                            e.preventDefault();

                            // flush any pending field values (date, time, datetime, phone)
                            // by triggering blur on the focused element before submitting
                            if (target && typeof target.blur === 'function') target.blur();

                            // allow blur handlers (including async ones) to settle before submitting
                            setTimeout(() => {
                                // scope to the footer - inline form buttons share the .btn class
                                const primaryBtn = document.querySelector('#buttonContainer .btn:not(.cancel):not(.secondary):not(.destructive)');
                                if (primaryBtn && !primaryBtn.disabled) primaryBtn.click();
                            }, 50);
                        }
                        break;

                    // ── close widget ──────────────────────────────────────────────────────
                    case 'Escape':
                        if (mosaic.config.close_on_escape) {
                            mosaic.con.log('mosaic.handlers.keyboard.setup() | Escape key pressed - closing widget.');
                            if (mosaic.context.isFlyout) {
                                mosaic.respond(mosaic.flyout.responses.buildDismissResponse());
                            } else {
                                $Client.close(null);
                            }
                        }
                        break;
                }
            });

        },
    },

};
