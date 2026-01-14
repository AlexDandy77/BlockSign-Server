import { app } from "./app.js";
import { env } from "./env.js";
import { startCleanupJob } from "./jobs/cleanup.js";

//startCleanupJob();

app.listen(env.PORT, () => {
    console.log(`API listening on http://localhost:${env.PORT}`);
})