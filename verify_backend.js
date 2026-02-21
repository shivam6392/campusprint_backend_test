const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000/api';
let token = '';
let printRequestId = '';

// Helper to create a dummy PDF
const createDummyPDF = () => {
    const filePath = path.join(__dirname, 'test.pdf');
    fs.writeFileSync(filePath, 'Dummy PDF content');
    return filePath;
};

const register = async () => {
    console.log('--- Registering User ---');
    const response = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'Test User',
            email: `test${Date.now()}@example.com`,
            password: 'password123'
        })
    });
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Data:', data);
    if (response.ok) token = data.token;
};

const login = async () => {
    console.log('\n--- Logging In ---');
    // Skipping actual login call as register returns token, but good to test
};

const uploadPDF = async () => {
    console.log('\n--- Uploading PDF ---');
    const filePath = createDummyPDF();
    const formData = new FormData();
    const fileBlob = new Blob([fs.readFileSync(filePath)], { type: 'application/pdf' });
    formData.append('pdf', fileBlob, 'test.pdf');
    formData.append('pages', '2');
    formData.append('copies', '1');

    const response = await fetch(`${BASE_URL}/print/upload`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: formData
    });
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Data:', data);
    if (response.ok) printRequestId = data._id;
};

const pay = async () => {
    console.log('\n--- Making Payment ---');
    const response = await fetch(`${BASE_URL}/print/pay`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ printRequestId })
    });
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Data:', data);
};

const run = async () => {
    try {
        await register();
        if (token) {
            // Node 18+ fetch implementation of FormData specific handling might need 'form-data' package
            // or specific boundary handling. 
            // simpler to use a library or just try standard fetch.
            // If native fetch FormData is tricky with fs, I might fail here using raw fetch in Node 
            // without 'form-data' package.
            // Let's use a simpler approach: mock the upload or install 'form-data'
            // For now, let's try to install 'form-data' and 'node-fetch' if needed, 
            // but 'fetch' is global in Node 18+. 'FormData' is also global in Node 18+.
            // However, appending a file from fs to global FormData might require Blob.
            // I used Blob above. Let's see if it works.

            await uploadPDF();
            if (printRequestId) {
                await pay();
            }
        }
    } catch (error) {
        console.error('Error:', error);
    }
};

run();
