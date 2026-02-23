import neo4j from 'neo4j-driver';

const uri = process.env.NEO4J_URI || 'neo4j://localhost:7687';
const user = process.env.NEO4J_USERNAME || 'neo4j';
const password = process.env.NEO4J_PASSWORD || 'password';

const isHttp = uri.startsWith('http');
export const driver = isHttp ? null : neo4j.driver(uri, neo4j.auth.basic(user, password));

async function executeHttp(query: string, params = {}) {
    // Determine the database name from env, normally 'neo4j'
    const dbName = process.env.NEO4J_DATABASE || 'neo4j';
    const endpoint = `${uri}/db/${dbName}/tx/commit`;

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic ' + Buffer.from(`${user}:${password}`).toString('base64'),
            'Accept': 'application/json'
        },
        body: JSON.stringify({
            statements: [{ statement: query, parameters: params }]
        })
    });

    if (!response.ok) {
        throw new Error(`Neo4j HTTP Error: ${response.status} ${response.statusText}`);
    }

    const json = await response.json();
    if (json.errors && json.errors.length > 0) {
        throw new Error(`Neo4j Cypher Error: ` + JSON.stringify(json.errors));
    }

    const result = json.results[0];
    if (!result) return { records: [] };

    const columns: string[] = result.columns;
    const records = result.data.map((item: any) => ({
        get: (key: string) => {
            const index = columns.indexOf(key);
            return index !== -1 ? item.row[index] : null;
        }
    }));

    return { records };
}

export const executeRead = async (query: string, params = {}) => {
    if (isHttp) return executeHttp(query, params);

    const session = driver!.session();
    try {
        const res = await session.executeRead(tx => tx.run(query, params));
        return res;
    } finally {
        await session.close();
    }
};

export const executeWrite = async (query: string, params = {}) => {
    if (isHttp) return executeHttp(query, params);

    const session = driver!.session();
    try {
        const res = await session.executeWrite(tx => tx.run(query, params));
        return res;
    } finally {
        await session.close();
    }
};
