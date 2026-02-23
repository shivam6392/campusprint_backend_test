const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/.env' }); // force path

async function checkDB() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log("Connected!");

        const orders = await mongoose.connection.collection('printrequests').find().sort({ createdAt: -1 }).limit(2).toArray();
        console.log('\n--- RECENT ORDERS ---');
        orders.forEach(o => console.log(`ID: ${o._id} | PublicId: ${o.publicId} | Status: ${o.paymentStatus} | Pages: ${o.pages}`));

        const caches = await mongoose.connection.collection('webhookcaches').find().sort({ createdAt: -1 }).limit(2).toArray();
        console.log('\n--- WEBHOOK CACHE ---');
        if (caches.length === 0) console.log('Empty');
        caches.forEach(c => console.log(`PublicId: ${c.publicId} | Pages: ${c.pages}`));

    } catch (err) {
        console.error("DB Error:", err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

checkDB();
