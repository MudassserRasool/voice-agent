interface Chunk {
  text: string;
  metadata: {
    source: string;
    lectureNumber?: number;
    lectureTitle?: string;
    chunkIndex: number;
  };
}

function cleanText(text: string): string {
  // Remove header/copyright noise (no newline dependency)
  text = text.replace(/CS504-Software Engineering[\s–\-–—]*I?\s*VU\s*_*/gi, '');
  text = text.replace(/©\s*Copyright Virtual University of Pakistan/gi, '');
  text = text.replace(/Software Engineering\s*[–\-]\s*\d+\s*\(CS504\)/gi, '');
  text = text.replace(/Lecture Notes Delivered by Dr\.?\s*Fakhar Lodhi/gi, '');
  text = text.replace(/TABLE OF CONTENTS/gi, '');

  // Remove TOC entries: "Title ........ 12" or "Title ……… 12"
  text = text.replace(/[A-Za-z][^.!?]{2,80}[.…]{3,}\s*\d+/g, '');

  // Remove dividers
  text = text.replace(/[_\-=]{3,}/g, ' ');

  // Collapse excess whitespace (PDF often has no real newlines)
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

function splitIntoSections(
  text: string
): Array<{ title: string; lectureNumber?: number; body: string }> {
  // ✅ Matches "Lecture 01:" or "Lecture 1:" with zero-padded numbers
  // ✅ Title ends at next "Lecture" keyword, not at \n (since PDF has no newlines)
  const lectureRegex = /Lecture\s+0*(\d+)\s*:/gi;

  const matches: Array<{ index: number; number: number }> = [];
  let match: RegExpExecArray | null;

  // First pass: collect all match positions
  while ((match = lectureRegex.exec(text)) !== null) {
    matches.push({
      index: match.index,
      number: parseInt(match[1]),
    });
  }

  console.log(`Found ${matches.length} lecture sections`);

  const sections: Array<{ title: string; lectureNumber?: number; body: string }> = [];

  if (matches.length === 0) {
    // Fallback: no lecture pattern found, chunk entire text
    console.warn('No lecture pattern found — chunking full text');
    sections.push({ title: 'Document', lectureNumber: undefined, body: text });
    return sections;
  }

  // Add any content before the first lecture
  const preamble = text.slice(0, matches[0].index).trim();
  if (preamble.length > 100) {
    sections.push({ title: 'Introduction', lectureNumber: undefined, body: preamble });
  }

  // Second pass: slice body between consecutive lecture markers
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;

    const body = text.slice(start, end).trim();

    // Extract title: text right after "Lecture N:" up to ~60 chars or next capital word boundary
    const titleMatch = body.match(/^Lecture\s+0*\d+\s*:\s*(.{5,80?)(?=\s[A-Z]|\s{2}|$)/);
    const title = titleMatch ? titleMatch[1].trim() : `Lecture ${matches[i].number}`;

    sections.push({
      title,
      lectureNumber: matches[i].number,
      // body includes the lecture header — that's fine, cleaner than stripping it
      body,
    });
  }

  return sections;
}

function splitSentences(text: string): string[] {
  // Split on ". " followed by capital letter, avoiding "Dr.", "e.g." etc.
  return text
    .split(/(?<!\b(?:Dr|Mr|Mrs|Prof|Fig|e\.g|i\.e|vs|etc|St|No))\.\s+(?=[A-Z])/g)
    .map((s) => s.trim())
    .filter((s) => s.length > 15);
}

function chunkSection(
  section: { title: string; lectureNumber?: number; body: string },
  source: string,
  maxSize = 800,
  overlap = 150
): Chunk[] {
  const sentences = splitSentences(section.body);
  const chunks: Chunk[] = [];

  const prefix = section.lectureNumber
    ? `[Lecture ${section.lectureNumber}: ${section.title}]\n`
    : `[${section.title}]\n`;

  let current = '';
  let chunkIndex = 0;

  for (const sentence of sentences) {
    const candidate = current + sentence + ' ';

    if (candidate.length > maxSize - prefix.length && current.trim().length > 0) {
      chunks.push({
        text: (prefix + current.trim()).slice(0, 2000), // OpenAI token safety
        metadata: {
          source,
          lectureNumber: section.lectureNumber,
          lectureTitle: section.title,
          chunkIndex: chunkIndex++,
        },
      });

      // Sentence-aware overlap
      const pastSentences = current.trim().split(/(?<=\.)\s+/);
      const overlapSentences: string[] = [];
      let overlapLen = 0;
      for (let i = pastSentences.length - 1; i >= 0; i--) {
        overlapLen += pastSentences[i].length;
        overlapSentences.unshift(pastSentences[i]);
        if (overlapLen >= overlap) break;
      }
      current = overlapSentences.join(' ') + ' ';
    }

    current += sentence + ' ';
  }

  if (current.trim().length > 20) {
    chunks.push({
      text: (prefix + current.trim()).slice(0, 2000),
      metadata: {
        source,
        lectureNumber: section.lectureNumber,
        lectureTitle: section.title,
        chunkIndex: chunkIndex++,
      },
    });
  }

  return chunks;
}

function chunkText(text: string, source = 'cs504', maxSize = 800, overlap = 150): Chunk[] {
  console.log('Input text length:', text.length);

  const cleaned = cleanText(text);
  console.log('Cleaned text length:', cleaned.length);
  console.log('Cleaned preview:', cleaned.slice(0, 300));

  const sections = splitIntoSections(cleaned);
  console.log('Sections found:', sections.length);
  sections.slice(0, 3).forEach((s, i) => {
    console.log(`Section ${i}: Lecture ${s.lectureNumber} — "${s.title}" (${s.body.length} chars)`);
  });

  const chunks = sections.flatMap((section) => chunkSection(section, source, maxSize, overlap));
  console.log('Total chunks:', chunks.length);

  return chunks;
}

export { Chunk, chunkText };
