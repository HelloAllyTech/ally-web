import { useEffect, useState } from "react";

import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import {
  useGetScenarioPathsQuery,
  useDeleteScenarioPathByIdMutation,
  useUpdateSimulationPathByIdMutation,
} from "@api";
import { ROUTES, en } from "@constants";
import { ScenarioPath, SimulationStatus } from "@types";

const PATHWAYS_PAGE_SIZE = 30;

interface UseSimulationPathwaysProps {
  selectedFilters: Array<{ id: string; label: string }>;
}

export const useSimulationPathways = ({ selectedFilters }: UseSimulationPathwaysProps) => {
  const navigate = useNavigate();

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDeletePathwayPopupOpen, setIsDeletePathwayPopupOpen] = useState(false);
  const [currentPathway, setCurrentPathway] = useState<ScenarioPath | null>(null);
  const [pathways, setPathways] = useState<ScenarioPath[]>([]);
  const [pathwaysOffset, setPathwaysOffset] = useState<number>(0);
  const [hasMore, setHasMore] = useState(true);
  const [isUnpublishPathwayPopupOpen, setIsUnpublishPathwayPopupOpen] = useState(false);

  const [updateSimulationPathByIdQuery] = useUpdateSimulationPathByIdMutation();

  // API hooks
  const {
    data: pathwaysResponse,
    isFetching: isPathwaysFetching,
    isLoading: isPathwaysLoading,
  } = useGetScenarioPathsQuery({
    status:
      selectedFilters.length > 0 ? selectedFilters?.map(filter => filter.id)?.join(",") : undefined,
    offset: pathwaysOffset,
    limit: PATHWAYS_PAGE_SIZE,
    search: "",
  });

  const [deletePathwayById] = useDeleteScenarioPathByIdMutation();

  useEffect(() => {
    setPathwaysOffset(0);
  }, [selectedFilters]);

  useEffect(() => {
    if (!pathwaysResponse) return;
    const nextData = pathwaysResponse.data ?? [];
    setHasMore(nextData.length >= PATHWAYS_PAGE_SIZE);
    if (pathwaysOffset === 0) {
      setPathways(nextData);
    } else {
      setPathways(previousPathways => {
        const existingIds = new Set(previousPathways.map(pathway => pathway.id));
        const newItems = nextData.filter(pathway => !existingIds.has(pathway.id));
        return [...previousPathways, ...newItems];
      });
    }
  }, [pathwaysResponse, pathwaysOffset]);

  const loadPathways = (append = false) => {
    setPathwaysOffset(previousOffset => (append ? previousOffset + PATHWAYS_PAGE_SIZE : 0));
  };

  const handleNewPathway = () => {
    navigate(ROUTES.CREATE_PATH);
  };

  const onEditPathway = (pathway: ScenarioPath) => {
    navigate(ROUTES.EDIT_PATH(String(pathway.id)));
  };

  const handleDeletePathway = (pathway: ScenarioPath) => {
    setCurrentPathway(pathway);
    setIsDeletePathwayPopupOpen(true);
  };

  const onDeletePathway = async () => {
    if (!currentPathway) return;

    try {
      await deletePathwayById(currentPathway.id).unwrap();
      setIsDeletePathwayPopupOpen(false);
      setCurrentPathway(null);
      toast.success(en.simulation.pathwayDeletedSuccessfully);
    } catch {
      toast.error(en.simulation.failedDeletePathway);
    }
  };

  const onPreviewPathway = (pathway: ScenarioPath) => {
    setCurrentPathway(pathway);
    setIsPreviewOpen(true);
  };

  const handleUnpublishPathway = (pathway: ScenarioPath) => {
    setCurrentPathway(pathway);
    setIsUnpublishPathwayPopupOpen(true);
  };

  const handleChangePathwayStatus = async (status: SimulationStatus) => {
    if (!currentPathway) return;
    try {
      await updateSimulationPathByIdQuery({
        id: currentPathway.id,
        data: { status, title: currentPathway.title },
      }).unwrap();
      setIsUnpublishPathwayPopupOpen(false);
      setCurrentPathway(null);
      toast.success(en.simulation.pathwayStatusUpdatedSuccessfully + status);
    } catch {
      toast.error(en.simulation.failedChangePathwayStatus);
    }
  };

  return {
    // State
    pathways,
    currentPathway,
    hasMore,
    isPathwaysLoading,
    isPathwaysFetching,
    pathwaysOffset,
    isUnpublishPathwayPopupOpen,
    setIsUnpublishPathwayPopupOpen,

    // Popup states
    isPreviewOpen,
    setIsPreviewOpen,
    isDeletePathwayPopupOpen,
    setIsDeletePathwayPopupOpen,
    handleChangePathwayStatus,

    // Actions
    loadPathways,
    handleNewPathway,
    onEditPathway,
    handleDeletePathway,
    onDeletePathway,
    onPreviewPathway,
    handleUnpublishPathway,
  };
};
