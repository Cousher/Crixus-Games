const cron = require('node-cron');
const User = require('../models/User');
const { settleWeeklyLeagues } = require('../utils/leagues');

module.exports = {
    startCronJobs: function (io) {

        // Schedule a task to run every Wednesday at 8 pm Argentina time (UTC-3)
        cron.schedule('0 20 * * 3', async () => {
            try {
                // Settle all 5 weekly leagues: pays Top 3 prizes per league,
                // promotes top performers, and demotes inactive upper-tier players.
                await settleWeeklyLeagues(io);

                // Reset weekly winnings for all users
                await User.updateMany({}, { weeklyWinnings: 0 });

                console.log('Weekly leagues settled & winnings reset successfully.');
            } catch (error) {
                console.error('Error resetting weekly winnings:', error);
            }
        }, { timezone: 'America/Argentina/Buenos_Aires' })
    }
}