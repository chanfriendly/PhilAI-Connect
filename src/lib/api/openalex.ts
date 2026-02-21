export interface OpenAlexPaper {
    id: string;
    title: string;
    abstract: string;
    authors: string[];
    published_date: string;
    url: string;
}

export const searchOpenAlexPapers = async (query: string, limit: number = 5): Promise<OpenAlexPaper[]> => {
    const url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&filter=has_abstract:true&per-page=${limit}`;

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`OpenAlex API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.results.map((work: any) => {
        // OpenAlex returns abstracts as an inverted index to save space, reconstruct it:
        let abstract = '';
        if (work.abstract_inverted_index) {
            const index = work.abstract_inverted_index;
            const words = Object.keys(index);
            const wordPositions: { word: string, pos: number }[] = [];
            words.forEach(word => {
                index[word].forEach((pos: number) => {
                    wordPositions.push({ word, pos });
                });
            });
            wordPositions.sort((a, b) => a.pos - b.pos);
            abstract = wordPositions.map(wp => wp.word).join(' ');
        }

        return {
            id: work.id,
            title: work.title,
            abstract: abstract,
            authors: work.authorships?.map((a: any) => a.author?.display_name || '') || [],
            published_date: work.publication_date,
            url: work.doi || work.id
        };
    });
};
