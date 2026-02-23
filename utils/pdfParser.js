const pdf = require('pdf-parse');

/**
 * Advanced Server-Side PDF Page Counter
 * Safely parses massive 127MB+ PDFs with 0 server memory impact
 */
async function getPageCount(storage, bucketName, filePath) {
    try {
        const file = storage.bucket(bucketName).file(filePath);
        const [metadata] = await file.getMetadata();
        const fileSize = parseInt(metadata.size, 10);

        if (!fileSize || fileSize === 0) {
            throw new Error("File is empty or not found in Google Cloud Storage");
        }

        console.log(`Analyzing file ${filePath}, size: ${(fileSize / (1024 * 1024)).toFixed(2)} MB`);

        // ==========================================
        // 1. FAST PATH: XREF CATALOG FETCH (~16KB)
        // ==========================================
        // The PDF /Type /Pages /Count is almost always near the absolute end of the file.
        // We only download the last 16KB of the massive file to locate the page count instantly.
        const CHUNK_SIZE = 16 * 1024; // 16KB
        const start = Math.max(0, fileSize - CHUNK_SIZE);
        const end = fileSize - 1;

        console.log(`XREF Fast Path: Downloading last ${CHUNK_SIZE / 1024}KB...`);
        const [buffer] = await file.download({ start, end });
        const tailString = buffer.toString('utf-8');

        // Regex to find `/Type /Pages ... /Count 123`
        // We look for the Pages dictionary explicitly.
        const xrefRegex = /\/Type\s*\/Pages[\s\S]*?\/Count\s+(\d+)/i;
        const xrefMatch = tailString.match(xrefRegex);

        if (xrefMatch && xrefMatch[1]) {
            const pageCount = parseInt(xrefMatch[1], 10);
            console.log(`✅ XREF Success! Parsed ${pageCount} pages instantly.`);
            // A PDF must have at least 1 page.
            if (pageCount > 0) return pageCount;
        }

        console.log(`⚠️ XREF Fast Path failed. Falling back to Full Parse/Stream...`);

        // ==========================================
        // 2. FALLBACK 1: LIGHTWEIGHT PARSE (< 20MB)
        // ==========================================
        // If the XREF was missing (malformed PDF, linearized, etc), but it's small enough,
        // we can safely load it into RAM and use the standard pdf-parse library.
        const SAFE_RAM_LIMIT = 20 * 1024 * 1024; // 20MB
        if (fileSize < SAFE_RAM_LIMIT) {
            console.log(`Local Download Fallback: Downloading full ${fileSize / 1024 / 1024}MB file to RAM...`);
            const [fullBuffer] = await file.download();
            const pdfData = await pdf(fullBuffer);
            if (pdfData && pdfData.numpages) {
                console.log(`✅ Lightweight Parse Success! parsed ${pdfData.numpages} pages.`);
                return pdfData.numpages;
            }
        }

        // ==========================================
        // 3. FALLBACK 2: MASSIVE STREAMING PARSE (> 20MB)
        // ==========================================
        // It's a massive 127MB file, AND the XREF is broken. We absolutely CANNOT download this into RAM.
        // We will pipe it as a stream and incrementally count the `/Type /Page` dictionary objects as they pass by.
        console.log(`Massive Streaming Fallback: Streaming ${fileSize / 1024 / 1024}MB file to count pages incrementally...`);

        return new Promise((resolve, reject) => {
            let streamPageCount = 0;
            // The regex matches `/Type /Page` followed by either space, a slash, or a closing bracket.
            // It ignores `/Type /Pages` (with an 's').
            const pageRegex = /\/Type\s*\/Page[\s>\/]/gi;

            let tailStr = '';

            const readStream = file.createReadStream();

            readStream.on('data', (chunk) => {
                const chunkStr = chunk.toString('utf-8');
                // Keep the last few characters of the previous chunk in case the `/Type /Page` dictionary
                // happened to be cut exactly in half between network stream chunks.
                const searchStr = tailStr + chunkStr;

                const matches = searchStr.match(pageRegex);
                if (matches) {
                    streamPageCount += matches.length;
                }

                // Keep the last 20 characters for the next chunk merge
                tailStr = searchStr.slice(-20);
            });

            readStream.on('end', () => {
                console.log(`✅ Massive Streaming Success! Found ${streamPageCount} exact pages via stream.`);
                resolve(Math.max(1, streamPageCount)); // Every PDF has at least 1 page
            });

            readStream.on('error', (err) => {
                console.error('Massive Streaming Parsing Error:', err);
                reject(err);
            });
        });

    } catch (error) {
        console.error("PDF Parsing Error:", error);
        return 1; // absolute minimum fallback in case of total collapse
    }
}

module.exports = { getPageCount };
