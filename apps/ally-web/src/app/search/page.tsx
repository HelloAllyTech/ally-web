import { fetchReferenceDocuments } from './api';
import SearchClient from './SearchClient';
import BottomTabs from '../bottom-tabs/page';



export default async function SearchPage({
searchParams,
}: {
  searchParams: { q?: string; category?: string };
}) {
  const searchQuery = searchParams.q ?? '';
  const category = searchParams.category ?? 'all';

 const { documents } = await fetchReferenceDocuments(searchQuery, category);

  return (
    <>
      <SearchClient searchQuery={searchQuery} category={category} documents={documents} />
      <BottomTabs />
    </>
  );
} 