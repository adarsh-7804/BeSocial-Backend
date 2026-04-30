const cron = require("node-cron");
const mongoose = require("mongoose");
const { processDuePosts } = require("../controllers/scheduledPostController");

const initScheduledPostJob = () => {
  console.log("[Scheduler] Initializing scheduled post publisher...");

  // Delay startup test
  setTimeout(async () => {
    try {
      if (mongoose.connection.readyState !== 1) {
        console.log("[Scheduler] DB not ready, skipping startup test");
        return;
      }

      console.log("[Scheduler] Running startup test...");
      const result = await processDuePosts();
      console.log("[Scheduler] Startup result:", result);
    } catch (err) {
      console.error("[Scheduler] Startup error:", err);
    }
  }, 5000);

  // Every minute
  const task = cron.schedule("* * * * *", async () => {
    try {
      if (mongoose.connection.readyState !== 1) {
        console.log("[Cron] DB not connected, skipping...");
        return;
      }

      const result = await processDuePosts();
      console.log("[Cron] Result:", result);

    } catch (err) {
      console.error("[Cron] Error:", err.message);
    }
  });

  return task;
};

module.exports = { initScheduledPostJob };