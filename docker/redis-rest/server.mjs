import http from "node:http";
import { createClient } from "redis";

const port = Number(process.env.UPSTASH_REDIS_REST_PORT ?? 8079);
const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? "dev-token";
const redisUrl = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";

const client = createClient({ url: redisUrl });
client.on("error", (err) => {
  console.error("Redis REST proxy client error", err);
});
await client.connect();

const encodePrimitive = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "boolean") {
    return Buffer.from(value ? "true" : "false").toString("base64");
  }
  if (typeof value === "string") {
    return Buffer.from(value, "utf8").toString("base64");
  }
  if (Buffer.isBuffer(value)) {
    return value.toString("base64");
  }
  return Buffer.from(String(value), "utf8").toString("base64");
};

const encodeResult = (value) => {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) {
    return value.map((entry) => encodeResult(entry));
  }
  if (value instanceof Map) {
    const result = [];
    for (const [key, val] of value.entries()) {
      result.push(encodeResult(key), encodeResult(val));
    }
    return result;
  }
  if (typeof value === "object" && !Buffer.isBuffer(value)) {
    const entries = Object.entries(value);
    if (entries.length === 0) return [];
    const flattened = [];
    for (const [key, val] of entries) {
      flattened.push(encodeResult(key), encodeResult(val));
    }
    return flattened;
  }
  return encodePrimitive(value);
};

const readJsonBody = (req) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      if (chunks.length === 0) {
        resolve(undefined);
        return;
      }
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });

const unauthorized = (res) => {
  res.writeHead(401, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Unauthorized" }));
};

const methodNotAllowed = (res) => {
  res.writeHead(405, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Method Not Allowed" }));
};

const notFound = (res) => {
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not Found" }));
};

const handleSingle = async (body, res) => {
  if (!Array.isArray(body)) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Body must be an array" }));
    return;
  }
  try {
    const command = body.map((part) =>
      part === null || part === undefined ? null : String(part),
    );
    const redisResult = await client.sendCommand(command);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ result: encodeResult(redisResult) }));
  } catch (error) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
  }
};

const handleBatch = async (body, res) => {
  if (!Array.isArray(body)) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Body must be an array of commands" }));
    return;
  }
  const responses = [];
  for (const entry of body) {
    if (!Array.isArray(entry)) {
      responses.push({ error: "Command must be an array" });
      continue;
    }
    try {
      const command = entry.map((part) =>
        part === null || part === undefined ? null : String(part),
      );
      const redisResult = await client.sendCommand(command);
      responses.push({ result: encodeResult(redisResult) });
    } catch (error) {
      responses.push({
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(responses));
};

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, { "Access-Control-Allow-Origin": "*" });
    res.end();
    return;
  }
  if (req.method !== "POST") {
    methodNotAllowed(res);
    return;
  }
  const authHeader = req.headers["authorization"] ?? "";
  if (authHeader !== `Bearer ${token}`) {
    unauthorized(res);
    return;
  }
  let body;
  try {
    body = await readJsonBody(req);
  } catch (error) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Invalid JSON body" }));
    return;
  }
  const url = new URL(req.url ?? "/", `http://localhost:${port}`);
  switch (url.pathname) {
    case "/":
      await handleSingle(body, res);
      break;
    case "/pipeline":
    case "/multi-exec":
      await handleBatch(body, res);
      break;
    default:
      notFound(res);
      break;
  }
});

const shutdown = async () => {
  try {
    await client.disconnect();
  } catch (error) {
    console.error("Error disconnecting redis client", error);
  }
  server.close(() => {
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

server.listen(port, () => {
  console.log(`Upstash-compatible Redis REST proxy listening on port ${port}`);
});
