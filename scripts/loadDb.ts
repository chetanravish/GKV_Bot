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


                const pageText = await page.evaluate(() => {
                    const body = document.body.cloneNode(true) as HTMLElement;

                    // Remove standard page elements that are not useful
                    // as knowledge sources.
                    body
                        .querySelectorAll(
                            [
                                "script",
                                "style",
                                "form",
                                "input",
                                "textarea",
                                "select",
                                "button",
                                "noscript",
                                "nav",
                                "header",
                                "footer",
                                "aside",
                                '[role="navigation"]',
                                '[aria-label="Breadcrumb"]',
                                ".elementor-form",
                                ".site-header",
                                ".site-footer",
                                ".main-navigation",
                                ".elementor-location-header",
                                ".elementor-location-footer",
                                ".sharedaddy",
                                ".shared-counts",
                                ".addtoany_share_save_container",
                                ".wp-social-sharing",
                                ".wpcf7-response-output",
                                ".wpcf7-not-valid-tip",
                                ".wpcf7-form",
                                ".wpcf7",
                                ".elementor-widget-share-buttons",
                                "#masthead",
                                "#colophon",
                            ].join(",")
                        )
                        .forEach((element) => element.remove());

                    return body.innerText
                        .replace(/\u00a0/g, " ")
                        .replace(/[ \t]+\n/g, "\n")
                        .replace(/\n{3,}/g, "\n\n")
                        .trim();
                });

                const navigationLines = new Set([
                    "Merit List",
                    "Placement Cell",
                    "Tenders",
                    "Fee Payment",
                    "Contact Us",
                    "Emergency Contacts",
                    "Quick Enquiry",
                    "MENU",
                ]);

                const cleanedText = pageText
                    .split(/\r?\n/)
                    .filter((line) => !navigationLines.has(line.trim()))
                    .join("\n")
                    .replace(/[ \t]+\n/g, "\n")
                    .replace(/\n{3,}/g, "\n\n")
                    .trim();


                console.log(`Original text length: ${pageText.length}`);
                console.log(`Cleaned text length: ${cleanedText.length}`);
                console.log("Cleaned preview:", cleanedText.slice(0, 700));
                if (cleanedText.trim()) {
                    scrapedPages.push({
                        url,
                        text: cleanedText,
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
            let saved = 0;

            // Process in small batches to avoid sending too many
            // requests to Astra DB at once.
            const batchSize = 5;

            for (let i = 0; i < documents.length; i += batchSize) {
                const batch = documents.slice(i, i + batchSize);

                const results = await Promise.all(
                    batch.map((document) =>
                        collection.updateOne(
                            { _id: document._id },
                            {
                                $set: {
                                    text: document.text,
                                    url: document.url,
                                    $vector: document.$vector,
                                },
                            },
                            { upsert: true }
                        )
                    )
                );

                saved += results.length;
                console.log(`Processed ${saved}/${documents.length} documents`);
            }

            console.log(
                `Successfully upserted ${saved} documents into Astra DB`
            );

            const currentIds = new Set(
                documents.map((document) => document._id)
            );

            const refreshedUrls = [
                ...new Set(documents.map((document) => document.url)),
            ];

            let removed = 0;

            for (const url of refreshedUrls) {
                const existingDocs = await collection.find({ url }).toArray();

                const staleDocs = existingDocs.filter(
                    (doc) =>
                        typeof doc._id === "string" &&
                        !currentIds.has(doc._id)
                );

                for (const doc of staleDocs) {
                    await collection.deleteOne({ _id: doc._id });
                    removed++;
                }
            }

            console.log(`Removed ${removed} obsolete documents`);

        } else {
            console.warn("No documents to save.");
        }


    } finally {
        await browser.close()
    }
}

loadData().catch(error => {
    console.error("Data ingestion failed:", error)
    process.exitCode = 1
})
