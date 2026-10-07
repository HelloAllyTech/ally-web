import React from "react";

import { en } from "@constants";
import { SkillExperimentEvent } from "@types";
import { formatRelativeTime } from "@utils";

/** What the loop and admins did, newest first — how a returning admin catches up. */
export const ExperimentTimeline: React.FC<{ events: SkillExperimentEvent[] }> = ({ events }) => {
  const copy = en.skillExperiments.timeline;
  return (
    <section className="flex flex-col gap-3" aria-labelledby="timeline-heading">
      <h3 id="timeline-heading" className="text-base font-medium text-typography-900">
        {copy.heading}
      </h3>
      {events.length === 0 ? (
        <p className="text-sm text-typography-500">{copy.empty}</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {events.map(event => (
            <li
              key={event.id}
              className="flex flex-col gap-0.5 border-l-2 border-border-light pl-3"
            >
              <span className="text-xs text-typography-500">
                <time dateTime={event.createdAt} title={new Date(event.createdAt).toLocaleString()}>
                  {formatRelativeTime(event.createdAt)}
                </time>
                {" · "}
                {event.actorId ? copy.byAdmin : copy.byLoop}
              </span>
              <span
                className={`text-sm ${event.type === "error" ? "text-destructive-700" : "text-typography-800"}`}
              >
                {event.message}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
};
