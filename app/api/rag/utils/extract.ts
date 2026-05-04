// import pdfParse from 'pdf-parse-new';
// // const pdfParse = (await import('pdf-parse')).default || require('pdf-parse');
// export async function extractPDFText(buffer: Buffer) {
//   const data = await pdfParse(buffer);
//   return data.text;
// }
// app/api/rag/utils/extract.ts
import { extractText, getDocumentProxy } from 'unpdf';

export async function extractPDFText(buffer: Buffer): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return text;
}
