## 1. Start PostgreSQL (Docker)

Run PostgreSQL with pgvector using Docker:

```bash
docker compose up -d
````
---

## 2. Install Dependencies

```bash
npm install
```

---

## 3. Run the Development Server

```bash
npm run dev
```

---

## Notes

* Make sure **Docker is running** before starting the database.
* PostgreSQL will be available at:

```
postgres://postgres:postgres@localhost:5432/gemini_images
```

