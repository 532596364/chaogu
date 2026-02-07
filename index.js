import { MongoClient, ServerApiVersion } from "mongodb";
const uri =
  "mongodb+srv://coyizdy_test_1:9xdrEqU3DD8I3DMF@coyizdycluster.mdbfoub.mongodb.net/?appName=coyiZdyCluster";
const fallback = process.env.MONGODB_URI_NOSRV || "";
const MONGODB_URI_NOSRV =
  "mongodb://coyizdy_test_1:9xdrEqU3DD8I3DMF@ac-4chy49n-shard-00-00.mdbfoub.mongodb.net:27017,ac-4chy49n-shard-00-01.mdbfoub.mongodb.net:27017,ac-4chy49n-shard-00-02.mdbfoub.mongodb.net:27017?authSource=admin&replicaSet=atlas-1696pf-shard-0&tls=true";

if (!uri && !fallback) {
  throw new Error("Missing MongoDB connection string.");
}
function createClient() {
  return new MongoClient(MONGODB_URI_NOSRV);
}
async function run() {
  let client;
  try {
    client = createClient(uri);
    await client.connect();
  } catch (err) {
    if (
      fallback &&
      err?.code === "ECONNREFUSED" &&
      err?.syscall === "querySrv"
    ) {
      client = createClient(fallback);
      await client.connect();
    } else {
      throw err;
    }
  }
  try {
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    await client.close();
  }
}
run().catch((e) => {
  console.dir(e);
  process.exitCode = 1;
});
