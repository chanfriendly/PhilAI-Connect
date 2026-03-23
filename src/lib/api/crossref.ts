/**
 * CrossRef API Client
 *
 * CrossRef is a free, open registry of DOIs covering 130M+ academic works.
 * No API key required, though polite usage (identifying yourself via User-Agent)
 * gets you a faster, dedicated pool. See: https://api.crossref.org/swagger-ui/index.html
 *
 * Compared to arXiv (CS-heavy), CrossRef covers philosophy journals well —
 * Mind, Journal of Philosophy, Nous, Synthese, Philosophical Studies, etc.
 */

export interface CrossRefPaper {
    doi: string;
    title: string;
    abstract: string;
    authors: string[];
    published_date: string;
    url: string;
    journal: string;
}

/**
 * Strips HTML tags from CrossRef abstracts, which are often wrapped in JATS XML.
 */
const stripHtml = (html: string): string =>
    html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

export const searchCrossRef = async (
    query: string,
    limit: number = 10
): Promise<CrossRefPaper[]> => {
    // CrossRef asks polite users to identify themselves in the User-Agent so
    // they can route you to a faster pool. Replace the email below with your own.
    const politeEmail = process.env.CROSSREF_POLITE_EMAIL || 'philai-connect@example.com';

    const url = new URL('https://api.crossref.org/works');
    url.searchParams.set('query', query);
    url.searchParams.set('filter', 'type:journal-article,has-abstract:true');
    url.searchParams.set('rows', String(limit));
    url.searchParams.set('select', 'DOI,title,abstract,author,published,container-title,URL,type');

    const response = await fetch(url.toString(), {
        headers: {
            'User-Agent': `PhilAI-Connect/1.0 (mailto:${politeEmail})`,
        },
    });

    if (!response.ok) {
        throw new Error(`CrossRef API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    return (data.message?.items || [])
        .map((item: any) => {
            const rawAbstract = item.abstract || '';
            const abstract = stripHtml(rawAbstract);

            const authors = (item.author || []).map((a: any) =>
                [a.given, a.family].filter(Boolean).join(' ')
            );

            // CrossRef date is stored as [[year, month, day]] nested arrays
            const dateParts = item.published?.['date-parts']?.[0] || [];
            const published_date = dateParts.length
                ? `${dateParts[0]}-${String(dateParts[1] || 1).padStart(2, '0')}-${String(dateParts[2] || 1).padStart(2, '0')}`
                : '';

            const journal = Array.isArray(item['container-title'])
                ? item['container-title'][0] || ''
                : item['container-title'] || '';

            const title = Array.isArray(item.title) ? item.title[0] : item.title || '';

            return {
                doi: item.DOI || '',
                title,
                abstract,
                authors,
                published_date,
                url: item.URL || `https://doi.org/${item.DOI}`,
                journal,
            } as CrossRefPaper;
        })
        .filter((p: CrossRefPaper) => p.title && p.abstract.length > 50); // Drop thin results
};
