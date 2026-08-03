import { useEffect, useState, FC } from "react";

import { CustomImage } from "@ally-ui-mono/ui-shared";
import { useGetTracksQuery } from "@api";
import { BookWhite } from "@assets";
import { ListToolbar, EmptyState, ToggleSwitch } from "@components";
import { en } from "@constants";
import { AccessFilterValue, SimulationStatus, TrackListItem } from "@types";
import { isNonEmptyArray, toAssignmentStatus } from "@utils";

import { AccessFilter } from "./AccessFilter";

const COURSES_PAGE_SIZE = 30;

interface CoursesTabProps {
  organizationId?: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onToggleAccess: (trackId: string, enabled: boolean) => Promise<void>;
}

/**
 * Per-organization access for Track 2.0 courses. Only ACTIVE courses are
 * listed — a draft course is invisible to learners regardless of assignment,
 * so offering the toggle for one would be misleading.
 */
export const CoursesTab: FC<CoursesTabProps> = ({
  organizationId,
  searchValue,
  onSearchChange,
  onToggleAccess,
}) => {
  const [coursesOffset, setCoursesOffset] = useState(0);
  const [courses, setCourses] = useState<TrackListItem[]>([]);
  const [accessFilter, setAccessFilter] = useState<AccessFilterValue>(AccessFilterValue.ALL);

  const handleToggleAccess = async (trackId: string, enabled: boolean) => {
    setCourses(prev =>
      prev.map(course =>
        course.id === trackId ? { ...course, isAssignedToTenant: enabled } : course,
      ),
    );
    try {
      await onToggleAccess(trackId, enabled);
      const matchesFilter =
        accessFilter === AccessFilterValue.ALL ||
        (accessFilter === AccessFilterValue.ENABLED) === enabled;
      if (!matchesFilter) {
        setCourses(prev => prev.filter(course => course.id !== trackId));
      }
    } catch {
      setCourses(prev =>
        prev.map(course =>
          course.id === trackId ? { ...course, isAssignedToTenant: !enabled } : course,
        ),
      );
    }
  };

  const courseParams = {
    limit: COURSES_PAGE_SIZE,
    offset: coursesOffset,
    search: searchValue,
    tenantId: organizationId,
    status: SimulationStatus.ACTIVE,
    assignmentStatus: toAssignmentStatus(accessFilter),
  };

  const {
    data: coursesResponse,
    isFetching: isCoursesFetching,
    isLoading: isCoursesLoading,
  } = useGetTracksQuery(courseParams);

  useEffect(() => {
    if (!coursesResponse) return;
    if (coursesOffset === 0) {
      setCourses(coursesResponse.data);
    } else {
      setCourses(prev => {
        const existingIds = new Set(prev.map(course => course.id));
        const newItems = coursesResponse.data.filter(course => !existingIds.has(course.id));
        return [...prev, ...newItems];
      });
    }
  }, [coursesResponse, coursesOffset]);

  useEffect(() => {
    setCoursesOffset(0);
  }, [searchValue, accessFilter]);

  const loadMore = () => {
    setCoursesOffset(prev => prev + COURSES_PAGE_SIZE);
  };

  const hasMore = coursesResponse?.data?.length === COURSES_PAGE_SIZE;

  if (isCoursesLoading && coursesOffset === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="text-typography-600">{en.common.loading}</span>
      </div>
    );
  }

  const renderThumbnailOverlay = (course: TrackListItem) => (
    <div className="absolute top-0 right-0 bottom-0 w-[40%] z-10 bg-[rgba(0,0,0,0.5)] text-xs gap-1 text-white text-center flex items-center flex-col justify-center">
      {course.totalItems}
      <BookWhite width={14} height={14} />
    </div>
  );

  const renderCourseCard = (course: TrackListItem) => {
    return (
      <div
        key={course.id}
        className="flex items-center gap-4 py-4 pr-4 border-b border-border-light hover:bg-background-secondary transition-colors h-[80px]"
      >
        {/* Course Image */}
        <div className="w-[64px] sm:w-[72px] md:w-[80px] lg:w-[96px] h-[56px] flex-shrink-0 rounded-lg overflow-hidden bg-neutral-100">
          <div className="w-full h-full relative rounded-lg overflow-hidden">
            <CustomImage
              src={course.coverImageUrl}
              alt={course.title}
              className="w-full h-full object-cover"
            />
            {renderThumbnailOverlay(course)}
          </div>
        </div>

        {/* Course Title and Description */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm text-typography-900 truncate">{course.title}</h3>
            {course.isGlobal && (
              <span
                title={en.userManagement.globalCourseHint}
                className="flex-shrink-0 text-xs text-typography-600 border border-border-light rounded-full px-2 py-0.5"
              >
                {en.userManagement.global}
              </span>
            )}
          </div>
          <p className="text-sm text-typography-700 leading-relaxed line-clamp-2">
            {course.description}
          </p>
        </div>

        {/* Toggle and Status */}
        <div className="flex items-center gap-3 flex-shrink-0 min-w-[140px] justify-end mr-5">
          <ToggleSwitch
            enabled={course.isAssignedToTenant ?? false}
            onChange={enabled => handleToggleAccess(course.id, enabled)}
            label={en.userManagement.toggleAccess(course.title)}
          />
          <span
            className={`text-sm ${course.isAssignedToTenant ? "text-typography-900" : "text-typography-600"}`}
          >
            {course.isAssignedToTenant ? en.userManagement.enabled : en.userManagement.disabled}
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
      {!isNonEmptyArray(courses) && isCoursesLoading ? (
        <div className="flex items-center justify-center py-12">
          <span className="text-typography-600">{en.common.loading}</span>
        </div>
      ) : !isNonEmptyArray(courses) ? (
        <EmptyState title={en.simulation.noResultFound} subtitle={en.simulation.adjustFilter} />
      ) : (
        <div className="flex flex-col flex-1 overflow-y-auto pb-8 custom-scrollbar">
          <div className="grid grid-cols-12 text-base text-typography-800 border-b border-border-light sticky top-0 z-50 bg-white pb-1">
            <div className="col-span-11 text-typography-600 text-sm">
              {en.userManagement.courses}
            </div>
            <div className="col-span-1 text-sm text-typography-600 pr-8">
              {en.userManagement.access}
            </div>
          </div>
          <div className="flex-1">
            {courses?.map(course => renderCourseCard(course))}
            {hasMore && (
              <div className="flex justify-start mt-2 pb-4 mb-4">
                <button
                  onClick={loadMore}
                  disabled={isCoursesFetching}
                  className="inline-flex font-primary items-center disabled:opacity-50 text-sm text-typography-700 font-medium py-1 px-1 hover:text-typography-900"
                >
                  + {isCoursesFetching ? en.common.loading : en.common.loadMore}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
