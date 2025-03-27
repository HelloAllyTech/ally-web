import { FunctionComponent, useState } from "react";
import { Tabs, Tab } from "@mui/material";

import { Drawer } from "@/components";

// TODO: Added only for removing lint error - remove and find actual solution
declare global {
  interface Window {
    handleCommentClick: (comment: string) => void;
  }
}

// TODO: Update type after review
interface SummarySideBarProps {
  summary: any;
  setSummary: any;
}

const SummarySideBar: FunctionComponent<SummarySideBarProps> = ({
  summary,
  setSummary,
}) => {
  const [selectedTab, setSelectedTab] = useState(1);
  const [selectedComment, setSelectedComment] = useState<string>("");

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  const subSection = (title: string, content: string) => {
    return (
      <div className="mb-6">
        <h3 className="font-semibold text-sm mb-2">{title}</h3>
        <ul className="list-disc pl-6 space-y-2 text-sm">
          {content
            ?.split("-")
            ?.filter((value: string) => value.trim() !== "")
            ?.map((value: string, index: number) => (
              <li key={`${title}-${index}`}> {value} </li>
            ))}
        </ul>
      </div>
    );
  };
  return (
    <Drawer
      open={true}
      onClose={() => setSummary(null)}
      title={`Review/${summary.id}`}
    >
      <div className="w-[55vw] h-full flex flex-col gap-6">
        <div className="flex h-[calc(100vh-75px)] w-full">
          <div className="rounded-sm  border border-[#DBDBDB] h-full overflow-hidden w-full">
            <Tabs
              value={selectedTab}
              onChange={handleChange}
              variant="fullWidth"
              className="w-full normal-case"
            >
              <Tab
                label="Summary"
                value={1}
                sx={{
                  textTransform: "none",
                  fontWeight: 500,
                  color: "#49454F",
                }}
              />
              <Tab
                label="Feedback"
                value={2}
                sx={{
                  textTransform: "none",
                  fontWeight: 500,
                  color: "#49454F",
                }}
              />
            </Tabs>

            {selectedTab === 1 && (
              <div className="w-full border-t border-[#DBDBDB] h-full overflow-y-auto p-2">
                {subSection("Key Concerns", summary.keyConcerns)}
                {subSection("Flow", summary.flow)}
                {subSection("Notes for next call", summary.notes)}
              </div>
            )}
            {selectedTab === 2 && (
              <div className="flex flex-1 border-t border-[#DBDBDB] overflow-y-hidden h-[calc(100vh-75px)]">
                <div className="flex-1 overflow-y-scroll p-2">
                  <h3 className="font-semibold text-sm mb-2 pt-2">
                    Transcript
                  </h3>
                  <div className="space-y-4 flex-1 mb-20">
                    {summary.transcript
                      ?.split("\n")
                      ?.filter((line: string) => line.trim() !== "")
                      .map((line: string, index: number) => {
                        const [speaker, ...rest] = line.split(":");
                        const message = rest.join(":");

                        window.handleCommentClick = (comment: string) => {
                          setSelectedComment(
                            comment === selectedComment ? "" : comment
                          );
                        };
                        // Create highlighted message by checking for comment keywords
                        const highlightedMessage = summary?.comments?.length
                          ? summary.comments.reduce((text, { comment }) => {
                              const regex = new RegExp(`(${comment})`, "gi");
                              return text.replace(
                                regex,
                                selectedComment === comment
                                  ? `<button
                                  onclick="window.handleCommentClick('${comment}')"
                                  style="background-color: #FFF9E6; border-bottom: 2px solid #fef08a; pointer: cursor;">$1
                                  </button>`
                                  : `<button
                                  onclick="window.handleCommentClick('${comment}')"
                                  style="border-bottom: 2px solid #fef08a; cursor: pointer;">$1</button>`
                              );
                            }, message)
                          : message;

                        return (
                          <div key={`${speaker}-${index}`} className="flex">
                            <div className="text-sm text-gray-500 w-[40px]">
                              {(0.01 + index / 100).toFixed(2)}
                            </div>
                            <div className="flex-1 text-sm">
                              <span className="font-semibold">{speaker}: </span>
                              <span
                                dangerouslySetInnerHTML={{
                                  __html: highlightedMessage,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
                {summary?.comments?.length > 0 && (
                  <div className="flex-1 px-4 bg-[#F0F4F8]">
                    <h3 className="font-semibold text-sm mb-2 pt-2">
                      Comments
                    </h3>
                    <div className="space-y-4">
                      {summary.comments.map(
                        ({ comment, description }, index) => (
                          <div
                            key={`comment-${index}`}
                            className={`p-3 rounded-lg border
                                ${comment === selectedComment ? "border-[#FECA04] bg-[#FFF9E6]" : "bg-white"} `}
                          >
                            <>
                              <div
                                className={`text-sm font-medium
                                    ${comment === selectedComment ? "text-[#FF9E28]" : "text-[#605E5E]"}`}
                              >
                                ~ {comment}
                              </div>
                              <div className="text-sm mt-1">{description}</div>
                            </>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Drawer>
  );
};

export default SummarySideBar;
