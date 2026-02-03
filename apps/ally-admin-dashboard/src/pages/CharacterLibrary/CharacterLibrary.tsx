import React, { useState, useMemo, useCallback, useEffect } from "react";

import { toast } from "sonner";

import { useGetCharactersQuery } from "@api";
import { Trash } from "@assets";
import {
  NotionTable,
  ListToolbar,
  ActionConfirmationPopup,
  CharacterSidePanel,
  CharacterData,
} from "@components";
import { ButtonVariant } from "@components/types";
import { CHARACTER_LIBRARY_TABLE_COLUMNS, en } from "@constants";

export const CharacterLibrary: React.FC = () => {
  const limit = 30;

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
    searchName: characterSearch,
  });

  // Update characters when data changes
  useEffect(() => {
    if (charactersData) {
      if (offset === 0) {
        setCharacters(charactersData);
      } else {
        setCharacters(prev => [...prev, ...charactersData]);
      }
      setHasMore(charactersData.length === limit);
    }
  }, [charactersData, offset]);

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
      // Create new character
      const newCharacter = {
        ...character,
        id: `${characters.length + 1}`,
      };
      setCharacters(prev => [newCharacter, ...prev]);
      toast.success("Character created successfully!");
    } else {
      // Update existing character
      const updatedCharacters = characters.map(char =>
        char.id === character.id ? character : char,
      );
      setCharacters(updatedCharacters);
      toast.success("Character updated successfully!");
    }
  };

  const handleDeleteCharacter = (characterId: string) => {
    const updatedCharacters = characters.filter(char => char.id !== characterId);
    setCharacters(updatedCharacters);
    toast.success("Character deleted successfully!");
    setIsSidePanelOpen(false);
    setSelectedCharacter(null);
  };

  const createCharacterObject = useCallback((character: any) => {
    return {
      id: { value: character.id || "", disabled: false, rowId: character.id },
      name: { value: character.name || "", disabled: false, rowId: character.id },
      age: { value: character.age || "", disabled: false, rowId: character.id },
      gender: { value: character.gender || "", disabled: false, rowId: character.id },
      profession: { value: character.profession || "", disabled: false, rowId: character.id },
      currentLocation: {
        value: character.currentLocation || "",
        disabled: false,
        rowId: character.id,
      },
      genderIdentity: {
        value: character.genderIdentity || "",
        disabled: false,
        rowId: character.id,
      },
      sexualOrientation: {
        value: character.sexualOrientation || "",
        disabled: false,
        rowId: character.id,
      },
    };
  }, []);

  const tableData = useMemo(() => {
    return {
      data: characters?.map(character => createCharacterObject(character)),
      columns: CHARACTER_LIBRARY_TABLE_COLUMNS,
    };
  }, [characters, createCharacterObject]);

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
    if (value !== undefined && selectedCharacter) {
      const updatedCharacter = { ...selectedCharacter, [columnId]: value };
      const updatedCharacters = characters.map(char =>
        char.id === rowId ? updatedCharacter : char,
      );
      setCharacters(updatedCharacters);
      toast.success(en.simulation.characterUpdatedSuccessfully);
    }
  };

  const handleSelectionChange = useCallback((markedRows: any[]) => {
    setSelectedCharacters(markedRows);
  }, []);

  const handleDeleteCharacters = async (characterIds: string[]) => {
    if (characterIds.length === 0) return;

    try {
      const updatedCharacters = characters.filter(char => !characterIds.includes(char.id));
      setCharacters(updatedCharacters);
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
    return selectedCharacters.length > 0
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
  }, [selectedCharacters, handleNewCharacterClick]);

  return (
    <div className="py-[2px] font-primary overflow-hidden relative">
      <div>
        <h1 className="text-2xl text-typography-900 pb-6 font-secondary">
          {en.simulation.characterLibrary}
        </h1>
        <ListToolbar
          searchValue={characterSearch}
          onSearchChange={onSearchChange}
          action={listToolbarAction}
        />
        <div className="flex flex-col gap-4 h-[calc(100vh-100px)] relative mt-[20px]">
          <NotionTable
            tableData={tableData}
            onRowChange={handleUpdateCharacterTable}
            onRowClick={handleCharacterSelect}
            tableFooter={tableFooter}
            onSelectionChange={handleSelectionChange}
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
          onDelete={handleDeleteCharacter}
          onSave={handleSaveCharacter}
          isNewCharacter={isNewCharacter}
        />
      </div>
    </div>
  );
};
