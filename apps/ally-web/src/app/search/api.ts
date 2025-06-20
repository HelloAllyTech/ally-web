const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const API_VERSION = process.env.NEXT_PUBLIC_API_VERSION;

export const initialFetchLimit = 10;

const fetchReferenceDocuments = async (query: string, category?: string, limit: number = initialFetchLimit) => {
  console.log(process.env);
  const response = await fetch(
    `${API_BASE_URL}/api/${API_VERSION}/reference-document/search/public`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, limit }),
    }
  );
  return response.json();
};

const fetchCategories = async () => {
  const response = await fetch(
    `${API_BASE_URL}/api/${API_VERSION}/reference-document/categories`,
    {
      method: 'GET',
    }
  );
  return response.json();
};

export { fetchReferenceDocuments, fetchCategories };
