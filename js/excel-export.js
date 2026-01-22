/**
 * Excel Export Module
 * Uses xlsx-js-style for Excel files with formatting
 */

// Style definitions
const STYLES = {
    header: {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '1E3A8A' } },  // Dark navy blue
        alignment: { horizontal: 'center', vertical: 'center' }
    },
    companyName: {
        font: { bold: true }
    },
    number: {
        numFmt: '0.00'
    }
};

// Generate Excel file from financial data
function generateExcel(data, userInfo, selectedMetrics, fiscalYear) {
    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Create Sheet 1: Financial Ratios
    const ratiosSheet = createRatiosSheet(data, selectedMetrics);
    XLSX.utils.book_append_sheet(workbook, ratiosSheet, 'Financial Ratios');

    // Create Sheet 2: Metadata
    const metadataSheet = createMetadataSheet(data, userInfo, selectedMetrics, fiscalYear);
    XLSX.utils.book_append_sheet(workbook, metadataSheet, 'Metadata');

    // Generate filename
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `financial_analysis_${fiscalYear}_${timestamp}.xlsx`;

    // Write and download
    XLSX.writeFile(workbook, filename);

    return filename;
}

// Create the Financial Ratios sheet
function createRatiosSheet(data, selectedMetrics) {
    // Build header row
    const headers = ['Company Name', 'Ticker', 'Filing Date'];

    // Add selected metric names to headers
    for (const metricKey of selectedMetrics) {
        const ratio = FINANCIAL_RATIOS[metricKey];
        if (ratio) {
            headers.push(ratio.name);
        }
    }

    // Build data rows
    const rows = [headers];

    for (const result of data) {
        const row = [
            result.company.name,
            result.company.ticker,
            result.data?.filingDate || 'N/A'
        ];

        // Add ratio values
        for (const metricKey of selectedMetrics) {
            if (result.ratios && result.ratios[metricKey]) {
                const ratioResult = result.ratios[metricKey];
                // Use raw value for Excel (for calculations), formatted as number
                row.push(ratioResult.value !== null ? ratioResult.value : 'N/A');
            } else {
                row.push('N/A');
            }
        }

        rows.push(row);
    }

    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(rows);

    // Set column widths
    const colWidths = [
        { wch: 30 },  // Company Name
        { wch: 10 },  // Ticker
        { wch: 12 }   // Filing Date
    ];

    // Add widths for metric columns
    for (let i = 0; i < selectedMetrics.length; i++) {
        colWidths.push({ wch: 18 });
    }

    worksheet['!cols'] = colWidths;

    // Apply header row styling (row 0)
    for (let colIdx = 0; colIdx < headers.length; colIdx++) {
        const cellRef = XLSX.utils.encode_cell({ r: 0, c: colIdx });
        if (worksheet[cellRef]) {
            worksheet[cellRef].s = STYLES.header;
        }
    }

    // Apply company name styling (column 0, bold) and number formatting
    for (let rowIdx = 1; rowIdx < rows.length; rowIdx++) {
        // Bold company name (first column)
        const companyCell = XLSX.utils.encode_cell({ r: rowIdx, c: 0 });
        if (worksheet[companyCell]) {
            worksheet[companyCell].s = STYLES.companyName;
        }

        // Format number cells (metric columns)
        for (let colIdx = 3; colIdx < headers.length; colIdx++) {
            const cellRef = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx });
            if (worksheet[cellRef] && typeof worksheet[cellRef].v === 'number') {
                worksheet[cellRef].t = 'n';
                worksheet[cellRef].z = '0.00';
            }
        }
    }

    // Freeze the header row (row 1 frozen, so rows below scroll)
    if (!worksheet['!views']) worksheet['!views'] = [{}];
    worksheet['!views'][0].state = 'frozen';
    worksheet['!views'][0].ySplit = 1;
    worksheet['!views'][0].topLeftCell = 'A2';
    worksheet['!views'][0].activeCell = 'A2';

    return worksheet;
}

// Create the Metadata sheet
function createMetadataSheet(data, userInfo, selectedMetrics, fiscalYear) {
    const timestamp = new Date().toISOString();

    const metadataRows = [
        ['Financial Analysis Report Metadata'],
        [],
        ['Report Information'],
        ['Generated At', timestamp],
        ['Fiscal Year', fiscalYear],
        ['Total Companies', data.length],
        ['Successful Fetches', data.filter(d => d.success).length],
        ['Failed Fetches', data.filter(d => !d.success).length],
        [],
        ['User Information'],
        ['Name', userInfo.name],
        ['Email', userInfo.email],
        ['Purpose', userInfo.purpose || 'Not specified'],
        [],
        ['Selected Metrics'],
    ];

    // Add selected metrics
    for (const metricKey of selectedMetrics) {
        const ratio = FINANCIAL_RATIOS[metricKey];
        if (ratio) {
            metadataRows.push([ratio.name, ratio.formula]);
        }
    }

    metadataRows.push([]);
    metadataRows.push(['Company Filing Dates']);
    metadataRows.push(['Company', 'Ticker', 'CIK', 'Filing Date', 'Status']);

    // Add filing info for each company
    for (const result of data) {
        metadataRows.push([
            result.company.name,
            result.company.ticker,
            result.company.cik,
            result.data?.filingDate || 'N/A',
            result.success ? 'Success' : `Error: ${result.error}`
        ]);
    }

    metadataRows.push([]);
    metadataRows.push(['Data Source']);
    metadataRows.push(['Source', 'SEC EDGAR XBRL API']);
    metadataRows.push(['URL', 'https://www.sec.gov/edgar']);
    metadataRows.push(['Disclaimer', 'This data is provided for educational and research purposes only.']);

    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(metadataRows);

    // Set column widths
    worksheet['!cols'] = [
        { wch: 25 },
        { wch: 50 },
        { wch: 15 },
        { wch: 15 },
        { wch: 30 }
    ];

    // Merge cells for title
    worksheet['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }
    ];

    // Style the title row
    const titleCell = worksheet['A1'];
    if (titleCell) {
        titleCell.s = {
            font: { bold: true, sz: 14, color: { rgb: 'FFFFFF' } },
            fill: { fgColor: { rgb: '1E3A8A' } },
            alignment: { horizontal: 'center', vertical: 'center' }
        };
    }

    // Style section headers (rows with single cell that are labels)
    const sectionRows = [2, 9, 14]; // "Report Information", "User Information", "Selected Metrics"
    for (const rowIdx of sectionRows) {
        const cellRef = XLSX.utils.encode_cell({ r: rowIdx, c: 0 });
        if (worksheet[cellRef]) {
            worksheet[cellRef].s = {
                font: { bold: true, color: { rgb: '1E3A8A' } }
            };
        }
    }

    return worksheet;
}

// Generate and download Excel file - returns the blob for re-download
function generateAndDownloadExcel(data, userInfo, selectedMetrics, fiscalYear) {
    const filename = generateExcel(data, userInfo, selectedMetrics, fiscalYear);
    return filename;
}

// Store last generated data for re-download
let lastGeneratedData = null;

function storeLastGeneration(data, userInfo, selectedMetrics, fiscalYear) {
    lastGeneratedData = { data, userInfo, selectedMetrics, fiscalYear };
}

function downloadAgain() {
    if (lastGeneratedData) {
        return generateExcel(
            lastGeneratedData.data,
            lastGeneratedData.userInfo,
            lastGeneratedData.selectedMetrics,
            lastGeneratedData.fiscalYear
        );
    }
    return null;
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generateExcel,
        generateAndDownloadExcel,
        storeLastGeneration,
        downloadAgain
    };
}
