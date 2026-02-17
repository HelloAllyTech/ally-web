import { useCallback, useEffect, useState } from "react";

import { useGetUserBadgesQuery } from "@src/api/userBadges";
import { Add } from "@src/assets";
import {
  Button,
  CreateBadgePopup,
  CreateBadgeSidePanel,
  ListToolbar,
  NotionTable,
} from "@src/components";
import { Badge } from "@src/components/create-badge-popup/CreateBadgePopup";
import { ButtonVariant } from "@src/components/types";
import { en, USER_BADGES_TABLE_COLUMNS } from "@src/constants";
import { useDebounce } from "@src/hooks";
import TableSkeleton from "@src/pages/UserBadges/TableSkeleton";
import { BadgeCategory, UserBadge } from "@src/types";
import { formatDate } from "@src/utils";

const SEARCH_DEBOUNCE_MS = 300;
const BADGES_PAGE_LIMIT = 20;

export const UserBadges = () => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [isCreateUserBadgePopupOpen, setIsCreateUserBadgePopupOpen] = useState<boolean>(false);
  const [isBadgeSidePanelOpen, setIsBadgeSidePanelOpen] = useState<boolean>(false);
  const [selectedBadgeType, setSelectedBadgeType] = useState<Badge | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<UserBadge | null>(null);

  // Pagination state
  const [offset, setOffset] = useState<number>(0);
  const [allBadges, setAllBadges] = useState<UserBadge[]>([]);

  // Debounced function to update search value for API and reset pagination
  const updateDebouncedSearch = useDebounce((value: string) => {
    setDebouncedSearch(value);
    setOffset(0);
    setAllBadges([]);
  }, SEARCH_DEBOUNCE_MS);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value);
      updateDebouncedSearch(value);
    },
    [updateDebouncedSearch],
  );

  const {
    data: userBadges,
    isLoading,
    isFetching,
    refetch,
  } = useGetUserBadgesQuery({
    search: debouncedSearch || undefined,
    limit: BADGES_PAGE_LIMIT,
    offset,
  });

  const totalCount = userBadges?.count || 0;
  const hasMore = allBadges.length < totalCount;

  useEffect(() => {
    if (userBadges?.data) {
      if (offset === 0) {
        setAllBadges(userBadges.data);
      } else {
        setAllBadges(prev => [...prev, ...userBadges.data]);
      }
    }
  }, [userBadges, offset]);

  // Load more handler for infinite scroll
  const handleLoadMore = useCallback(() => {
    if (!isFetching && hasMore) {
      setOffset(prev => prev + BADGES_PAGE_LIMIT);
    }
  }, [isFetching, hasMore]);

  const createUserBadgeObject = useCallback((userBadge: UserBadge) => {
    return {
      id: { value: userBadge.id || "", disabled: false, rowId: userBadge.id },
      imageUrl: { value: userBadge.imageUrl || "", disabled: false, rowId: userBadge.id },
      name: { value: userBadge.name || "", disabled: false, rowId: userBadge.id },
      description: { value: userBadge.description || "", disabled: false, rowId: userBadge.id },
      category: {
        value: BadgeCategory[userBadge.category as keyof typeof BadgeCategory] || "",
        disabled: false,
        rowId: userBadge.id,
      },
      roles: { value: userBadge.roles || "", disabled: false, rowId: userBadge.id },
      updatedAt: {
        value: formatDate(userBadge.updatedAt) || "",
        disabled: false,
        rowId: userBadge.id,
      },
      status: {
        value: userBadge.status || "",
        disabled: false,
        rowId: userBadge.id,
      },
      visibilityType: {
        value: userBadge.visibilityType || "",
        disabled: false,
        rowId: userBadge.id,
      },
    };
  }, []);

  const handleBadgeTypeSelect = useCallback((badgeType: string) => {
    setSelectedBadgeType(badgeType as Badge);
    setIsCreateUserBadgePopupOpen(false);
    setIsBadgeSidePanelOpen(true);
  }, []);

  const handleBadgeSidePanelClose = useCallback(() => {
    setIsBadgeSidePanelOpen(false);
    setSelectedBadgeType(null);
    setSelectedBadge(null);
  }, []);

  const handleBadgeEdit = useCallback(
    (rowIndex: number) => {
      if (rowIndex !== null && allBadges.length > 0) {
        const badge = allBadges[rowIndex];
        setSelectedBadge(badge);
        setSelectedBadgeType(badge.category as Badge);
        setIsBadgeSidePanelOpen(true);
      }
    },
    [allBadges],
  );

  const handleBadgeSidePanelSuccess = useCallback(() => {
    setAllBadges([]);
    setOffset(0);
    refetch();
    setIsBadgeSidePanelOpen(false);
    setSelectedBadgeType(null);
    setSelectedBadge(null);
  }, [refetch]);

  return (
    <div className="p-6">
      <h1 className="text-2xl h-14 text-typography-900 font-secondary">
        {en.userManagement.userBadges}
      </h1>
      <div className="pt-2 w-full flex justify-between items-center">
        <ListToolbar
          searchValue={searchQuery}
          onSearchChange={handleSearchChange}
          placeholder={en.common.search}
          className="w-2/3"
        />
        <Button variant={ButtonVariant.PRIMARY} onClick={() => setIsCreateUserBadgePopupOpen(true)}>
          <Add />
          {en.userManagement.createUserBadge}
        </Button>
      </div>
      <div className="pt-2 w-full" style={{ height: "calc(100vh - 200px)" }}>
        {isLoading && allBadges.length === 0 ? (
          <TableSkeleton />
        ) : (
          <NotionTable
            tableData={{
              data: allBadges.map(createUserBadgeObject),
              columns: USER_BADGES_TABLE_COLUMNS,
            }}
            tableStyle={{
              height: "100%",
            }}
            tableFooter={
              isFetching && allBadges.length > 0 ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" />
                </div>
              ) : null
            }
            onRowClick={handleBadgeEdit}
            infiniteScroll={{
              onLoadMore: handleLoadMore,
              isLoading: isFetching,
              hasMore,
            }}
            editIndex={2}
          />
        )}
      </div>
      <CreateBadgePopup
        onSelect={handleBadgeTypeSelect}
        isOpen={isCreateUserBadgePopupOpen}
        onClose={() => setIsCreateUserBadgePopupOpen(false)}
      />
      <CreateBadgeSidePanel
        selectedBadgeType={selectedBadgeType}
        selectedBadge={selectedBadge}
        isOpen={isBadgeSidePanelOpen}
        onClose={handleBadgeSidePanelClose}
        onSuccess={handleBadgeSidePanelSuccess}
      />
    </div>
  );
};
