import React, { useEffect, useMemo, useState } from "react";

import { useNavigate } from "react-router-dom";

import { Button, GenericTable } from "@ally-ui-mono/ui-shared";
import { useGetCharactersQuery } from "@api";
import { WandStars } from "@assets";
import { CharacterFormPanel } from "@components/character-library";
import { characterLibraryStrings as strings, ROUTES } from "@constants";
import { useCanViewCharacterLibrary } from "@hooks";
import { CharacterData } from "@types";

// Import AccessDenied from its leaf module (not the @pages barrel) so this
// page can live in the barrel without a self-referential import cycle —
// mirrors OrganizationSettings.tsx's own note on the same pattern.
import { AccessDenied } from "../access-denied/AccessDenied";

const PAGE_LIMIT = 30;

const COLUMNS = [
  { key: "name", header: "Name" },
  { key: "age", header: "Age" },
  { key: "gender", header: "Gender" },
  { key: "profession", header: "Profession" },
  { key: "currentLocation", header: "Current location" },
];

/**
 * Own-tenant, view+create Character Library for tenant ADMINs — the consumer
 * -app counterpart to ally-admin-dashboard's Character Library, which plain
 * tenant ADMIN accounts can never reach (its login excludes that role; see
 * the migration/route comments in ally-be and ally-admin-dashboard). No
 * edit/delete here: the backend only grants ADMIN view+create.
 */
export const CharacterLibrary: React.FC = () => {
  const navigate = useNavigate();
  const { canView, isLoading: isAccessLoading } = useCanViewCharacterLibrary();

  const [offset, setOffset] = useState(0);
  const [characters, setCharacters] = useState<CharacterData[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);

  const { data, isLoading, isFetching } = useGetCharactersQuery(
    { limit: PAGE_LIMIT, offset, search },
    { skip: !canView },
  );

  useEffect(() => {
    if (!data?.characters) return;
    if (offset === 0) {
      setCharacters(data.characters);
    } else {
      setCharacters(prev => {
        const existingIds = new Set(prev.map(char => char.id));
        return [...prev, ...data.characters.filter(char => !existingIds.has(char.id))];
      });
    }
    setHasMore(data.characters.length === PAGE_LIMIT);
  }, [data, offset]);

  const onSearchChange = (value: string) => {
    setSearch(value);
    setOffset(0);
  };

  const handleLoadMore = () => {
    if (isFetching || !hasMore) return;
    setOffset(prev => prev + PAGE_LIMIT);
  };

  const columns = useMemo(
    () => COLUMNS.map(column => ({ ...column, render: (value: any) => String(value ?? "—") })),
    [],
  );

  if (isAccessLoading) return null;
  if (!canView) return <AccessDenied />;

  return (
    <div className="py-[2px] font-primary">
      <div className="flex items-center justify-between pb-6">
        <h1 className="text-2xl text-typography-900 font-secondary">{strings.characters}</h1>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Search characters"
            className="border border-border-light rounded-md px-3 py-2 text-sm"
          />
          <Button
            kind="tertiary"
            renderIcon={WandStars}
            onClick={() => navigate(ROUTES.CHARACTER_LIBRARY_INTERVIEW)}
          >
            {strings.createWithInterviewAgent}
          </Button>
          <Button kind="primary" onClick={() => setIsFormOpen(true)}>
            {strings.createNewCharacter}
          </Button>
        </div>
      </div>

      <GenericTable
        columns={columns}
        data={characters}
        isLoading={isLoading}
        handleLoadMore={hasMore ? handleLoadMore : undefined}
        fallbackUI={
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-base font-medium text-typography-900">{strings.emptyStateTitle}</p>
            <p className="text-sm text-typography-600 mt-1 max-w-sm">
              {strings.emptyStateDescription}
            </p>
          </div>
        }
      />

      <CharacterFormPanel
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={character => {
          setCharacters(prev => [character, ...prev]);
        }}
      />
    </div>
  );
};
