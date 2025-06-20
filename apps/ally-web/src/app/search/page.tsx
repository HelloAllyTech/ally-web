import { fetchCategories, fetchReferenceDocuments } from './api';
import SearchClient from './SearchClient';


export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string; category?: string };
}) {
  const searchQuery = searchParams.q ?? '';
  const category = searchParams.category ?? 'All';

  const { documents } = await fetchReferenceDocuments(searchQuery, category);
  const categories = await fetchCategories();

  return (
    <SearchClient searchQuery={searchQuery} category={category} documents={documents} categories={categories} />
  );
} 