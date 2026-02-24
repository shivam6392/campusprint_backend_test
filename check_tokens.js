const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const checkTokens = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const usersWithTokens = await User.find({ 'fcmTokens.0': { $exists: true } });
        console.log(`Found ${usersWithTokens.length} users with FCM tokens.`);

        usersWithTokens.forEach(u => {
            console.log(`User: ${u.email}, Tokens: ${u.fcmTokens.length}`);
        });

        const allUsers = await User.find({}, 'email fcmTokens');
        console.log(`Total users in DB: ${allUsers.length}`);

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
};

checkTokens();
