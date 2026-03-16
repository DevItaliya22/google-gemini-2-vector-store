import { GoogleGenAI } from "@google/genai";
import { readFileSync } from "fs";
import { extname } from "path";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

export async function embedImage(filePath: string): Promise<number[]> {
  const ext = extname(filePath).toLowerCase();
  const mimeType = MIME_TYPES[ext] ?? "image/jpeg";
  const buffer = readFileSync(filePath);
  const base64 = buffer.toString("base64");

  const response = await ai.models.embedContent({
    model: "gemini-embedding-2-preview",
    contents: [{ inlineData: { mimeType, data: base64 } }],
    // taskType: "RETRIEVAL_DOCUMENT",
  });

  const embedding = response.embeddings?.[0]?.values;
  if (!embedding) throw new Error("No embedding returned");
  return embedding;
}

export async function embedText(text: string): Promise<number[]> {
  const response = await ai.models.embedContent({
    model: "gemini-embedding-2-preview",
    contents: text,
    // taskType: "RETRIEVAL_QUERY",
  });

  const embedding = response.embeddings?.[0]?.values;
  if (!embedding) throw new Error("No embedding returned");
  return embedding;
}
