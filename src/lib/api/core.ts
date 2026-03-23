/**
 * CORE API Client
 *
 * CORE (core.ac.uk) aggregates open-access research from universities and repositories
 * worldwide. It covers papers that arXiv and CrossRef can miss — particularly from
 * humanities departments. Free API key available at: https://core.ac.uk/services/api
 *
 * Rate limit (free tier): 10 requests/minute.
 * Add CORE_API_KEY to your .env.local to enable this source.
 */

export interface COREPaper {
    id: string;
    title: string;
    abstract: string;
    authors: string[];
    published_date: string;
    url: string;
}

export const searchCORE = async (
    query: string,
    limit: number = 10
): Promise<COREPaper[]> => {
    const apiKey = process.env.CORE_API_KEY;

    if (!apiKey) {
        console.warn(
            '⚠️  CORE_API_KEY not set. Register for a free key at https://core.ac.uk/services/api'
        );
        return [];
    }

    const url = new URL('https://api.core.ac.uk/v3/search/works');
    url.searchParams.set('q', query);
    url.searchParams.set('limit', String(limit));

    const response = await fetch(url.toString(), {
        headers: {
            Authorization: `Bearer ${apiKey}`,
        },
    });

    if (!response.ok) {
        throw new Error(`CORE API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    return (data.results || [])
        .filter((item: any) => item.title && item.abstract)
        .map((item: any) => {
            // CORE returns authors as objects with a 'name' field
            const authors = (item.authors || []).map((a: any) =>
                typeof a === 'string' ? a : a.name || ''
            ).filter(Boolean);

            // Prefer publishedDate; fall back to yearPublished
            const published_date = item.publishedDate ||
                (item.yearPublished ? `${item.yearPublished}-01-01` : '');

            // Prefer a direct download URL, then the CORE record URL
            const url = item.downloadUrl ||
                (item.sourceFulltextUrls && item.sourceFulltextUrls[0]) ||
                `https://core.ac.uk/works/${item.id}`;

            return {
                id: String(item.id),
                title: item.title,
                abstract: item.abstract,
                authors,
                published_date,
                url,
            } as COREPaper;
        });
};
