import { useEffect, useState } from "react";

import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { ROUTES } from "@constants";

// TODO: Import the actual API hooks when they are implemented
// import { useGetSimulationPathwaysQuery } from "@api";
// import { SORT_BY, SORT_ORDER } from "@constants";

const PATHWAYS_PAGE_SIZE = 30;

interface UseSimulationPathwaysProps {
  selectedFilters: Array<{ id: string; label: string }>;
}

// TODO: Define proper Pathway type
interface Pathway {
  id: string;
  title: string;
  status: string;
  // Add other pathway properties as needed
}

export const useSimulationPathways = ({ selectedFilters }: UseSimulationPathwaysProps) => {
  const navigate = useNavigate();

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDeletePopupOpen, setIsDeletePopupOpen] = useState(false);
  const [currentPathway, setCurrentPathway] = useState<Pathway | null>(null);
  const [pathways, setPathways] = useState<Pathway[]>([]);
  const [pathwaysOffset, setPathwaysOffset] = useState<number>(0);
  const [hasMore, setHasMore] = useState(true);

  // Temporary mock data for development
  const pathwaysResponse = { data: [] };
  const isPathwaysFetching = false;
  const isPathwaysLoading = false;

  useEffect(() => {
    setPathwaysOffset(0);
    // Reset pathways when filters change
    setPathways([]);
    setHasMore(false);
  }, [selectedFilters]);

  // TODO: Uncomment when API is implemented
  // useEffect(() => {
  //   if (!pathwaysResponse) return;
  //   const nextData = pathwaysResponse.data ?? [];
  //   setHasMore(nextData.length >= PATHWAYS_PAGE_SIZE);
  //   if (pathwaysOffset === 0) {
  //     setPathways(nextData);
  //   } else {
  //     setPathways(previousPathways => {
  //       const existingIds = new Set(previousPathways.map(pathway => pathway.id));
  //       const newItems = nextData.filter(pathway => !existingIds.has(pathway.id));
  //       return [...previousPathways, ...newItems];
  //     });
  //   }
  // }, [pathwaysResponse, pathwaysOffset]);

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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const onEditPathway = (_pathway: Pathway) => {
    // TODO: Implement edit pathway logic
    toast.info("Edit pathway coming soon!");
  };

  const handleDeletePathway = (pathway: Pathway) => {
    setCurrentPathway(pathway);
    setIsDeletePopupOpen(true);
  };

  const onDeletePathway = async () => {
    if (!currentPathway) return;

    try {
      // TODO: Implement delete pathway API call
      // await deletePathwayById(currentPathway.id).unwrap();
      setIsDeletePopupOpen(false);
      setCurrentPathway(null);
      toast.success("Pathway deleted successfully");
    } catch {
      toast.error("Failed to delete pathway");
    }
  };

  const onPreviewPathway = (pathway: Pathway) => {
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
    pathwaysResponse,
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
