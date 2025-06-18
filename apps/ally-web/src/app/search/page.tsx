import SearchClient from './SearchClient';

const API_BASE_URL = process.env.API_BASE_URL;
const API_VERSION = process.env.API_VERSION;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string; category?: string };
}) {
  const searchQuery = searchParams.q ?? '';
  const category = searchParams.category ?? 'all';
  
  const data = await fetch(`${API_BASE_URL}/api/${API_VERSION}/reference-document/search/public`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: searchQuery,
      filters: { category }
    })
  });
  const searchData = await data.json();

  console.log(searchData, searchQuery

  );
  return <SearchClient searchQuery={searchQuery} category={category} searchData={searchData} />;
} 