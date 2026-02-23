import { searchArxivPapers } from '../src/lib/api/arxiv';
import { searchOpenAlexPapers } from '../src/lib/api/openalex';
import { processPaperWithGemini } from '../src/lib/api/gemini';
import { searchSemanticScholar, getPaperCitations } from '../src/lib/api/semanticScholar';
import { supabase } from '../src/lib/db/supabase';
import { executeWrite, driver } from '../src/lib/db/neo4j';

/**
 * Normalizes an author's name to a standard format (capitalizing words).
 */
const normalizeAuthorName = (name: string) => {
    return name.trim().replace(/\w\S*/g, (w) => (w.replace(/^\w/, (c) => c.toUpperCase())));
};

/**
 * Helper to ensure an author exists in Supabase. Returns the author UUID.
 */
async function getOrCreateAuthorSupabase(name: string): Promise<string | null> {
    const normName = normalizeAuthorName(name);

    // Try to find existing
    let { data, error } = await supabase
        .from('authors')
        .select('id')
        .eq('name', normName)
        .single();

    if (data?.id) return data.id;

    // If not found, insert
    const res = await supabase
        .from('authors')
        .insert([{ name: normName }])
        .select('id')
        .single();

    if (res.error) {
        console.error(`Failed to create author ${normName} in Supabase:`, res.error);
        return null;
    }
    return res.data?.id;
}

/**
 * Main execution function
 */
async function main() {
    // Array of distinct search queries to hit different philosophy niches/authors
    // Array of distinct search queries to hit different philosophy niches
    const queries = [
        'all:"artificial intelligence" AND all:"philosophy of mind"',
        'all:"artificial intelligence" AND all:"epistemology"',
        'all:"artificial intelligence" AND all:"ethics"',
        'all:"artificial intelligence" AND all:"ontology"',
        'all:"introduction" AND all:"philosophy of artificial intelligence"',
        'all:"beginner" AND all:"philosophy of mind"'
    ];

    const limitPerQuery = 10; // Increased to find more entry points

    for (const query of queries) {
        console.log(`\n======================================================`);
        console.log(`🔍 Searching arXiv & OpenAlex for: '${query}' (Limit: ${limitPerQuery} each)`);

        let unifiedPapers: any[] = [];

        try {
            const arxivPapers = await searchArxivPapers(query, limitPerQuery);
            const formattedArxiv = arxivPapers.map(p => ({
                id: p.id,
                title: p.title,
                summary: p.summary,
                authors: p.authors,
                published: p.published,
                link: p.link,
                sourceType: 'arXiv'
            }));
            unifiedPapers = [...unifiedPapers, ...formattedArxiv];
        } catch (e) {
            console.error('arXiv fetch error:', e);
        }

        try {
            const openAlexPapers = await searchOpenAlexPapers(query, limitPerQuery);
            const formattedOpenAlex = openAlexPapers.map(p => ({
                id: p.url, // URL acts as unique ID
                title: p.title,
                summary: p.abstract,
                authors: p.authors,
                published: p.published_date,
                link: p.url,
                sourceType: 'OpenAlex'
            }));
            unifiedPapers = [...unifiedPapers, ...formattedOpenAlex];
        } catch (e) {
            console.error('OpenAlex fetch error:', e);
        }

        if (!unifiedPapers.length) {
            console.log('No papers found for this query across sources.');
            continue;
        }

        console.log(`Found ${unifiedPapers.length} combined papers. Beginning processing loop...\n`);

        for (const paper of unifiedPapers) {
            console.log(`-----------------------------------`);
            console.log(`📄 Processing: ${paper.title}`);

            // 1. Check if we already processed this paper (skip if so)
            const { data: existing } = await supabase
                .from('articles')
                .select('id')
                .eq('source', paper.sourceType)
                .eq('source_id', paper.id)
                .single();

            if (existing) {
                console.log(`⏭️  Already exists in database. Skipping.`);
                continue;
            }

            // 2. Ask Gemini for Philosophical Analysis
            console.log(`🧠 Asking Gemini for analysis...`);
            const aiAnalysis = await processPaperWithGemini({
                id: paper.id,
                title: paper.title,
                abstract: paper.summary,
            });

            if (!aiAnalysis) {
                console.log(`⚠️  Failed to analyze with Gemini. Skipping.`);
                continue;
            }

            console.log(`   - TL;DR: ${aiAnalysis.tldr.substring(0, 100)}...`);
            console.log(`   - Schools: ${aiAnalysis.schools.join(', ')}`);

            // 3. Save to Supabase
            console.log(`💾 Saving to Supabase...`);
            const { data: articleRes, error: articleErr } = await supabase
                .from('articles')
                .insert([{
                    source: paper.sourceType,
                    source_id: paper.id,
                    title: paper.title,
                    abstract: paper.summary,
                    published_date: new Date(paper.published).toISOString().split('T')[0],
                    url: paper.link,
                    philosophical_tldr: aiAnalysis.tldr,
                    philosophical_schools: aiAnalysis.schools,
                    difficulty_level: aiAnalysis.difficulty || 300
                }])
                .select('id')
                .single();

            if (articleErr || !articleRes) {
                console.error(`❌ Failed to save article to Supabase (likely RLS restrictions). Continuing to Neo4j insertion anyway:`, articleErr);
            } else {
                const articleUuid = articleRes.id;

                // Save Authors to Supabase
                for (let i = 0; i < paper.authors.length; i++) {
                    const authorId = await getOrCreateAuthorSupabase(paper.authors[i]);
                    if (authorId) {
                        await supabase.from('article_authors').insert([{
                            article_id: articleUuid,
                            author_id: authorId,
                            position: i + 1
                        }]);
                    }
                }
            }

            // 4. Save Graph nodes/edges to Neo4j
            console.log(`🕸️ Saving Graph nodes to Neo4j...`);

            // Create the Paper node
            await executeWrite(
                `MERGE (a:Article {id: $id}) 
       SET a.title = $title, 
           a.url = $url, 
           a.source = $source,
           a.tldr = $tldr,
           a.difficulty = $difficulty`,
                {
                    id: paper.id,
                    title: paper.title,
                    url: paper.link,
                    source: paper.sourceType,
                    tldr: aiAnalysis.tldr,
                    difficulty: aiAnalysis.difficulty || 300
                }
            );

            // Create School nodes and connect them to the Paper
            for (const school of aiAnalysis.schools) {
                const normSchool = school.trim();
                if (!normSchool) continue;

                await executeWrite(
                    `MERGE (s:School {name: $school})
         WITH s
         MATCH (a:Article {id: $paperId})
         MERGE (a)-[:CATEGORIZED_AS]->(s)`,
                    { school: normSchool, paperId: paper.id }
                );
            }

            // 5. Fetch Citations from Semantic Scholar and link in Neo4j
            console.log(`🔗 Fetching citation lineage from Semantic Scholar...`);
            try {
                const ssResults = await searchSemanticScholar(paper.title, 1);
                if (ssResults && ssResults.length > 0) {
                    const ssPaper = ssResults[0];
                    const citations = await getPaperCitations(ssPaper.paperId, 10); // get top 10 to avoid massive blowouts

                    console.log(`   - Found ${citations.length} citations.`);

                    for (const citationObj of citations) {
                        const cited = citationObj.citedPaper; // The API returns an object with a `citedPaper` property
                        if (!cited || !cited.title) continue;

                        // Neo4j CITES edge
                        await executeWrite(
                            `
                        MATCH (a:Article {id: $sourceId})
                        MERGE (cited:Article {id: $citedId})
                        ON CREATE SET cited.title = $citedTitle, cited.source = 'SemanticScholar'
                        MERGE (a)-[:CITES]->(cited)
                        `,
                            {
                                sourceId: paper.id,
                                citedId: cited.paperId, // Using the Semantic Scholar ID for the cited paper
                                citedTitle: cited.title
                            }
                        );
                    }
                } else {
                    console.log(`   - Paper not found on Semantic Scholar. Skipping citation graph.`);
                }
            } catch (error) {
                console.error(`   - Failed to fetch citations:`, error);
            }

            console.log(`✅ Finished processing: ${paper.title}`);
        }
    } // End query loop

    console.log(`\n🎉 Test extraction run complete!`);
    if (driver) await driver.close();
    process.exit(0);
}

main().catch(err => {
    console.error("Fatal error:", err);
    process.exit(1);
});
