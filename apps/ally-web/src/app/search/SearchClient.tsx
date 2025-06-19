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
    router.push(`/search?q=${encodeURIComponent(searchTerm)}&category=${encodeURIComponent(category)}`);
  };

  const onCategoryChange = (newCategory: string) => {
    router.push(`/search?q=${encodeURIComponent(searchQuery)}&category=${encodeURIComponent(newCategory)}`);
  };

  return (
    <main className="w-full min-h-screen flex justify-center items-center mb-[50px] pt-[40px] pb-[50px]">
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