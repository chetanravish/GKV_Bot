import { DataAPIClient } from "@datastax/astra-db-ts"
import puppeteer from "puppeteer"
import { GoogleGenAI } from "@google/genai"
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"
import "dotenv/config"
import { createHash } from "node:crypto"

const { ASTRA_DB_NAMESPACE,
    ASTRA_DB_COLLECTION,
    ASTRA_DB_API_ENDPOINT,
    ASTRA_DB_APPLICATION_TOKEN,
    GEMINI_API_KEY } = process.env

if (
    !ASTRA_DB_NAMESPACE ||
    !ASTRA_DB_COLLECTION ||
    !ASTRA_DB_API_ENDPOINT ||
    !ASTRA_DB_APPLICATION_TOKEN ||
    !GEMINI_API_KEY
) {
    throw new Error("Missing required environment variables in .env")
}


const ai = new GoogleGenAI({
    apiKey: GEMINI_API_KEY
})

const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN)

const db = client.db(ASTRA_DB_API_ENDPOINT, {
    keyspace: ASTRA_DB_NAMESPACE
})

const collection = db.collection(ASTRA_DB_COLLECTION)

const website_url = "https://www.gkv.ac.in/"



async function loadData() {
    const browser = await puppeteer.launch({
        headless: true,
    })

    try {
        const page = await browser.newPage()

        await page.goto(website_url, {
            waitUntil: "networkidle2",
        })

        const baseUrl = new URL(website_url)

        const links = await page.$$eval("a[href]", anchors => {
            return anchors.map(anchor => ({
                text: anchor.textContent?.trim() ?? "",
                href: (anchor as HTMLAnchorElement).href,
            }))
        })

        const internalLinks = links.filter(({ href }) => {
            try {
                const linkUrl = new URL(href)
                const hostname = linkUrl.hostname.replace(/^www\./, "")
                const baseHostname = baseUrl.hostname.replace(/^www\./, "")

                return (
                    hostname === baseHostname ||
                    hostname.endsWith(`.${baseHostname}`)
                )
            } catch {
                return false
            }
        })

        const uniqueUrls = [
            ...new Set(
                internalLinks.map(({ href }) => {
                    const url = new URL(href)
                    url.hash = ""
                    return url.href
                })
            ),
        ]

        const pagesToCrawl = uniqueUrls.slice(0, 5)

        const scrapedPages: {
            url: string
            text: string
        }[] = []

        for (const url of pagesToCrawl) {
            try {
                console.log(`Crawling: ${url}`)

                await page.goto(url, {
                    waitUntil: "domcontentloaded",
                    timeout: 30000,
                })

                const pageText = await page.evaluate(
                    () => document.body.innerText
                )

                if (pageText.trim()) {
                    scrapedPages.push({
                        url,
                        text: pageText,
                    })
                } else {
                    console.warn(`No text extracted from: ${url}`)
                }
            } catch (error) {
                console.error(`Failed to crawl ${url}:`, error)
            }
        }

        console.log("Pages successfully scraped:", scrapedPages.length)

        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
        })

        const allChunks: {
            url: string
            text: string
        }[] = []

        for (const scrapedPage of scrapedPages) {
            const chunks = await splitter.splitText(scrapedPage.text)

            for (const chunk of chunks) {
                allChunks.push({
                    url: scrapedPage.url,
                    text: chunk,
                })
            }
        }

        console.log("Total chunks prepared:", allChunks.length)

        const documents: {
            _id: string
            $vector: number[]
            text: string
            url: string
        }[] = []

        for (const [index, chunk] of allChunks.entries()) {
            const embeddingResult = await ai.models.embedContent({
                model: "gemini-embedding-001",
                contents: chunk.text,
            })

            const embedding = embeddingResult.embeddings?.[0]?.values

            if (!embedding || embedding.length !== 3072) {
                throw new Error(
                    `Invalid embedding for chunk ${index}: expected 3072 dimensions`
                )
            }

            const id = createHash("sha256")
                .update(`${chunk.url}:${index}:${chunk.text}`)
                .digest("hex")

            documents.push({
                _id: id,
                $vector: embedding,
                text: chunk.text,
                url: chunk.url,
            })
        }

        console.log(`Generated embeddings for ${documents.length} chunks`)
        if (documents.length > 0) {
    const result = await collection.insertMany(documents)
    console.log(`Successfully saved ${result.insertedCount} documents to Astra DB`)
} else {
    console.warn("No documents to save.")
}

    } finally {
        await browser.close()
    }
}

loadData().catch(error => {
    console.error("Data ingestion failed:", error)
    process.exitCode = 1
})
