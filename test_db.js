const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const orders = await mongoose.connection.collection('printrequests').find().sort({ createdAt: -1 }).limit(3).toArray();
        const cache = await mongoose.connection.collection('webhookcaches').find().sort({ createdAt: -1 }).limit(3).toArray();

        console.log('=== RECENT ORDERS ===');
        console.log(JSON.stringify(orders, null, 2));

        console.log('=== RECENT CACHE ===');
        console.log(JSON.stringify(cache, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
