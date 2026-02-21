// Simple arXiv API wrapper

export interface ArxivPaper {
    id: string;
    title: string;
    summary: string;
    authors: string[];
    published: string;
    link: string;
}

export const searchArxivPapers = async (query: string, maxResults: number = 10): Promise<ArxivPaper[]> => {
    const url = `http://export.arxiv.org/api/query?search_query=${encodeURIComponent(query)}&max_results=${maxResults}`;

    const response = await fetch(url);
    const text = await response.text();

    // Basic XML parsing logic (could use a dedicated fast-xml-parser later if needed, but keeping it simple)
    // arXiv returns atom XML
    const entries: ArxivPaper[] = [];
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    let match;

    while ((match = entryRegex.exec(text)) !== null) {
        const entryText = match[1];
        const titleMatch = entryText.match(/<title>([\s\S]*?)<\/title>/);
        const idMatch = entryText.match(/<id>([\s\S]*?)<\/id>/);
        const summaryMatch = entryText.match(/<summary>([\s\S]*?)<\/summary>/);
        const publishedMatch = entryText.match(/<published>([\s\S]*?)<\/published>/);

        // Authors
        const authors: string[] = [];
        const authorRegex = /<author>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/author>/g;
        let aMatch;
        while ((aMatch = authorRegex.exec(entryText)) !== null) {
            authors.push(aMatch[1].trim());
        }

        if (idMatch && titleMatch) {
            entries.push({
                id: idMatch[1].trim(),
                title: titleMatch[1].trim().replace(/\s+/g, ' '),
                summary: summaryMatch ? summaryMatch[1].trim().replace(/\s+/g, ' ') : '',
                authors,
                published: publishedMatch ? publishedMatch[1].trim() : '',
                link: idMatch[1].trim()
            });
        }
    }

    return entries;
};
