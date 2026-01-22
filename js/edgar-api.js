/**
 * SEC EDGAR API Integration
 * Handles fetching financial data from SEC EDGAR using proxy
 */

// Detect environment and set proxy URL
// Local: use localhost:8080/proxy/
// Production (Vercel): use /api/proxy?url=
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const PROXY_BASE = isLocalhost
    ? 'http://localhost:8080/proxy/'
    : '/api/proxy?url=';

const SEC_BASE_URL = 'https://data.sec.gov';
const RATE_LIMIT_DELAY = 150; // milliseconds between requests (SEC allows 10/sec)

// XBRL concept mappings - maps our field names to possible XBRL concept names
const XBRL_CONCEPTS = {
    revenue: [
        'RevenueFromContractWithCustomerExcludingAssessedTax',
        'Revenues',
        'SalesRevenueNet',
        'SalesRevenueGoodsNet',
        'RevenueFromContractWithCustomerIncludingAssessedTax',
        'SalesRevenueServicesNet',
        'TotalRevenuesAndOtherIncome'
    ],
    netIncome: [
        'NetIncomeLoss',
        'ProfitLoss',
        'NetIncomeLossAvailableToCommonStockholdersBasic',
        'NetIncomeLossAttributableToParent'
    ],
    totalAssets: [
        'Assets'
    ],
    currentAssets: [
        'AssetsCurrent'
    ],
    currentLiabilities: [
        'LiabilitiesCurrent'
    ],
    stockholdersEquity: [
        'StockholdersEquity',
        'StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest',
        'CommonStockholdersEquity'
    ],
    totalDebt: [
        'LongTermDebt',
        'LongTermDebtNoncurrent',
        'DebtLongtermAndShorttermCombinedAmount',
        'LongTermDebtAndCapitalLeaseObligations'
    ],
    cash: [
        'CashAndCashEquivalentsAtCarryingValue',
        'CashCashEquivalentsAndShortTermInvestments',
        'Cash'
    ],
    inventory: [
        'InventoryNet',
        'InventoryGross',
        'Inventories'
    ],
    grossProfit: [
        'GrossProfit'
    ],
    operatingIncome: [
        'OperatingIncomeLoss',
        'IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest'
    ],
    interestExpense: [
        'InterestExpense',
        'InterestExpenseDebt',
        'InterestIncomeExpenseNet'
    ],
    cogs: [
        'CostOfGoodsAndServicesSold',
        'CostOfRevenue',
        'CostOfGoodsSold',
        'CostOfServices'
    ],
    accountsReceivable: [
        'AccountsReceivableNetCurrent',
        'AccountsReceivableNet',
        'ReceivablesNetCurrent'
    ]
};

// Sleep function for rate limiting
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Fetch with timeout
async function fetchWithTimeout(url, options = {}, timeout = 30000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('Request timed out');
        }
        throw error;
    }
}

// Fetch via proxy (local or Vercel)
async function fetchWithProxy(url) {
    // Build proxy URL based on environment
    // Local: http://localhost:8080/proxy/https://data.sec.gov/...
    // Vercel: /api/proxy?url=https://data.sec.gov/...
    const proxyUrl = isLocalhost
        ? PROXY_BASE + url
        : PROXY_BASE + encodeURIComponent(url);

    console.log(`Fetching: ${url}`);

    const response = await fetchWithTimeout(proxyUrl, {
        method: 'GET',
        headers: {
            'Accept': 'application/json'
        }
    }, 30000);

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
    }

    return response.json();
}

// Pad CIK to 10 digits
function padCik(cik) {
    return cik.toString().replace(/^0+/, '').padStart(10, '0');
}

// Fetch company facts (XBRL data) from SEC EDGAR
async function fetchCompanyFacts(cik) {
    const paddedCik = padCik(cik);
    const url = `${SEC_BASE_URL}/api/xbrl/companyfacts/CIK${paddedCik}.json`;

    try {
        return await fetchWithProxy(url);
    } catch (error) {
        console.error(`Error fetching company facts for CIK ${cik}:`, error);
        throw error;
    }
}

// Fetch company submissions (filing info) from SEC EDGAR
async function fetchCompanySubmissions(cik) {
    const paddedCik = padCik(cik);
    const url = `${SEC_BASE_URL}/submissions/CIK${paddedCik}.json`;

    try {
        return await fetchWithProxy(url);
    } catch (error) {
        console.error(`Error fetching company submissions for CIK ${cik}:`, error);
        throw error;
    }
}

// Extract value for a specific fiscal year from XBRL data
function extractValueForYear(factsData, conceptNames, fiscalYear, form = '10-K') {
    if (!factsData || !factsData.facts) {
        return null;
    }

    const targetYear = parseInt(fiscalYear);

    // Try US-GAAP first, then IFRS
    const namespaces = ['us-gaap', 'ifrs-full'];

    for (const namespace of namespaces) {
        if (!factsData.facts[namespace]) {
            continue;
        }

        for (const conceptName of conceptNames) {
            const concept = factsData.facts[namespace][conceptName];
            if (!concept || !concept.units) {
                continue;
            }

            // Get values in USD (or shares for EPS)
            const units = concept.units.USD || concept.units['USD/shares'] || concept.units.pure;
            if (!units) {
                continue;
            }

            // Filter for 10-K filings for the specified fiscal year
            // Must match BOTH the fy tag AND the end date year
            const annualValues = units.filter(item => {
                // Check if it's a 10-K filing
                if (item.form !== form) {
                    return false;
                }

                // Must have the correct fiscal year tag
                if (item.fy !== targetYear) {
                    return false;
                }

                // CRITICAL: The end date must be in the target fiscal year
                // This filters out comparative/prior year data included in the filing
                if (item.end) {
                    const endYear = new Date(item.end).getFullYear();
                    // Allow for fiscal years ending in Dec of target year or early next year
                    // e.g., FY2022 might end 2022-09-30 or 2023-01-31
                    if (endYear !== targetYear && endYear !== targetYear + 1) {
                        return false;
                    }
                    // For income statement items with start date, verify it's roughly a full year
                    // ending in the target period
                    if (item.start) {
                        const startYear = new Date(item.start).getFullYear();
                        // Start should be about a year before end
                        if (startYear !== targetYear - 1 && startYear !== targetYear) {
                            return false;
                        }
                    }
                }

                return true;
            });

            // Sort by end date descending to get the most recent period
            annualValues.sort((a, b) => new Date(b.end) - new Date(a.end));

            // For income statement items, prefer full-year values
            const fullYearValue = annualValues.find(v => {
                if (v.start && v.end) {
                    const start = new Date(v.start);
                    const end = new Date(v.end);
                    const days = (end - start) / (1000 * 60 * 60 * 24);
                    return days > 300; // Approximately a full year (300+ days)
                }
                return true; // Balance sheet items don't have start date
            });

            if (fullYearValue) {
                return fullYearValue.val;
            }

            if (annualValues.length > 0) {
                return annualValues[0].val;
            }
        }
    }

    return null;
}

// Get filing date for a specific fiscal year
function getFilingDate(factsData, fiscalYear) {
    if (!factsData || !factsData.facts || !factsData.facts['us-gaap']) {
        return null;
    }

    // Try to find any concept with a 10-K filing for this year
    const concepts = Object.values(factsData.facts['us-gaap']);

    for (const concept of concepts) {
        if (!concept.units || !concept.units.USD) {
            continue;
        }

        const filing = concept.units.USD.find(item =>
            item.form === '10-K' &&
            (item.fy === parseInt(fiscalYear) ||
             (item.end && new Date(item.end).getFullYear() === parseInt(fiscalYear)))
        );

        if (filing && filing.filed) {
            return filing.filed;
        }
    }

    return null;
}

// Extract all financial data for a company and fiscal year
async function extractFinancialData(cik, fiscalYear, onProgress) {
    // Retry logic for transient failures
    let lastError = null;
    for (let retry = 0; retry < 2; retry++) {
        try {
            if (retry > 0) {
                await sleep(500); // Wait before retry
            }

            const factsData = await fetchCompanyFacts(cik);

            const financialData = {
                cik: cik,
                fiscalYear: fiscalYear,
                filingDate: getFilingDate(factsData, fiscalYear)
            };

            // Extract each financial field
            for (const [fieldName, conceptNames] of Object.entries(XBRL_CONCEPTS)) {
                financialData[fieldName] = extractValueForYear(factsData, conceptNames, fiscalYear);
            }

            return financialData;
        } catch (error) {
            lastError = error;
            console.warn(`Attempt ${retry + 1} failed for CIK ${cik}:`, error.message);
        }
    }

    throw lastError;
}

// Fetch data for multiple companies with rate limiting
async function fetchMultipleCompanies(companies, fiscalYear, onProgress) {
    const results = [];
    const total = companies.length;

    for (let i = 0; i < companies.length; i++) {
        const company = companies[i];

        if (onProgress) {
            onProgress({
                current: i + 1,
                total: total,
                company: company.name,
                status: 'fetching'
            });
        }

        try {
            const financialData = await extractFinancialData(company.cik, fiscalYear);

            results.push({
                company: company,
                data: financialData,
                success: true,
                error: null
            });

            if (onProgress) {
                onProgress({
                    current: i + 1,
                    total: total,
                    company: company.name,
                    status: 'success'
                });
            }
        } catch (error) {
            console.error(`Error fetching data for ${company.name}:`, error);

            results.push({
                company: company,
                data: null,
                success: false,
                error: error.message
            });

            if (onProgress) {
                onProgress({
                    current: i + 1,
                    total: total,
                    company: company.name,
                    status: 'error',
                    error: error.message
                });
            }
        }

        // Rate limiting - wait before next request
        if (i < companies.length - 1) {
            await sleep(RATE_LIMIT_DELAY);
        }
    }

    return results;
}

// Check if 10-K data is available for a company and year
async function check10KAvailability(cik, fiscalYear) {
    try {
        const factsData = await fetchCompanyFacts(cik);
        const filingDate = getFilingDate(factsData, fiscalYear);
        return filingDate !== null;
    } catch (error) {
        return false;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        fetchCompanyFacts,
        fetchCompanySubmissions,
        extractFinancialData,
        fetchMultipleCompanies,
        check10KAvailability,
        XBRL_CONCEPTS
    };
}
