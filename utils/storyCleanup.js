const cron = require("node-cron");
const Story = require("../models/Story");

/**
 * Cron job to clean up expired stories that are NOT highlighted.
 * Runs every hour. Stories older than 24 hours and not in any highlight
 * are permanently deleted from the database.
 */
function initStoryCleanupJob() {
  // Run every hour at minute 0
  cron.schedule("0 * * * *", async () => {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const result = await Story.deleteMany({
        createdAt: { $lt: twentyFourHoursAgo },
        isHighlighted: { $ne: true },
      });

      if (result.deletedCount > 0) {
        console.log(
          `[Story Cleanup] Deleted ${result.deletedCount} expired stories`
        );
      }
    } catch (error) {
      console.error("[Story Cleanup] Error:", error);
    }
  });

  console.log("[Story Cleanup] Cron job initialized (runs every hour)");
}

module.exports = { initStoryCleanupJob };
