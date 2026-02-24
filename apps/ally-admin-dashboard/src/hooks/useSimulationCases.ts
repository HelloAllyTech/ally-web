import { useEffect, useState } from "react";

import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { FEATURE_FLAGS_MAP } from "@ally-ui-mono/ui-shared";
import {
  useGetScenarioCasesQuery,
  useDeleteScenarioCaseByIdMutation,
  useUpdateSimulationCaseByIdMutation,
  useDuplicateScenarioCaseMutation,
} from "@api";
import { ROUTES, en } from "@constants";
import { ScenarioPath, SimulationStatus } from "@types";

const CASES_PAGE_SIZE = 30;

interface UseSimulationCasesProps {
  selectedFilters: Array<{ id: string; label: string }>;
}

export const useSimulationCases = ({ selectedFilters }: UseSimulationCasesProps) => {
  const navigate = useNavigate();

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDeleteCasePopupOpen, setIsDeleteCasePopupOpen] = useState(false);
  const [currentCase, setCurrentCase] = useState<ScenarioPath | null>(null);
  const [cases, setCases] = useState<ScenarioPath[]>([]);
  const [casesOffset, setCasesOffset] = useState<number>(0);
  const [casesLimit, setCasesLimit] = useState(CASES_PAGE_SIZE);
  const [hasMore, setHasMore] = useState(true);
  const [isUnpublishCasePopupOpen, setIsUnpublishCasePopupOpen] = useState(false);
  const [isDuplicateCasePopupOpen, setIsDuplicateCasePopupOpen] = useState(false);
  const [isCaseEditPopupOpen, setIsCaseEditPopupOpen] = useState<boolean>(false);

  const [updateSimulationCaseByIdQuery] = useUpdateSimulationCaseByIdMutation();

  // API hooks
  const {
    data: casesResponse,
    isFetching: isCasesFetching,
    isLoading: isCasesLoading,
  } = useGetScenarioCasesQuery(
    {
      status:
        selectedFilters.length > 0
          ? selectedFilters?.map(filter => filter.id)?.join(",")
          : undefined,
      offset: casesOffset,
      limit: casesLimit,
      search: "",
    },
    {
      skip: !FEATURE_FLAGS_MAP.SIMULATION_CASES_FLAG, // TODO: remove this skip when the feature flag is enabled
    },
  );

  const [deleteCaseById] = useDeleteScenarioCaseByIdMutation();
  const [duplicateScenarioCase] = useDuplicateScenarioCaseMutation();

  useEffect(() => {
    setCasesOffset(0);
  }, [selectedFilters]);

  useEffect(() => {
    if (!casesResponse) return;
    const nextData = casesResponse.data ?? [];
    setHasMore(nextData.length >= casesLimit);
    if (casesOffset === 0) {
      setCases(nextData);
      setCasesLimit(CASES_PAGE_SIZE);
    } else {
      setCases(previousCases => {
        const existingIds = new Set(previousCases.map(caseItem => caseItem.id));
        const newItems = nextData.filter(caseItem => !existingIds.has(caseItem.id));
        return [...previousCases, ...newItems];
      });
    }
  }, [casesResponse, casesOffset]);

  const loadCases = (append = false) => {
    setCasesOffset(previousOffset => (append ? previousOffset + casesLimit : 0));
  };

  const reLoadCurrentCases = () => {
    setCasesOffset(0);
    setCasesLimit(casesOffset + CASES_PAGE_SIZE);
  };

  const handleNewCase = () => {
    navigate(ROUTES.CREATE_CASE);
  };

  const onEditCase = (caseItem: ScenarioPath) => {
    if (caseItem.status === SimulationStatus.DRAFT) {
      handleEditCase(caseItem);
      return;
    }
    setCurrentCase(caseItem);
    setIsCaseEditPopupOpen(true);
  };

  const handleEditCase = (caseItem: ScenarioPath) => {
    navigate(ROUTES.EDIT_CASE(String(caseItem.id)));
  };

  const handleDeleteCase = (caseItem: ScenarioPath) => {
    setCurrentCase(caseItem);
    setIsDeleteCasePopupOpen(true);
  };

  const onDeleteCase = async () => {
    if (!currentCase) return;

    try {
      await deleteCaseById(currentCase.id).unwrap();
      setIsDeleteCasePopupOpen(false);
      setCurrentCase(null);
      toast.success(en.simulation.caseDeletedSuccessfully);
    } catch (error: any) {
      toast.error(error?.data?.message || en.simulation.failedDeleteCase);
    }
  };

  const onPreviewCase = (caseItem: ScenarioPath) => {
    setCurrentCase(caseItem);
    setIsPreviewOpen(true);
  };

  const handleUnpublishCase = (caseItem: ScenarioPath) => {
    setCurrentCase(caseItem);
    setIsUnpublishCasePopupOpen(true);
  };

  const handleChangeCaseStatus = async (status: SimulationStatus) => {
    if (!currentCase) return;
    try {
      await updateSimulationCaseByIdQuery({
        id: currentCase.id,
        data: { status, title: currentCase.title },
      }).unwrap();
      setIsUnpublishCasePopupOpen(false);
      setCurrentCase(null);
      toast.success(en.simulation.caseStatusUpdatedSuccessfully + status);
    } catch (error: any) {
      toast.error(error?.data?.message || en.simulation.failedChangeCaseStatus);
    }
  };

  const onDuplicateCase = async (caseItem: ScenarioPath) => {
    try {
      await duplicateScenarioCase(caseItem.id).unwrap();
      setIsDuplicateCasePopupOpen(false);
      setCurrentCase(null);
      reLoadCurrentCases();
      toast.success(en.simulation.caseDuplicatedSuccessfully);
    } catch (error: any) {
      toast.error(error?.data?.message || en.simulation.failedDuplicateCase);
    }
  };

  const handleDuplicateCase = (caseItem: ScenarioPath) => {
    setCurrentCase(caseItem);
    setIsDuplicateCasePopupOpen(true);
  };

  return {
    // State
    cases,
    currentCase,
    hasMore,
    isCasesLoading,
    isCasesFetching,
    casesOffset,

    // Popup states
    isPreviewOpen,
    isUnpublishCasePopupOpen,
    isDuplicateCasePopupOpen,
    isDeleteCasePopupOpen,
    isCaseEditPopupOpen,
    setIsPreviewOpen,
    setIsDuplicateCasePopupOpen,
    setIsUnpublishCasePopupOpen,
    setIsDeleteCasePopupOpen,
    setIsCaseEditPopupOpen,

    // Actions
    loadCases,
    handleNewCase,
    onEditCase,
    handleDeleteCase,
    onDeleteCase,
    onPreviewCase,
    handleUnpublishCase,
    onDuplicateCase,
    handleDuplicateCase,
    handleChangeCaseStatus,
    handleEditCase,
  };
};
