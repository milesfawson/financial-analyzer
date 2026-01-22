/**
 * Main Application Controller
 * Handles wizard navigation, form validation, and orchestrates the analysis process
 */

// Application state
const appState = {
    currentStep: 1,
    selectedCompanies: [],
    fiscalYear: '2024',
    selectedMetrics: [],
    userInfo: {
        name: '',
        email: '',
        purpose: ''
    },
    results: null
};

// Maximum selections
const MAX_COMPANIES = 20;
const MAX_METRICS = 10;

// DOM elements
let elements = {};

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    initializeElements();
    setupEventListeners();
    updateStepIndicator();
});

// Cache DOM elements
function initializeElements() {
    elements = {
        // Step containers
        steps: document.querySelectorAll('.wizard-step'),
        stepIndicators: document.querySelectorAll('.progress-indicator .step'),

        // Step 1: Company selection
        companySearch: document.getElementById('company-search'),
        searchResults: document.getElementById('search-results'),
        selectedChips: document.getElementById('selected-chips'),
        companyCount: document.getElementById('company-count'),
        clearCompanies: document.getElementById('clear-companies'),
        nextBtn1: document.getElementById('next-1'),

        // Step 2: Fiscal year
        fiscalYear: document.getElementById('fiscal-year'),
        yearWarnings: document.getElementById('year-warnings'),
        backBtn2: document.getElementById('back-2'),
        nextBtn2: document.getElementById('next-2'),

        // Step 3: Metrics
        metricCheckboxes: document.querySelectorAll('input[name="metric"]'),
        metricCount: document.getElementById('metric-count'),
        clearMetrics: document.getElementById('clear-metrics'),
        backBtn3: document.getElementById('back-3'),
        nextBtn3: document.getElementById('next-3'),

        // Step 4: User info
        fullName: document.getElementById('full-name'),
        email: document.getElementById('email'),
        purpose: document.getElementById('purpose'),
        secCompliance: document.getElementById('sec-compliance'),
        nameError: document.getElementById('name-error'),
        emailError: document.getElementById('email-error'),
        complianceError: document.getElementById('compliance-error'),
        backBtn4: document.getElementById('back-4'),
        nextBtn4: document.getElementById('next-4'),

        // Step 5: Processing & Download
        processingContainer: document.getElementById('processing-container'),
        downloadContainer: document.getElementById('download-container'),
        errorContainer: document.getElementById('error-container'),
        progressBar: document.getElementById('progress-bar'),
        statusMessage: document.getElementById('status-message'),
        companyProgress: document.getElementById('company-progress'),
        errorMessage: document.getElementById('error-message'),
        downloadAgain: document.getElementById('download-again'),
        startOver: document.getElementById('start-over'),
        retry: document.getElementById('retry'),
        errorStartOver: document.getElementById('error-start-over')
    };
}

// Setup event listeners
function setupEventListeners() {
    // Step 1: Company search
    elements.companySearch.addEventListener('input', handleCompanySearch);
    elements.companySearch.addEventListener('focus', handleCompanySearch);
    elements.companySearch.addEventListener('keydown', handleSearchKeydown);
    document.addEventListener('click', handleClickOutside);
    elements.clearCompanies.addEventListener('click', clearAllCompanies);
    elements.nextBtn1.addEventListener('click', () => goToStep(2));

    // Step 2: Fiscal year
    elements.fiscalYear.addEventListener('change', handleYearChange);
    elements.backBtn2.addEventListener('click', () => goToStep(1));
    elements.nextBtn2.addEventListener('click', () => goToStep(3));

    // Step 3: Metrics
    elements.metricCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', handleMetricChange);
    });
    elements.clearMetrics.addEventListener('click', clearAllMetrics);
    elements.backBtn3.addEventListener('click', () => goToStep(2));
    elements.nextBtn3.addEventListener('click', () => goToStep(4));

    // Step 4: User info
    elements.fullName.addEventListener('input', validateUserForm);
    elements.email.addEventListener('input', validateUserForm);
    elements.secCompliance.addEventListener('change', validateUserForm);
    elements.backBtn4.addEventListener('click', () => goToStep(3));
    elements.nextBtn4.addEventListener('click', startProcessing);

    // Step 5: Actions
    elements.downloadAgain.addEventListener('click', handleDownloadAgain);
    elements.startOver.addEventListener('click', resetWizard);
    elements.retry.addEventListener('click', startProcessing);
    elements.errorStartOver.addEventListener('click', resetWizard);
}

// ==================== Step Navigation ====================

function goToStep(step) {
    // Hide current step
    elements.steps[appState.currentStep - 1].classList.add('hidden');

    // Show new step
    elements.steps[step - 1].classList.remove('hidden');

    // Update state
    appState.currentStep = step;

    // Update progress indicator
    updateStepIndicator();

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateStepIndicator() {
    elements.stepIndicators.forEach((indicator, index) => {
        const stepNum = index + 1;
        indicator.classList.remove('active', 'completed');

        if (stepNum < appState.currentStep) {
            indicator.classList.add('completed');
            indicator.querySelector('.step-circle').textContent = '';
        } else if (stepNum === appState.currentStep) {
            indicator.classList.add('active');
            indicator.querySelector('.step-circle').textContent = stepNum;
        } else {
            indicator.querySelector('.step-circle').textContent = stepNum;
        }
    });
}

// ==================== Step 1: Company Selection ====================

let searchHighlightIndex = -1;

function handleCompanySearch() {
    const query = elements.companySearch.value.trim();
    const results = searchCompanies(query, appState.selectedCompanies);

    if (results.length > 0 && query.length > 0) {
        renderSearchResults(results);
        elements.searchResults.classList.add('active');
        searchHighlightIndex = -1;
    } else {
        elements.searchResults.classList.remove('active');
    }
}

function renderSearchResults(results) {
    elements.searchResults.innerHTML = results.map((company, index) => `
        <div class="search-result-item" data-index="${index}" data-cik="${company.cik}">
            <span class="company-name">${company.name}</span>
            <span class="company-ticker">(${company.ticker})</span>
        </div>
    `).join('');

    // Add click handlers
    elements.searchResults.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', () => selectCompany(item.dataset.cik));
    });
}

function handleSearchKeydown(e) {
    const items = elements.searchResults.querySelectorAll('.search-result-item');

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        searchHighlightIndex = Math.min(searchHighlightIndex + 1, items.length - 1);
        updateSearchHighlight(items);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        searchHighlightIndex = Math.max(searchHighlightIndex - 1, 0);
        updateSearchHighlight(items);
    } else if (e.key === 'Enter' && searchHighlightIndex >= 0) {
        e.preventDefault();
        const selectedItem = items[searchHighlightIndex];
        if (selectedItem) {
            selectCompany(selectedItem.dataset.cik);
        }
    } else if (e.key === 'Escape') {
        elements.searchResults.classList.remove('active');
    }
}

function updateSearchHighlight(items) {
    items.forEach((item, index) => {
        item.classList.toggle('highlighted', index === searchHighlightIndex);
    });
}

function handleClickOutside(e) {
    if (!elements.companySearch.contains(e.target) && !elements.searchResults.contains(e.target)) {
        elements.searchResults.classList.remove('active');
    }
}

function selectCompany(cik) {
    if (appState.selectedCompanies.length >= MAX_COMPANIES) {
        return;
    }

    const company = FORTUNE_500.find(c => c.cik === cik);
    if (company && !appState.selectedCompanies.some(c => c.cik === cik)) {
        appState.selectedCompanies.push(company);
        updateSelectedCompanies();
    }

    elements.companySearch.value = '';
    elements.searchResults.classList.remove('active');
}

function removeCompany(cik) {
    appState.selectedCompanies = appState.selectedCompanies.filter(c => c.cik !== cik);
    updateSelectedCompanies();
}

function clearAllCompanies() {
    appState.selectedCompanies = [];
    updateSelectedCompanies();
}

function updateSelectedCompanies() {
    // Update chips
    elements.selectedChips.innerHTML = appState.selectedCompanies.map(company => `
        <div class="chip" data-cik="${company.cik}">
            <span>${company.name} (${company.ticker})</span>
            <button type="button" class="chip-remove" onclick="removeCompany('${company.cik}')">&times;</button>
        </div>
    `).join('');

    // Update counter
    elements.companyCount.textContent = appState.selectedCompanies.length;

    // Update next button state
    elements.nextBtn1.disabled = appState.selectedCompanies.length === 0;
}

// ==================== Step 2: Fiscal Year Selection ====================

function handleYearChange() {
    appState.fiscalYear = elements.fiscalYear.value;
}

// ==================== Step 3: Metrics Selection ====================

function handleMetricChange(e) {
    const checkbox = e.target;
    const metricKey = checkbox.value;

    if (checkbox.checked) {
        if (appState.selectedMetrics.length < MAX_METRICS) {
            appState.selectedMetrics.push(metricKey);
        } else {
            checkbox.checked = false;
        }
    } else {
        appState.selectedMetrics = appState.selectedMetrics.filter(m => m !== metricKey);
    }

    updateMetricsCount();
}

function clearAllMetrics() {
    appState.selectedMetrics = [];
    elements.metricCheckboxes.forEach(cb => cb.checked = false);
    updateMetricsCount();
}

function updateMetricsCount() {
    elements.metricCount.textContent = appState.selectedMetrics.length;
    elements.nextBtn3.disabled = appState.selectedMetrics.length === 0;
}

// ==================== Step 4: User Information ====================

function validateUserForm() {
    let isValid = true;

    // Validate name
    const name = elements.fullName.value.trim();
    if (!name) {
        elements.nameError.textContent = 'Name is required';
        elements.fullName.classList.add('error');
        isValid = false;
    } else {
        elements.nameError.textContent = '';
        elements.fullName.classList.remove('error');
    }

    // Validate email
    const email = elements.email.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
        elements.emailError.textContent = 'Email is required';
        elements.email.classList.add('error');
        isValid = false;
    } else if (!emailRegex.test(email)) {
        elements.emailError.textContent = 'Please enter a valid email address';
        elements.email.classList.add('error');
        isValid = false;
    } else {
        elements.emailError.textContent = '';
        elements.email.classList.remove('error');
    }

    // Validate compliance checkbox
    if (!elements.secCompliance.checked) {
        elements.complianceError.textContent = 'You must agree to the SEC terms of use';
        isValid = false;
    } else {
        elements.complianceError.textContent = '';
    }

    // Update state
    appState.userInfo = {
        name: name,
        email: email,
        purpose: elements.purpose.value
    };

    // Update button state
    elements.nextBtn4.disabled = !isValid;

    return isValid;
}

// ==================== Step 5: Processing ====================

async function startProcessing() {
    if (!validateUserForm()) {
        return;
    }

    goToStep(5);

    // Reset UI
    elements.processingContainer.classList.remove('hidden');
    elements.downloadContainer.classList.add('hidden');
    elements.errorContainer.classList.add('hidden');
    elements.progressBar.style.width = '0%';
    elements.companyProgress.innerHTML = '';

    try {
        elements.statusMessage.textContent = 'Fetching data from SEC EDGAR...';

        // Fetch data for all companies
        const results = await fetchMultipleCompanies(
            appState.selectedCompanies,
            appState.fiscalYear,
            updateProgress
        );

        elements.statusMessage.textContent = 'Calculating financial ratios...';
        elements.progressBar.style.width = '90%';

        // Calculate ratios for each company
        for (const result of results) {
            if (result.success && result.data) {
                result.ratios = calculateRatios(result.data, appState.selectedMetrics);
            }
        }

        elements.statusMessage.textContent = 'Generating Excel file...';
        elements.progressBar.style.width = '95%';

        // Store data for re-download
        storeLastGeneration(results, appState.userInfo, appState.selectedMetrics, appState.fiscalYear);

        // Generate and download Excel
        appState.results = results;
        generateExcel(results, appState.userInfo, appState.selectedMetrics, appState.fiscalYear);

        // Show success
        elements.progressBar.style.width = '100%';
        elements.processingContainer.classList.add('hidden');
        elements.downloadContainer.classList.remove('hidden');

    } catch (error) {
        console.error('Processing error:', error);
        showError(error.message);
    }
}

function updateProgress(progress) {
    const percentage = (progress.current / progress.total) * 85;
    elements.progressBar.style.width = `${percentage}%`;
    elements.statusMessage.textContent = `Processing ${progress.company} (${progress.current}/${progress.total})...`;

    // Add progress item
    const statusClass = progress.status === 'success' ? 'success' :
                        progress.status === 'error' ? 'error' : '';
    const statusIcon = progress.status === 'success' ? '✓' :
                       progress.status === 'error' ? '✗' : '...';

    const progressItem = document.createElement('div');
    progressItem.className = `progress-item ${statusClass}`;
    progressItem.textContent = `${statusIcon} ${progress.company}`;

    if (progress.status === 'error') {
        progressItem.textContent += ` - ${progress.error}`;
    }

    elements.companyProgress.appendChild(progressItem);
    elements.companyProgress.scrollTop = elements.companyProgress.scrollHeight;
}

function showError(message) {
    elements.processingContainer.classList.add('hidden');
    elements.errorContainer.classList.remove('hidden');
    elements.errorMessage.textContent = message || 'An unexpected error occurred. Please try again.';
}

function handleDownloadAgain() {
    downloadAgain();
}

function resetWizard() {
    // Reset state
    appState.currentStep = 1;
    appState.selectedCompanies = [];
    appState.fiscalYear = '2024';
    appState.selectedMetrics = [];
    appState.userInfo = { name: '', email: '', purpose: '' };
    appState.results = null;

    // Reset UI
    elements.companySearch.value = '';
    elements.fiscalYear.value = '2024';
    elements.metricCheckboxes.forEach(cb => cb.checked = false);
    elements.fullName.value = '';
    elements.email.value = '';
    elements.purpose.value = '';
    elements.secCompliance.checked = false;

    // Reset counts and buttons
    updateSelectedCompanies();
    updateMetricsCount();
    elements.nextBtn4.disabled = true;

    // Clear errors
    elements.nameError.textContent = '';
    elements.emailError.textContent = '';
    elements.complianceError.textContent = '';
    elements.fullName.classList.remove('error');
    elements.email.classList.remove('error');

    // Go to step 1
    goToStep(1);
}
