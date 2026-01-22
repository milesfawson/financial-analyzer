/**
 * Financial Ratios - Definitions and Calculations
 */

// Ratio definitions with formulas and required data fields
const FINANCIAL_RATIOS = {
    // Liquidity Ratios
    currentRatio: {
        name: 'Current Ratio',
        category: 'Liquidity',
        formula: 'Current Assets / Current Liabilities',
        calculate: (data) => safeDivide(data.currentAssets, data.currentLiabilities),
        requiredFields: ['currentAssets', 'currentLiabilities']
    },
    quickRatio: {
        name: 'Quick Ratio',
        category: 'Liquidity',
        formula: '(Current Assets - Inventory) / Current Liabilities',
        calculate: (data) => safeDivide(
            (data.currentAssets || 0) - (data.inventory || 0),
            data.currentLiabilities
        ),
        requiredFields: ['currentAssets', 'inventory', 'currentLiabilities']
    },
    cashRatio: {
        name: 'Cash Ratio',
        category: 'Liquidity',
        formula: 'Cash & Equivalents / Current Liabilities',
        calculate: (data) => safeDivide(data.cash, data.currentLiabilities),
        requiredFields: ['cash', 'currentLiabilities']
    },

    // Profitability Ratios
    roe: {
        name: 'Return on Equity (ROE)',
        category: 'Profitability',
        formula: 'Net Income / Shareholders\' Equity',
        calculate: (data) => safeDivide(data.netIncome, data.stockholdersEquity),
        requiredFields: ['netIncome', 'stockholdersEquity'],
        isPercentage: true
    },
    roa: {
        name: 'Return on Assets (ROA)',
        category: 'Profitability',
        formula: 'Net Income / Total Assets',
        calculate: (data) => safeDivide(data.netIncome, data.totalAssets),
        requiredFields: ['netIncome', 'totalAssets'],
        isPercentage: true
    },
    netProfitMargin: {
        name: 'Net Profit Margin',
        category: 'Profitability',
        formula: 'Net Income / Revenue',
        calculate: (data) => safeDivide(data.netIncome, data.revenue),
        requiredFields: ['netIncome', 'revenue'],
        isPercentage: true
    },
    grossProfitMargin: {
        name: 'Gross Profit Margin',
        category: 'Profitability',
        formula: 'Gross Profit / Revenue',
        calculate: (data) => safeDivide(data.grossProfit, data.revenue),
        requiredFields: ['grossProfit', 'revenue'],
        isPercentage: true
    },
    operatingMargin: {
        name: 'Operating Margin',
        category: 'Profitability',
        formula: 'Operating Income / Revenue',
        calculate: (data) => safeDivide(data.operatingIncome, data.revenue),
        requiredFields: ['operatingIncome', 'revenue'],
        isPercentage: true
    },

    // Leverage Ratios
    debtToEquity: {
        name: 'Debt-to-Equity',
        category: 'Leverage',
        formula: 'Total Debt / Shareholders\' Equity',
        calculate: (data) => safeDivide(data.totalDebt, data.stockholdersEquity),
        requiredFields: ['totalDebt', 'stockholdersEquity']
    },
    debtToAssets: {
        name: 'Debt-to-Assets',
        category: 'Leverage',
        formula: 'Total Debt / Total Assets',
        calculate: (data) => safeDivide(data.totalDebt, data.totalAssets),
        requiredFields: ['totalDebt', 'totalAssets']
    },
    interestCoverage: {
        name: 'Interest Coverage',
        category: 'Leverage',
        formula: 'EBIT / Interest Expense',
        calculate: (data) => safeDivide(data.operatingIncome, data.interestExpense),
        requiredFields: ['operatingIncome', 'interestExpense']
    },
    equityMultiplier: {
        name: 'Equity Multiplier',
        category: 'Leverage',
        formula: 'Total Assets / Shareholders\' Equity',
        calculate: (data) => safeDivide(data.totalAssets, data.stockholdersEquity),
        requiredFields: ['totalAssets', 'stockholdersEquity']
    },

    // Efficiency Ratios
    assetTurnover: {
        name: 'Asset Turnover',
        category: 'Efficiency',
        formula: 'Revenue / Total Assets',
        calculate: (data) => safeDivide(data.revenue, data.totalAssets),
        requiredFields: ['revenue', 'totalAssets']
    },
    inventoryTurnover: {
        name: 'Inventory Turnover',
        category: 'Efficiency',
        formula: 'COGS / Average Inventory',
        calculate: (data) => safeDivide(data.cogs, data.inventory),
        requiredFields: ['cogs', 'inventory']
    },
    receivablesTurnover: {
        name: 'Receivables Turnover',
        category: 'Efficiency',
        formula: 'Revenue / Accounts Receivable',
        calculate: (data) => safeDivide(data.revenue, data.accountsReceivable),
        requiredFields: ['revenue', 'accountsReceivable']
    }
};

// Safe division to handle zero and null values
function safeDivide(numerator, denominator) {
    if (numerator === null || numerator === undefined ||
        denominator === null || denominator === undefined ||
        denominator === 0) {
        return null;
    }
    return numerator / denominator;
}

// Format ratio value for display
function formatRatioValue(value, ratio) {
    if (value === null || value === undefined || isNaN(value)) {
        return 'N/A';
    }

    if (ratio.isPercentage) {
        return (value * 100).toFixed(2) + '%';
    }

    return value.toFixed(2);
}

// Calculate multiple ratios for a company
function calculateRatios(financialData, selectedRatios) {
    const results = {};

    for (const ratioKey of selectedRatios) {
        const ratio = FINANCIAL_RATIOS[ratioKey];
        if (ratio) {
            const value = ratio.calculate(financialData);
            results[ratioKey] = {
                name: ratio.name,
                value: value,
                formatted: formatRatioValue(value, ratio),
                category: ratio.category
            };
        }
    }

    return results;
}

// Get all required financial data fields for selected ratios
function getRequiredFields(selectedRatios) {
    const fields = new Set();

    for (const ratioKey of selectedRatios) {
        const ratio = FINANCIAL_RATIOS[ratioKey];
        if (ratio && ratio.requiredFields) {
            ratio.requiredFields.forEach(field => fields.add(field));
        }
    }

    return Array.from(fields);
}

// Get ratio by key
function getRatio(key) {
    return FINANCIAL_RATIOS[key];
}

// Get all ratio keys
function getAllRatioKeys() {
    return Object.keys(FINANCIAL_RATIOS);
}

// Get ratios grouped by category
function getRatiosByCategory() {
    const categories = {};

    for (const [key, ratio] of Object.entries(FINANCIAL_RATIOS)) {
        if (!categories[ratio.category]) {
            categories[ratio.category] = [];
        }
        categories[ratio.category].push({
            key,
            ...ratio
        });
    }

    return categories;
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        FINANCIAL_RATIOS,
        safeDivide,
        formatRatioValue,
        calculateRatios,
        getRequiredFields,
        getRatio,
        getAllRatioKeys,
        getRatiosByCategory
    };
}
