import { MongoClient, MongoClientOptions, ServerApiVersion } from "mongodb";

const uri = process.env.MONGODB_URI;
const prodUri = process.env.PROD_MONGODB_URI as string;

if (!uri) {
  throw new Error("MONGODB_URI is not set in the environment.");
}

const options: MongoClientOptions = {};
let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  if (prodUri) {
    client = new MongoClient(prodUri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      }
    });
    clientPromise = client.connect();
  } else {
    client = new MongoClient(uri, options);
    clientPromise = client.connect();
  }
} 

export default clientPromise;
