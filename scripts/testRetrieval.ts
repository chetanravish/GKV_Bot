import { DataAPIClient } from "@datastax/astra-db-ts";
import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

type RetrievedDocument = {
    _id?: string;
    text?: string;
    url?: string;
    $similarity?: number;
};

type RankedDocument = RetrievedDocument & {
    keywordScore: number;
    combinedScore: number;
};

const {
    ASTRA_DB_NAMESPACE,
    ASTRA_DB_COLLECTION,
    ASTRA_DB_API_ENDPOINT,
    ASTRA_DB_APPLICATION_TOKEN,
    GEMINI_API_KEY,
} = process.env;

if (
    !ASTRA_DB_NAMESPACE ||
    !ASTRA_DB_COLLECTION ||
    !ASTRA_DB_API_ENDPOINT ||
    !ASTRA_DB_APPLICATION_TOKEN ||
    !GEMINI_API_KEY
) {
    throw new Error("Missing required environment variables in .env");
}

const ai = new GoogleGenAI({
    apiKey: GEMINI_API_KEY,
});

const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);

const db = client.db(ASTRA_DB_API_ENDPOINT, {
    keyspace: ASTRA_DB_NAMESPACE,
});

const collection = db.collection(ASTRA_DB_COLLECTION);

async function testRetrieval(): Promise<void> {
    const question =
        "Where can I find the MCA merit list?";

    console.log("\nStudent question:", question);
    console.log("\nGenerating question embedding...");

    const embeddingResult = await ai.models.embedContent({
        model: "gemini-embedding-001",
        contents: question,
    });

    const queryEmbedding =
        embeddingResult.embeddings?.[0]?.values;

    if (!queryEmbedding || queryEmbedding.length !== 3072) {
        throw new Error("Invalid question embedding.");
    }

    console.log("Embedding generated:", queryEmbedding.length);
    console.log("Searching Astra DB...\n");

    const cursor = collection.find(
        {},
        {
            sort: {
                $vector: queryEmbedding,
            },
            limit: 10,
            includeSimilarity: true,
        }
    );

    const results = (await cursor.toArray()) as RetrievedDocument[];

    if (results.length === 0) {
        console.log("No documents returned.");
        return;
    }

    const queryTerms = question
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .split(/\s+/)
        .filter(
            (term) =>
                term.length > 2 &&
                !["where", "can", "the", "for", "find"].includes(term)
        );

    const rankedResults: RankedDocument[] = results
        .map((doc): RankedDocument => {
            const text = String(doc.text ?? "").toLowerCase();
            const url = String(doc.url ?? "").toLowerCase();

            const matchedTerms = queryTerms.filter(
                (term) => text.includes(term) || url.includes(term)
            );

            const keywordScore =
                matchedTerms.length / Math.max(queryTerms.length, 1);

            const similarity = Number(doc.$similarity ?? 0);

            return {
                ...doc,
                keywordScore,
                combinedScore:
                    0.7 * similarity + 0.3 * keywordScore,
            };
        })
        .sort((a, b) => b.combinedScore - a.combinedScore)
        .slice(0, 5);

    console.log(
        `Retrieved ${rankedResults.length} ranked documents.\n`
    );

    rankedResults.forEach((doc, index) => {
        console.log("========================================");
        console.log(`RESULT ${index + 1}`);
        console.log("Source:", doc.url ?? "No source URL");

        console.log(
            "Original similarity:",
            Number(doc.$similarity ?? 0).toFixed(4)
        );

        console.log(
            "Keyword score:",
            doc.keywordScore.toFixed(4)
        );

        console.log(
            "Combined score:",
            doc.combinedScore.toFixed(4)
        );

        console.log("\nText:");
        console.log(doc.text ?? "No text available");
        console.log();
    });
}

testRetrieval().catch((error: unknown) => {
    console.error("Retrieval test failed:", error);
    process.exitCode = 1;
});