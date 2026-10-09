import {DataAPIClient} from "@datastax/astra-db-ts"
import puppeteer from "puppeteer"
import { GoogleGenAI } from "@google/genai"
import {RecursiveCharacterTextSplitter} from "@langchain/textsplitters"
import "dotenv/config"

const {ASTRA_DB_NAMESPACE,
    ASTRA_DB_COLLECTION,
    ASTRA_DB_API_ENDPOINT,
    ASTRA_DB_APPLICATION_TOKEN,
    GEMINI_API_KEY} = process.env


    const ai = new GoogleGenAI({
        apiKey: GEMINI_API_KEY
    })

const website_url = "https://www.gkv.ac.in/"


async function loadData() {
const browser = await puppeteer.launch({
    headless:false
})

const page = await browser.newPage()

await page.goto(website_url, {
    waitUntil: "networkidle2"
})

const text = await page.evaluate(() => document.body.innerText)

console.log(text)

await browser.close()
}

loadData()