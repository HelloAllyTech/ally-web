import { logger } from "@lifeline-ui-mono/ui-shared";

import { fetchReferenceDocuments } from "./api";
import { SearchClient } from "./components";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string; category?: string };
}) {
  const searchQuery = searchParams.q ?? "";
  const category = searchParams.category;
  try {
    const { documents, categories, total } = await fetchReferenceDocuments(searchQuery, category);
    let categoryCountList = categories;
    if (category) {
      // This is to fetch the category count list - category list wont be correct oif there is a filter as in previous case
      const { categories: categoryList } = await fetchReferenceDocuments(searchQuery);
      categoryCountList = categoryList;
    }

    return (
      <SearchClient
        searchQuery={searchQuery}
        category={category}
        documents={documents}
        totalDocumentCount={total}
        categoryCountList={categoryCountList}
      />
    );
  } catch (error) {
    logger.info(`Error in SearchPage: ${error}`);
    return <div>Error loading search results.</div>;
  }
}
