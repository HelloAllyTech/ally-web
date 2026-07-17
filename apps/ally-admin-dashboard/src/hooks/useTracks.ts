import { useEffect, useState } from "react";

import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import {
  useDeleteTrackByIdMutation,
  useDuplicateTrackMutation,
  useGetTracksQuery,
  useUpdateTrackByIdMutation,
} from "@api";
import { ROUTES, TRACK_ENTITY_LABEL } from "@constants";
import { ScenarioPath, SimulationStatus, TrackListItem } from "@types";

const TRACKS_PAGE_SIZE = 30;

interface UseTracksProps {
  selectedFilters: Array<{ id: string; label: string }>;
  enabled?: boolean;
}

/**
 * Maps a Track 2.0 row onto the `ScenarioPath` shape `PathwayList` renders.
 * Track ids are uuid strings; `ScenarioPath.id` is typed number, but the list
 * and its action callbacks only pass the id through, so the cast is safe.
 */
const toPathwayListShape = (track: TrackListItem): ScenarioPath => ({
  id: track.id as unknown as number,
  title: track.title,
  description: track.description,
  coverImageUrl: track.coverImageUrl,
  status: track.status,
  isGlobal: track.isGlobal,
  totalScenarios: track.totalItems,
  updatedAt: track.updatedAt,
  isAssignedToTenant: track.isAssignedToTenant ?? false,
});

export const useTracks = ({ selectedFilters, enabled = true }: UseTracksProps) => {
  const navigate = useNavigate();

  const [isDeleteTrackPopupOpen, setIsDeleteTrackPopupOpen] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<ScenarioPath | null>(null);
  const [tracks, setTracks] = useState<ScenarioPath[]>([]);
  const [tracksOffset, setTracksOffset] = useState<number>(0);
  const [tracksLimit, setTracksLimit] = useState(TRACKS_PAGE_SIZE);
  const [hasMore, setHasMore] = useState(true);
  const [isUnpublishTrackPopupOpen, setIsUnpublishTrackPopupOpen] = useState(false);
  const [isDuplicateTrackPopupOpen, setIsDuplicateTrackPopupOpen] = useState(false);
  const [isTrackEditPopupOpen, setIsTrackEditPopupOpen] = useState(false);

  const [updateTrackById] = useUpdateTrackByIdMutation();
  const [deleteTrackById] = useDeleteTrackByIdMutation();
  const [duplicateTrack] = useDuplicateTrackMutation();

  const {
    data: tracksResponse,
    isFetching: isTracksFetching,
    isLoading: isTracksLoading,
  } = useGetTracksQuery(
    {
      status:
        selectedFilters.length > 0
          ? selectedFilters?.map(filter => filter.id)?.join(",")
          : undefined,
      offset: tracksOffset,
      limit: tracksLimit,
      search: "",
    },
    { skip: !enabled },
  );

  useEffect(() => {
    setTracksOffset(0);
  }, [selectedFilters]);

  useEffect(() => {
    if (!tracksResponse) return;
    const nextData = (tracksResponse.data ?? []).map(toPathwayListShape);
    setHasMore(nextData.length >= tracksLimit);
    if (tracksOffset === 0) {
      setTracks(nextData);
      setTracksLimit(TRACKS_PAGE_SIZE);
    } else {
      setTracks(previousTracks => {
        const existingIds = new Set(previousTracks.map(track => track.id));
        const newItems = nextData.filter(track => !existingIds.has(track.id));
        return [...previousTracks, ...newItems];
      });
    }
  }, [tracksResponse, tracksOffset, tracksLimit]);

  const loadTracks = (append = false) => {
    setTracksOffset(previousOffset => (append ? previousOffset + tracksLimit : 0));
  };

  const reLoadCurrentTracks = () => {
    setTracksOffset(0);
    setTracksLimit(tracksOffset + TRACKS_PAGE_SIZE);
  };

  const handleNewTrack = () => {
    navigate(ROUTES.CREATE_TRACK);
  };

  const handleEditTrack = (track: ScenarioPath) => {
    navigate(ROUTES.EDIT_TRACK(String(track.id)));
  };

  const onEditTrack = (track: ScenarioPath) => {
    if (track.status === SimulationStatus.DRAFT) {
      handleEditTrack(track);
      return;
    }
    setCurrentTrack(track);
    setIsTrackEditPopupOpen(true);
  };

  const handleDeleteTrack = (track: ScenarioPath) => {
    setCurrentTrack(track);
    setIsDeleteTrackPopupOpen(true);
  };

  const onDeleteTrack = async () => {
    if (!currentTrack) return;

    try {
      await deleteTrackById(String(currentTrack.id)).unwrap();
      setIsDeleteTrackPopupOpen(false);
      setCurrentTrack(null);
      toast.success(`${TRACK_ENTITY_LABEL} deleted successfully`);
    } catch (error: any) {
      toast.error(error?.data?.message || `Failed to delete ${TRACK_ENTITY_LABEL.toLowerCase()}`);
    }
  };

  const handleUnpublishTrack = (track: ScenarioPath) => {
    setCurrentTrack(track);
    setIsUnpublishTrackPopupOpen(true);
  };

  const handleChangeTrackStatus = async (status: SimulationStatus) => {
    if (!currentTrack) return;
    try {
      await updateTrackById({
        id: String(currentTrack.id),
        data: { status, title: currentTrack.title },
      }).unwrap();
      setIsUnpublishTrackPopupOpen(false);
      setCurrentTrack(null);
      toast.success(`${TRACK_ENTITY_LABEL} status updated to ${status}`);
    } catch (error: any) {
      toast.error(
        error?.data?.message || `Failed to change ${TRACK_ENTITY_LABEL.toLowerCase()} status`,
      );
    }
  };

  const handleDuplicateTrack = (track: ScenarioPath) => {
    setCurrentTrack(track);
    setIsDuplicateTrackPopupOpen(true);
  };

  const onDuplicateTrack = async (track: ScenarioPath | null) => {
    if (!track) return;
    try {
      await duplicateTrack(String(track.id)).unwrap();
      setIsDuplicateTrackPopupOpen(false);
      setCurrentTrack(null);
      reLoadCurrentTracks();
      toast.success(`${TRACK_ENTITY_LABEL} duplicated successfully`);
    } catch (error: any) {
      toast.error(
        error?.data?.message || `Failed to duplicate ${TRACK_ENTITY_LABEL.toLowerCase()}`,
      );
    }
  };

  return {
    // State
    tracks,
    currentTrack,
    hasMore,
    isTracksLoading,
    isTracksFetching,

    // Popup states
    isUnpublishTrackPopupOpen,
    isDuplicateTrackPopupOpen,
    isDeleteTrackPopupOpen,
    isTrackEditPopupOpen,
    setIsDuplicateTrackPopupOpen,
    setIsUnpublishTrackPopupOpen,
    setIsDeleteTrackPopupOpen,
    setIsTrackEditPopupOpen,

    // Actions
    loadTracks,
    handleNewTrack,
    onEditTrack,
    handleEditTrack,
    handleDeleteTrack,
    onDeleteTrack,
    handleUnpublishTrack,
    handleChangeTrackStatus,
    handleDuplicateTrack,
    onDuplicateTrack,
  };
};
