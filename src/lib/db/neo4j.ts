import neo4j from 'neo4j-driver';

const uri = process.env.NEO4J_URI || 'neo4j://localhost:7687';
const user = process.env.NEO4J_USERNAME || 'neo4j';
const password = process.env.NEO4J_PASSWORD || 'password';

export const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));

export const executeRead = async (query: string, params = {}) => {
    const session = driver.session();
    try {
        const res = await session.executeRead(tx => tx.run(query, params));
        return res;
    } finally {
        await session.close();
    }
};

export const executeWrite = async (query: string, params = {}) => {
    const session = driver.session();
    try {
        const res = await session.executeWrite(tx => tx.run(query, params));
        return res;
    } finally {
        await session.close();
    }
};
