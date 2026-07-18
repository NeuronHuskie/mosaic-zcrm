/**
 * ════════════════════════════════════════════════════════════════════════
 *  mosaic.export - table export functionality module
 * ════════════════════════════════════════════════════════════════════════
 */

mosaic.export = {

    state: {
        dropdownOpen: false
    },

    dropdown: {
        toggle() {
            const dropdown = document.getElementById('exportDropdown');
            if (!dropdown) return;

            mosaic.export.state.dropdownOpen = !mosaic.export.state.dropdownOpen;
            dropdown.classList.toggle('show', mosaic.export.state.dropdownOpen);
        },

        close() {
            const dropdown = document.getElementById('exportDropdown');
            if (dropdown) {
                dropdown.classList.remove('show');
                mosaic.export.state.dropdownOpen = false;
            }
        },

        initClickOutsideListener() {
            document.addEventListener('click', (event) => {
                const container = document.querySelector('.export-container');
                if (container && !container.contains(event.target)) {
                    mosaic.export.dropdown.close();
                }
            });
        }
    },

    data: {
        async getCurrentTableData() {
            const columns = mosaic.config.columns || [];
            const sourceData = mosaic.runtime.table.sourceData || [];

            if (!sourceData.length || !columns.length) return [];

            return Promise.all(sourceData.map(async row => {
                const rowData = {};

                for (const col of columns) {
                    const value = mosaic.util.object.resolveDotNotation(row, col.key);
                    rowData[col.header] = value != null ? String(value) : '';

                    if (col.link?.module && col.link?.id_key) {
                        const linkId = mosaic.util.object.resolveDotNotation(row, col.link.id_key);
                        if (linkId) {
                            const linkUrl = await mosaic.util.data.generateRecordLink(col.link.module, linkId);
                            if (linkUrl) rowData[col.header + '.url'] = linkUrl;
                        }
                    }
                }

                return rowData;
            }));
        }
    },

    run: {
        async exportData(format) {
            const data = await mosaic.export.data.getCurrentTableData();

            if (!data || data.length === 0) {
                mosaic.ui.alert.show('No data available to export.');
                return;
            }

            let orgDomainName;

            try {
                orgDomainName = await mosaic.api.env.getOrgDomainName();
            } catch (error) {
                mosaic.con.err(`mosaic.export.run.exportData() | Error fetching organization domain name`, error);
                mosaic.ui.alert.show('Failed to fetch organization information.');
                return;
            }

            const filename = `zcrm-${orgDomainName || 'export'}-${mosaic.util.ids.generateTimestamp()}`;

            switch (format) {
                case 'csv':
                    mosaic.export.formats.csv(data, filename);
                    break;
                case 'xlsx':
                    await mosaic.export.formats.xlsx(data, filename);
                    break;
                case 'pdf':
                    await mosaic.export.formats.pdf(data, filename);
                    break;
                case 'json':
                    mosaic.export.formats.json(data, filename);
                    break;
                default:
                    mosaic.con.warn(`mosaic.export.run.exportData() | Unknown export format: ${format}`);
            }

            mosaic.export.dropdown.close();
        }
    },

    formats: {
        csv(data, filename) {
            if (!data.length) return;

            // get all headers, renaming .url columns to .name/.url pairs
            const allKeys = Object.keys(data[0]);
            const headers = [];

            allKeys.forEach(key => {
                if (key.endsWith('.url')) {
                    const baseName = key.slice(0, -4);
                    headers.push(baseName + '.name', baseName + '.url');
                } else if (!allKeys.includes(key + '.url')) {
                    headers.push(key);
                }
            });

            const csvContent = [
                headers.join(','),
                ...data.map(row =>
                    headers.map(header => {
                        let value;
                        if (header.endsWith('.name')) {
                            value = row[header.slice(0, -5)] || '';
                        } else if (header.endsWith('.url')) {
                            value = row[header.slice(0, -4) + '.url'] || '';
                        } else {
                            value = row[header] || '';
                        }
                        value = String(value);
                        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                            return '"' + value.replace(/"/g, '""') + '"';
                        }
                        return value;
                    }).join(',')
                )
            ].join('\n');

            mosaic.export.files.download(csvContent, `${filename}.csv`, 'text/csv;charset=utf-8;');
        },

        // ╭──────────────────────────────────────────────────╮
        // │          export to excel (xlsx) format           │
        // ╰──────────────────────────────────────────────────╯,

        async xlsx(data, filename) {
            await mosaic.util.libs.load('xlsx');

            if (typeof XLSX === 'undefined') {
                mosaic.ui.alert.show('Excel export library (SheetJS) is not loaded. Please refresh the page and try again.');
                return;
            }

            // get headers excluding .url columns (they'll become hyperlinks)
            const allKeys = Object.keys(data[0]);
            const headers = allKeys.filter(key => !key.endsWith('.url'));

            // build worksheet data with hyperlinks
            const wsData = [headers];
            data.forEach(row => {
                wsData.push(headers.map(header => {
                    const value = row[header] != null ? String(row[header]) : '';
                    const url = row[header + '.url'];
                    return url ? { t: 's', v: value, l: { Target: url } } : value;
                }));
            });

            const ws = XLSX.utils.aoa_to_sheet(wsData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Records');

            // auto-size columns for better readability
            const range = XLSX.utils.decode_range(ws['!ref']);
            const colWidths = [];
            for (let C = range.s.c; C <= range.e.c; ++C) {
                let maxWidth = 10;
                for (let R = range.s.r; R <= range.e.r; ++R) {
                    const cell = ws[XLSX.utils.encode_cell({r: R, c: C})];
                    if (cell?.v) {
                        const cellLength = cell.v.toString().length;
                        if (cellLength > maxWidth) maxWidth = Math.min(cellLength, 50);
                    }
                }
                colWidths.push({wch: maxWidth});
            }
            ws['!cols'] = colWidths;

            XLSX.writeFile(wb, `${filename}.xlsx`);
        },

        async pdf(data, filename) {
            try {
                await mosaic.util.libs.load('jspdf');
                await mosaic.util.libs.load('jspdfTable');

                const jsPDFConstructor = window.jspdf?.jsPDF;

                if (!jsPDFConstructor) {
                    mosaic.ui.alert.show('PDF export library is not loaded. Please refresh the page and try again.');
                    return;
                }

                const doc = new jsPDFConstructor({ orientation: 'landscape', unit: 'mm', format: 'a4' });

                if (typeof doc.autoTable !== 'function') {
                    mosaic.ui.alert.show('PDF table plugin is not loaded. Please refresh the page and try again.');
                    return;
                }

                const title = mosaic.config.title || 'Data Export';
                doc.setFontSize(14);
                doc.text(title, 14, 15);
                doc.setFontSize(8);
                doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);

                if (!data.length) {
                    doc.setFontSize(10);
                    doc.text('No data to export', 14, 35);
                } else {
                    const headers = Object.keys(data[0]).filter(key => !key.endsWith('.url'));

                    const processedRows = data.map(row => {
                        return headers.map(header => {
                            const value = row[header] == null ? '' : String(row[header]);
                            const truncated = value.length > 50 ? value.substring(0, 47) + '...' : value;
                            const url = row[header + '.url'];
                            return url ? { text: truncated, url } : truncated;
                        });
                    });

                    doc.autoTable({
                        head: [headers],
                        body: processedRows,
                        startY: 30,
                        theme: 'striped',
                        styles: {
                            fontSize: 7,
                            cellPadding: 1.5,
                            overflow: 'linebreak'
                        },
                        headStyles: {
                            fillColor: [18, 18, 18],
                            textColor: [217, 217, 217],
                            fontStyle: 'bold',
                            fontSize: 7
                        },
                        alternateRowStyles: { fillColor: [239, 239, 239] },
                        margin: { top: 30, left: 10, right: 10, bottom: 20 },
                        tableLineWidth: 0,
                        didParseCell: function(cellData) {
                            if (cellData.cell.raw?.url) {
                                cellData.cell.text = cellData.cell.raw.text;
                                cellData.cell.styles.textColor = [17, 85, 204];
                            }
                        },
                        didDrawCell: function(cellData) {
                            if (cellData.cell.raw?.url) {
                                doc.link(cellData.cell.x, cellData.cell.y, cellData.cell.width, cellData.cell.height, {
                                    url: cellData.cell.raw.url,
                                    newWindow: true
                                });
                            }

                            if (cellData.column.index === cellData.table.columns.length - 1) {
                                doc.setDrawColor(200, 200, 200);
                                doc.setLineWidth(0.1);
                                doc.line(
                                    cellData.table.settings.margin.left,
                                    cellData.cell.y + cellData.cell.height,
                                    doc.internal.pageSize.width - cellData.table.settings.margin.right,
                                    cellData.cell.y + cellData.cell.height
                                );
                            }
                        }
                    });
                }

                const totalPages = doc.internal.getNumberOfPages();
                for (let i = 1; i <= totalPages; i++) {
                    doc.setPage(i);
                    doc.setFontSize(8);
                    doc.text(
                        `Page ${i} of ${totalPages}`,
                        doc.internal.pageSize.width - 30,
                        doc.internal.pageSize.height - 10
                    );
                }

                doc.save(`${filename}.pdf`);
            } catch (error) {
                mosaic.con.err(`mosaic.export.formats.pdf() | PDF generation error`, error);
                mosaic.ui.alert.show('An error occurred while generating the PDF: ' + error.message);
            }
        },

        json(data, filename) {
            // transform .url columns to .name/.url pairs
            const cleanData = data.map(row => {
                const cleanRow = {};
                const urlKeys = Object.keys(row).filter(key => key.endsWith('.url'));

                Object.keys(row).forEach(key => {
                    if (key.endsWith('.url')) {
                        const baseName = key.slice(0, -4);
                        cleanRow[baseName + '.name'] = row[baseName] || '';
                        cleanRow[baseName + '.url'] = row[key];
                    } else if (!urlKeys.includes(key + '.url')) {
                        cleanRow[key] = row[key];
                    }
                });

                return cleanRow;
            });

            const jsonContent = JSON.stringify(cleanData, null, 4);
            mosaic.export.files.download(jsonContent, `${filename}.json`, 'application/json');
        }
    },

    files: {
        download(content, filename, mimeType) {
            mosaic.api.files.downloadBlob(new Blob([content], { type: mimeType }), filename);
        }
    },

    controls: {
        buildButton() {
            return `
                <div class="export-container">
                    <button type="button" class="export-btn" title="Export data" onclick="mosaic.export.dropdown.toggle()">
                        <i class="fa-solid fa-download" aria-hidden="true"></i>
                    </button>
                    <div class="export-dropdown" id="exportDropdown">
                        <div class="export-option" onclick="mosaic.export.run.exportData('csv')">
                            <i class="fa-solid fa-file-csv export-icon"></i>
                            <span>CSV</span>
                        </div>
                        <div class="export-option" onclick="mosaic.export.run.exportData('xlsx')">
                            <i class="fa-solid fa-file-excel export-icon"></i>
                            <span>Excel (XLSX)</span>
                        </div>
                        <div class="export-option" onclick="mosaic.export.run.exportData('pdf')">
                            <i class="fa-solid fa-file-pdf export-icon"></i>
                            <span>PDF</span>
                        </div>
                        <div class="export-option" onclick="mosaic.export.run.exportData('json')">
                            <i class="fa-solid fa-file-code export-icon"></i>
                            <span>JSON</span>
                        </div>
                    </div>
                </div>`;
        }
    },
};

// ╭─────────────────────────────────────────────────────────╮
// │   initialize click-outside listener when dom is ready   │
// ╰─────────────────────────────────────────────────────────╯
document.addEventListener('DOMContentLoaded', () => {
    mosaic.export.dropdown.initClickOutsideListener();
});
