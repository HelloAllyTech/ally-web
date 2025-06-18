'use client';

import { ResourceSearchResults } from '@ally-ui-mono/ui-shared';
import { useRouter } from 'next/navigation';

interface SearchClientProps {
  searchQuery: string;
  category: string;
  searchData: any;
}

export default function SearchClient({ searchQuery, category, searchData }: SearchClientProps) {
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
        resources={[]}
        isLoading={false}
      />
    </main>
  );
} 