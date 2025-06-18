'use client';

import { useRouter } from 'next/navigation';

import { ResourceSearchResults } from '@ally-ui-mono/ui-shared';
import { Resource } from 'libs/ui-shared/src/types';

interface SearchClientProps {
  searchQuery: string;
  category: string;
  documents: Resource[];
}

export default function SearchClient({ searchQuery, category, documents }: SearchClientProps) {
  const router = useRouter();
  const onSearch = (searchTerm: string) => {
    console.log(searchTerm);
    router.push(`/search?q=${encodeURIComponent(searchTerm)}&category=${encodeURIComponent(category)}`);
  };

  const onCategoryChange = (newCategory: string) => {
    console.log(newCategory);
    router.push(`/search?q=${encodeURIComponent(searchQuery)}&category=${encodeURIComponent(newCategory)}`);
  };

  return (
    <main className="w-full min-h-screen flex justify-center items-center">
      <ResourceSearchResults 
        searchQuery={searchQuery} 
        onSearch={onSearch} 
        selectedCategory={category} 
        setSelectedCategory={onCategoryChange}
        onInfiniteScroll={() => {}}
        resources={documents}
        isLoading={false}
      />
    </main>
  );
} 