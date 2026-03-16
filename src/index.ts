import "dotenv/config";
import cors from "cors";
import express from "express";
import { createReadStream, existsSync, readdirSync, statSync } from "fs";
import { homedir } from "os";
import { join, extname, resolve } from "path";
import { embedImage, embedText } from "./lib/embeddings.js";
import {
  getExistingPaths,
  insertEmbedding,
  searchByEmbedding,
} from "./lib/db.js";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const IMAGE_EXT = new Set([".png", ".jpg", ".jpeg"]);

function collectImages(dir: string, acc: string[] = []): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      collectImages(full, acc);
    } else if (IMAGE_EXT.has(extname(e.name).toLowerCase())) {
      acc.push(full);
    }
  }
  return acc;
}

function isImagePath(p: string): boolean {
  return IMAGE_EXT.has(extname(p).toLowerCase());
}

app.post("/api/vectorize", async (req, res) => {
  try {
    const pathOrFolder = (req.body?.path ??
      req.body?.folder ??
      process.env.IMAGES_FOLDER_PATH) as string;
    if (!pathOrFolder) {
      return res.status(400).json({ error: "Missing path" });
    }
    if (!existsSync(pathOrFolder)) {
      return res.status(400).json({ error: "Path does not exist" });
    }
    const stat = statSync(pathOrFolder);
    const images: string[] = stat.isDirectory()
      ? collectImages(pathOrFolder)
      : stat.isFile() && isImagePath(pathOrFolder)
        ? [pathOrFolder]
        : [];
    if (images.length === 0) {
      return res.status(400).json({
        error: stat.isFile()
          ? "Path is not an image (.png, .jpg, .jpeg)"
          : "No images found in folder",
      });
    }
    const existing = await getExistingPaths();
    const toProcess = images.filter((p) => !existing.has(p));

    let processed = 0;
    for (const path of toProcess) {
      try {
        const embedding = await embedImage(path);
        await insertEmbedding(path, embedding);
        processed++;
        console.log(
          `Vectorization complete for path=${path} (${processed}/${toProcess.length})`,
        );
      } catch (err) {
        console.error(`Failed to vectorize ${path}:`, err);
      }
    }

    console.log(
      `Vectorization batch done. total=${images.length} skipped=${images.length - toProcess.length} processed=${processed}`,
    );

    res.json({
      total: images.length,
      skipped: images.length - toProcess.length,
      processed,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

app.post("/api/search", async (req, res) => {
  try {
    const {
      query,
      limit = 6,
      maxDistance = 2,
    } = req.body as {
      query?: string;
      limit?: number;
      maxDistance?: number;
    };
    if (!query || typeof query !== "string") {
      return res.status(400).json({ error: "Missing query" });
    }

    const embedding = await embedText(query);
    const results = await searchByEmbedding(
      embedding,
      Math.min(limit, 10),
      maxDistance,
    );
    res.json({ results: results.map((r) => r.path) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

app.get("/api/image", (req, res) => {
  const pathParam = decodeURIComponent((req.query.path as string) ?? "");
  if (!pathParam) return res.status(400).send("Missing path");
  const root = resolve(process.env.IMAGES_FOLDER_PATH ?? homedir());
  const abs = resolve(pathParam);
  if (!abs.startsWith(root)) return res.status(403).send("Forbidden");
  if (!existsSync(abs)) return res.status(404).send("Not found");
  const st = statSync(abs);
  if (!st.isFile()) return res.status(400).send("Not a file");
  const ext = extname(abs).toLowerCase();
  const mime = ext === ".png" ? "image/png" : "image/jpeg";
  res.setHeader("Content-Type", mime);
  createReadStream(abs).pipe(res);
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => {
  console.log(`Server on http://localhost:${PORT}`);
});
