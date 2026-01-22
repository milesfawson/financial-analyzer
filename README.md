# Financial Analysis Tool

A web-based tool for analyzing Fortune 500 companies using SEC EDGAR data. This application allows users to select companies, choose financial metrics, and export calculated ratios to Excel.

## Features

- **Company Selection**: Search and select up to 20 Fortune 500 companies
- **Fiscal Year Selection**: Choose from fiscal years 2020-2024
- **Financial Metrics**: Calculate 15 different financial ratios across 4 categories
- **Excel Export**: Download results in a formatted Excel file using SheetJS
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## Financial Metrics Available

### Liquidity Ratios
- Current Ratio
- Quick Ratio
- Cash Ratio

### Profitability Ratios
- Return on Equity (ROE)
- Return on Assets (ROA)
- Net Profit Margin
- Gross Profit Margin
- Operating Margin

### Leverage Ratios
- Debt-to-Equity
- Debt-to-Assets
- Interest Coverage
- Equity Multiplier

### Efficiency Ratios
- Asset Turnover
- Inventory Turnover
- Receivables Turnover

## Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection (for SEC EDGAR API access)

### Running Locally

1. Clone or download this repository
2. Open `index.html` in a web browser
3. No build process or server required - it's all static files

### Deployment

This application can be deployed to any static hosting service:

- **GitHub Pages**: Push to a GitHub repository and enable Pages
- **Netlify**: Drag and drop the folder to deploy
- **Vercel**: Import the repository for automatic deployments

## How It Works

### Step 1: Select Companies
Search for Fortune 500 companies by name or ticker symbol. Select up to 20 companies for analysis.

### Step 2: Choose Fiscal Year
Select the fiscal year for which you want to analyze 10-K annual report data.

### Step 3: Select Metrics
Choose up to 10 financial ratios to calculate. Hover over each metric to see its formula.

### Step 4: Enter Your Information
Provide your name and email for compliance tracking. Accept the SEC EDGAR terms of use.

### Step 5: Generate Report
The application fetches data from SEC EDGAR, calculates the selected ratios, and generates an Excel file for download.

## Technical Details

### Architecture

```
financial-analyzer/
├── index.html          # Main HTML with 5-step wizard
├── css/
│   └── styles.css      # Styling (navy/green/red theme)
├── js/
│   ├── app.js          # Main application controller
│   ├── companies.js    # Fortune 500 company data
│   ├── edgar-api.js    # SEC EDGAR API integration
│   ├── ratios.js       # Financial ratio calculations
│   └── excel-export.js # SheetJS Excel generation
└── README.md           # Documentation
```

### External Dependencies

- **SheetJS (xlsx.js)**: Excel file generation - loaded via CDN

### SEC EDGAR API

Data is fetched from SEC EDGAR using the XBRL company facts API:
- Endpoint: `https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json`
- CORS Proxy: `https://corsproxy.io/` (for browser access)
- Rate Limiting: 100ms delay between requests

### XBRL Concept Mappings

The application maps financial data fields to XBRL concepts:

| Financial Item | Primary XBRL Concepts |
|----------------|----------------------|
| Revenue | RevenueFromContractWithCustomerExcludingAssessedTax, Revenues |
| Net Income | NetIncomeLoss, ProfitLoss |
| Total Assets | Assets |
| Current Assets | AssetsCurrent |
| Current Liabilities | LiabilitiesCurrent |
| Stockholders Equity | StockholdersEquity |
| Long-term Debt | LongTermDebt, LongTermDebtNoncurrent |
| Cash | CashAndCashEquivalentsAtCarryingValue |
| Inventory | InventoryNet |
| Gross Profit | GrossProfit |
| Operating Income | OperatingIncomeLoss |
| Interest Expense | InterestExpense |
| COGS | CostOfGoodsAndServicesSold, CostOfRevenue |
| Accounts Receivable | AccountsReceivableNetCurrent |

## Excel Output

### Sheet 1: Financial Ratios
Contains calculated ratios for each selected company:
- Company Name
- Ticker Symbol
- Filing Date
- Selected metric values

### Sheet 2: Metadata
Contains report information:
- Generation timestamp
- User information
- Selected metrics with formulas
- Filing dates per company
- Data source attribution

## Error Handling

- **API Failures**: Displays error message with retry option
- **Missing Data**: Shows "N/A" in Excel cells
- **Rate Limiting**: Automatic delays between API requests
- **Form Validation**: Inline error messages for invalid inputs

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Limitations

- Data is limited to SEC EDGAR 10-K filings
- Some companies may have different fiscal year ends
- XBRL data availability varies by company and year
- Valuation ratios (P/E, P/B, etc.) are excluded as they require stock price data

## License

This project is for educational and research purposes only.

## Disclaimer

This tool is provided as-is for educational purposes. The financial data is sourced from SEC EDGAR and should not be used as the sole basis for investment decisions. Always verify data with official SEC filings and consult with financial professionals.

## Data Source

All financial data is sourced from the U.S. Securities and Exchange Commission's [EDGAR system](https://www.sec.gov/edgar).
