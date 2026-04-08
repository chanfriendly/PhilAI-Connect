/**
 * PhilArchive OAI-PMH Client
 *
 * PhilArchive (philarchive.org) is the open-access philosophy preprint repository
 * operated by PhilPapers. It hosts 115k+ philosophy papers with full text and
 * Dublin Core metadata. Unlike the other sources in this pipeline, PhilArchive
 * provides no keyword search — it uses OAI-PMH, a harvesting protocol.
 *
 * Strategy: harvest records created/updated within a date window and return all
 * that have abstracts. Gemini handles relevance filtering downstream.
 *
 * No API key required. No rate limit documented; using 1s delay between pages.
 *
 * OAI-PMH endpoint: https://philarchive.org/oai.pl
 */

export interface PhilArchivePaper {
    id: string;
    title: string;
    abstract: string;
    authors: string[];
    published_date: string;
    url: string;
}

const OAI_BASE = 'https://philarchive.org/oai.pl';
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/** Strip XML/HTML tags and normalize whitespace. */
const stripTags = (s: string) =>
    s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

/** Extract all values for a given Dublin Core element name from a <record> block. */
const extractDcValues = (record: string, element: string): string[] => {
    const re = new RegExp(`<(?:dc:)?${element}[^>]*>([\\s\\S]*?)<\\/(?:dc:)?${element}>`, 'gi');
    const results: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(record)) !== null) {
        const val = stripTags(m[1]).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        if (val) results.push(val);
    }
    return results;
};

/** Parse a batch of <record> blocks from an OAI-PMH ListRecords response. */
const parseRecords = (xml: string): PhilArchivePaper[] => {
    const papers: PhilArchivePaper[] = [];
    const recordRe = /<record>([\s\S]*?)<\/record>/g;
    let match: RegExpExecArray | null;

    while ((match = recordRe.exec(xml)) !== null) {
        const block = match[1];

        // Skip deleted records
        if (/<header[^>]+status=["']deleted["']/.test(block)) continue;

        const titles = extractDcValues(block, 'title');
        const descriptions = extractDcValues(block, 'description');
        const creators = extractDcValues(block, 'creator');
        const dates = extractDcValues(block, 'date');

        // Prefer the identifier that looks like a URL; fall back to the OAI identifier
        const identifiers = extractDcValues(block, 'identifier');
        const url = identifiers.find(id => id.startsWith('http')) || identifiers[0] || '';

        // OAI identifier is in the <header>
        const oaiIdMatch = block.match(/<identifier>([\s\S]*?)<\/identifier>/);
        const oaiId = oaiIdMatch ? oaiIdMatch[1].trim() : url;

        const title = titles[0] || '';
        // Dublin Core uses <dc:description> for the abstract
        const abstract = descriptions.find(d => d.length > 80) || '';

        if (!title || !abstract) continue;

        papers.push({
            id: oaiId,
            title,
            abstract,
            authors: creators,
            published_date: dates[0] || '',
            url,
        });
    }

    return papers;
};

/** Extract the resumption token from a ListRecords response, if present. */
const extractResumptionToken = (xml: string): string | null => {
    const m = xml.match(/<resumptionToken[^>]*>([^<]+)<\/resumptionToken>/);
    return m ? m[1].trim() : null;
};

/**
 * Harvest PhilArchive papers via OAI-PMH.
 *
 * @param from   ISO date string (YYYY-MM-DD). Defaults to 90 days ago.
 * @param until  ISO date string (YYYY-MM-DD). Defaults to today.
 * @param maxPages  Safety cap on pagination (each page ~100 records). Default 10.
 */
export const harvestPhilArchive = async (
    from?: string,
    until?: string,
    maxPages = 10
): Promise<PhilArchivePaper[]> => {
    // Default: last 90 days
    if (!from) {
        const d = new Date();
        d.setDate(d.getDate() - 90);
        from = d.toISOString().split('T')[0];
    }
    if (!until) {
        until = new Date().toISOString().split('T')[0];
    }

    const papers: PhilArchivePaper[] = [];
    let page = 0;
    let resumptionToken: string | null = null;

    console.log(`   PhilArchive: harvesting ${from} → ${until}`);

    while (page < maxPages) {
        let url: string;

        if (resumptionToken) {
            url = `${OAI_BASE}?verb=ListRecords&resumptionToken=${encodeURIComponent(resumptionToken)}`;
        } else {
            const params = new URLSearchParams({
                verb: 'ListRecords',
                metadataPrefix: 'oai_dc',
                from,
                until,
            });
            url = `${OAI_BASE}?${params.toString()}`;
        }

        let response: Response;
        try {
            response = await fetch(url, {
                headers: {
                    'User-Agent': 'PhilAI-Connect/1.0 (Academic research aggregator; non-commercial)',
                },
            });
        } catch (err) {
            console.warn(`   ⚠️  PhilArchive network error on page ${page + 1}:`, err);
            break;
        }

        if (!response.ok) {
            console.warn(`   ⚠️  PhilArchive HTTP ${response.status} on page ${page + 1}`);
            break;
        }

        const xml = await response.text();

        // OAI-PMH returns an error element when there are no results
        if (xml.includes('<error code="noRecordsMatch">')) {
            console.log(`   PhilArchive: no records in date range.`);
            break;
        }

        const batch = parseRecords(xml);
        papers.push(...batch);
        console.log(`   PhilArchive: page ${page + 1} → ${batch.length} records (total: ${papers.length})`);

        resumptionToken = extractResumptionToken(xml);
        if (!resumptionToken) break;

        page++;
        await sleep(1000); // polite delay between pages
    }

    return papers;
};
