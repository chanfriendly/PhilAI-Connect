// Semantic Scholar API wrapper

export interface SemanticScholarPaper {
    paperId: string;
    title: string;
    abstract: string;
    authors: { authorId: string; name: string }[];
    year: number;
    url: string;
    citationCount: number;
}

const BASE_URL = 'https://api.semanticscholar.org/graph/v1';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const fetchWithRetry = async (url: string, options: RequestInit, retries = 3, backoff = 1000): Promise<Response> => {
    try {
        const response = await fetch(url, options);
        if (response.status === 429 && retries > 0) {
            console.warn(`⏳ Rate limited by Semantic Scholar. Retrying in ${backoff}ms...`);
            await sleep(backoff);
            return fetchWithRetry(url, options, retries - 1, backoff * 2);
        }
        return response;
    } catch (error) {
        if (retries > 0) {
            console.warn(`⏳ Network error fetching from Semantic Scholar. Retrying in ${backoff}ms...`);
            await sleep(backoff);
            return fetchWithRetry(url, options, retries - 1, backoff * 2);
        }
        throw error;
    }
};

export const searchSemanticScholar = async (query: string, limit: number = 10): Promise<SemanticScholarPaper[]> => {
    const apiKey = process.env.SEMANTIC_SCHOLAR_API_KEY;

    const headers: HeadersInit = {};
    if (apiKey) {
        headers['x-api-key'] = apiKey;
    }

    const url = `${BASE_URL}/paper/search?query=${encodeURIComponent(query)}&limit=${limit}&fields=paperId,title,abstract,authors,year,url,citationCount`;

    const response = await fetchWithRetry(url, { headers });

    if (!response.ok) {
        throw new Error(`Semantic Scholar API error (search): ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.data || [];
};

export const getPaperCitations = async (paperId: string, limit: number = 50) => {
    const apiKey = process.env.SEMANTIC_SCHOLAR_API_KEY;

    const headers: HeadersInit = {};
    if (apiKey) {
        headers['x-api-key'] = apiKey;
    }

    const url = `${BASE_URL}/paper/${paperId}/citations?fields=paperId,title,authors,year&limit=${limit}`;

    const response = await fetchWithRetry(url, { headers });

    if (!response.ok) {
        throw new Error(`Semantic Scholar API error (citations): ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.data || [];
};
