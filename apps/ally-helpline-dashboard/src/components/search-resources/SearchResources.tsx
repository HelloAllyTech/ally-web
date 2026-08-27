import { FC, useEffect, useState, useRef } from "react";

import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { ResourceSearch } from "@ally-ui-mono/ui-shared";
import { Resource, SearchVariant } from "@ally-ui-mono/ui-shared/types";
import { useGetSearchResultsMutation } from "@api";
import { ANALYTICS_EVENTS, ANALYTICS_PROPS } from "@constants/analyticsEvents";
import { useAnalytics } from "@hooks";

import { SearchResourcesProps } from "./types";

const PAGE_SIZE = 10;

const SearchResources: FC<SearchResourcesProps> = ({
  isInSidebar = false,
  showHeader = true,
  fullWidth = false,
}) => {
  const { t } = useTranslation();
  const { track } = useAnalytics();
  const [, setSearchParams] = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [resources, setResources] = useState<Resource[]>([]);
  const [categoryCountList, setCategoryCountList] = useState<{ [key: string]: number }>({});
  const [hasMore, setHasMore] = useState<boolean>(true);
  const lastRequestId = useRef<number>(0);
  const currentRequestId = useRef<number>(0);

  useEffect(() => {
    const initializeSearchWithQueryParams = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const query = urlParams.get("q");
      const category = urlParams.get("category");
      if (!query && !category) {
        return;
      }
      setSearchQuery(query);
      setSelectedCategory(category || "All");
      // To get the category count list
      await triggerSearch(query);
      if (category) triggerSearch(query, category);
    };

    initializeSearchWithQueryParams();
  }, []);

  const [getSearchResults, { isLoading: isResourcesLoading }] = useGetSearchResultsMutation();

  const triggerSearch = async (query: string, category?: string) => {
    const requestId = ++currentRequestId.current;

    let filters = undefined;
    if (category && category !== "All") {
      filters = { category };
    }
    const response = await getSearchResults({
      query,
      limit: PAGE_SIZE,
      filters,
    });
    setHasMore(response.data?.total > response.data?.documents?.length);

    // Every search funnels through here — a typed query, a category change, and
    // the query-param restore on load — so this is the one place the event has
    // to be. Note what is NOT sent: the query text itself is clinical detail
    // about a caller (see ANALYTICS_PROPS.SEARCH_QUERY), so only its length
    // travels. `result_count` is the half the zero-result detector reads.
    track(ANALYTICS_EVENTS.SEARCH_PERFORMED, {
      [ANALYTICS_PROPS.QUERY_LENGTH]: query.trim().length,
      [ANALYTICS_PROPS.RESULT_COUNT]: response.data?.total ?? 0,
    });

    // Only process the response if it's from the most recent request
    if (requestId > lastRequestId.current) {
      lastRequestId.current = requestId;
      if (response.data) {
        setResources(response.data.documents);
        if (!(category && category !== "All")) {
          // If there is a category, it means the query is filtered and wont return category list
          setCategoryCountList(response.data.categories);
        }
      } else {
        toast.error(t("search.error"));
      }
    }
  };

  const onSearch = async (query: string) => {
    if (!isInSidebar) {
      setSearchParams({ q: query });
    }
    setSearchQuery(query);
    if (query) {
      triggerSearch(query);
    }
    setSelectedCategory("All");
  };

  const onCategoryChange = async (category: string) => {
    if (!isInSidebar) {
      if (category === "All") {
        setSearchParams({ q: searchQuery });
      } else {
        setSearchParams({ q: searchQuery, category });
      }
    }
    setSelectedCategory(category);
    triggerSearch(searchQuery, category);
  };

  const fetchRemainingResources = async () => {
    if (isResourcesLoading || !hasMore) return;

    const requestId = ++currentRequestId.current;
    let filters = undefined;
    if (selectedCategory && selectedCategory !== "All") {
      filters = { category: selectedCategory };
    }
    const response = await getSearchResults({
      query: searchQuery,
      limit: PAGE_SIZE,
      filters,
      excludedIds: resources.map(resource => resource.id),
    });

    // Only process the response if it's from the most recent request
    if (requestId > lastRequestId.current) {
      lastRequestId.current = requestId;
      if (response.data) {
        const newDocuments = response.data.documents;
        setResources(prevResources => {
          // Check to ensure no duplicates when combining with previous resources
          const combinedResources = [...prevResources, ...newDocuments];
          return combinedResources.filter(
            (resource, index, self) => index === self.findIndex(r => r.id === resource.id),
          );
        });
        setHasMore(response.data?.total > response.data?.documents?.length);
      }
    }
  };

  return (
    <ResourceSearch
      resources={resources}
      isLoading={isResourcesLoading}
      onSearch={onSearch}
      onInfiniteScroll={fetchRemainingResources}
      selectedCategory={selectedCategory}
      onCategoryChange={onCategoryChange}
      showHeader={showHeader}
      fullWidth={fullWidth}
      searchQuery={searchQuery}
      isSuggestionsCenter={isInSidebar}
      isSuggestionsRow={!isInSidebar}
      mode={isInSidebar ? SearchVariant.DARK : SearchVariant.LIGHT}
      categoryCountList={categoryCountList}
      searchPlaceholder={t("search.placeholder", "Need guidance? Search here..")}
      headerDescription={t(
        "search.headerDescription",
        "Guidance, safety, and support — whenever you need it.",
      )}
      suggestionsTitle={t("search.suggestionsTitle", "Try:")}
      noResultsLabel={t("search.noResults", 'No results found for "{{query}}"')}
      allLabel={t("search.allLabel", "All")}
      logoAlt={t("search.logoAlt", "Ally Logo")}
      translateCategory={category => t(`search.categories.${category}`, category as any) as string}
      viewMoreLabel={t("search.viewMore", "View more")}
      viewLessLabel={t("search.viewLess", "View less")}
    />
  );
};

export default SearchResources;
