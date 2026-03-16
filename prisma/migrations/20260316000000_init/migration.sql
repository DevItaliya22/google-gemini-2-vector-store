CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS "Image" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Image_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Image_path_key" ON "Image"("path");

CREATE TABLE IF NOT EXISTS "image_embeddings" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL UNIQUE,
    "embedding" vector(3072) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "image_embeddings_pkey" PRIMARY KEY ("id")
);

