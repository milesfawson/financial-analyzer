// Vercel Serverless Function - SEC EDGAR Proxy
// Handles CORS and adds proper User-Agent header

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Get the target URL from query parameter
    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'Missing url parameter' });
    }

    // Only allow SEC EDGAR URLs
    if (!url.startsWith('https://data.sec.gov/')) {
        return res.status(400).json({ error: 'Only SEC EDGAR URLs are allowed' });
    }

    try {
        // Fetch from SEC EDGAR with proper User-Agent
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'User-Agent': 'FinancialAnalyzer/1.0 (Educational Tool; Contact: user@example.com)',
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            return res.status(response.status).json({
                error: `SEC EDGAR returned ${response.status}`
            });
        }

        const data = await response.json();

        // Cache for 1 hour to reduce SEC API load
        res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');

        return res.status(200).json(data);

    } catch (error) {
        console.error('Proxy error:', error);
        return res.status(500).json({ error: error.message });
    }
}
