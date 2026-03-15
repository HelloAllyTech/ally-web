import { useEffect, useState } from "react";

import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import {
  useGetScenarioPathsQuery,
  useDeleteScenarioPathByIdMutation,
  useUpdateSimulationPathByIdMutation,
  useDuplicateScenarioPathMutation,
} from "@api";
import { ROUTES, en } from "@constants";
import { ScenarioPath, SimulationStatus } from "@types";

const PATHWAYS_PAGE_SIZE = 30;

interface UseSimulationPathwaysProps {
  selectedFilters: Array<{ id: string; label: string }>;
  enabled?: boolean;
}

export const useSimulationPathways = ({
  selectedFilters,
  enabled = true,
}: UseSimulationPathwaysProps) => {
  const navigate = useNavigate();

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDeletePathwayPopupOpen, setIsDeletePathwayPopupOpen] = useState(false);
  const [currentPathway, setCurrentPathway] = useState<ScenarioPath | null>(null);
  const [pathways, setPathways] = useState<ScenarioPath[]>([]);
  const [pathwaysOffset, setPathwaysOffset] = useState<number>(0);
  const [pathwaysLimit, setPathwaysLimit] = useState(PATHWAYS_PAGE_SIZE);
  const [hasMore, setHasMore] = useState(true);
  const [isUnpublishPathwayPopupOpen, setIsUnpublishPathwayPopupOpen] = useState(false);
  const [isDuplicatePathwayPopupOpen, setIsDuplicatePathwayPopupOpen] = useState(false);
  const [isPathEditPopupOpen, setIsPathEditPopupOpen] = useState<boolean>(false);

  const [updateSimulationPathByIdQuery] = useUpdateSimulationPathByIdMutation();

  // API hooks
  const {
    data: pathwaysResponse,
    isFetching: isPathwaysFetching,
    isLoading: isPathwaysLoading,
  } = useGetScenarioPathsQuery(
    {
      status:
        selectedFilters.length > 0
          ? selectedFilters?.map(filter => filter.id)?.join(",")
          : undefined,
      offset: pathwaysOffset,
      limit: pathwaysLimit,
      search: "",
    },
    { skip: !enabled },
  );

  const [deletePathwayById] = useDeleteScenarioPathByIdMutation();
  const [duplicateScenarioPath] = useDuplicateScenarioPathMutation();

  useEffect(() => {
    setPathwaysOffset(0);
  }, [selectedFilters]);

  useEffect(() => {
    if (!pathwaysResponse) return;
    const nextData = pathwaysResponse.data ?? [];
    setHasMore(nextData.length >= pathwaysLimit);
    if (pathwaysOffset === 0) {
      setPathways(nextData);
      setPathwaysLimit(PATHWAYS_PAGE_SIZE);
    } else {
      setPathways(previousPathways => {
        const existingIds = new Set(previousPathways.map(pathway => pathway.id));
        const newItems = nextData.filter(pathway => !existingIds.has(pathway.id));
        return [...previousPathways, ...newItems];
      });
    }
  }, [pathwaysResponse, pathwaysOffset]);

  const loadPathways = (append = false) => {
    setPathwaysOffset(previousOffset => (append ? previousOffset + pathwaysLimit : 0));
  };

  const reLoadCurrentPathways = () => {
    setPathwaysOffset(0);
    setPathwaysLimit(pathwaysOffset + PATHWAYS_PAGE_SIZE);
  };

  const handleNewPathway = () => {
    navigate(ROUTES.CREATE_PATH);
  };

  const onEditPathway = (pathway: ScenarioPath) => {
    if (pathway.status === SimulationStatus.DRAFT) {
      handleEditPathway(pathway);
      return;
    }
    setCurrentPathway(pathway);
    setIsPathEditPopupOpen(true);
  };

  const handleEditPathway = (pathway: ScenarioPath) => {
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
    } catch (error: any) {
      toast.error(error?.data?.message || en.simulation.failedDeletePathway);
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
    } catch (error: any) {
      toast.error(error?.data?.message || en.simulation.failedChangePathwayStatus);
    }
  };

  const onDuplicatePathway = async (pathway: ScenarioPath) => {
    try {
      await duplicateScenarioPath(pathway.id).unwrap();
      setIsDuplicatePathwayPopupOpen(false);
      setCurrentPathway(null);
      reLoadCurrentPathways();
      toast.success(en.simulation.pathwayDuplicatedSuccessfully);
    } catch (error: any) {
      toast.error(error?.data?.message || en.simulation.failedDuplicatePathway);
    }
  };

  const handleDuplicatePathway = (pathway: ScenarioPath) => {
    setCurrentPathway(pathway);
    setIsDuplicatePathwayPopupOpen(true);
  };

  return {
    // State
    pathways,
    currentPathway,
    hasMore,
    isPathwaysLoading,
    isPathwaysFetching,
    pathwaysOffset,

    // Popup states
    isPreviewOpen,
    isUnpublishPathwayPopupOpen,
    isDuplicatePathwayPopupOpen,
    isDeletePathwayPopupOpen,
    isPathEditPopupOpen,
    setIsPreviewOpen,
    setIsDuplicatePathwayPopupOpen,
    setIsUnpublishPathwayPopupOpen,
    setIsDeletePathwayPopupOpen,
    setIsPathEditPopupOpen,

    // Actions
    loadPathways,
    handleNewPathway,
    onEditPathway,
    handleDeletePathway,
    onDeletePathway,
    onPreviewPathway,
    handleUnpublishPathway,
    onDuplicatePathway,
    handleDuplicatePathway,
    handleChangePathwayStatus,
    handleEditPathway,
  };
};
