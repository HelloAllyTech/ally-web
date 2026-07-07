import { FC } from "react";

import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { ComposedModal, InfiniteScroll, Loading, ModalBody } from "@ally-ui-mono/ui-shared";
import { ArrowDownFilled } from "@assets";
import { NativeEmoji } from "@components";
import { useReactionModal } from "@hooks";

interface ReactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  reviewId: string;
  isScribeReview?: boolean;
}

const ReactionsModal: FC<ReactionsModalProps> = ({ isOpen, onClose, reviewId, isScribeReview }) => {
  const { t } = useTranslation();
  const {
    activeTab,
    showMoreEmojis,
    totalCount,
    visibleReactions,
    hiddenReactions,
    userReactions,
    isLoading,
    loadMore,
    handleTabChange,
    handleToggleMoreEmojis,
    handleSelectHiddenReaction,
    resetState,
  } = useReactionModal({ reviewId, isOpen, isScribeReview });

  const handleClose = () => {
    resetState();
    onClose?.();
  };

  const renderTabButton = ({
    tabId,
    label,
    isActive,
    onClick,
  }: {
    tabId: string;
    label: string;
    isActive: boolean;
    onClick: () => void;
  }) => (
    <button
      key={tabId}
      onClick={onClick}
      className={`flex items-center justify-center gap-1 px-1.5 py-3.5 min-w-[60px] relative ${
        isActive ? "text-primary-500" : "text-black/87"
      }`}
    >
      <span className="font-primary text-sm">{label}</span>
      {isActive && (
        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-primary-500 rounded-t-md" />
      )}
    </button>
  );

  const renderEmojiTab = (reactionCode: string, count: number, isActive: boolean) => (
    <button
      key={reactionCode}
      onClick={() => handleTabChange(reactionCode)}
      className={`flex items-center justify-center gap-0.5 px-1.5 py-3.5 min-w-[60px] relative ${
        isActive ? "text-primary-500" : "text-black/87"
      }`}
    >
      <div className="flex items-center gap-1 p-1 rounded-[18px] bg-white border-[0.5px] border-border">
        <NativeEmoji unified={reactionCode} size={14} />
      </div>
      <span className="font-primary text-sm">{count}</span>
      {isActive && (
        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-primary-500 rounded-t-md" />
      )}
    </button>
  );

  const renderContent = () => {
    if (isLoading && userReactions.length === 0) {
      return (
        <div className="flex items-center justify-center h-[300px]">
          <Loading withOverlay={false} />
        </div>
      );
    }

    if (userReactions.length === 0) {
      return (
        <div className="flex items-center justify-center h-[300px] text-typography-500">
          {t("review.reactionsModal.noReactionsYet")}
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-3 h-[300px] overflow-y-auto custom-scrollbar">
        <InfiniteScroll onInfiniteScroll={loadMore} isLoading={isLoading}>
          {userReactions.map((userReaction, index) => (
            <div key={`${userReaction.id}-${index}`} className="flex items-center gap-2.5 w-full">
              <div className="relative flex-shrink-0">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center overflow-hidden ${!userReaction.createdBy.profileImage ? "border border-border-light" : ""}`}
                >
                  {userReaction.createdBy.profileImage ? (
                    <img
                      src={userReaction.createdBy.profileImage}
                      alt={userReaction.createdBy.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="font-primary leading-[1.67] text-typography-800">
                      {userReaction.createdBy.name?.charAt(0).toUpperCase() ?? ""}
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center p-[3px] pt-[4px] rounded-full bg-white border-[0.35px] border-border">
                  <NativeEmoji unified={userReaction.reaction} size={10} />
                </div>
              </div>
              <span className="font-primary text-base leading-5 text-[#1A1A1A] flex-1 truncate">
                {userReaction.createdBy.name}
              </span>
            </div>
          ))}
        </InfiniteScroll>
        {isLoading && (
          <div className="flex items-center justify-center py-2">
            <Loading withOverlay={false} small />
          </div>
        )}
      </div>
    );
  };

  return (
    <ComposedModal open={isOpen} onClose={handleClose} size="sm">
      <ModalBody className="p-0">
        <div className="w-[400px] max-w-[calc(100vw-32px)] flex flex-col gap-2 p-4 bg-white relative">
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 p-1 rounded-full hover:bg-neutral-100 transition-colors"
          >
            <X className="w-5 h-5 text-typography-700" />
          </button>

          <div className="font-primary font-medium text-base leading-5 text-[#1A1A1A] pr-8">
            {t("review.reactionsModal.title")}
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col">
              <div className="flex">
                {renderTabButton({
                  tabId: "all",
                  label: t("review.reactionsModal.all", { count: totalCount }),
                  isActive: activeTab === "all",
                  onClick: () => handleTabChange("all"),
                })}

                {visibleReactions.map(([code, count]) =>
                  renderEmojiTab(code, count, activeTab === code),
                )}

                {hiddenReactions.length > 0 && (
                  <div className="relative">
                    <button
                      onClick={handleToggleMoreEmojis}
                      className="flex text-center items-center justify-center gap-0.5 px-1.5 py-3.5 text-[#1A1A1A] font-primary text-base leading-5"
                    >
                      {t("review.reactionsModal.more")}
                      <div className="flex items-center justify-center text-typography-600 w-4 h-4">
                        <ArrowDownFilled />
                      </div>
                    </button>

                    {showMoreEmojis && (
                      <div className="absolute top-full left-0 z-10 bg-white border border-border rounded-lg shadow-lg py-2 min-w-[120px]">
                        {hiddenReactions.map(([code, count]) => (
                          <button
                            key={code}
                            onClick={() => handleSelectHiddenReaction(code)}
                            className="flex items-center gap-2 w-full px-3 py-2 hover:bg-neutral-50"
                          >
                            <div className="flex items-center gap-1 py-0.5 px-1 rounded-[18px] bg-white border-[0.5px] border-border">
                              <NativeEmoji unified={code} size={16} />
                            </div>
                            <span className="font-primary text-sm text-black/87">{count}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="w-full h-[1px] bg-border-light" />
            </div>

            {renderContent()}
          </div>
        </div>
      </ModalBody>
    </ComposedModal>
  );
};

export default ReactionsModal;
