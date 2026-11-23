const cron = require('node-cron');
const User = require('../models/User');
const Notification = require("../models/Notification");

module.exports = {
    startCronJobs: function (io) {

        // Schedule a task to run every Wednesday at 8 pm Argentina time (UTC-3)
        cron.schedule('0 20 * * 3', async () => {
            try {
                // Award the top 3 players with weeklyWinnings > 0 directly to walletBalance
                // (atomic $inc instead of overwriting bonusAmount)
                const topUsers = await User.find({ weeklyWinnings: { $gt: 0 } })
                    .sort({ weeklyWinnings: -1 })
                    .limit(3);
                const prizes = [10000, 5000, 2500];
                for (let i = 0; i < topUsers.length; i++) {
                    const winner = topUsers[i];
                    const prize = prizes[i];
                    const updated = await User.findByIdAndUpdate(
                        winner._id,
                        { $inc: { walletBalance: prize } },
                        { new: true }
                    );

                    const newNotification = new Notification({
                        senderId: winner._id,
                        receiverId: winner._id,
                        type: 'message',
                        title: `Award - ${i + 1} place`,
                        content: `You have been awarded $${prize} for being in the top 3 on the leaderboard!`,
                    });
                    await newNotification.save();

                    io.to(winner._id.toString()).emit("newNotification", {
                        message: `You have been awarded $${prize} for being in the top 3 on the leaderboard!`
                    });
                    if (updated) {
                        io.to(winner._id.toString()).emit("userDataUpdated", {
                            walletBalance: updated.walletBalance,
                            xp: updated.xp,
                            level: updated.level,
                        });
                    }
                }

                // Reset weekly winnings for all users
                await User.updateMany({}, { weeklyWinnings: 0 });

                console.log('Weekly winnings reset successfully.');
            } catch (error) {
                console.error('Error resetting weekly winnings:', error);
            }
        }, { timezone: 'America/Argentina/Buenos_Aires' })
    }
}