const cron = require("node-cron");
const { processDuePosts } = require("../controllers/scheduledPostController");

const initScheduledPostJob = () => {
  console.log("[Scheduler] Initializing scheduled post publisher...");
  console.log("[Scheduler] Current time:", new Date().toISOString());

  // Run immediately on startup for testing
  console.log("[Scheduler] Running immediate test...");
  processDuePosts().then(result => {
    console.log("[Scheduler] Immediate test result:", result);
  }).catch(err => {
    console.error("[Scheduler] Immediate test error:", err);
  });

  // Then schedule every minute
  const task = cron.schedule("*/59 * * * *", async () => {
    const now = new Date();
    console.log(`\n[Cron] ======== Running at ${now.toISOString()} ========`);
    
    try {
      const result = await processDuePosts();
      console.log("[Cron] Result:", result);
    } catch (err) {
      console.error("[Cron] Error:", err.message);
      console.error(err.stack);
    }
  });

  console.log("[Scheduler] Cron job scheduled (runs every minute)");

  process.on("SIGTERM", () => {
    console.log("[Scheduler] Stopping cron job...");
    task.stop();
  });

  process.on("SIGINT", () => {
    console.log("[Scheduler] Stopping cron job...");
    task.stop();
  });

  return task;
};

module.exports = { initScheduledPostJob };