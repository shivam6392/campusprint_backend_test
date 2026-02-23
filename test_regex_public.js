const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

async function testRegex() {
    try {
        console.log("Generating 162-page PDF...");
        const pdfDoc = await PDFDocument.create();
        for (let i = 0; i < 162; i++) {
            pdfDoc.addPage();
        }
        const pdfBytes = await pdfDoc.save();

        console.log("Loading raw bytes via pdf-lib engine...");
        // pdf-lib can instantly read the exact count without rendering anything!
        const parsedDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
        console.log("PDF-Lib Extracted True Page Count:", parsedDoc.getPageCount());

    } catch (e) {
        console.error(e);
    }
}

testRegex();
