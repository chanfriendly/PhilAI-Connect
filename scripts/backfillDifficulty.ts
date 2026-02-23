import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { supabase } from '../src/lib/db/supabase';
import { executeWrite, driver } from '../src/lib/db/neo4j';
import { processPaperWithGemini } from '../src/lib/api/gemini';

async function backfill() {
    console.log("Starting backfill for Cognitive Difficulty levels...");

    // 1. Fetch articles from Supabase that have no difficulty level
    const { data: articles, error } = await supabase
        .from('articles')
        .select('id, source_id, title, abstract')
        .is('difficulty_level', null);

    if (error) {
        console.error("Failed to fetch articles from Supabase:", error);
        process.exit(1);
    }

    if (!articles || articles.length === 0) {
        console.log("All articles already have a difficulty level assigned.");
        if (driver) await driver.close();
        process.exit(0);
    }

    console.log(`Found ${articles.length} articles needing backfill. Processing with Gemini...`);

    // 2. Loop and Reprocess
    for (const article of articles) {
        console.log(`\n📄 Grading: ${article.title}`);

        const aiAnalysis = await processPaperWithGemini({
            id: article.source_id,
            title: article.title,
            abstract: article.abstract || "No abstract provided."
        });

        if (!aiAnalysis) {
            console.log(`⚠️ Failed to analyze ${article.title}. Skipping.`);
            continue;
        }

        const difficulty = aiAnalysis.difficulty || 300;
        console.log(`   - Assigned Level: ${difficulty}`);

        // Update Supabase
        const { error: updateErr } = await supabase
            .from('articles')
            .update({ difficulty_level: difficulty })
            .eq('id', article.id);

        if (updateErr) {
            console.error(`   - Failed to update Supabase:`, updateErr);
        }

        // Update Neo4j
        await executeWrite(
            `MATCH (a:Article {id: $sourceId}) SET a.difficulty = $difficulty`,
            { sourceId: article.source_id, difficulty: difficulty }
        );
    }

    console.log("\n✅ Backfill complete!");
    if (driver) await driver.close();
    process.exit(0);
}

backfill().catch(err => {
    console.error("Fatal error:", err);
    process.exit(1);
});
