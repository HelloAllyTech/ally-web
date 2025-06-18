const API_BASE_URL = process.env.API_BASE_URL;
const API_VERSION = process.env.API_VERSION;

const fetchReferenceDocuments = async (query: string, category?: string) => {
  const response = await fetch(
    `${API_BASE_URL}/api/${API_VERSION}/reference-document/search/public`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, filters: { category } }),
    }
  );
  return response.json();
};

export { fetchReferenceDocuments };
