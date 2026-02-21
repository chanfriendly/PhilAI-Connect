import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Google Generative AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface CategorizationRequest {
    id: string; // The paper ID
    title: string;
    abstract: string;
}

/**
 * Uses Gemini (1.5 Flash) to generate a TL;DR and categorize the given paper.
 * For massive batch processes, Google AI Studio supports batching, 
 * but for simplicity here we process individually or in Promise.all concurrency.
 */
export const processPaperWithGemini = async (req: CategorizationRequest) => {
    // Use the fast, cost-effective gemini-2.5-flash model
    const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        systemInstruction: "You are an expert AI philosopher. Provide structured analysis in valid JSON format. Provide exactly two keys: 'tldr' (a 3-sentence philosophical summary) and 'schools' (an array of strings representing relevant philosophical schools like 'Functionalism', 'Virtue Ethics')."
    });

    const prompt = `Title: ${req.title}\nAbstract: ${req.abstract}`;

    try {
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
                responseMimeType: "application/json",
            }
        });

        const responseText = result.response.text();
        return JSON.parse(responseText);
    } catch (error) {
        console.error(`Error processing paper ${req.id} with Gemini:`, error);
        return null;
    }
};
