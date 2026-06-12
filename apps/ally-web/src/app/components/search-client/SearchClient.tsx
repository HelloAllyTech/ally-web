"use client";

import { useEffect, useState } from "react";

import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";

import { logger, ResourceSearch, Resource } from "@ally-ui-mono/ui-shared";

import { fetchReferenceDocuments, INITIAL_FETCH_LIMIT } from "../../api";

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
  documents: initialDocuments = [],
  categoryCountList,
  totalDocumentCount,
}: SearchClientProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [documents, setDocuments] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    if (searchQuery) {
      setDocuments(initialDocuments);
      setHasMore(initialDocuments.length < totalDocumentCount);
    }
  }, [initialDocuments, totalDocumentCount, searchQuery]);

  const onSearch = (searchTerm: string) => {
    const searchParams = new URLSearchParams();
    if (searchTerm) {
      searchParams.set("q", searchTerm);
    }
    const queryString = searchParams.toString();
    router.push(`${pathname}?${queryString ?? ""}`);
  };

  const onCategoryChange = (newCategory: string) => {
    const searchParams = new URLSearchParams();
    if (searchQuery) {
      searchParams.set("q", searchQuery);
    }
    if (newCategory !== "All") {
      searchParams.set("category", newCategory);
    }
    const queryString = searchParams.toString();
    router.push(`${pathname}?${queryString ?? ""}`);
  };

  const onInfiniteScroll = async () => {
    if (isLoading || !hasMore) return;
    setIsLoading(true);
    try {
      const { documents: newDocuments, total } = await fetchReferenceDocuments(
        searchQuery,
        category,
        INITIAL_FETCH_LIMIT,
        documents.map(doc => doc.id),
      );
      setDocuments(prev => [...prev, ...newDocuments]);
      // The total value on infinite scroll after excluded Ids are added is the total after the first fetch
      setHasMore(total > newDocuments.length);
    } catch (error) {
      logger.error(`Error in onInfiniteScroll: ${error}`);
      toast.error("Couldn't load more results. Please try again.");
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
        showHeaderDescriptionInMobile={!searchQuery}
        isLoading={isLoading}
        categoryCountList={categoryCountList}
        isSuggestionsCenter={false}
        isSuggestionsRow={true}
      />
    </main>
  );
}
