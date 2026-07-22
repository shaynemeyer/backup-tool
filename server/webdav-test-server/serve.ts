import { mkdir } from "node:fs/promises";
import express from "express";
import nepheleServer from "nephele";
import FileSystemAdapter from "@nephele/adapter-file-system";
import Authenticator, { User } from "@nephele/authenticator-custom";

const PORT = 1900;
const USERNAME = "demo";
const PASSWORD = "demo";
const STORAGE_DIR = new URL("./storage", import.meta.url).pathname;

await mkdir(STORAGE_DIR, { recursive: true });

const app = express();

app.use(
  "/",
  nepheleServer({
    adapter: new FileSystemAdapter({ root: STORAGE_DIR }),
    authenticator: new Authenticator({
      realm: "WebDAV Test Server",
      getUser: async (username: string) => {
        if (username === USERNAME) {
          return new User({ username });
        }
        return null;
      },
      authBasic: async (user: InstanceType<typeof User>, password: string) => {
        return user.username === USERNAME && password === PASSWORD;
      },
    }),
  }),
);

app.listen(PORT, () => {
  console.log(`WebDAV test server: http://localhost:${PORT}`);
  console.log(`Credentials: ${USERNAME} / ${PASSWORD}`);
  console.log(`Storage: ${STORAGE_DIR}`);
});
