// // src/pdf/stamp.ts
// import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
// import QRCode from 'qrcode';

// type StampInfo = {
//   name: string;
//   username: string;
//   signedAtIso: string;
//   sha256Hex: string;           // full doc hash
//   signatureB64: string;        // signer’s detached sig over canonical payload
//   verifyUrl: string;           // e.g. https://your.app/verify?sha256=...
// };

// type Placement = { page: number; x: number; y: number; width: number; height: number };

// export async function stampPdf(
//   pdfBuffer: Buffer,
//   stamps: Array<{ info: StampInfo; placements: Placement[] }>
// ): Promise<Uint8Array> {
//   const pdf = await PDFDocument.load(pdfBuffer);
//   const font = await pdf.embedFont(StandardFonts.Helvetica);
//   const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

//   // Prebuild QR images (PNG) for each unique signer/info
//   const qrCache = new Map<string, Uint8Array>();
//   const pngFor = async (info: StampInfo) => {
//     const key = info.verifyUrl;
//     if (!qrCache.has(key)) {
//       const dataUrl = await QRCode.toDataURL(info.verifyUrl, { errorCorrectionLevel: 'M', margin: 0, width: 256 });
//       const pngBytes = Buffer.from(dataUrl.split(',')[1], 'base64');
//       qrCache.set(key, pngBytes);
//     }
//     return qrCache.get(key)!;
//   };

//   for (const { info, placements } of stamps) {
//     const qrPng = await pngFor(info);
//     const qrImage = await pdf.embedPng(qrPng);

//     for (const p of placements) {
//       const page = pdf.getPage(p.page - 1); // 1-based -> 0-based
//       const { width: W, height: H } = page.getSize();

//       // Clamp bounds a bit
//       const boxW = Math.max(160, p.width);
//       const boxH = Math.max(60, p.height);
//       const x = Math.min(Math.max(0, p.x), W - boxW);
//       const y = Math.min(Math.max(0, p.y), H - boxH);

//       // Background
//       page.drawRectangle({
//         x, y, width: boxW, height: boxH,
//         color: rgb(1, 1, 1),
//         borderColor: rgb(0.2, 0.2, 0.2),
//         borderWidth: 1.2,
//         opacity: 0.95
//       });

//       // QR (optional) on the left
//       const qrSize = Math.min(boxH - 12, 48); // keep it small but legible
//       page.drawImage(qrImage, {
//         x: x + 8,
//         y: y + (boxH - qrSize) / 2,
//         width: qrSize,
//         height: qrSize
//       });

//       // Text block on the right
//       const left = x + 12 + qrSize + 8;
//       const top = y + boxH - 10;
//       const line = (t: string, i: number, bold = false) => {
//         page.drawText(t, {
//           x: left,
//           y: top - i * 12,
//           size: 9.5,
//           font: bold ? fontBold : font,
//           color: rgb(0.1, 0.1, 0.1)
//         });
//       };

//       const sigShort = Buffer.from(info.signatureB64, 'base64').toString('hex').slice(0, 8);
//       const hashShort = info.sha256Hex.slice(0, 8);

//       line(`Signed by: ${info.name} (@${info.username})`, 0, true);
//       line(`Date (UTC): ${new Date(info.signedAtIso).toISOString()}`, 1);
//       line(`Doc Hash: ${hashShort}…`, 2);
//       line(`Sig: ${sigShort}…`, 3);
//       line(`Verify: ${info.verifyUrl}`, 4);
//     }
//   }

//   return await pdf.save();
// }