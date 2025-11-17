import { useEffect, useState } from "react";

import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { useGetScenarioPathsQuery, useDeleteScenarioPathByIdMutation } from "@api";
import { ROUTES } from "@constants";
import { ScenarioPath } from "@types";

const PATHWAYS_PAGE_SIZE = 30;

interface UseSimulationPathwaysProps {
  selectedFilters: Array<{ id: string; label: string }>;
}

export const useSimulationPathways = ({ selectedFilters }: UseSimulationPathwaysProps) => {
  const navigate = useNavigate();

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDeletePopupOpen, setIsDeletePopupOpen] = useState(false);
  const [currentPathway, setCurrentPathway] = useState<ScenarioPath | null>(null);
  const [pathways, setPathways] = useState<ScenarioPath[]>([]);
  const [pathwaysOffset, setPathwaysOffset] = useState<number>(0);
  const [hasMore, setHasMore] = useState(true);

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
    tenantId: "",
  });

  const [deletePathwayById] = useDeleteScenarioPathByIdMutation();

  useEffect(() => {
    setPathwaysOffset(0);
    setHasMore(true);
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

  const handleCreatePathway = () => {
    // TODO: Navigate to pathway creation
    toast.info("Pathway creation coming soon!");
  };

  const onEditPathway = (pathway: ScenarioPath) => {
    // TODO: Implement edit pathway logic
    navigate(ROUTES.EDIT_PATH(String(pathway.id)));
  };

  const handleDeletePathway = (pathway: ScenarioPath) => {
    setCurrentPathway(pathway);
    setIsDeletePopupOpen(true);
  };

  const onDeletePathway = async () => {
    if (!currentPathway) return;

    try {
      await deletePathwayById(currentPathway.id).unwrap();
      setIsDeletePopupOpen(false);
      setCurrentPathway(null);
      toast.success("Pathway deleted successfully");
    } catch {
      toast.error("Failed to delete pathway");
    }
  };

  const onPreviewPathway = (pathway: ScenarioPath) => {
    setCurrentPathway(pathway);
    setIsPreviewOpen(true);
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
    setIsPreviewOpen,
    isDeletePopupOpen,
    setIsDeletePopupOpen,

    // Actions
    loadPathways,
    handleNewPathway,
    handleCreatePathway,
    onEditPathway,
    handleDeletePathway,
    onDeletePathway,
    onPreviewPathway,
  };
};
