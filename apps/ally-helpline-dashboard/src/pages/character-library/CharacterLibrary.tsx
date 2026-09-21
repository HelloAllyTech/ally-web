import React, { useCallback, useEffect, useMemo, useState } from "react";

import { useNavigate } from "react-router-dom";

import { Button, GenericTable } from "@ally-ui-mono/ui-shared";
import { useGetCharactersQuery } from "@api";
import { CloseIcon, NoResults, SearchIcon, WandStars } from "@assets";
import { FallbackUI, Input } from "@components";
import { CharacterFormPanel } from "@components/character-library";
import { characterLibraryStrings as strings, ROUTES } from "@constants";
import { useCanViewCharacterLibrary, useDebounce } from "@hooks";
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
  // Starts false, not true: `true` put a "Load more" affordance under the
  // table before the first page had even arrived.
  const [hasMore, setHasMore] = useState(false);
  // `searchInput` is what the admin sees; `search` is what we actually query
  // with, 300ms behind it — the house pattern from OrgAccessList. Querying on
  // every keystroke fired a request per character typed.
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  // A row a tenant admin already built, opened read-only — the ADMIN group
  // has no edit grant on scenario-character, so this is view-only, but
  // without it there was no way at all to see a character again once its
  // create form closed.
  const [viewingCharacter, setViewingCharacter] = useState<CharacterData | null>(null);

  const { data, isLoading, isFetching, isError, refetch } = useGetCharactersQuery(
    { limit: PAGE_LIMIT, offset, search },
    { skip: !canView },
  );

  const applySearch = useCallback((value: string) => {
    setSearch(value);
    setOffset(0);
  }, []);
  const debouncedSearch = useDebounce(applySearch, 300);

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
    setSearchInput(value);
    debouncedSearch(value);
  };

  const clearSearch = () => {
    setSearchInput("");
    applySearch("");
  };

  const handleLoadMore = () => {
    if (isFetching || !hasMore) return;
    setOffset(prev => prev + PAGE_LIMIT);
  };

  const columns = useMemo(
    () =>
      COLUMNS.map(column => ({
        ...column,
        // An em dash for anything blank — `?? "—"` alone let an empty string
        // through, so an unfilled profession rendered as an empty cell that
        // read as a layout bug rather than as "not set".
        render: (value: any) => {
          const text = value === null || value === undefined ? "" : String(value);
          return text.trim() === "" ? "—" : text;
        },
      })),
    [],
  );

  /**
   * The table body's fallback has to distinguish four situations that all
   * used to render the same "No characters yet" empty state: still loading,
   * the fetch failed, the search matched nothing, and a genuinely empty
   * library. Telling an admin their library is empty while we're still
   * reading it — or because the request 500'd — is simply wrong.
   */
  const renderFallbackUI = () => {
    // icon/mainMessage/description go unused while isLoading (FallbackUI
    // renders only the spinner then), but the shared type requires them.
    if (isLoading) {
      return <FallbackUI isLoading icon={null} mainMessage="" description="" className="py-20" />;
    }

    if (isError) {
      return (
        <FallbackUI
          icon={<NoResults />}
          mainMessage={strings.errorTitle}
          description={strings.errorDescription}
          button={{ text: strings.retry, onClick: () => void refetch() }}
          className="py-16"
        />
      );
    }

    if (search.trim() !== "") {
      return (
        <FallbackUI
          icon={<NoResults />}
          mainMessage={strings.noResultsTitle}
          description={strings.noResultsDescription}
          button={{ text: strings.clearSearch, onClick: clearSearch }}
          className="py-16"
        />
      );
    }

    // A first character is 7 required fields away by hand, so the empty
    // state leads with the interview agent — the low-friction path — and
    // keeps a single obvious next action rather than none at all.
    return (
      <FallbackUI
        icon={<NoResults />}
        mainMessage={strings.emptyStateTitle}
        description={strings.emptyStateDescription}
        button={{
          text: strings.createWithInterviewAgent,
          onClick: () => navigate(ROUTES.CHARACTER_LIBRARY_INTERVIEW),
        }}
        className="py-16"
      />
    );
  };

  if (isAccessLoading) return null;
  if (!canView) return <AccessDenied />;

  return (
    <div className="p-8 font-primary">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6">
        <h1 className="text-2xl text-typography-900 font-secondary">{strings.characters}</h1>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full max-w-xs sm:w-64">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-typography-500">
              <SearchIcon />
            </span>
            <Input
              value={searchInput}
              onChange={e => onSearchChange(e.target.value)}
              placeholder={strings.searchPlaceholder}
              aria-label={strings.searchLabel}
              className="pl-9 pr-9"
            />
            {searchInput !== "" && (
              <button
                type="button"
                onClick={clearSearch}
                aria-label={strings.clearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-typography-500 hover:bg-surface-100 hover:text-typography-800"
              >
                <CloseIcon width={12} height={12} />
              </button>
            )}
          </div>
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
        // isFetching, not isLoading: the spinner beside "Load more" is there
        // to acknowledge the pagination click, and isLoading is false by then.
        isLoading={isFetching}
        handleLoadMore={characters.length > 0 && hasMore ? handleLoadMore : undefined}
        loadMoreLabel={strings.loadMore}
        fallbackUI={renderFallbackUI()}
        onRowClick={(character: CharacterData) => setViewingCharacter(character)}
      />

      <CharacterFormPanel
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={character => {
          setCharacters(prev => [character, ...prev]);
        }}
      />

      <CharacterFormPanel
        isOpen={!!viewingCharacter}
        onClose={() => setViewingCharacter(null)}
        onSave={() => setViewingCharacter(null)}
        initialCharacter={viewingCharacter}
        readOnly
      />
    </div>
  );
};
