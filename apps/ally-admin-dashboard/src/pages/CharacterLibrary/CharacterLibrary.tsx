import React, { useState, useMemo, useCallback, useEffect } from "react";

import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import {
  useGetCharactersQuery,
  useDeleteCharacterMutation,
  useUpdateCharacterMutation,
} from "@api";
import { Trash, WandStars } from "@assets";
import { NotionTable, ListToolbar, ActionConfirmationPopup, CharacterSidePanel } from "@components";
import { ButtonVariant } from "@components/types";
import {
  CHARACTER_LIBRARY_TABLE_COLUMNS,
  CHARACTER_LIBRARY_OWNER_COLUMNS,
  en,
  Permissions,
  ROUTES,
} from "@constants";
import { useUser } from "@hooks";
import { CharacterData } from "@types";

export const CharacterLibrary: React.FC = () => {
  const navigate = useNavigate();
  const limit = 30;

  // Two audiences share this page. A platform admin gets the full library and
  // full CRUD. A tenant admin gets only characters their own org created, and
  // may create but not change or remove one — so the inline-edit, select and
  // delete affordances are withheld rather than shown and then rejected by the
  // API. `edit`/`delete` are the discriminator because the backend grants a
  // tenant ADMIN view+create only.
  const { permissions } = useUser();
  const canEdit = Boolean(permissions?.includes(Permissions.EDIT_CHARACTER_LIBRARY));
  const canDelete = Boolean(permissions?.includes(Permissions.DELETE_CHARACTER_LIBRARY));

  const [offset, setOffset] = useState<number>(0);
  const [characters, setCharacters] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [characterSearch, setCharacterSearch] = useState<string>("");
  const [selectedCharacters, setSelectedCharacters] = useState<any[]>([]);
  const [showDeleteConfirmationPopup, setShowDeleteConfirmationPopup] = useState<boolean>(false);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState<boolean>(false);
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterData | null>(null);
  const [isNewCharacter, setIsNewCharacter] = useState<boolean>(false);

  // Fetch characters using RTK Query
  const { data: charactersData, isLoading } = useGetCharactersQuery({
    limit,
    offset,
    search: characterSearch,
  });

  // API mutations
  const [deleteCharacter] = useDeleteCharacterMutation();
  const [updateCharacter] = useUpdateCharacterMutation();

  // Update characters when data changes
  useEffect(() => {
    if (charactersData?.characters) {
      if (offset === 0) {
        setCharacters(charactersData?.characters);
      } else {
        // Avoid duplicates by filtering out characters that already exist
        setCharacters(prev => {
          const existingIds = new Set(prev.map(char => char.id));
          const newCharacters = charactersData?.characters?.filter(
            char => !existingIds.has(char.id),
          );
          return [...prev, ...newCharacters];
        });
      }
      setHasMore(charactersData?.characters?.length === limit);
    }
  }, [charactersData, offset, limit]);

  const onSearchChange = (value: string) => {
    setCharacterSearch(value);
    setOffset(0);
  };

  const handleNewCharacterClick = () => {
    const newCharacter: CharacterData = {
      id: `temp-${Date.now()}`,
      name: "",
      age: "",
      gender: "",
      profession: "",
      currentLocation: "",
      genderIdentity: "",
      sexualOrientation: "",
    };
    setSelectedCharacter(newCharacter);
    setIsNewCharacter(true);
    setIsSidePanelOpen(true);
  };

  const handleLoadMore = () => {
    if (isLoading || !hasMore) return;
    setOffset(prev => prev + limit);
  };

  const handleCharacterSelect = (rowIndex: number) => {
    if (rowIndex !== null && characters?.length > 0) {
      setSelectedCharacter(characters[rowIndex]);
      setIsNewCharacter(false);
      setIsSidePanelOpen(true);
    }
  };

  const handleSidePanelClose = () => {
    setIsSidePanelOpen(false);
    setSelectedCharacter(null);
    setIsNewCharacter(false);
  };

  const handleSaveCharacter = (character: CharacterData) => {
    if (isNewCharacter) {
      setCharacters(prev => [character, ...prev]);
      toast.success(en.simulation.characterCreatedSuccessfully);
    } else {
      // Update existing character
      const updatedCharacters = characters.map(char =>
        char.id === character.id ? character : char,
      );
      setCharacters(updatedCharacters);
      toast.success(en.simulation.characterUpdatedSuccessfully);
    }
  };

  const handleDeleteCharacter = async (characterId: string) => {
    try {
      await deleteCharacter({ scenarioCharacterIds: [characterId] }).unwrap();
      toast.success(en.simulation.characterDeletedSuccessfully);
      setIsSidePanelOpen(false);
      setCharacters(characters?.filter(char => char?.id !== characterId));
      setSelectedCharacter(null);
      // The character list will automatically refresh due to cache invalidation
    } catch {
      toast.error(en.simulation.failedToDeleteCharacter);
    }
  };

  const createCharacterObject = useCallback((character: any) => {
    return {
      id: { value: character.id || "", disabled: true, rowId: character.id },
      name: { value: character.name || "", disabled: true, rowId: character.id },
      age: { value: character.age || "", disabled: true, rowId: character.id },
      gender: { value: character.gender || "", disabled: true, rowId: character.id },
      profession: { value: character.profession || "", disabled: true, rowId: character.id },
      currentLocation: {
        value: character.currentLocation || "",
        disabled: true,
        rowId: character.id,
      },
      genderIdentity: {
        value: character.genderIdentity || "",
        disabled: true,
        rowId: character.id,
      },
      sexualOrientation: {
        value: character.sexualOrientation || "",
        disabled: true,
        rowId: character.id,
      },
      coverImageUrl: {
        value: character.coverImageUrl || "",
        disabled: true,
        rowId: character.id,
      },
      coverVideoUrl: {
        value: character.coverVideoUrl || "",
        disabled: true,
        rowId: character.id,
      },
      characterProfileText: {
        value: character.characterProfileText || "",
        disabled: true,
        rowId: character.id,
      },
      createdByName: {
        value: character.createdByName || "",
        disabled: true,
        rowId: character.id,
      },
      // Blank means Ally-owned rather than unknown — spell that out, since an
      // empty org cell would otherwise read as missing data.
      tenantName: {
        value: character.tenantName || en.simulation.allyOwnedCharacter,
        disabled: true,
        rowId: character.id,
      },
    };
  }, []);

  const tableData = useMemo(() => {
    return {
      data: characters?.map(character => createCharacterObject(character)),
      // "Created by" / "Organisation" only mean something when the list spans
      // orgs, so they ride along with the platform-admin view.
      columns: canEdit
        ? [...CHARACTER_LIBRARY_TABLE_COLUMNS, ...CHARACTER_LIBRARY_OWNER_COLUMNS]
        : CHARACTER_LIBRARY_TABLE_COLUMNS,
    };
  }, [characters, createCharacterObject, canEdit]);

  const tableFooter = (
    <button
      type="button"
      onClick={handleLoadMore}
      className="flex justify-start items-center py-4 text-typography-700 hover:text-typography-900 disabled:opacity-50 w-[200px]"
      disabled={isLoading || !hasMore}
    >
      <span>+</span>
      <span className="text-base ml-[5px] font-primary">
        {isLoading ? en.common.loading : hasMore ? en.common.loadMore : en.common.noMoreData}
      </span>
    </button>
  );

  const handleUpdateCharacterTable = async (action: {
    columnId?: string;
    value?: any;
    rowIndex?: number;
    rowId?: string;
  }) => {
    const { columnId, value, rowId } = action;
    const selectedCharacter = characters.find(char => char.id === rowId);

    if (value !== undefined && selectedCharacter && columnId) {
      // Prevent clearing mandatory fields
      if (
        ["name", "age", "gender", "profession", "currentLocation"].includes(columnId) &&
        (value === "" || value === null || value === undefined)
      ) {
        toast.error(
          `${columnId.charAt(0).toUpperCase() + columnId.slice(1).replace(/([A-Z])/g, " $1")} is required`,
        );
        return;
      }

      try {
        // Update the character with the new value
        const updatedCharacterData = { ...selectedCharacter, [columnId]: value };
        const { ...data } = updatedCharacterData;

        // Call the API to update the character
        await updateCharacter({ id: rowId!, data }).unwrap();

        toast.success(en.simulation.characterUpdatedSuccessfully);
      } catch {
        toast.error(en.simulation.failedToUpdateCharacter);
      }
    }
  };

  const handleSelectionChange = useCallback((markedRows: any[]) => {
    setSelectedCharacters(markedRows);
  }, []);

  const handleDeleteCharacters = async (characterIds: string[]) => {
    if (characterIds.length === 0) return;

    try {
      // Delete all selected characters
      await deleteCharacter({ scenarioCharacterIds: characterIds }).unwrap();

      setCharacters(characters?.filter(char => !characterIds.includes(char.id)));

      toast.success(
        `${en.common.successfullyDeleted} ${selectedCharacters.length} ${selectedCharacters.length > 1 ? en.common.characters : en.common.character}`,
      );
      setShowDeleteConfirmationPopup(false);
      setSelectedCharacters([]);
    } catch {
      toast.error(en.errors.failedToDeleteCharacter);
    }
  };

  const listToolbarAction = useMemo(() => {
    return canDelete && selectedCharacters.length > 0
      ? {
          label: en.common.delete,
          variant: ButtonVariant.SECONDARY,
          icon: (
            <div className="w-3 h-3">
              <Trash />
            </div>
          ),
          onClick: () => setShowDeleteConfirmationPopup(true),
        }
      : {
          label: en.simulation.createNewCharacter,
          variant: ButtonVariant.PRIMARY,
          onClick: handleNewCharacterClick,
        };
  }, [selectedCharacters, handleNewCharacterClick, canDelete]);

  const listToolbarSecondaryAction = useMemo(() => {
    if (canDelete && selectedCharacters.length > 0) return undefined;
    return {
      label: en.simulation.createWithInterviewAgent,
      variant: ButtonVariant.SECONDARY,
      icon: (
        <div className="w-3 h-3">
          <WandStars />
        </div>
      ),
      onClick: () => navigate(ROUTES.CHARACTER_LIBRARY_INTERVIEW),
    };
  }, [selectedCharacters, navigate, canDelete]);

  return (
    <div className="py-[2px] font-primary overflow-hidden relative">
      <div>
        <h1 className="text-2xl text-typography-900 pb-6 font-secondary">
          {en.simulation.characters}
        </h1>
        <ListToolbar
          searchValue={characterSearch}
          onSearchChange={onSearchChange}
          action={listToolbarAction}
          secondaryAction={listToolbarSecondaryAction}
        />
        <div className="flex flex-col gap-4 h-[calc(100vh-100px)] relative mt-[20px]">
          <NotionTable
            tableData={tableData}
            onRowChange={canEdit ? handleUpdateCharacterTable : undefined}
            onRowClick={handleCharacterSelect}
            tableFooter={tableFooter}
            onSelectionChange={canDelete ? handleSelectionChange : undefined}
            hideSelectionColumn={!canDelete}
          />
        </div>
        {showDeleteConfirmationPopup && (
          <ActionConfirmationPopup
            isOpen={showDeleteConfirmationPopup}
            onClose={() => setShowDeleteConfirmationPopup(false)}
            title={`${en.common.delete} ${selectedCharacters.length > 1 ? en.common.characters : en.common.character}`}
            description={`${en.common.areYouSureYouWantToDelete} ${selectedCharacters.length} ${selectedCharacters.length > 1 ? en.common.characters : en.common.character}?`}
            primaryButton={{
              label: en.common.delete,
              onClick: () =>
                handleDeleteCharacters(
                  selectedCharacters?.map(char => char.id?.value || char.id) || [],
                ),
              variant: ButtonVariant.DESTRUCTIVE,
            }}
            secondaryButton={{
              label: en.common.cancel,
              onClick: () => setShowDeleteConfirmationPopup(false),
              variant: ButtonVariant.SECONDARY,
            }}
          />
        )}
        <CharacterSidePanel
          selectedCharacter={selectedCharacter}
          isOpen={isSidePanelOpen}
          onClose={handleSidePanelClose}
          onDelete={canDelete ? handleDeleteCharacter : undefined}
          onSave={handleSaveCharacter}
          isNewCharacter={isNewCharacter}
          // Creating is always allowed here; only editing an existing one is not.
          readOnly={!canEdit && !isNewCharacter}
        />
      </div>
    </div>
  );
};
