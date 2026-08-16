---
name: mongodb
description: "Expert MongoDB development guide covering schema design (embedding vs referencing), index strategies (compound, multikey, text, TTL, partial), aggregation pipeline, transactions, change streams, Node.js driver, Mongoose ODM, Atlas features (search, vector search, triggers), sharding, read/write concerns, connection pooling, GridFS, and security (RBAC, field-level encryption)."
version: 1.0.0
---

# MongoDB Expert

## 1. Schema Design

### Embedding vs Referencing

**Embed** when data is accessed together and the embedded document is bounded in size. **Reference** when data is large, unbounded, or accessed independently.

```javascript
// Embedded: address belongs to the user, accessed together, bounded
{
  _id: ObjectId("..."),
  name: "Alice Johnson",
  email: "alice@example.com",
  address: {
    street: "123 Main St",
    city: "Portland",
    state: "OR",
    zip: "97201"
  }
}

// Referenced: orders are unbounded and queried independently
// users collection
{
  _id: ObjectId("user1"),
  name: "Alice Johnson",
  email: "alice@example.com"
}

// orders collection
{
  _id: ObjectId("order1"),
  userId: ObjectId("user1"),    // reference to user
  items: [
    { productId: ObjectId("prod1"), name: "Widget", quantity: 2, price: 29.99 },
    { productId: ObjectId("prod2"), name: "Gadget", quantity: 1, price: 49.99 }
  ],
  total: 109.97,
  status: "shipped",
  createdAt: ISODate("2025-02-15T10:30:00Z")
}
```

### Decision Guide

```
Embed when:
  - Data is read together in the same query (1:1 or 1:few)
  - Child data does not grow unboundedly
  - Child data does not need independent access
  - You want atomic updates (single document = atomic)

Reference when:
  - Data grows unboundedly (comments, orders, logs)
  - Child data is large (> 100 KB per child)
  - Child data is accessed independently
  - Many-to-many relationships exist
  - Data is shared across multiple parent documents
```

### Schema Validation

```javascript
db.createCollection("products", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["name", "price", "category", "status"],
      properties: {
        name: {
          bsonType: "string",
          minLength: 1,
          maxLength: 200,
          description: "Product name is required"
        },
        price: {
          bsonType: "decimal",
          minimum: 0,
          description: "Price must be a non-negative decimal"
        },
        category: {
          bsonType: "string",
          enum: ["electronics", "clothing", "food", "books", "home"],
          description: "Category must be one of the allowed values"
        },
        status: {
          bsonType: "string",
          enum: ["draft", "active", "archived"],
          description: "Status must be draft, active, or archived"
        },
        tags: {
          bsonType: "array",
          items: { bsonType: "string" },
          maxItems: 20,
          description: "Tags must be an array of strings"
        },
        specs: {
          bsonType: "object",
          description: "Product specifications"
        }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});
```

### Common Patterns

```javascript
// Polymorphic pattern: different shapes in the same collection
// Use a discriminator field
{
  _id: ObjectId("..."),
  type: "blog_post",
  title: "MongoDB Patterns",
  body: "...",
  tags: ["mongodb", "patterns"],
  publishedAt: ISODate("2025-02-15")
}
{
  _id: ObjectId("..."),
  type: "video",
  title: "MongoDB Tutorial",
  url: "https://example.com/video.mp4",
  duration: 3600,
  publishedAt: ISODate("2025-02-14")
}

// Bucket pattern: group time-series data to reduce document count
{
  sensorId: "temp-001",
  bucket: ISODate("2025-02-15T10:00:00Z"),  // 1-hour bucket
  measurements: [
    { ts: ISODate("2025-02-15T10:00:12Z"), value: 22.5 },
    { ts: ISODate("2025-02-15T10:01:03Z"), value: 22.6 },
    { ts: ISODate("2025-02-15T10:02:15Z"), value: 22.4 }
  ],
  count: 3,
  min: 22.4,
  max: 22.6,
  avg: 22.5
}

// Computed pattern: store precomputed values for fast reads
{
  _id: ObjectId("..."),
  productId: ObjectId("prod1"),
  totalReviews: 142,
  averageRating: 4.3,
  ratingDistribution: { "1": 5, "2": 8, "3": 15, "4": 52, "5": 62 },
  lastUpdated: ISODate("2025-02-15T12:00:00Z")
}
```

---

## 2. Index Strategies

### Compound Indexes

```javascript
// Compound index: supports queries that match a prefix of the index keys
// Order matters: equality -> sort -> range (ESR rule)
db.orders.createIndex({ status: 1, createdAt: -1 });
// Supports: { status: "shipped" }
// Supports: { status: "shipped" }, sorted by createdAt DESC
// Does NOT efficiently support: { createdAt: { $gt: date } } alone

// Covered query: index contains all fields the query needs
db.orders.createIndex({ userId: 1, status: 1, total: 1, createdAt: -1 });
// This query is fully covered (no document fetch):
db.orders.find(
  { userId: ObjectId("..."), status: "shipped" },
  { total: 1, createdAt: 1, _id: 0 }
).sort({ createdAt: -1 });
```

### Multikey Indexes

```javascript
// Automatically created when indexing array fields
db.products.createIndex({ tags: 1 });
// Supports: db.products.find({ tags: "electronics" })
// Supports: db.products.find({ tags: { $in: ["electronics", "sale"] } })

// Compound with array field (only ONE array field per compound index)
db.products.createIndex({ category: 1, tags: 1 });
// VALID: category is scalar, tags is array
// INVALID: db.collection.createIndex({ tags: 1, colors: 1 }) where both are arrays
```

### Text Indexes

```javascript
// Full-text search index
db.articles.createIndex(
  { title: "text", body: "text", tags: "text" },
  { weights: { title: 10, tags: 5, body: 1 }, name: "article_search" }
);

// Text search query
db.articles.find(
  { $text: { $search: "mongodb aggregation pipeline" } },
  { score: { $meta: "textScore" } }
).sort({ score: { $meta: "textScore" } }).limit(20);

// Phrase search
db.articles.find({ $text: { $search: "\"aggregation pipeline\"" } });

// Exclude terms
db.articles.find({ $text: { $search: "mongodb -mongoose" } });
```

### TTL Indexes

```javascript
// Automatically delete documents after a period
db.sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
// Document is deleted when current time > expiresAt

// Fixed TTL from creation
db.logs.createIndex({ createdAt: 1 }, { expireAfterSeconds: 2592000 });
// Documents deleted 30 days after createdAt

// Insert with explicit expiry
db.sessions.insertOne({
  sessionId: "abc123",
  userId: ObjectId("..."),
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)  // 24 hours from now
});
```

### Partial Indexes

```javascript
// Index only documents matching a filter condition
db.orders.createIndex(
  { createdAt: -1 },
  { partialFilterExpression: { status: "pending" } }
);
// Smaller index, faster writes, only useful for queries filtering on status: "pending"

// Sparse index: only indexes documents where the field exists
db.users.createIndex({ email: 1 }, { unique: true, sparse: true });
// Allows multiple documents without the email field
// But unique among those that have it
```

### Wildcard Indexes

```javascript
// Index all fields in a subdocument (for dynamic/unknown field names)
db.products.createIndex({ "attributes.$**": 1 });
// Supports: db.products.find({ "attributes.color": "red" })
// Supports: db.products.find({ "attributes.weight": { $lt: 5 } })
// Does NOT support compound queries across multiple attribute fields efficiently
```

---

## 3. Aggregation Pipeline

### Core Stages

```javascript
// Multi-stage aggregation: filter -> group -> sort -> project
db.orders.aggregate([
  // Stage 1: Match (filter early to reduce data)
  { $match: {
    status: "completed",
    createdAt: { $gte: ISODate("2025-01-01"), $lt: ISODate("2025-02-01") }
  }},

  // Stage 2: Group by user, calculate totals
  { $group: {
    _id: "$userId",
    orderCount: { $sum: 1 },
    totalSpent: { $sum: "$total" },
    avgOrderValue: { $avg: "$total" },
    lastOrder: { $max: "$createdAt" }
  }},

  // Stage 3: Filter grouped results
  { $match: { totalSpent: { $gte: 100 } } },

  // Stage 4: Sort by total spent descending
  { $sort: { totalSpent: -1 } },

  // Stage 5: Limit to top 10
  { $limit: 10 },

  // Stage 6: Lookup user details
  { $lookup: {
    from: "users",
    localField: "_id",
    foreignField: "_id",
    as: "user"
  }},
  { $unwind: "$user" },

  // Stage 7: Project final shape
  { $project: {
    _id: 0,
    userName: "$user.name",
    email: "$user.email",
    orderCount: 1,
    totalSpent: { $round: ["$totalSpent", 2] },
    avgOrderValue: { $round: ["$avgOrderValue", 2] },
    lastOrder: 1
  }}
]);
```

### Lookup with Pipeline (Subquery Join)

```javascript
db.orders.aggregate([
  { $lookup: {
    from: "products",
    let: { productIds: "$items.productId" },
    pipeline: [
      { $match: { $expr: { $in: ["$_id", "$$productIds"] } } },
      { $project: { name: 1, price: 1, category: 1 } }
    ],
    as: "productDetails"
  }}
]);
```

### Faceted Search

```javascript
db.products.aggregate([
  { $match: { $text: { $search: "laptop" } } },
  { $facet: {
    results: [
      { $sort: { score: { $meta: "textScore" } } },
      { $skip: 0 },
      { $limit: 20 },
      { $project: { name: 1, price: 1, category: 1 } }
    ],
    categoryFacets: [
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ],
    priceRanges: [
      { $bucket: {
        groupBy: "$price",
        boundaries: [0, 500, 1000, 2000, 5000],
        default: "5000+",
        output: { count: { $sum: 1 } }
      }}
    ],
    totalCount: [
      { $count: "total" }
    ]
  }}
]);
```

### Window Functions (MongoDB 5.0+)

```javascript
db.sales.aggregate([
  { $setWindowFields: {
    partitionBy: "$region",
    sortBy: { date: 1 },
    output: {
      runningTotal: {
        $sum: "$amount",
        window: { documents: ["unbounded", "current"] }
      },
      movingAvg7Day: {
        $avg: "$amount",
        window: { range: [-6, "current"], unit: "day" }
      },
      rank: {
        $rank: {}
      }
    }
  }}
]);
```

---

## 4. Transactions

### Multi-Document Transactions

```javascript
const session = client.startSession();

try {
  session.startTransaction({
    readConcern: { level: "snapshot" },
    writeConcern: { w: "majority" },
    readPreference: "primary"
  });

  const ordersCol = db.collection("orders");
  const inventoryCol = db.collection("inventory");
  const paymentsCol = db.collection("payments");

  // Create order
  const order = {
    userId: userId,
    items: cartItems,
    total: cartTotal,
    status: "confirmed",
    createdAt: new Date()
  };
  const { insertedId } = await ordersCol.insertOne(order, { session });

  // Decrement inventory for each item
  for (const item of cartItems) {
    const result = await inventoryCol.updateOne(
      { productId: item.productId, quantity: { $gte: item.quantity } },
      { $inc: { quantity: -item.quantity } },
      { session }
    );
    if (result.modifiedCount === 0) {
      throw new Error(`Insufficient inventory for product ${item.productId}`);
    }
  }

  // Record payment
  await paymentsCol.insertOne({
    orderId: insertedId,
    amount: cartTotal,
    method: paymentMethod,
    status: "captured",
    createdAt: new Date()
  }, { session });

  await session.commitTransaction();
  return { orderId: insertedId };

} catch (error) {
  await session.abortTransaction();
  throw error;
} finally {
  session.endSession();
}
```

### Transaction Best Practices

```
- Keep transactions short (< 60 seconds, default timeout)
- Minimize the number of documents touched
- Use retryable writes (enabled by default in driver 4.0+)
- Read and write to the primary in transactions
- Transactions work across collections and databases in replica sets
- Transactions work across shards in sharded clusters (MongoDB 4.2+)
- Avoid transactions when a single-document update suffices (single-doc ops are already atomic)
```

---

## 5. Change Streams

```javascript
// Watch for changes on a collection
const changeStream = db.collection("orders").watch(
  [{ $match: { "fullDocument.status": "confirmed" } }],
  { fullDocument: "updateLookup" }
);

changeStream.on("change", async (change) => {
  switch (change.operationType) {
    case "insert":
      console.log("New order:", change.fullDocument);
      await sendOrderConfirmation(change.fullDocument);
      break;
    case "update":
      console.log("Order updated:", change.documentKey._id);
      console.log("Changed fields:", change.updateDescription.updatedFields);
      break;
    case "delete":
      console.log("Order deleted:", change.documentKey._id);
      break;
  }
});

// Resume from a specific point (survives app restarts)
const resumeToken = change._id;
const resumedStream = db.collection("orders").watch([], {
  resumeAfter: resumeToken
});

// Watch all collections in a database
const dbStream = db.watch();

// Watch the entire deployment
const clusterStream = client.watch();
```

---

## 6. Node.js Driver

### Connection and Configuration

```typescript
import { MongoClient, ServerApiVersion } from "mongodb";

const client = new MongoClient(process.env.MONGODB_URI, {
  serverApi: { version: ServerApiVersion.v1, strict: true },
  maxPoolSize: 50,           // Max connections in pool
  minPoolSize: 5,            // Min connections kept open
  maxIdleTimeMS: 30000,      // Close idle connections after 30s
  connectTimeoutMS: 10000,   // Connection timeout
  socketTimeoutMS: 45000,    // Socket timeout
  retryWrites: true,         // Retry failed writes
  retryReads: true,          // Retry failed reads
  w: "majority",             // Default write concern
  readPreference: "secondaryPreferred",  // Read from secondaries when possible
});

// Connection lifecycle
async function connectDB(): Promise<void> {
  await client.connect();
  await client.db("admin").command({ ping: 1 });
  console.log("Connected to MongoDB");
}

// Graceful shutdown
process.on("SIGINT", async () => {
  await client.close();
  process.exit(0);
});
```

### CRUD Operations

```typescript
const db = client.db("myapp");
const users = db.collection("users");

// Insert
const result = await users.insertOne({
  name: "Alice",
  email: "alice@example.com",
  createdAt: new Date(),
});
console.log("Inserted ID:", result.insertedId);

// Bulk insert
const bulkResult = await users.insertMany([
  { name: "Bob", email: "bob@example.com" },
  { name: "Carol", email: "carol@example.com" },
], { ordered: false });  // ordered: false continues on error

// Find with projection and sort
const activeUsers = await users
  .find({ active: true })
  .project({ name: 1, email: 1, _id: 0 })
  .sort({ createdAt: -1 })
  .limit(20)
  .toArray();

// Update
await users.updateOne(
  { _id: userId },
  {
    $set: { name: "Alice Smith", updatedAt: new Date() },
    $inc: { loginCount: 1 },
    $push: { tags: "premium" },
  }
);

// Update with array filters
await users.updateOne(
  { _id: userId },
  { $set: { "addresses.$[addr].verified": true } },
  { arrayFilters: [{ "addr.type": "home" }] }
);

// Delete
await users.deleteOne({ _id: userId });
await users.deleteMany({ active: false, lastLogin: { $lt: oneYearAgo } });

// Find one and update (atomic, returns the document)
const updated = await users.findOneAndUpdate(
  { _id: userId },
  { $set: { status: "active" } },
  { returnDocument: "after" }  // Return the updated document
);
```

---

## 7. Mongoose ODM

### Schema Definition

```typescript
import mongoose, { Schema, Document, Model } from "mongoose";

interface IProduct extends Document {
  name: string;
  slug: string;
  price: number;
  category: string;
  tags: string[];
  specs: Map<string, string>;
  status: "draft" | "active" | "archived";
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>({
  name: {
    type: String,
    required: [true, "Product name is required"],
    trim: true,
    minlength: [1, "Name must be at least 1 character"],
    maxlength: [200, "Name cannot exceed 200 characters"],
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    index: true,
  },
  price: {
    type: Number,
    required: true,
    min: [0, "Price cannot be negative"],
  },
  category: {
    type: String,
    required: true,
    enum: {
      values: ["electronics", "clothing", "food", "books", "home"],
      message: "{VALUE} is not a valid category",
    },
    index: true,
  },
  tags: {
    type: [String],
    validate: {
      validator: (v: string[]) => v.length <= 20,
      message: "A product can have at most 20 tags",
    },
    index: true,
  },
  specs: {
    type: Map,
    of: String,
  },
  status: {
    type: String,
    enum: ["draft", "active", "archived"],
    default: "draft",
    index: true,
  },
}, {
  timestamps: true,  // Adds createdAt and updatedAt automatically
  versionKey: "__v",
});
```

### Virtuals

```typescript
// Virtual field: computed from existing fields, not stored in DB
productSchema.virtual("displayPrice").get(function () {
  return `$${this.price.toFixed(2)}`;
});

productSchema.virtual("isActive").get(function () {
  return this.status === "active";
});

// Virtual populate: reference without storing IDs
productSchema.virtual("reviews", {
  ref: "Review",
  localField: "_id",
  foreignField: "productId",
});

// Ensure virtuals are included in JSON output
productSchema.set("toJSON", { virtuals: true });
productSchema.set("toObject", { virtuals: true });
```

### Middleware (Hooks)

```typescript
// Pre-save: generate slug before saving
productSchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }
  next();
});

// Pre-find: always exclude archived products by default
productSchema.pre("find", function () {
  if (!this.getFilter().status) {
    this.where({ status: { $ne: "archived" } });
  }
});

// Post-save: clear cache
productSchema.post("save", async function (doc) {
  await cache.del(`product:${doc._id}`);
  await cache.del("products:list");
});

// Pre-remove: cascade delete reviews
productSchema.pre("deleteOne", { document: true, query: false }, async function () {
  await mongoose.model("Review").deleteMany({ productId: this._id });
});
```

### Population

```typescript
// Define reference fields
const orderSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  items: [{
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true },
  }],
  total: { type: Number, required: true },
});

// Populate references
const order = await Order
  .findById(orderId)
  .populate("userId", "name email")                    // Select specific fields
  .populate("items.productId", "name price category")  // Nested populate
  .lean();                                              // Return plain object (faster)

// Deep populate
const order = await Order
  .findById(orderId)
  .populate({
    path: "userId",
    select: "name email",
    populate: { path: "address", select: "city state" },
  });
```

---

## 8. Atlas Features

### Atlas Search

```javascript
// Create a search index (in Atlas UI or via API)
// Index definition:
{
  "mappings": {
    "dynamic": false,
    "fields": {
      "title": { "type": "string", "analyzer": "lucene.standard" },
      "body": { "type": "string", "analyzer": "lucene.english" },
      "category": { "type": "stringFacet" },
      "price": { "type": "number" },
      "createdAt": { "type": "date" }
    }
  }
}

// Search query using $search stage
db.articles.aggregate([
  { $search: {
    index: "article_search",
    compound: {
      must: [
        { text: { query: "mongodb performance", path: ["title", "body"], fuzzy: { maxEdits: 1 } } }
      ],
      filter: [
        { range: { path: "createdAt", gte: ISODate("2025-01-01") } }
      ]
    },
    highlight: { path: ["title", "body"] }
  }},
  { $project: {
    title: 1,
    score: { $meta: "searchScore" },
    highlights: { $meta: "searchHighlights" }
  }},
  { $limit: 20 }
]);
```

### Atlas Vector Search

```javascript
// Create a vector search index
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 1536,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "category"
    }
  ]
}

// Vector search query (semantic similarity)
db.documents.aggregate([
  { $vectorSearch: {
    index: "vector_index",
    path: "embedding",
    queryVector: queryEmbedding,  // 1536-dimensional float array
    numCandidates: 100,
    limit: 10,
    filter: { category: "technical" }
  }},
  { $project: {
    title: 1,
    content: 1,
    score: { $meta: "vectorSearchScore" }
  }}
]);
```

### Atlas Triggers

```javascript
// Database trigger (responds to collection changes)
// Configured in Atlas UI or via App Services API
exports = async function(changeEvent) {
  const { operationType, fullDocument, documentKey } = changeEvent;

  if (operationType === "insert") {
    // Send welcome email when a new user is created
    const email = fullDocument.email;
    const name = fullDocument.name;
    await context.services
      .get("email-service")
      .send({ to: email, subject: `Welcome, ${name}!` });
  }

  if (operationType === "update") {
    // Log changes for audit trail
    const audit = context.services.get("mongodb-atlas").db("myapp").collection("audit_log");
    await audit.insertOne({
      collectionName: "users",
      documentId: documentKey._id,
      operation: operationType,
      changes: changeEvent.updateDescription,
      timestamp: new Date()
    });
  }
};
```

---

## 9. Sharding

### Shard Key Selection

```javascript
// Range-based sharding (good for range queries, risk of hotspots)
sh.shardCollection("myapp.orders", { createdAt: 1 });

// Hashed sharding (even distribution, no range queries on shard key)
sh.shardCollection("myapp.events", { _id: "hashed" });

// Compound shard key (balance distribution and query routing)
sh.shardCollection("myapp.orders", { userId: 1, createdAt: 1 });
// Queries filtering on userId are routed to a specific shard
// Queries on userId + createdAt range are efficient
```

### Shard Key Rules

```
- Shard key is immutable after creation (cannot change it)
- High cardinality: many distinct values (avoid boolean, status fields)
- Low frequency: no single value dominates (avoid "country" if 90% is "US")
- Non-monotonic: avoid auto-incrementing fields alone (causes hotspot on last shard)
- Query isolation: queries should include the shard key to avoid scatter-gather
```

---

## 10. Read/Write Concerns

```javascript
// Write concern: how many replicas must acknowledge a write
// w: 1       -- Primary only (fast, risk of rollback)
// w: majority -- Majority of replicas (safe, default for transactions)
// w: 0       -- Fire and forget (fastest, no acknowledgment)

await collection.insertOne(doc, { writeConcern: { w: "majority", wtimeout: 5000 } });

// Read concern: what data a query returns
// local        -- Returns most recent data on the node (may be rolled back)
// majority     -- Returns data committed to majority (durable)
// snapshot     -- Point-in-time snapshot (used in transactions)
// linearizable -- Most strict, waits for all prior writes to be majority-committed

await collection.find({}).readConcern("majority").toArray();

// Read preference: which node handles reads
// primary             -- All reads go to primary (default)
// primaryPreferred     -- Primary if available, else secondary
// secondary            -- Only secondaries
// secondaryPreferred   -- Secondaries if available, else primary
// nearest              -- Lowest latency node
```

---

## 11. Connection Pooling

```typescript
// Driver-level connection pooling
const client = new MongoClient(uri, {
  maxPoolSize: 100,       // Max simultaneous connections
  minPoolSize: 10,        // Keep at least 10 connections open
  maxIdleTimeMS: 30000,   // Close connections idle for 30 seconds
  waitQueueTimeoutMS: 10000,  // Fail if no connection available in 10s
  compressors: ["zstd", "snappy"],  // Network compression
});

// Connection pool monitoring
client.on("connectionPoolCreated", (event) => {
  console.log("Pool created:", event.address);
});
client.on("connectionCheckedOut", (event) => {
  console.log("Connection checked out:", event.connectionId);
});
client.on("connectionPoolCleared", (event) => {
  console.log("Pool cleared:", event.address);
});
```

---

## 12. GridFS

```typescript
import { GridFSBucket, ObjectId } from "mongodb";
import { createReadStream, createWriteStream } from "fs";

const bucket = new GridFSBucket(db, { bucketName: "uploads" });

// Upload a file
async function uploadFile(filePath: string, filename: string, metadata: Record<string, unknown>): Promise<ObjectId> {
  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(filename, {
      metadata,
      chunkSizeBytes: 1024 * 255,  // 255 KB chunks (default)
    });

    createReadStream(filePath)
      .pipe(uploadStream)
      .on("error", reject)
      .on("finish", () => resolve(uploadStream.id as ObjectId));
  });
}

// Download a file
async function downloadFile(fileId: ObjectId, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    bucket.openDownloadStream(fileId)
      .pipe(createWriteStream(destPath))
      .on("error", reject)
      .on("finish", resolve);
  });
}

// Delete a file
await bucket.delete(fileId);

// List files
const files = await bucket.find({ "metadata.userId": userId }).toArray();
```

---

## 13. Security

### RBAC (Role-Based Access Control)

```javascript
// Create an application-specific role
db.createRole({
  role: "appReadWrite",
  privileges: [
    {
      resource: { db: "myapp", collection: "orders" },
      actions: ["find", "insert", "update"]
    },
    {
      resource: { db: "myapp", collection: "products" },
      actions: ["find"]
    }
  ],
  roles: []
});

// Create a user with the custom role
db.createUser({
  user: "app_service",
  pwd: "secure_password_here",
  roles: [{ role: "appReadWrite", db: "myapp" }]
});

// Read-only analytics user
db.createUser({
  user: "analytics",
  pwd: "readonly_password",
  roles: [{ role: "read", db: "myapp" }]
});
```

### Client-Side Field Level Encryption (CSFLE)

```typescript
import { MongoClient, ClientEncryption } from "mongodb";

// Configure auto-encryption
const client = new MongoClient(uri, {
  autoEncryption: {
    keyVaultNamespace: "encryption.__keyVault",
    kmsProviders: {
      aws: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    },
    schemaMap: {
      "myapp.users": {
        bsonType: "object",
        encryptMetadata: { keyId: [dataKeyId] },
        properties: {
          ssn: {
            encrypt: {
              bsonType: "string",
              algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic"
              // Deterministic: supports equality queries on encrypted field
            }
          },
          medicalRecords: {
            encrypt: {
              bsonType: "array",
              algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Random"
              // Random: more secure, no queryability
            }
          }
        }
      }
    }
  }
});

// Encrypted writes and reads are transparent to application code
await users.insertOne({ name: "Alice", ssn: "123-45-6789", medicalRecords: [...] });
const user = await users.findOne({ ssn: "123-45-6789" });  // Works with deterministic encryption
```

---

## 14. Common Anti-Patterns

### Unbounded Arrays

```javascript
// BAD: Array grows without limit (document will exceed 16 MB)
{
  _id: ObjectId("..."),
  postId: ObjectId("..."),
  comments: [
    // This array could grow to millions of entries
    { userId: ObjectId("..."), text: "...", createdAt: new Date() },
    // ...
  ]
}

// GOOD: Separate collection with reference
// comments collection
{
  _id: ObjectId("..."),
  postId: ObjectId("..."),
  userId: ObjectId("..."),
  text: "Great post!",
  createdAt: new Date()
}
// Index: { postId: 1, createdAt: -1 }
```

### Missing Indexes on Query Patterns

```javascript
// BAD: Querying without an index (full collection scan)
db.orders.find({ userId: ObjectId("..."), status: "pending" }).sort({ createdAt: -1 });

// GOOD: Create a compound index matching the query pattern
db.orders.createIndex({ userId: 1, status: 1, createdAt: -1 });
```

### Using $where or JavaScript Expressions

```javascript
// BAD: JavaScript execution in queries (slow, no index usage, security risk)
db.users.find({ $where: "this.firstName + ' ' + this.lastName === 'John Doe'" });

// GOOD: Use native query operators
db.users.find({ firstName: "John", lastName: "Doe" });
```

### Not Using .lean() in Mongoose

```typescript
// BAD: Full Mongoose document with change tracking overhead
const users = await User.find({ active: true });

// GOOD: Plain JavaScript object when you do not need Mongoose features
const users = await User.find({ active: true }).lean();
```

---

## 15. Critical Reminders

### ALWAYS

- Create indexes for every query pattern your application uses
- Use projection to return only the fields you need
- Set `maxTimeMS` on queries to prevent runaway operations
- Use `$match` early in aggregation pipelines to reduce data volume
- Monitor slow queries with the profiler: `db.setProfilingLevel(1, { slowms: 100 })`
- Use `bulkWrite` for batch operations (much faster than individual writes)
- Handle `MongoServerError` code 11000 for duplicate key violations
- Use `lean()` in Mongoose when you do not need document methods or change tracking
- Set `retryWrites: true` and `retryReads: true` in connection options
- Validate schema with `$jsonSchema` validator or Mongoose validation

### NEVER

- Store unbounded arrays in a single document (16 MB document limit)
- Use `$where` or server-side JavaScript execution
- Create an index on every field (each index costs write performance and storage)
- Use `find()` without `limit()` on large collections
- Store large binary files directly in documents (use GridFS for files > 256 KB)
- Ignore write concern in production (use `w: "majority"` for important data)
- Use auto-incrementing integers as `_id` in sharded clusters (causes hotspots)
- Skip connection pooling configuration (defaults may not suit your workload)
