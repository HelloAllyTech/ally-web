import { useCallback, useState } from "react";

import { useGetUserBadgesQuery } from "@src/api/userBadges";
import { Add } from "@src/assets";
import { Button, CreateBadgePopup, ListToolbar, NotionTable } from "@src/components";
import { ButtonVariant } from "@src/components/types";
import { en, USER_BADGES_TABLE_COLUMNS } from "@src/constants";
import TableSkeleton from "@src/pages/UserBadges/TableSkeleton";
import { BadgeCategory, UserBadge } from "@src/types";
import { formatDate } from "@src/utils";

export const UserBadges = () => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isCreateUserBadgePopupOpen, setIsCreateUserBadgePopupOpen] = useState<boolean>(false);

  const { data: userBadges, isLoading } = useGetUserBadgesQuery();

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
      code: {
        value: userBadge.code || "",
        disabled: false,
        rowId: userBadge.id,
      },
    };
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl h-14 text-typography-900 font-secondary">
        {en.userManagement.userBadges}
      </h1>
      <div className="pt-2 w-full flex justify-between items-center">
        <ListToolbar
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          placeholder={en.common.search}
          className="w-2/3"
        />
        <Button variant={ButtonVariant.PRIMARY} onClick={() => setIsCreateUserBadgePopupOpen(true)}>
          <Add />
          {en.userManagement.createUserBadge}
        </Button>
      </div>
      <div className="pt-2 w-full" style={{ height: "calc(100vh - 200px)" }}>
        {isLoading ? (
          <TableSkeleton />
        ) : (
          <NotionTable
            tableData={{
              data: userBadges?.data?.map(createUserBadgeObject) ?? [],
              columns: USER_BADGES_TABLE_COLUMNS,
            }}
            tableStyle={{
              height: "100%",
            }}
          />
        )}
      </div>
      <CreateBadgePopup
        onSelect={() => {}}
        isOpen={isCreateUserBadgePopupOpen}
        onClose={() => setIsCreateUserBadgePopupOpen(false)}
      />
    </div>
  );
};
