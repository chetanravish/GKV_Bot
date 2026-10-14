import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing from .env");
}

const ai = new GoogleGenAI({ apiKey });

async function listModels() {
    console.log("Checking models available to your API key...\n");

    const models = await ai.models.list();

    for await (const model of models) {
        if (
            model.supportedActions?.includes("generateContent")
        ) {
            console.log(model.name);
        }
    }
}

listModels().catch((error: unknown) => {
    console.error("Failed to list models:", error);
    process.exitCode = 1;
});