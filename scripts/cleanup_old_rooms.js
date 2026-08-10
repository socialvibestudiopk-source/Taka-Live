require('dotenv').config();
const mongoose = require('mongoose');

const LiveUser = require('../server/liveUser/liveUser.model');
const LiveStreamingHistory = require('../server/liveStreamingHistory/liveStreamingHistory.model');
const Chat = require('../server/chat/chat.model');
const User = require('../server/user/user.model');

const MONGO = process.env.MONGODB_URI;
if (!MONGO) {
  console.error('Missing MONGODB_URI in environment. Aborting.');
  process.exit(1);
}

const CONFIRM = process.env.CONFIRM === 'yes' || process.argv.includes('CONFIRM=yes');
const DRY_RUN = process.env.DRY_RUN !== 'false'; // default true

async function main() {
  await mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB');

  const liveCount = await LiveUser.countDocuments({});
  const historyCount = await LiveStreamingHistory.countDocuments({});
  console.log(`Found ${liveCount} LiveUser docs and ${historyCount} LiveStreamingHistory docs.`);

  if (!CONFIRM) {
    console.log('CONFIRM not provided. Dry-run only. To execute deletion set CONFIRM=yes');
  }

  if (DRY_RUN) {
    console.log('DRY_RUN is enabled. No destructive changes will be made.');
  }

  if (CONFIRM && !DRY_RUN) {
    console.log('Proceeding with destructive cleanup: removing live documents and resetting users');
    await LiveUser.deleteMany({});
    await LiveStreamingHistory.deleteMany({});
    await Chat.deleteMany({});

    // Reset live-related flags on users
    await User.updateMany({}, { $set: { isOnline: false, isBusy: false, channel: null, token: null } });

    console.log('Cleanup completed.');
  } else if (CONFIRM && DRY_RUN) {
    console.log('CONFIRM provided but DRY_RUN enabled. No data deleted. To actually delete, set DRY_RUN=false and CONFIRM=yes');
  }

  mongoose.connection.close();
}

main().catch((err) => {
  console.error('Cleanup script error:', err.message);
  process.exit(1);
});
