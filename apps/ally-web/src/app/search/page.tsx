import { fetchReferenceDocuments } from "./api";
import SearchClient from "./SearchClient";
import { logger } from "@ally-ui-mono/ui-shared";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string; category?: string };
}) {
  const searchQuery = searchParams.q ?? "";
  const category = searchParams.category ?? "All";
  try {
    const { documents, categories } = await fetchReferenceDocuments(searchQuery, category);

    return (
      <SearchClient
        searchQuery={searchQuery}
        category={category}
        documents={documents}
        categoryCountList={categories}
      />
    );
  } catch (error) {
    logger.info(`Error in SearchPage: ${error}`);
    return <div>Error loading search results.</div>;
  }
}
