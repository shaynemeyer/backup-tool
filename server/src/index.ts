import "dotenv/config";
import express from "express";
import { browseHandler } from "./browse.js";
import { backupHandler } from "./backup.js";

const app = express();
const port = process.env.PORT ?? 3001;

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/browse", browseHandler);
app.post("/api/backup", backupHandler);

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
