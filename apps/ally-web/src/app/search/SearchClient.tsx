'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { logger } from '@ally-ui-mono/ui-shared';

import { ResourceSearch } from '@ally-ui-mono/ui-shared';
import { Resource } from 'libs/ui-shared/src/types';
import { fetchReferenceDocuments, initialFetchLimit } from './api';
import { useEffect } from 'react';

interface SearchClientProps {
  searchQuery: string;
  category: string;
  categories: string[];
  documents: Resource[];
}

export default function SearchClient({
  searchQuery,
  category,
  documents: initialDocuments,
  categories,
}: SearchClientProps) {
  const router = useRouter();
  const [documents, setDocuments] = useState<Resource[]>(initialDocuments);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    setDocuments(initialDocuments);
  }, [initialDocuments]);


  const onSearch = (searchTerm: string) => {
    router.push(`/search?q=${encodeURIComponent(searchTerm)}&category=${encodeURIComponent(category)}`);
  };

  const onCategoryChange = (newCategory: string) => {
    router.push(`/search?q=${encodeURIComponent(searchQuery)}&category=${encodeURIComponent(newCategory)}`);
  };

  const onInfiniteScroll = async () => {
    if (isLoading || !hasMore) return;
    setIsLoading(true);
    try {
      const { documents: newDocuments } = await fetchReferenceDocuments(
        searchQuery,
        category,
        documents.length + initialFetchLimit,
      );
      if (newDocuments.length > documents.length) {
        setDocuments(newDocuments);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      logger.info(`Error in onInfiniteScroll: ${error}`);
    }
    setIsLoading(false);
  };

  return (
    <main className="w-full h-[calc(100vh-10px)] sm:h-[calc(100vh-5px)] flex justify-center items-center pt-[40px] pb-[50px] sm:px-[15%] px-[0px] overflow-y-hidden">
      <ResourceSearch
        searchQuery={searchQuery}
        onSearch={onSearch}
        selectedCategory={category}
        setSelectedCategory={onCategoryChange}
        onInfiniteScroll={onInfiniteScroll}
        resources={documents}
        showHeaderDescriptionInMobile={false}
        isLoading={isLoading}
        categories={categories}
      />
    </main>
  );
} 