import { Prisma } from "../../generated/client.js";
import prisma from "./prisma.js";

type ImageEmbeddingPath = Prisma.ImageEmbeddingGetPayload<{
  select: { path: true };
}>;

export async function getExistingPaths(): Promise<Set<string>> {
  const rows = await prisma.$queryRaw<ImageEmbeddingPath[]>(
    Prisma.sql`SELECT "path" FROM "image_embeddings"`,
  );
  return new Set(rows.map((r) => r.path));
}

export async function insertEmbedding(
  path: string,
  embedding: number[],
): Promise<void> {
  const vectorLiteral = `[${embedding.map((x) => Number(x).toString()).join(",")}]`;

  await prisma.$executeRawUnsafe(
    'INSERT INTO "image_embeddings" ("id", "path", "embedding") VALUES (gen_random_uuid()::text, $1, $2::vector) ON CONFLICT ("path") DO UPDATE SET "embedding" = EXCLUDED."embedding"',
    path,
    vectorLiteral,
  );
}

export async function searchByEmbedding(
  embedding: number[],
  limit: number,
  maxDistance: number,
): Promise<ImageEmbeddingPath[]> {
  const vectorLiteral = `[${embedding.map((x) => Number(x).toString()).join(",")}]`;

  const rows = await prisma.$queryRawUnsafe<ImageEmbeddingPath[]>(
    'SELECT "path" FROM "image_embeddings" WHERE ("embedding" <-> $1::vector) < $2 ORDER BY "embedding" <-> $1::vector LIMIT $3',
    vectorLiteral,
    maxDistance,
    limit,
  );

  return rows;
}
