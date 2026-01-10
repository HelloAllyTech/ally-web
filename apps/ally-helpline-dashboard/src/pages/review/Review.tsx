import { FC, useState, useEffect, useCallback, useRef } from "react";

import FeedCard from "@src/components/feed-card";
import ToggleButtonGroup from "@src/components/toggle-button-group/ToggleButtonGroup";

const FILTER_OPTIONS = [
  { value: "ALL", label: "All" },
  { value: "LATEST", label: "Latest" },
  { value: "MOST_REVIEWED", label: "Most reviewed" },
  { value: "UNDISCOVRED", label: "Undiscovered" },
];

//Replace with API data
const MOCK_FEED_DATA = [
  {
    id: "1",
    createdAt: "2026-01-06T10:26:21",
    user: { name: "Emily Chen" },
    scenario: {
      title: "Help Ahana connect with her parents",
      createdAt: "2025-02-18T11:05:00",
      duration: "9:15 Min",
      description:
        "Ahana is an adolescent in acute academic distress. She just received her results for pre-boards for 10th class and she is disappointed and scared. Your goal is to help her feel prepared to have a constructive conversation with her parents.",
      coverImageUrl:
        "https://images.unsplash.com/photo-1558637845-c8b7ead71a3e?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8MTYlM0E5fGVufDB8fDB8fHww",
    },
    reactions: { "1f44d": 6, "2764-fe0f": 2, "1f604": 2, "1f44f": 4, "1f4a1": 2, "1f389": 2 },
    commentsCount: 24,
    comments: [
      {
        id: "1",
        user: { name: "Alicia Keys" },
        date: "Mar 1",
        text: "Thanks, Dr. Smith. I appreciate your insights on managing client expectations.",
        reactions: { "1f44d": 1, "1f4a1": 1, "1f389": 1 },
        repliesCount: 3,
      },
      {
        id: "2",
        user: { name: "Ben Carter" },
        date: "2026-01-06T10:26:21",
        text: "Thanks, Dr. Smith. I appreciate your insights on managing client expectations.",
        reactions: {},
        repliesCount: 1,
      },
    ],
  },
  {
    id: "2",
    createdAt: "2026-01-07T00:00:11",
    user: { name: "Michael Thompson" },
    scenario: {
      title: "He found the initiative to explore new hobbies, which has been a positive change",
      createdAt: "2025-02-18T11:05:00",
      duration: "9:15 Min",
      description:
        "A 30-year-old software engineer faces work-life balance challenges despite a successful career.",
      coverImageUrl:
        "https://images.unsplash.com/photo-1558637845-c8b7ead71a3e?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8MTYlM0E5fGVufDB8fDB8fHww",
    },
    reactions: { "2764-fe0f": 4 },
    commentsCount: 24,
    comments: [
      {
        id: "1",
        user: { name: "Alicia Keys" },
        date: "2026-01-07T00:00:11",
        text: "Thanks, Dr. Smith. I appreciate your insights on managing client expectations.",
        reactions: { "1f44d": 1, "1f4a1": 1, "1f389": 1 },
        repliesCount: 3,
      },
      {
        id: "2",
        user: { name: "Ben Carter" },
        date: "2026-01-06T10:26:21",
        text: "Thanks, Dr. Smith. I appreciate your insights on managing client expectations.",
        reactions: {},
        repliesCount: 1,
      },
    ],
  },
  {
    id: "3",
    createdAt: "2024-02-18T11:05:00",
    user: { name: "Sofia Martinez" },
    scenario: {
      title: "Encouraged by friends, she is starting to open up about her feelings",
      createdAt: "2025-02-18T11:05:00",
      duration: "7:45 Min",
      description:
        "A 27-year-old graphic designer navigates through personal growth and self-discovery.",
      coverImageUrl:
        "https://images.unsplash.com/photo-1580757468214-c73f7062a5cb?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8MTYlM0E5fGVufDB8fDB8fHww",
    },
    reactions: {},
    commentsCount: 30,
    comments: [
      {
        id: "1",
        user: { name: "Alicia Keys" },
        date: "2026-01-07T00:00:11",
        text: "Thanks, Dr. Smith. I appreciate your insights on managing client expectations.",
        reactions: { "1f44d": 1, "1f4a1": 1, "1f389": 1 },
        repliesCount: 3,
      },
      {
        id: "2",
        user: { name: "Ben Carter" },
        date: "2026-01-06T10:26:21",
        text: "Thanks, Dr. Smith. I appreciate your insights on managing client expectations.",
        reactions: {},
        repliesCount: 1,
      },
    ],
  },
];

export const Review: FC = () => {
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [feedData, setFeedData] = useState(MOCK_FEED_DATA);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const lastTriggerTime = useRef<number>(0);

  // Replace with api
  const loadMore = useCallback(() => {
    if (isLoading || !hasMore) return;

    const now = Date.now();
    if (now - lastTriggerTime.current < 500) return;
    lastTriggerTime.current = now;

    setIsLoading(true);

    // TODO: Replace with actual API call
    // Simulate API completion for now
    setTimeout(() => {
      setIsLoading(false);
      // setHasMore(false); // Uncomment when no more data
    }, 1000);
  }, [isLoading, hasMore]);

  // Reset data when filter changes
  useEffect(() => {
    setFeedData(MOCK_FEED_DATA);
    setHasMore(true);
    // TODO: Call API with new filter
  }, [activeFilter]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !isLoading) {
          loadMore();
        }
      },
      {
        threshold: 0.1,
        rootMargin: "100px",
      },
    );

    observer.observe(sentinel);

    return () => observer.unobserve(sentinel);
  }, [hasMore, isLoading, loadMore]);

  return (
    <div className="flex h-full w-full flex-col bg-[#FAFAFA]">
      <div className="sticky top-0 z-10 flex flex-col items-center bg-[#FAFAFA]">
        <div className="flex items-center self-stretch gap-8 px-4 sm:px-8 py-5 bg-white">
          <h1 className="font-secondary text-2xl sm:text-2xl text-[#0D0D0D]">Review</h1>
        </div>

        <div className="w-full max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="py-4 sm:py-6 w-full">
            <ToggleButtonGroup
              className="w-full font-primary text-xs sm:text-sm leading-[1.5]"
              value={activeFilter}
              onValueChange={setActiveFilter}
              items={FILTER_OPTIONS}
              equalWidth
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="flex justify-center w-full">
          <div className="w-full max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center gap-4 w-full pb-8">
              {feedData.map(feedItem => (
                <FeedCard
                  key={feedItem.id}
                  id={feedItem.id}
                  createdAt={feedItem.createdAt}
                  user={feedItem.user}
                  scenario={feedItem.scenario}
                  reactions={feedItem.reactions}
                  commentsCount={feedItem.commentsCount}
                  comments={feedItem.comments}
                  onReviewTranscript={() => {}}
                />
              ))}

              {hasMore && <div ref={sentinelRef} className="w-full h-4" />}

              {isLoading && (
                <div className="flex items-center justify-center py-4">
                  <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
