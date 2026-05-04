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
function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function buildFallbackPatterns(query: string) {
  const snippet = query.trim().slice(0, 180);
  const tokens = Array.from(
    new Set(
      query
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((token) => token.length >= 5)
    )
  ).slice(0, 8);

  const patterns = [];

  if (snippet.length >= 20) {
    patterns.push({ text: { $regex: escapeRegExp(snippet), $options: 'i' } });
  }

  for (const token of tokens) {
    patterns.push({ text: { $regex: `\\b${escapeRegExp(token)}\\b`, $options: 'i' } });
  }

  return patterns;
}

export { buildFallbackPatterns };
