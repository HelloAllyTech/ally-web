import { fetchReferenceDocuments } from './api';
import SearchClient from './SearchClient';



export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string; category?: string };
}) {
  const searchQuery = searchParams.q ?? '';
  const category = searchParams.category ?? 'all';
  
 const refDocs = await fetchReferenceDocuments(searchQuery, category);
 console.log(refDocs);

  return <SearchClient searchQuery={searchQuery} category={category} />;
} 