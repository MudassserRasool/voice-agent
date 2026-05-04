function chunkText(text: string, maxSize = 1200, overlap = 200) {
  const sentences =
    text.match(/[^.!?]+[.!?]+|\s*[^.!?]+$/g) || [];

  const chunks: string[] = [];
  let chunk = '';

  for (const s of sentences) {
    if ((chunk + s).length > maxSize) {
      chunks.push(chunk.trim());

      const words = chunk.split(' ');
      chunk = words.slice(-overlap).join(' ') + ' ';
    }

    chunk += s + ' ';
  }

  if (chunk.trim()) chunks.push(chunk.trim());

  return chunks;
}

export { chunkText };
