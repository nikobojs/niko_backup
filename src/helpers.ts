export function getFileNameFriendlyDate(d = new Date()) {
  return d
    .toISOString()
    .split('T')
    .map(s => s.replace(/:/g, '_'))
    .join('T')
    .split('.')[0];
}

export function extractDateFromFileName(
  filename: string
): Date | null {
  const regex = /\d{4}-\d{2}-\d{2}T\d{2}_\d{2}_\d{2}/
  const match = filename.match(regex);
  if (match) {
    const rawDate = match[0].replace(/_/g, ':');
    console.log('rawDate:', rawDate)
    const result = new Date(rawDate);
    return result;
  } else {
    return null;
  }
}