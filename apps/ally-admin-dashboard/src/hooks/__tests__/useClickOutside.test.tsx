import { useRef } from "react";

import { render, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

import { useClickOutside } from "../useClickOutside";

const TestComponent = ({ callback }: { callback: () => void }) => {
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, callback);

  return (
    <div>
      <div ref={ref} data-testid="inside">
        Inside Element
      </div>
      <div data-testid="outside">Outside Element</div>
    </div>
  );
};

describe("useClickOutside", () => {
  let callback: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    callback = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Click Detection", () => {
    it("does not call callback when clicking inside the element", () => {
      const { getByTestId } = render(<TestComponent callback={callback} />);

      const insideElement = getByTestId("inside");
      fireEvent.mouseDown(insideElement);

      expect(callback).not.toHaveBeenCalled();
    });

    it("calls callback when clicking outside the element", () => {
      const { getByTestId } = render(<TestComponent callback={callback} />);

      const outsideElement = getByTestId("outside");
      fireEvent.mouseDown(outsideElement);

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("calls callback when clicking on document body", () => {
      render(<TestComponent callback={callback} />);

      fireEvent.mouseDown(document.body);

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("handles multiple outside clicks", () => {
      const { getByTestId } = render(<TestComponent callback={callback} />);

      const outsideElement = getByTestId("outside");

      fireEvent.mouseDown(outsideElement);
      fireEvent.mouseDown(outsideElement);
      fireEvent.mouseDown(outsideElement);

      expect(callback).toHaveBeenCalledTimes(3);
    });

    it("does not call callback for clicks on child elements", () => {
      const TestWithChildren = ({ callback }: { callback: () => void }) => {
        const ref = useRef<HTMLDivElement>(null);
        useClickOutside(ref, callback);

        return (
          <div>
            <div ref={ref} data-testid="parent">
              <div data-testid="child">Child Element</div>
            </div>
            <div data-testid="outside">Outside</div>
          </div>
        );
      };

      const { getByTestId } = render(<TestWithChildren callback={callback} />);

      const childElement = getByTestId("child");
      fireEvent.mouseDown(childElement);

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe("Event Listener Management", () => {
    it("adds event listener on mount", () => {
      const addEventListenerSpy = vi.spyOn(document, "addEventListener");

      render(<TestComponent callback={callback} />);

      expect(addEventListenerSpy).toHaveBeenCalledWith("mousedown", expect.any(Function));

      addEventListenerSpy.mockRestore();
    });

    it("removes event listener on unmount", () => {
      const removeEventListenerSpy = vi.spyOn(document, "removeEventListener");

      const { unmount } = render(<TestComponent callback={callback} />);

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith("mousedown", expect.any(Function));

      removeEventListenerSpy.mockRestore();
    });

    it("does not call callback after unmount", () => {
      const { unmount, getByTestId } = render(<TestComponent callback={callback} />);

      const outsideElement = getByTestId("outside");

      unmount();

      fireEvent.mouseDown(outsideElement);

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe("Ref Handling", () => {
    it("handles null ref gracefully", () => {
      const TestWithNullRef = ({ callback }: { callback: () => void }) => {
        const ref = useRef<HTMLDivElement>(null);
        useClickOutside(ref, callback);

        return (
          <div>
            <div data-testid="outside">Outside Element</div>
          </div>
        );
      };

      const { getByTestId } = render(<TestWithNullRef callback={callback} />);

      const outsideElement = getByTestId("outside");

      // Should not throw even with null ref
      expect(() => fireEvent.mouseDown(outsideElement)).not.toThrow();

      // Since ref.current is null, clicking outside should trigger callback
      // because the condition `!ref.current.contains(event.target)` will be skipped
      // and the callback won't be called
      expect(callback).not.toHaveBeenCalled();
    });

    it("updates when ref changes", () => {
      const TestWithDynamicRef = ({
        callback,
        showFirst,
      }: {
        callback: () => void;
        showFirst: boolean;
      }) => {
        const ref1 = useRef<HTMLDivElement>(null);
        const ref2 = useRef<HTMLDivElement>(null);
        useClickOutside(showFirst ? ref1 : ref2, callback);

        return (
          <div>
            {showFirst ? (
              <div ref={ref1} data-testid="first">
                First Element
              </div>
            ) : (
              <div ref={ref2} data-testid="second">
                Second Element
              </div>
            )}
            <div data-testid="outside">Outside Element</div>
          </div>
        );
      };

      const { getByTestId, rerender } = render(
        <TestWithDynamicRef callback={callback} showFirst={true} />,
      );

      const firstElement = getByTestId("first");
      fireEvent.mouseDown(firstElement);
      expect(callback).not.toHaveBeenCalled();

      rerender(<TestWithDynamicRef callback={callback} showFirst={false} />);

      const secondElement = getByTestId("second");
      fireEvent.mouseDown(secondElement);
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe("Callback Updates", () => {
    it("uses updated callback", () => {
      const firstCallback = vi.fn();
      const secondCallback = vi.fn();

      const { getByTestId, rerender } = render(<TestComponent callback={firstCallback} />);

      const outsideElement = getByTestId("outside");
      fireEvent.mouseDown(outsideElement);

      expect(firstCallback).toHaveBeenCalledTimes(1);
      expect(secondCallback).not.toHaveBeenCalled();

      rerender(<TestComponent callback={secondCallback} />);

      fireEvent.mouseDown(outsideElement);

      expect(firstCallback).toHaveBeenCalledTimes(1);
      expect(secondCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe("Edge Cases", () => {
    it("handles rapid clicks", () => {
      const { getByTestId } = render(<TestComponent callback={callback} />);

      const outsideElement = getByTestId("outside");

      for (let i = 0; i < 10; i++) {
        fireEvent.mouseDown(outsideElement);
      }

      expect(callback).toHaveBeenCalledTimes(10);
    });

    it("handles clicks on deeply nested children", () => {
      const TestWithDeepNesting = ({ callback }: { callback: () => void }) => {
        const ref = useRef<HTMLDivElement>(null);
        useClickOutside(ref, callback);

        return (
          <div>
            <div ref={ref} data-testid="parent">
              <div>
                <div>
                  <div>
                    <div data-testid="deep-child">Deep Child</div>
                  </div>
                </div>
              </div>
            </div>
            <div data-testid="outside">Outside</div>
          </div>
        );
      };

      const { getByTestId } = render(<TestWithDeepNesting callback={callback} />);

      const deepChild = getByTestId("deep-child");
      fireEvent.mouseDown(deepChild);

      expect(callback).not.toHaveBeenCalled();
    });

    it("handles clicks on sibling elements", () => {
      const TestWithSiblings = ({ callback }: { callback: () => void }) => {
        const ref = useRef<HTMLDivElement>(null);
        useClickOutside(ref, callback);

        return (
          <div>
            <div data-testid="sibling1">Sibling 1</div>
            <div ref={ref} data-testid="target">
              Target Element
            </div>
            <div data-testid="sibling2">Sibling 2</div>
          </div>
        );
      };

      const { getByTestId } = render(<TestWithSiblings callback={callback} />);

      fireEvent.mouseDown(getByTestId("sibling1"));
      expect(callback).toHaveBeenCalledTimes(1);

      fireEvent.mouseDown(getByTestId("sibling2"));
      expect(callback).toHaveBeenCalledTimes(2);

      fireEvent.mouseDown(getByTestId("target"));
      expect(callback).toHaveBeenCalledTimes(2);
    });

    it("works with multiple instances", () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      const TestWithMultiple = () => {
        const ref1 = useRef<HTMLDivElement>(null);
        const ref2 = useRef<HTMLDivElement>(null);
        useClickOutside(ref1, callback1);
        useClickOutside(ref2, callback2);

        return (
          <div>
            <div ref={ref1} data-testid="element1">
              Element 1
            </div>
            <div ref={ref2} data-testid="element2">
              Element 2
            </div>
            <div data-testid="outside">Outside</div>
          </div>
        );
      };

      const { getByTestId } = render(<TestWithMultiple />);

      fireEvent.mouseDown(getByTestId("element1"));
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalledTimes(1);

      fireEvent.mouseDown(getByTestId("element2"));
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);

      fireEvent.mouseDown(getByTestId("outside"));
      expect(callback1).toHaveBeenCalledTimes(2);
      expect(callback2).toHaveBeenCalledTimes(2);
    });
  });

  describe("Event Types", () => {
    it("only responds to mousedown events", () => {
      const { getByTestId } = render(<TestComponent callback={callback} />);

      const outsideElement = getByTestId("outside");

      fireEvent.click(outsideElement);
      expect(callback).not.toHaveBeenCalled();

      fireEvent.mouseUp(outsideElement);
      expect(callback).not.toHaveBeenCalled();

      fireEvent.mouseDown(outsideElement);
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe("Integration", () => {
    it("works with real-world dropdown scenario", () => {
      const TestDropdown = ({ callback }: { callback: () => void }) => {
        const ref = useRef<HTMLDivElement>(null);
        useClickOutside(ref, callback);

        return (
          <div>
            <button data-testid="trigger">Open Dropdown</button>
            <div ref={ref} data-testid="dropdown">
              <ul>
                <li data-testid="option1">Option 1</li>
                <li data-testid="option2">Option 2</li>
              </ul>
            </div>
          </div>
        );
      };

      const { getByTestId } = render(<TestDropdown callback={callback} />);

      // Click on dropdown options should not trigger callback
      fireEvent.mouseDown(getByTestId("option1"));
      expect(callback).not.toHaveBeenCalled();

      fireEvent.mouseDown(getByTestId("option2"));
      expect(callback).not.toHaveBeenCalled();

      // Click on trigger button should trigger callback
      fireEvent.mouseDown(getByTestId("trigger"));
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("works with modal/overlay scenario", () => {
      const TestModal = ({ callback }: { callback: () => void }) => {
        const ref = useRef<HTMLDivElement>(null);
        useClickOutside(ref, callback);

        return (
          <div data-testid="overlay">
            <div ref={ref} data-testid="modal">
              <h2>Modal Title</h2>
              <button data-testid="close">Close</button>
            </div>
          </div>
        );
      };

      const { getByTestId } = render(<TestModal callback={callback} />);

      // Click inside modal should not trigger callback
      fireEvent.mouseDown(getByTestId("modal"));
      expect(callback).not.toHaveBeenCalled();

      fireEvent.mouseDown(getByTestId("close"));
      expect(callback).not.toHaveBeenCalled();

      // Click on overlay should trigger callback
      fireEvent.mouseDown(getByTestId("overlay"));
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });
});
