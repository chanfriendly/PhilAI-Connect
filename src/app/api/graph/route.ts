import { NextResponse } from 'next/server';
import { executeRead } from '@/lib/db/neo4j';

export async function GET() {
    try {
        // Query Neo4j for all Articles, Schools, and their relationships (CATEGORIZED_AS and CITES)
        const result = await executeRead(`
            MATCH (a:Article)
            OPTIONAL MATCH (a)-[r_cat:CATEGORIZED_AS]->(s:School)
            OPTIONAL MATCH (a)-[r_cite:CITES]->(cited:Article)
            RETURN 
                a.id AS paperId, a.title AS title, a.tldr AS tldr, 
                s.name AS school,
                cited.id AS citedPaperId, cited.title AS citedTitle
        `);

        const nodesMap = new Map();
        const links: any[] = [];
        const addedLinks = new Set(); // To prevent duplicate links

        // Pre-compute paper counts per school to eliminate "dead end" single-paper schools
        const schoolPaperCounts = new Map<string, Set<string>>();
        result.records.forEach((record: any) => {
            const school = record.get('school');
            const paperId = record.get('paperId');
            if (school && paperId) {
                if (!schoolPaperCounts.has(school)) schoolPaperCounts.set(school, new Set());
                schoolPaperCounts.get(school)!.add(paperId);
            }
        });

        // Process records into react-force-graph format
        result.records.forEach((record: any) => {
            const paperId = record.get('paperId');
            const title = record.get('title');
            const tldr = record.get('tldr');

            const school = record.get('school');
            const citedPaperId = record.get('citedPaperId');
            const citedTitle = record.get('citedTitle');

            // Ensure Primary Paper Node exists
            if (!nodesMap.has(paperId)) {
                nodesMap.set(paperId, {
                    id: paperId,
                    name: title,
                    val: 1,
                    group: 1, // 1 = Paper
                    tldr: tldr
                });
            }

            // Handle School Edge (Only draw it if it's a HUB connecting > 1 paper)
            if (school && schoolPaperCounts.has(school) && schoolPaperCounts.get(school)!.size > 1) {
                const schoolId = `school-${school}`;
                if (!nodesMap.has(schoolId)) {
                    nodesMap.set(schoolId, {
                        id: schoolId,
                        name: school,
                        val: 3, // Make schools larger
                        group: 2 // 2 = School
                    });
                }
                const linkKey = `${paperId}->${schoolId}`;
                if (!addedLinks.has(linkKey)) {
                    links.push({ source: paperId, target: schoolId });
                    addedLinks.add(linkKey);
                }
            }

            // Handle Citation Edge
            if (citedPaperId) {
                if (!nodesMap.has(citedPaperId)) {
                    nodesMap.set(citedPaperId, {
                        id: citedPaperId,
                        name: citedTitle || 'Unknown Paper',
                        val: 0.8, // Slightly smaller for cited papers without abstracts yet
                        group: 1, // 1 = Paper
                    });
                }
                const linkKey = `${paperId}->${citedPaperId}`;
                if (!addedLinks.has(linkKey)) {
                    links.push({ source: paperId, target: citedPaperId, _isCitation: true });
                    addedLinks.add(linkKey);
                }
            }
        });

        const graphData = {
            nodes: Array.from(nodesMap.values()),
            links: links
        };

        return NextResponse.json(graphData);
    } catch (error) {
        console.error('Failed to fetch graph data:', error);
        return NextResponse.json({ error: 'Failed to fetch graph data' }, { status: 500 });
    }
}
