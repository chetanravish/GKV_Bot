# GkvBot — Retrieval-Augmented Generation (RAG) Web App

Knowly is a college project focused on building a web-based knowledge assistant that can retrieve information from website content and use it to generate relevant, context-aware answers.

The goal is to let users ask questions about a website's content instead of manually searching through multiple pages. The project is being developed incrementally, starting with website content ingestion and moving toward retrieval, AI-powered responses, and a complete user-facing experience.

> **Project status:** In Development 🚧  
> Currently working on the website content ingestion pipeline and database seeding process.

## 🎯 Project Objectives

- Build a RAG-based question-answering system for website content.
- Automatically collect and process relevant information from websites.
- Enable users to ask natural-language questions about ingested content.
- Generate answers grounded in retrieved information rather than relying solely on an LLM's general knowledge.
- Develop a clean, responsive web interface for interacting with the knowledge assistant.

## 🛠️ Tech Stack

The project is being developed using the following technologies:

- **Frontend:** Next.js, React, TypeScript
- **Runtime and package management:** Node.js, npm
- **Web content extraction:** Puppeteer
- **AI and retrieval:** RAG pipeline (under development)
- **Data storage:** Database integration for storing processed website content (under development)

*The AI model, embedding provider, vector database, and other infrastructure choices will be documented here once they are finalized.*

## ⚙️ How Knowly Is Intended to Work

The planned workflow is:

1. **Website ingestion:** Provide a website URL as a source of knowledge.
2. **Content extraction:** Crawl relevant pages and extract their textual content.
3. **Content processing:** Clean the extracted text and divide it into manageable chunks.
4. **Embedding generation:** Convert text chunks into vector embeddings for semantic search.
5. **Knowledge storage:** Store the processed content and its associated metadata.
6. **Question processing:** Accept a user's question through the web interface.
7. **Context retrieval:** Find the most relevant content chunks for the question.
8. **Answer generation:** Pass the question and retrieved context to an AI model to generate a grounded response.
9. **Source references:** Where supported by the implementation, show the source pages used to construct the answer.

## 🚧 Current Progress

The project is actively being developed. The current focus is on establishing a reliable content ingestion workflow.

- [x] Initialize the Next.js project.
- [x] Set up the initial database seeding script using `npm run seed`.
- [x] Begin implementing website content extraction using Puppeteer.
- [ ] Finalize website URL handling and multi-page crawling.
- [ ] Extract and clean content consistently across pages.
- [ ] Complete the database ingestion and storage pipeline.
- [ ] Implement text chunking and embedding generation.
- [ ] Implement semantic retrieval for user queries.
- [ ] Connect retrieval with an LLM for context-aware answers.
- [ ] Build the complete question-answering interface.
- [ ] Add source references and improve answer reliability.
- [ ] Test the end-to-end pipeline with different websites and questions.

*The checklist distinguishes initial setup from work that remains to be completed. Update it as individual features become functional and tested.*

## 🔮 Future Scope

### 1. Multi-page Website Crawling
Expand ingestion beyond a single URL so Knowly can discover and process relevant internal pages, subject to configurable crawling limits and website policies.

### 2. Semantic Search
Use vector embeddings to retrieve information based on meaning rather than relying only on exact keyword matches.

### 3. Context-Aware AI Responses
Integrate a language model with the retrieval pipeline so answers are generated using relevant source content, with appropriate handling of questions that cannot be answered from the available knowledge.

### 4. Source Attribution
Display links to the original pages or relevant passages so users can verify the information behind an answer.

### 5. Multiple Knowledge Sources
Explore supporting multiple websites and, later, documents such as PDFs and text files within a single knowledge base.

### 6. Better User Experience
Develop a responsive chat interface with conversation history, loading indicators, error handling, and a clear presentation of retrieved information.

### 7. Performance and Reliability
Improve crawling efficiency, prevent duplicate ingestion, handle failed pages, and introduce automated tests for the ingestion and retrieval pipelines.

### 8. Deployment and Monitoring
Deploy the application, configure environment variables securely, and add logging and monitoring to help identify ingestion failures and answer-quality issues.

## 🚀 Getting Started

### Prerequisites

- Node.js and npm installed
- Access to the database used by the project
- API credentials for any external AI or embedding services required by the current implementation

### Installation

Clone the repository and navigate to the project directory:

```bash
git clone <your-repository-url>
cd knowly
```

Install dependencies:

```bash
npm install
```

### Environment Configuration

Create a `.env.local` file in the project root and add the environment variables required by your implementation.

For example:

```env
# Add the database connection string
# Add AI model or embedding API keys if required
```

Use the actual variable names expected by the application. Never commit real API keys, passwords, or database credentials to GitHub.

### Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Run the Database Seeding Script

To execute the current ingestion/seeding workflow:

```bash
npm run seed
```

The script is configured through the project's `seed` command and uses `ts-node` to execute `scripts/loadDb.ts`. Ensure the required environment variables and database connection are configured before running it.

The exact ingestion behavior depends on the current implementation of `loadDb.ts`.

## 📁 Project Structure

The project currently includes a Next.js application and a database seeding script. The structure below is illustrative; update it to match the actual repository.

```text
knowly/
├── pages/                 # Next.js pages and API routes
├── public/                # Static assets
├── scripts/
│   └── loadDb.ts          # Database seeding / ingestion script
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
└── README.md
```

## 🧪 Testing Strategy

As development progresses, testing will cover:

- Website URL validation and inaccessible pages.
- Multi-page crawling and duplicate content.
- Content extraction and text chunking.
- Database insertion and error handling.
- Retrieval relevance for representative questions.
- Answer grounding and source attribution.
- End-to-end behavior from ingestion to generated response.

## 🎓 Academic Purpose

Knowly is being developed as a college project to explore Retrieval-Augmented Generation and its practical applications in knowledge retrieval, natural-language processing, web content extraction, and AI-assisted question answering.

The project provides an opportunity to understand how website data can be transformed into a searchable knowledge base and connected to a language model to produce more relevant and context-aware answers.

## 📌 Project Status

Knowly is a work in progress. Features described under **Future Scope** represent planned improvements and should not be considered completed functionality.

More details about the architecture, supported data sources, retrieval strategy, and deployment will be added as the implementation evolves.
