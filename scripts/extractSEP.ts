/**
 * Stanford Encyclopedia of Philosophy (SEP) Scraper
 *
 * The SEP (plato.stanford.edu) is the gold standard for philosophy reference:
 * every entry is peer-reviewed, written accessibly, and has a structured bibliography.
 * For an undergrad audience, SEP entries make excellent Introductory–Intermediate
 * anchor nodes in the graph — they provide context that raw academic papers lack.
 *
 * There is no official SEP API. This script fetches public HTML pages and parses
 * the preamble (intro section). Please use respectfully:
 *   - A 2-second delay is enforced between requests.
 *   - Run infrequently (not on every pipeline run).
 *   - Respect SEP's Terms of Use: https://plato.stanford.edu/info.html#c
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/extractSEP.ts
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { processPaperWithGemini } from '../src/lib/api/gemini';
import { supabase } from '../src/lib/db/supabase';
import { executeWrite, driver } from '../src/lib/db/neo4j';

// ---------------------------------------------------------------------------
// Curated list of SEP entries at the AI–philosophy intersection.
// Slugs correspond to the URL: https://plato.stanford.edu/entries/<slug>/
// ---------------------------------------------------------------------------
const SEP_ENTRIES = [
    { slug: 'artificial-intelligence',           title: 'Artificial Intelligence' },
    { slug: 'functionalism',                     title: 'Functionalism' },
    { slug: 'consciousness',                     title: 'Consciousness' },
    { slug: 'dualism',                           title: 'Dualism' },
    { slug: 'chinese-room',                      title: 'The Chinese Room Argument' },
    { slug: 'turing-test',                       title: 'The Turing Test' },
    { slug: 'ethics-ai',                title: 'Ethics of Artificial Intelligence and Robotics' },
    { slug: 'identity-personal',        title: 'Personal Identity' },
    { slug: 'connectionism',            title: 'Connectionism' },
    { slug: 'intentionality',           title: 'Intentionality' },
    { slug: 'computational-mind',       title: 'Computation and the Mind' },
    { slug: 'moral-responsibility',     title: 'Moral Responsibility' },
    { slug: 'other-minds',              title: 'Other Minds' },
    { slug: 'logic-ai',                 title: 'Logic and Artificial Intelligence' },
    { slug: 'mind-identity',            title: 'The Identity Theory of Mind' },
    { slug: 'eliminativism',            title: 'Eliminative Materialism' },
    { slug: 'qualia',                   title: 'Qualia' },
    { slug: 'multiple-realizability',   title: 'Multiple Realizability' },
    { slug: 'epiphenomenalism',         title: 'Epiphenomenalism' },
    { slug: 'freewill',                 title: 'Free Will' },
    { slug: 'moral-realism',            title: 'Moral Realism' },
    { slug: 'consequentialism',         title: 'Consequentialism' },
    { slug: 'ethics-deontological',     title: 'Deontological Ethics' },
    { slug: 'ethics-virtue',            title: 'Virtue Ethics' },
    { slug: 'intrinsic-extrinsic',      title: 'Intrinsic vs. Extrinsic Properties' },
    { slug: 'truth',                    title: 'Truth' },
    { slug: 'epistemology',             title: 'Epistemology' },
];

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetches and parses the introductory preamble of a SEP entry.
 * The preamble is wrapped in <div id="preamble"> in SEP's HTML.
 */
async function scrapeEntry(slug: string): Promise<{
    title: string;
    abstract: string;
    url: string;
} | null> {
    const url = `https://plato.stanford.edu/entries/${slug}/`;

    try {
        const response = await fetch(url, {
            headers: {
                // Identify the scraper as requested by SEP's guidelines
                'User-Agent': 'PhilAI-Connect/1.0 (Academic research aggregator; non-commercial)',
            },
        });

        if (!response.ok) {
            console.warn(`   ⚠️  HTTP ${response.status} for SEP entry: ${slug}`);
            return null;
        }

        const html = await response.text();

        // --- Extract preamble ---
        // SEP's structure: <div id="preamble"> ... </div>
        const preambleMatch = html.match(/<div[^>]+id=["']preamble["'][^>]*>([\s\S]*?)<\/div>/i);
        if (!preambleMatch) {
            console.warn(`   ⚠️  Could not find preamble in SEP entry: ${slug}`);
            return null;
        }

        const abstract = preambleMatch[1]
            .replace(/<[^>]*>/g, ' ')   // strip HTML tags
            .replace(/\s+/g, ' ')       // collapse whitespace
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&nbsp;/g, ' ')
            .replace(/&#[0-9]+;/g, '')  // remove numeric entities
            .trim()
            .substring(0, 3000);         // cap length for Gemini context

        if (abstract.length < 100) {
            console.warn(`   ⚠️  Preamble too short for entry: ${slug}. Skipping.`);
            return null;
        }

        // --- Extract page title ---
        const titleMatch = html.match(/<title>([^<]*)<\/title>/);
        const title = titleMatch
            ? titleMatch[1]
                .replace('(Stanford Encyclopedia of Philosophy)', '')
                .replace('–', '')
                .trim()
            : slug;

        return { title, abstract, url };
    } catch (error) {
        console.error(`   ❌ Network error scraping SEP/${slug}:`, error);
        return null;
    }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
    console.log('🏛️  Starting SEP extraction...\n');
    console.log(`   Entries to process: ${SEP_ENTRIES.length}`);
    console.log('   Delay between requests: 2s (respectful scraping)\n');

    let added = 0;
    let skipped = 0;
    let failed = 0;

    for (const entry of SEP_ENTRIES) {
        console.log(`\n📚 ${entry.title} (${entry.slug})`);

        const sourceId = `plato.stanford.edu/entries/${entry.slug}`;

        // Skip if already in the database
        const { data: existing } = await supabase
            .from('articles')
            .select('id')
            .eq('source', 'SEP')
            .eq('source_id', sourceId)
            .single();

        if (existing) {
            console.log('   ⏭️  Already in database. Skipping.');
            skipped++;
            continue;
        }

        // Polite delay
        await sleep(2000);

        const scraped = await scrapeEntry(entry.slug);
        if (!scraped) {
            failed++;
            continue;
        }

        console.log(`   🧠 Sending to Gemini for analysis...`);
        const aiAnalysis = await processPaperWithGemini({
            id: sourceId,
            title: scraped.title,
            abstract: scraped.abstract,
        });

        if (!aiAnalysis) {
            console.log(`   ⚠️  Gemini analysis failed. Skipping.`);
            failed++;
            continue;
        }

        // SEP entries are editorial overviews, not primary research.
        // Cap difficulty at 300 (Intermediate) so they serve as accessible entry points.
        // A Functionalism survey entry should sit before a Chalmers or Searle paper.
        const difficulty = Math.min(aiAnalysis.difficulty || 200, 300);

        console.log(`   - TL;DR: ${(aiAnalysis.tldr || '').substring(0, 80)}...`);
        console.log(`   - Schools: ${(aiAnalysis.schools || []).join(', ')}`);
        console.log(`   - Difficulty: ${difficulty} (capped from ${aiAnalysis.difficulty})`);

        // Save to Supabase (non-blocking — Supabase stores full metadata but the graph
        // runs entirely off Neo4j, so a Supabase failure should warn but not stop the write)
        const { error: articleErr } = await supabase.from('articles').insert([{
            source: 'SEP',
            source_id: sourceId,
            title: scraped.title,
            abstract: scraped.abstract,
            url: scraped.url,
            philosophical_tldr: aiAnalysis.tldr,
            philosophical_schools: aiAnalysis.schools || [],
            difficulty_level: difficulty,
            published_date: null,
        }]);

        if (articleErr) {
            console.warn(`   ⚠️  Supabase insert failed (graph will still be updated): ${articleErr.message}`);
            console.warn(`      If you see ENOTFOUND, your Supabase project may be paused — restore it at app.supabase.com`);
        }

        // Save to Neo4j (primary graph store — runs regardless of Supabase status)
        await executeWrite(
            `MERGE (a:Article {id: $id})
             SET a.title   = $title,
                 a.url     = $url,
                 a.source  = 'SEP',
                 a.tldr    = $tldr,
                 a.difficulty = $difficulty`,
            {
                id: sourceId,
                title: scraped.title,
                url: scraped.url,
                tldr: aiAnalysis.tldr,
                difficulty,
            }
        );

        // Connect to philosophical schools
        for (const school of (aiAnalysis.schools || [])) {
            const normSchool = school.trim();
            if (!normSchool) continue;

            await executeWrite(
                `MERGE (s:School {name: $school})
                 WITH s
                 MATCH (a:Article {id: $paperId})
                 MERGE (a)-[:CATEGORIZED_AS]->(s)`,
                { school: normSchool, paperId: sourceId }
            );
        }

        console.log(`   ✅ Saved: "${scraped.title}"`);
        added++;
    }

    console.log(`\n========================================`);
    console.log(`🎉 SEP extraction complete.`);
    console.log(`   Added:   ${added}`);
    console.log(`   Skipped: ${skipped} (already in DB)`);
    console.log(`   Failed:  ${failed}`);

    if (driver) await driver.close();
    process.exit(0);
}

main().catch(err => {
    console.error('\n💥 Fatal error:', err);
    process.exit(1);
});
