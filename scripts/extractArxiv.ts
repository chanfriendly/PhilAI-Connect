/**
 * Main Paper Extraction Pipeline
 *
 * Sources: arXiv, OpenAlex, CrossRef, CORE
 *
 * Workflow per paper:
 *   1. Search each source with a curated query
 *   2. Deduplicate by source + source_id (skip existing)
 *   3. Send title + abstract to Gemini → get TL;DR, schools, difficulty
 *   4. Write to Supabase (relational) and Neo4j (graph)
 *   5. Fetch citation graph from Semantic Scholar and wire CITES edges in Neo4j
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/extractArxiv.ts
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { searchArxivPapers } from '../src/lib/api/arxiv';
import { searchOpenAlexPapers } from '../src/lib/api/openalex';
import { searchCrossRef } from '../src/lib/api/crossref';
import { searchCORE } from '../src/lib/api/core';
import { processPaperWithGemini } from '../src/lib/api/gemini';
import { searchSemanticScholar, getPaperCitations } from '../src/lib/api/semanticScholar';
import { supabase } from '../src/lib/db/supabase';
import { executeWrite, driver } from '../src/lib/db/neo4j';

// ---------------------------------------------------------------------------
// Query Bank
//
// Each query is run across all active sources. Aim for specificity — broad
// queries (e.g. just "AI ethics") pull too many non-philosophical papers.
// Grouped loosely by philosophical area for maintainability.
// ---------------------------------------------------------------------------
const queries = [
    // --- Core AI + Philosophy of Mind ---
    'artificial intelligence philosophy of mind',
    'philosophy of artificial intelligence consciousness',
    'artificial intelligence epistemology knowledge',
    'machine learning philosophy ontology',
    'introduction philosophy artificial intelligence overview',

    // --- Consciousness & Qualia ---
    'consciousness artificial intelligence hard problem',
    'qualia phenomenal experience artificial minds',
    'functionalism multiple realizability mind',
    'Chinese room argument Searle intentionality',
    'higher-order theories consciousness',

    // --- Ethics & Value Alignment ---
    'artificial intelligence ethics moral philosophy',
    'AI alignment value ethics philosophy',
    'machine ethics deontological consequentialist',
    'robot rights moral status philosophy',
    'autonomous systems moral responsibility philosophy',

    // --- Personal Identity & Continuity ---
    'personal identity artificial intelligence philosophy',
    'psychological continuity personal identity',
    'uploading mind digital consciousness philosophy',

    // --- Free Will & Agency ---
    'free will artificial intelligence determinism',
    'agency intentionality artificial systems philosophy',

    // --- Epistemology & Knowledge ---
    'epistemic injustice artificial intelligence',
    'machine learning bias epistemology philosophy',
    'explainable AI knowledge philosophy',

    // --- Language & Meaning ---
    'natural language processing philosophy semantics',
    'large language models meaning understanding philosophy',
    'Wittgenstein language games artificial intelligence',

    // --- Metaphysics & Ontology ---
    'ontology knowledge representation artificial intelligence',
    'social ontology artificial intelligence philosophy',
];

const LIMIT_PER_QUERY_PER_SOURCE = 8;

// ---------------------------------------------------------------------------
// Author helpers
// ---------------------------------------------------------------------------
const normalizeAuthorName = (name: string) =>
    name.trim().replace(/\w\S*/g, w => w.replace(/^\w/, c => c.toUpperCase()));

async function getOrCreateAuthorSupabase(name: string): Promise<string | null> {
    const normName = normalizeAuthorName(name);

    const { data } = await supabase
        .from('authors')
        .select('id')
        .eq('name', normName)
        .single();

    if (data?.id) return data.id;

    const res = await supabase
        .from('authors')
        .insert([{ name: normName }])
        .select('id')
        .single();

    if (res.error) {
        console.error(`Failed to create author ${normName}:`, res.error);
        return null;
    }
    return res.data?.id ?? null;
}

// ---------------------------------------------------------------------------
// Core ingestion function — shared across all sources
// ---------------------------------------------------------------------------
interface UnifiedPaper {
    id: string;
    title: string;
    summary: string;
    authors: string[];
    published: string;
    link: string;
    sourceType: string;
}

async function ingestPaper(paper: UnifiedPaper) {
    // 1. Skip if already in DB
    const { data: existing } = await supabase
        .from('articles')
        .select('id')
        .eq('source', paper.sourceType)
        .eq('source_id', paper.id)
        .single();

    if (existing) {
        console.log(`   ⏭️  Already exists. Skipping.`);
        return;
    }

    if (!paper.summary || paper.summary.length < 50) {
        console.log(`   ⚠️  No usable abstract. Skipping.`);
        return;
    }

    // 2. Gemini analysis
    console.log(`   🧠 Sending to Gemini...`);
    const aiAnalysis = await processPaperWithGemini({
        id: paper.id,
        title: paper.title,
        abstract: paper.summary,
    });

    if (!aiAnalysis) {
        console.log(`   ⚠️  Gemini analysis failed. Skipping.`);
        return;
    }

    const difficulty = aiAnalysis.difficulty || 300;
    console.log(`   - Schools: ${(aiAnalysis.schools || []).join(', ')}`);
    console.log(`   - Difficulty: ${difficulty}`);

    // 3. Save to Supabase
    const { data: articleRes, error: articleErr } = await supabase
        .from('articles')
        .insert([{
            source: paper.sourceType,
            source_id: paper.id,
            title: paper.title,
            abstract: paper.summary,
            published_date: paper.published
                ? new Date(paper.published).toISOString().split('T')[0]
                : null,
            url: paper.link,
            philosophical_tldr: aiAnalysis.tldr,
            philosophical_schools: aiAnalysis.schools || [],
            difficulty_level: difficulty,
        }])
        .select('id')
        .single();

    if (articleErr || !articleRes) {
        console.warn(`   ⚠️  Supabase insert failed (graph will still be updated): ${articleErr?.message}`);
        if (articleErr?.message?.includes('ENOTFOUND')) {
            console.warn(`      Supabase project may be paused — restore it at app.supabase.com`);
        }
    } else {
        for (let i = 0; i < paper.authors.length; i++) {
            const authorId = await getOrCreateAuthorSupabase(paper.authors[i]);
            if (authorId) {
                await supabase.from('article_authors').insert([{
                    article_id: articleRes.id,
                    author_id: authorId,
                    position: i + 1,
                }]);
            }
        }
    }

    // 4. Save to Neo4j
    await executeWrite(
        `MERGE (a:Article {id: $id})
         SET a.title      = $title,
             a.url        = $url,
             a.source     = $source,
             a.tldr       = $tldr,
             a.difficulty = $difficulty`,
        {
            id: paper.id,
            title: paper.title,
            url: paper.link,
            source: paper.sourceType,
            tldr: aiAnalysis.tldr,
            difficulty,
        }
    );

    for (const school of (aiAnalysis.schools || [])) {
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

    // 5. Fetch citation graph from Semantic Scholar
    try {
        const ssResults = await searchSemanticScholar(paper.title, 1);
        if (ssResults?.length > 0) {
            const citations = await getPaperCitations(ssResults[0].paperId, 10);
            console.log(`   🔗 ${citations.length} citations found.`);
            for (const citationObj of citations) {
                const cited = citationObj.citedPaper;
                if (!cited?.title) continue;
                await executeWrite(
                    `MATCH (a:Article {id: $sourceId})
                     MERGE (cited:Article {id: $citedId})
                     ON CREATE SET cited.title = $citedTitle, cited.source = 'SemanticScholar'
                     MERGE (a)-[:CITES]->(cited)`,
                    {
                        sourceId: paper.id,
                        citedId: cited.paperId,
                        citedTitle: cited.title,
                    }
                );
            }
        }
    } catch (err) {
        console.warn(`   ⚠️  Citation fetch failed:`, err);
    }

    console.log(`   ✅ Done.`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
    let totalProcessed = 0;

    for (const query of queries) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`🔍 Query: "${query}"`);

        const allPapers: UnifiedPaper[] = [];

        // --- arXiv ---
        try {
            const arxivPapers = await searchArxivPapers(query, LIMIT_PER_QUERY_PER_SOURCE);
            allPapers.push(...arxivPapers.map(p => ({
                id: p.id,
                title: p.title,
                summary: p.summary,
                authors: p.authors,
                published: p.published,
                link: p.link,
                sourceType: 'arXiv',
            })));
            console.log(`   arXiv: ${arxivPapers.length} results`);
        } catch (e) {
            console.warn(`   arXiv fetch error:`, e);
        }

        // --- OpenAlex ---
        try {
            const openAlexPapers = await searchOpenAlexPapers(query, LIMIT_PER_QUERY_PER_SOURCE);
            allPapers.push(...openAlexPapers.map(p => ({
                id: p.url,
                title: p.title,
                summary: p.abstract,
                authors: p.authors,
                published: p.published_date,
                link: p.url,
                sourceType: 'OpenAlex',
            })));
            console.log(`   OpenAlex: ${openAlexPapers.length} results`);
        } catch (e) {
            console.warn(`   OpenAlex fetch error:`, e);
        }

        // --- CrossRef ---
        try {
            const crossRefPapers = await searchCrossRef(query, LIMIT_PER_QUERY_PER_SOURCE);
            allPapers.push(...crossRefPapers.map(p => ({
                id: p.doi,
                title: p.title,
                summary: p.abstract,
                authors: p.authors,
                published: p.published_date,
                link: p.url,
                sourceType: 'CrossRef',
            })));
            console.log(`   CrossRef: ${crossRefPapers.length} results`);
        } catch (e) {
            console.warn(`   CrossRef fetch error:`, e);
        }

        // --- CORE ---
        try {
            const corePapers = await searchCORE(query, LIMIT_PER_QUERY_PER_SOURCE);
            allPapers.push(...corePapers.map(p => ({
                id: p.id,
                title: p.title,
                summary: p.abstract,
                authors: p.authors,
                published: p.published_date,
                link: p.url,
                sourceType: 'CORE',
            })));
            console.log(`   CORE: ${corePapers.length} results`);
        } catch (e) {
            console.warn(`   CORE fetch error:`, e);
        }

        console.log(`   Total candidates this query: ${allPapers.length}\n`);

        for (const paper of allPapers) {
            if (!paper.title || !paper.id) continue;
            console.log(`📄 ${paper.title.substring(0, 80)}${paper.title.length > 80 ? '…' : ''}`);
            console.log(`   Source: ${paper.sourceType}`);
            await ingestPaper(paper);
            totalProcessed++;
        }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎉 Pipeline complete. Total papers processed: ${totalProcessed}`);

    if (driver) await driver.close();
    process.exit(0);
}

main().catch(err => {
    console.error('\n💥 Fatal error:', err);
    process.exit(1);
});
