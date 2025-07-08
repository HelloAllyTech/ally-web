"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { logger, ResourceSearch, Resource } from "@ally-ui-mono/ui-shared";

import { fetchReferenceDocuments, initialFetchLimit } from "./api";

interface SearchClientProps {
  searchQuery: string;
  category?: string;
  documents: Resource[];
  categoryCountList: { [key: string]: number };
  totalDocumentCount: number;
}

export default function SearchClient({
  searchQuery,
  category,
  documents: initialDocuments,
  categoryCountList,
  totalDocumentCount,
}: SearchClientProps) {
  const router = useRouter();
  const [documents, setDocuments] = useState<Resource[]>(initialDocuments);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialDocuments.length < totalDocumentCount);

  useEffect(() => {
    setDocuments(initialDocuments);
    setHasMore(initialDocuments.length < totalDocumentCount);
  }, [initialDocuments, totalDocumentCount]);

  const onSearch = (searchTerm: string) => {
    router.push(`/search?q=${encodeURIComponent(searchTerm)}`);
  };

  const onCategoryChange = (newCategory: string) => {
    router.push(
      `/search?q=${encodeURIComponent(searchQuery)}${newCategory !== "All" ? `&category=${encodeURIComponent(newCategory)}` : ""}`,
    );
  };

  const onInfiniteScroll = async () => {
    if (isLoading || !hasMore) return;
    setIsLoading(true);
    try {
      const { documents: newDocuments, total } = await fetchReferenceDocuments(
        searchQuery,
        category,
        initialFetchLimit,
        documents.map(doc => doc.id),
      );
      setDocuments(prev => [...prev, ...newDocuments]);
      // The total value on infinite scroll after excluded Ids are added is the total after the first fetch
      setHasMore(total > newDocuments.length);
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
        onCategoryChange={onCategoryChange}
        onInfiniteScroll={onInfiniteScroll}
        resources={documents}
        showHeaderDescriptionInMobile={false}
        isLoading={isLoading}
        categoryCountList={categoryCountList}
        isSuggestionsCenter={false}
        isSuggestionsRow={true}
      />
    </main>
  );
}
