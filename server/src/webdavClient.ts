import { createClient } from "webdav";

const url = process.env.WEBDAV_URL;
const username = process.env.WEBDAV_USERNAME;
const password = process.env.WEBDAV_PASSWORD;

if (!url) {
  throw new Error("WEBDAV_URL environment variable is required");
}

export const webdavClient = createClient(url, { username, password });
