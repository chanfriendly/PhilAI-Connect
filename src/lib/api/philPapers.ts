// PhilPapers API Client

export interface PhilPapersArticle {
    id: string;
    title: string;
    abstract: string;
    authors: string[];
    year: number;
    url: string;
}

export const searchPhilPapers = async (query: string, limit: number = 10): Promise<PhilPapersArticle[]> => {
    const apiKey = process.env.PHILPAPERS_API_KEY;
    const apiId = process.env.PHILPAPERS_API_ID; // Depending on their auth scheme

    if (!apiKey) {
        console.warn('PhilPapers API key not configured.');
        return [];
    }

    // PhilPapers API historically uses a specific format, we will use a hypothetical REST endpoint here.
    // The actual endpoint usually requires specific parameters and an API account.
    // URL: https://philpapers.org/philpapers/raw/export.json (as an example)

    const url = `https://philpapers.org/philpapers/api/search?query=${encodeURIComponent(query)}&apiKey=${apiKey}&limit=${limit}`;

    try {
        const response = await fetch(url, {
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`PhilPapers API error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.results || [];
    } catch (error) {
        console.error('Error fetching from PhilPapers:', error);
        return [];
    }
};
