import { DataAPIClient } from "@datastax/astra-db-ts";
import "dotenv/config"

// 1. Initialize client with your Astra DB application token
const client = new DataAPIClient(process.env.ASTRA_DB_APPLICATION_TOKE);

// 2. Connect to your database using the API endpoint from your URL
const db = client.db(process.env.ASTRA_DB_API_ENDPOINT);

async function deleteRecord() {
  try {
    // 3. Select the collection
    const collection = db.collection("knowly_docs");

    // 4. Delete the exact document by its _id
    const result = await collection.deleteOne({
      _id: "3cab81ba-175a-4dc2-ab81-ba175a3dc2b8",
    });

    console.log(`Deleted document count: ${result.deletedCount}`);
  } catch (error) {
    console.error("Error deleting document:", error);
  }
}

deleteRecord();