import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { QuestionMedia } from "../QuestionMedia";
import { QuestionMedia as QuestionMediaValue } from "../../../../../types/tracks";

const image: QuestionMediaValue = {
  kind: "image",
  source: "s3",
  url: "https://bucket.s3.ap-south-1.amazonaws.com/track-media/question_image/1-ankle.png",
  alt: "A swollen left ankle",
};

describe("QuestionMedia", () => {
  it("renders nothing when a question carries no media", () => {
    const { container } = render(<QuestionMedia media={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing for media with an empty URL", () => {
    const { container } = render(<QuestionMedia media={{ ...image, url: "" }} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders an image with the trainer's description as alt text", () => {
    render(<QuestionMedia media={image} />);
    const img = screen.getByTestId("question-media-image") as HTMLImageElement;
    expect(img.src).toBe(image.url);
    expect(img.alt).toBe("A swollen left ankle");
  });

  it("falls back to empty alt rather than a filename when undescribed", () => {
    render(<QuestionMedia media={{ ...image, alt: undefined }} />);
    expect((screen.getByTestId("question-media-image") as HTMLImageElement).alt).toBe("");
  });

  it("opens a full-size view when the image is tapped, and closes again", () => {
    render(<QuestionMedia media={image} />);
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByTestId("question-media-image"));
    expect(screen.getByRole("dialog")).toBeTruthy();
    fireEvent.click(screen.getByRole("dialog"));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  // A broken-image glyph on a bad connection reads as "this question is
  // broken". The description the trainer wrote is a better fallback.
  it("explains a failed image instead of leaving a broken glyph", () => {
    render(<QuestionMedia media={image} />);
    fireEvent.error(screen.getByTestId("question-media-image"));
    expect(screen.getByTestId("question-media-failed")).toBeTruthy();
    expect(screen.getByText("A swollen left ankle")).toBeTruthy();
  });

  it("plays an uploaded video inline, and never autoplays it", () => {
    render(
      <QuestionMedia
        media={{ kind: "video", source: "s3", url: "https://cdn.example.com/clip.mp4" }}
      />,
    );
    const video = screen.getByTestId("question-media-video") as HTMLVideoElement;
    expect(video.getAttribute("src")).toBe("https://cdn.example.com/clip.mp4");
    expect(video.controls).toBe(true);
    expect(video.autoplay).toBe(false);
  });

  it("shows the captured poster frame before the learner presses play", () => {
    render(
      <QuestionMedia
        media={{
          kind: "video",
          source: "s3",
          url: "https://cdn.example.com/clip.mp4",
          posterUrl: "https://cdn.example.com/clip-poster.jpg",
        }}
      />,
    );
    expect(screen.getByTestId("question-media-video").getAttribute("poster")).toBe(
      "https://cdn.example.com/clip-poster.jpg",
    );
  });

  it("renders a clip with no poster rather than failing", () => {
    render(
      <QuestionMedia
        media={{ kind: "video", source: "s3", url: "https://cdn.example.com/clip.mp4" }}
      />,
    );
    expect(screen.getByTestId("question-media-video").hasAttribute("poster")).toBe(false);
  });

  it.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "https://www.youtube.com/embed/dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ", "https://www.youtube.com/embed/dQw4w9WgXcQ"],
    ["https://vimeo.com/76979871", "https://player.vimeo.com/video/76979871"],
    ["https://www.loom.com/share/abc123", "https://www.loom.com/embed/abc123"],
  ])("embeds %s as a player", (url, expected) => {
    render(<QuestionMedia media={{ kind: "video", source: "youtube", url }} />);
    expect(screen.getByTestId("question-media-embed").getAttribute("src")).toBe(expected);
  });

  it("degrades to a plain link when a video URL cannot be embedded", () => {
    render(
      <QuestionMedia
        media={{ kind: "video", source: "youtube", url: "https://example.com/somewhere" }}
      />,
    );
    expect(screen.queryByTestId("question-media-embed")).toBeNull();
    expect(screen.getByRole("link").getAttribute("href")).toBe("https://example.com/somewhere");
  });
});
