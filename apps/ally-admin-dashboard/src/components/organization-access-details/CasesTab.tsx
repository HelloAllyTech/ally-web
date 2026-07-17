import { useEffect, useState, FC } from "react";

import { CustomImage } from "@ally-ui-mono/ui-shared";
import { useGetScenarioCasesQuery } from "@api";
import { BookWhite } from "@assets";
import { ListToolbar, EmptyState, ToggleSwitch } from "@components";
import { en } from "@constants";
import { AccessFilterValue, ScenarioPath, SimulationStatus } from "@types";
import { isNonEmptyArray, toAssignmentStatus } from "@utils";

import { AccessFilter } from "./AccessFilter";

const CASES_PAGE_SIZE = 30;

interface CasesTabProps {
  organizationId?: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onToggleAccess: (caseId: number, enabled: boolean) => Promise<void>;
}

export const CasesTab: FC<CasesTabProps> = ({
  organizationId,
  searchValue,
  onSearchChange,
  onToggleAccess,
}) => {
  const [casesOffset, setCasesOffset] = useState(0);
  const [cases, setCases] = useState<ScenarioPath[]>([]);
  const [accessFilter, setAccessFilter] = useState<AccessFilterValue>(AccessFilterValue.ALL);

  const handleToggleAccess = async (caseId: number, enabled: boolean) => {
    setCases(prev =>
      prev.map(caseItem =>
        caseItem.id === caseId ? { ...caseItem, isAssignedToTenant: enabled } : caseItem,
      ),
    );
    try {
      await onToggleAccess(caseId, enabled);
      const matchesFilter =
        accessFilter === AccessFilterValue.ALL ||
        (accessFilter === AccessFilterValue.ENABLED) === enabled;
      if (!matchesFilter) {
        setCases(prev => prev.filter(caseItem => caseItem.id !== caseId));
      }
    } catch {
      setCases(prev =>
        prev.map(caseItem =>
          caseItem.id === caseId ? { ...caseItem, isAssignedToTenant: !enabled } : caseItem,
        ),
      );
    }
  };

  const caseParams = {
    limit: CASES_PAGE_SIZE,
    offset: casesOffset,
    search: searchValue,
    tenantId: organizationId,
    status: SimulationStatus.ACTIVE,
    assignmentStatus: toAssignmentStatus(accessFilter),
  };

  const {
    data: casesResponse,
    isFetching: isCasesFetching,
    isLoading: isCasesLoading,
  } = useGetScenarioCasesQuery(caseParams);

  useEffect(() => {
    if (!casesResponse) return;
    if (casesOffset === 0) {
      setCases(casesResponse.data);
    } else {
      setCases(prev => {
        const existingIds = new Set(prev.map(caseItem => caseItem.id));
        const newItems = casesResponse.data.filter(caseItem => !existingIds.has(caseItem.id));
        return [...prev, ...newItems];
      });
    }
  }, [casesResponse, casesOffset]);

  useEffect(() => {
    setCasesOffset(0);
  }, [searchValue, accessFilter]);

  const loadMore = () => {
    setCasesOffset(prev => prev + CASES_PAGE_SIZE);
  };

  const hasMore = casesResponse?.data?.length === CASES_PAGE_SIZE;

  if (isCasesLoading && casesOffset === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="text-typography-600">{en.common.loading}</span>
      </div>
    );
  }

  const renderThumbnailOverlay = (caseItem: ScenarioPath) => (
    <div className="absolute top-0 right-0 bottom-0 w-[40%] z-10 bg-[rgba(0,0,0,0.5)] text-xs gap-1 text-white text-center flex items-center flex-col justify-center">
      {caseItem.totalScenarios}
      <BookWhite width={14} height={14} />
    </div>
  );

  const renderCaseCard = (caseItem: ScenarioPath) => {
    return (
      <div
        key={caseItem.id}
        className="flex items-center gap-4 py-4 pr-4 border-b border-border-light hover:bg-background-secondary transition-colors h-[80px]"
      >
        {/* Case Image */}
        <div className="w-[64px] sm:w-[72px] md:w-[80px] lg:w-[96px] h-[56px] flex-shrink-0 rounded-lg overflow-hidden bg-neutral-100">
          <div className="w-full h-full relative rounded-lg overflow-hidden">
            <CustomImage
              src={caseItem.coverImageUrl}
              alt={caseItem.title}
              className="w-full h-full object-cover"
            />
            {renderThumbnailOverlay(caseItem)}
          </div>
        </div>

        {/* Case Title and Description */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <h3 className="text-sm text-typography-900 mb-1 truncate">{caseItem.title}</h3>
          <p className="text-sm text-typography-700 leading-relaxed line-clamp-2">
            {caseItem.description}
          </p>
        </div>

        {/* Toggle and Status */}
        <div className="flex items-center gap-3 flex-shrink-0 min-w-[140px] justify-end mr-5">
          <ToggleSwitch
            enabled={caseItem.isAssignedToTenant ?? false}
            onChange={enabled => handleToggleAccess(caseItem.id, enabled)}
            label={`Toggle access for ${caseItem.title}`}
          />
          <span
            className={`text-sm ${caseItem.isAssignedToTenant ? "text-typography-900" : "text-typography-600"}`}
          >
            {caseItem.isAssignedToTenant ? en.userManagement.enabled : en.userManagement.disabled}
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
      {!isNonEmptyArray(cases) && isCasesLoading ? (
        <div className="flex items-center justify-center py-12">
          <span className="text-typography-600">{en.common.loading}</span>
        </div>
      ) : !isNonEmptyArray(cases) ? (
        <EmptyState title={en.simulation.noResultFound} subtitle={en.simulation.adjustFilter} />
      ) : (
        <div className="flex flex-col flex-1 overflow-y-auto pb-8 custom-scrollbar">
          <div className="grid grid-cols-12 text-base text-typography-800 border-b border-border-light sticky top-0 z-50 bg-white pb-1">
            <div className="col-span-11 text-typography-600 text-sm">{en.userManagement.cases}</div>
            <div className="col-span-1 text-sm text-typography-600 pr-8">
              {en.userManagement.access}
            </div>
          </div>
          <div className="flex-1">
            {cases?.map(caseItem => renderCaseCard(caseItem))}
            {hasMore && (
              <div className="flex justify-start mt-2 pb-4 mb-4">
                <button
                  onClick={loadMore}
                  disabled={isCasesFetching}
                  className="inline-flex font-primary items-center disabled:opacity-50 text-sm text-typography-700 font-medium py-1 px-1 hover:text-typography-900"
                >
                  + {isCasesFetching ? en.common.loading : en.common.loadMore}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
