import { useEffect, useState, FC } from "react";

import { CustomImage } from "@ally-ui-mono/ui-shared";
import { useGetScenarioPathsQuery } from "@api";
import { BookWhite } from "@assets";
import { ListToolbar, EmptyState, ToggleSwitch } from "@components";
import { en } from "@constants";
import { AccessFilterValue, ScenarioPath, SimulationStatus } from "@types";
import { isNonEmptyArray, toAssignmentStatus } from "@utils";

import { AccessFilter } from "./AccessFilter";

const PATHS_PAGE_SIZE = 30;

interface PathTabProps {
  organizationId?: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onToggleAccess: (pathId: number, enabled: boolean) => Promise<void>;
}

export const PathTab: FC<PathTabProps> = ({
  organizationId,
  searchValue,
  onSearchChange,
  onToggleAccess,
}) => {
  const [pathsOffset, setPathsOffset] = useState(0);
  const [paths, setPaths] = useState<ScenarioPath[]>([]);
  const [accessFilter, setAccessFilter] = useState<AccessFilterValue>(AccessFilterValue.ALL);

  const handleToggleAccess = async (pathId: number, enabled: boolean) => {
    setPaths(prev =>
      prev.map(path => (path.id === pathId ? { ...path, isAssignedToTenant: enabled } : path)),
    );
    try {
      await onToggleAccess(pathId, enabled);
      const matchesFilter =
        accessFilter === AccessFilterValue.ALL ||
        (accessFilter === AccessFilterValue.ENABLED) === enabled;
      if (!matchesFilter) {
        setPaths(prev => prev.filter(path => path.id !== pathId));
      }
    } catch {
      setPaths(prev =>
        prev.map(path => (path.id === pathId ? { ...path, isAssignedToTenant: !enabled } : path)),
      );
    }
  };

  const pathParams = {
    limit: PATHS_PAGE_SIZE,
    offset: pathsOffset,
    search: searchValue,
    tenantId: organizationId,
    status: SimulationStatus.ACTIVE,
    assignmentStatus: toAssignmentStatus(accessFilter),
  };

  const {
    data: pathsResponse,
    isFetching: isPathsFetching,
    isLoading: isPathsLoading,
  } = useGetScenarioPathsQuery(pathParams);

  useEffect(() => {
    if (!pathsResponse) return;
    if (pathsOffset === 0) {
      setPaths(pathsResponse.data);
    } else {
      setPaths(prev => {
        const existingIds = new Set(prev.map(path => path.id));
        const newItems = pathsResponse.data.filter(path => !existingIds.has(path.id));
        return [...prev, ...newItems];
      });
    }
  }, [pathsResponse, pathsOffset]);

  useEffect(() => {
    setPathsOffset(0);
  }, [searchValue, accessFilter]);

  const loadMore = () => {
    setPathsOffset(prev => prev + PATHS_PAGE_SIZE);
  };

  const hasMore = pathsResponse?.data?.length === PATHS_PAGE_SIZE;

  if (isPathsLoading && pathsOffset === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="text-typography-600">{en.common.loading}</span>
      </div>
    );
  }

  const renderThumbnailOverlay = (pathway: ScenarioPath) => (
    <div className="absolute top-0 right-0 bottom-0 w-[40%] z-10 bg-[rgba(0,0,0,0.5)] text-xs gap-1 text-white text-center flex items-center flex-col justify-center">
      {pathway.totalScenarios}
      <BookWhite width={14} height={14} />
    </div>
  );

  const renderPathCard = (path: ScenarioPath) => {
    return (
      <div
        key={path.id}
        className="flex items-center gap-4 py-4 pr-4 border-b border-border-light hover:bg-background-secondary transition-colors h-[80px]"
      >
        {/* Path Image */}
        <div className="w-[64px] sm:w-[72px] md:w-[80px] lg:w-[96px] h-[56px] flex-shrink-0 rounded-lg overflow-hidden bg-neutral-100">
          <div className="w-full h-full relative rounded-lg overflow-hidden">
            <CustomImage
              src={path.coverImageUrl}
              alt={path.title}
              className="w-full h-full object-cover"
            />
            {renderThumbnailOverlay(path)}
          </div>
        </div>

        {/* Path Title and Description */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <h3 className="text-sm text-typography-900 mb-1 truncate">{path.title}</h3>
          <p className="text-sm text-typography-700 leading-relaxed line-clamp-2">
            {path.description}
          </p>
        </div>

        {/* Toggle and Status */}
        <div className="flex items-center gap-3 flex-shrink-0 min-w-[140px] justify-end mr-5">
          <ToggleSwitch
            enabled={path.isAssignedToTenant ?? false}
            onChange={enabled => handleToggleAccess(path.id, enabled)}
            label={`Toggle access for ${path.title}`}
          />
          <span
            className={`text-sm ${path.isAssignedToTenant ? "text-typography-900" : "text-typography-600"}`}
          >
            {path.isAssignedToTenant ? en.userManagement.enabled : en.userManagement.disabled}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 z-10 bg-white pb-2">
        <ListToolbar
          searchValue={searchValue}
          onSearchChange={onSearchChange}
          placeholder={en.common.search}
          filter={<AccessFilter value={accessFilter} onChange={setAccessFilter} />}
        />
      </div>
      {!isNonEmptyArray(paths) && isPathsLoading ? (
        <div className="flex items-center justify-center py-12">
          <span className="text-typography-600">{en.common.loading}</span>
        </div>
      ) : !isNonEmptyArray(paths) ? (
        <EmptyState title={en.simulation.noResultFound} subtitle={en.simulation.adjustFilter} />
      ) : (
        <div className="flex flex-col flex-1 overflow-y-auto pb-8 custom-scrollbar">
          <div className="grid grid-cols-12 text-base text-typography-800 border-b border-border-light sticky top-0 z-50 bg-white pb-1">
            <div className="col-span-11 text-typography-600 text-sm">{en.userManagement.path}</div>
            <div className="col-span-1 text-sm text-typography-600 pr-8">
              {en.userManagement.access}
            </div>
          </div>
          <div className="flex-1">
            {paths?.map(path => renderPathCard(path))}
            {hasMore && (
              <div className="flex justify-start mt-2 pb-4 mb-4">
                <button
                  onClick={loadMore}
                  disabled={isPathsFetching}
                  className="inline-flex font-primary items-center disabled:opacity-50 text-sm text-typography-700 font-medium py-1 px-1 hover:text-typography-900"
                >
                  + {isPathsFetching ? en.common.loading : en.common.loadMore}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
