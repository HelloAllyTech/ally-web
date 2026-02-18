import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useGetUserBadgesQuery } from "@src/api/userBadges";
import { Trash } from "@src/assets";
import {
  ActionConfirmationPopup,
  CreateBadgePopup,
  CreateBadgeSidePanel,
  EmptyState,
  FilterDropdown,
  ListToolbar,
  NotionTable,
} from "@src/components";
import { Badge } from "@src/components/create-badge-popup/CreateBadgePopup";
import { ButtonVariant } from "@src/components/types";
import { en, USER_BADGES_TABLE_COLUMNS } from "@src/constants";
import { useDebounce } from "@src/hooks";
import TableSkeleton from "@src/pages/UserBadges/TableSkeleton";
import { BadgeCategory, UserBadge, UserBadgeFilters } from "@src/types";
import { formatDate } from "@src/utils";

const SEARCH_DEBOUNCE_MS = 300;
const BADGES_PAGE_LIMIT = 10;

export const UserBadges = () => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [isCreateUserBadgePopupOpen, setIsCreateUserBadgePopupOpen] = useState<boolean>(false);
  const [isBadgeSidePanelOpen, setIsBadgeSidePanelOpen] = useState<boolean>(false);
  const [selectedBadgeType, setSelectedBadgeType] = useState<Badge | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<UserBadge | null>(null);
  const [selectedBadges, setSelectedBadges] = useState<UserBadge[]>([]);
  const [filters, setFilters] = useState<UserBadgeFilters>({
    category: [],
    status: [],
  });
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
  const addFilterBtnRef = useRef<HTMLButtonElement>(null);
  const [showDeleteBadgesConfirmation, setShowDeleteBadgesConfirmation] = useState<boolean>(false);

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

  const listToolbarAction = useMemo(() => {
    return selectedBadges.length > 0
      ? {
          label: en.common.delete,
          variant: ButtonVariant.SECONDARY,
          icon: (
            <div className="w-3 h-3">
              <Trash />
            </div>
          ),
          onClick: () => setShowDeleteBadgesConfirmation(true),
        }
      : {
          label: en.badge.createBadge,
          variant: ButtonVariant.PRIMARY,
          onClick: () => setIsCreateUserBadgePopupOpen(true),
        };
  }, [selectedBadges]);

  const {
    data: userBadges,
    isLoading,
    isFetching,
  } = useGetUserBadgesQuery({
    search: debouncedSearch || undefined,
    category: filters.category.length > 0 ? filters.category : undefined,
    status: filters.status.length > 0 ? filters.status : undefined,
    limit: BADGES_PAGE_LIMIT,
    offset,
  });

  const hasMore = userBadges?.data?.length === BADGES_PAGE_LIMIT;

  useEffect(() => {
    if (userBadges?.data) {
      if (offset === 0) {
        setAllBadges(userBadges.data);
      } else {
        const existingIds = new Set(allBadges.map(b => b.id));
        const newData = userBadges.data.filter(b => !existingIds.has(b.id));
        setAllBadges(prev => [...prev, ...newData]);
      }
    }
  }, [userBadges?.data, offset, isBadgeSidePanelOpen]);

  const handleSelectionChange = useCallback((markedRows: any[]) => {
    setSelectedBadges(markedRows);
  }, []);

  const handleCancelDeleteBadges = useCallback(() => {
    setShowDeleteBadgesConfirmation(false);
  }, []);

  const handleConfirmDeleteBadges = useCallback(() => {
    setShowDeleteBadgesConfirmation(false);
    setSelectedBadges([]);
    // setOffset(0);
    // setAllBadges([]);
  }, []);

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

  const handleApplyFilters = (newFilters: UserBadgeFilters) => {
    setFilters(newFilters);
    setOffset(0);
    setIsFilterOpen(false);
    setAllBadges([]);
  };

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

  const filterChips = useMemo(() => {
    const chips: any[] = [];

    if (filters.category.length > 0) {
      chips.push({
        label: "Category",
        value: filters.category.map(c => BadgeCategory[c as keyof typeof BadgeCategory]).join(", "),
        allValue: filters.category,
        onClear: () => {
          setFilters(prev => ({ ...prev, category: [] }));
          setOffset(0);
          setAllBadges([]);
        },
      });
    }

    if (filters.status.length > 0) {
      chips.push({
        label: "Status",
        value: filters.status.join(", "),
        allValue: filters.status,
        onClear: () => {
          setFilters(prev => ({ ...prev, status: [] }));
          setOffset(0);
          setAllBadges([]);
        },
      });
    }

    return chips;
  }, [filters]);

  const addFilterCta = useMemo(
    () => ({
      label: "Filter",
      onClick: () => setIsFilterOpen(prev => !prev),
      active: isFilterOpen,
    }),
    [isFilterOpen],
  );

  const handleBadgeSidePanelSuccess = useCallback(() => {
    setAllBadges([]);
    setOffset(0);
    setIsBadgeSidePanelOpen(false);
    setSelectedBadgeType(null);
    setSelectedBadge(null);
  }, []);

  const categoryOptions = useMemo(() => {
    const options: { label: string; value: string }[] = [];
    for (const category of Object.keys(BadgeCategory)) {
      options.push({
        label: BadgeCategory[category as keyof typeof BadgeCategory],
        value: category,
      });
    }
    return options;
  }, []);

  const statusOptions = useMemo(() => {
    return Object.values(["ACTIVE", "DRAFT"]).map(s => ({ label: s, value: s }));
  }, []);

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
          className="w-full"
          filterChips={filterChips}
          action={listToolbarAction}
          addFilterCta={addFilterCta}
          addFilterButtonRef={addFilterBtnRef}
        />
        <FilterDropdown<UserBadgeFilters>
          isOpen={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          currentFilters={filters}
          onApplyFilters={handleApplyFilters}
          anchorRect={addFilterBtnRef.current?.getBoundingClientRect() ?? null}
          sections={[
            {
              id: "category",
              label: "Category",
              options: categoryOptions,
            },
            {
              id: "status",
              label: "Status",
              options: statusOptions,
            },
          ]}
        />
      </div>
      <div className="pt-2 w-full" style={{ height: "calc(100vh - 200px)" }}>
        {(isLoading || isFetching) && allBadges.length === 0 ? (
          <TableSkeleton />
        ) : !isFetching && allBadges.length === 0 ? (
          <EmptyState
            title={
              debouncedSearch
                ? en.userManagement.noSearchResults
                : filters.category.length > 0 || filters.status.length > 0
                  ? en.userManagement.noFilterResults
                  : en.userManagement.noBadgesFound
            }
            subtitle={
              !debouncedSearch && filters.category.length === 0 && filters.status.length === 0
                ? en.userManagement.noBadgesSubtitle
                : undefined
            }
            actionLabel={
              !debouncedSearch && filters.category.length === 0 && filters.status.length === 0
                ? en.userManagement.createUserBadge
                : undefined
            }
            onAction={() => setIsCreateUserBadgePopupOpen(true)}
          />
        ) : (
          <NotionTable
            hasResizer={false}
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
            onSelectionChange={handleSelectionChange}
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
      <ActionConfirmationPopup
        isOpen={showDeleteBadgesConfirmation}
        onClose={handleCancelDeleteBadges}
        title={
          selectedBadges.length > 1
            ? en.badge.deleteBadgesConfirmation
            : en.badge.deleteBadgeConfirmation
        }
        titleItalic={
          selectedBadges.length > 1
            ? en.badge.deleteBadgesConfirmationTitleItalic
            : en.badge.deleteBadgeConfirmationTitleItalic
        }
        description={en.badge.deleteBadgeConfirmationDescription}
        primaryButton={{
          label: en.badge.deleteBadge,
          onClick: handleConfirmDeleteBadges,
        }}
        secondaryButton={{
          label: en.common.cancel,
          onClick: handleCancelDeleteBadges,
        }}
      />
    </div>
  );
};
