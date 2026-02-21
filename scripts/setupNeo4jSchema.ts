// Neo4j Schema Setup
// Run this script once to initialize constraints
// Usage: npx tsx scripts/setupNeo4jSchema.ts

import { driver, executeWrite } from '../src/lib/db/neo4j';

async function main() {
    console.log('Setting up Neo4j Constraints and Indexes...');

    const constraints = [
        'CREATE CONSTRAINT article_id IF NOT EXISTS FOR (a:Article) REQUIRE a.id IS UNIQUE',
        'CREATE CONSTRAINT author_name IF NOT EXISTS FOR (a:Author) REQUIRE a.name IS UNIQUE',
        'CREATE CONSTRAINT school_name IF NOT EXISTS FOR (s:School) REQUIRE s.name IS UNIQUE'
    ];

    for (const q of constraints) {
        console.log(`Executing: ${q}`);
        await executeWrite(q);
    }

    console.log('Done.');
    await driver.close();
    process.exit(0);
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
