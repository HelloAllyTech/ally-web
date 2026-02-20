export const stringToHashCode = (str: string): number => {
  return str.split("").reduce((acc, char) => {
    const hash = (acc << 5) - acc + char.charCodeAt(0);
    return hash & hash; // Convert to 32-bit integer
  }, 0);
};

export const extractReportIdFromFileName = (fileName: string): string | null => {
  const match = fileName.match(/^Report (.+)$/);
  return match?.[1] || null;
};
