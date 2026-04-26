import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ApiExplorer from "../../app/_components/ApiExplorer";

describe("ApiExplorer Component", () => {
  const setupFetchMock = (mockFn: () => Promise<Response>) => {
    globalThis.fetch = mock(mockFn) as unknown as typeof globalThis.fetch;
  };

  beforeEach(() => {
    mock.restore();
  });

  afterEach(() => {
    // Ensure we clean up fetch mock
    const fetchMock = globalThis.fetch as unknown as {
      mockRestore?: () => void;
    };
    if (typeof fetchMock?.mockRestore === "function") {
      fetchMock.mockRestore();
    }
  });

  it("renders correctly with default state", () => {
    render(<ApiExplorer />);

    expect(screen.getByText("GET")).toBeDefined();
    expect(screen.getByText("/api/fetch_syllabus")).toBeDefined();
    expect(screen.getByRole("button", { name: "Try it" })).toBeDefined();
    expect(screen.queryByText("Send Request")).toBeNull();
  });

  it("toggles the try-it panel when clicking the Try it button", async () => {
    const user = userEvent.setup();
    render(<ApiExplorer />);

    const toggleButton = screen.getByRole("button", { name: "Try it" });

    // Open
    await user.click(toggleButton);
    expect(screen.getByText("閉じる")).toBeDefined();
    expect(screen.getByRole("button", { name: "Send Request" })).toBeDefined();

    // Close
    await user.click(screen.getByRole("button", { name: "閉じる" }));
    expect(screen.getByRole("button", { name: "Try it" })).toBeDefined();
    expect(screen.queryByText("Send Request")).toBeNull();
  });

  it("sends a request and displays the result", async () => {
    const user = userEvent.setup();
    const mockResponse = {
      "Room A": [
        {
          subject: "Subject 1",
          room: "Room A",
          season: "前期",
          open_time: "月1",
        },
      ],
    };
    setupFetchMock(async () => {
      return new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: new Headers({
          "Content-Type": "application/json; charset=UTF-8",
          etag: '"mock-etag-1234"',
        }),
      });
    });

    render(<ApiExplorer />);

    await user.click(screen.getByRole("button", { name: "Try it" }));
    await user.click(screen.getByRole("button", { name: "Send Request" }));

    await waitFor(() => {
      expect(screen.getByText("200")).toBeDefined(); // Status badge
      expect(screen.getAllByText('"mock-etag-1234"').length).toBeGreaterThan(0); // ETag stored
    });

    expect(
      screen.getAllByText("application/json; charset=UTF-8").length,
    ).toBeGreaterThan(0);
  });

  it("handles 304 Not Modified response correctly", async () => {
    const user = userEvent.setup();
    setupFetchMock(async () => {
      return new Response(null, {
        status: 304,
        headers: new Headers({
          etag: '"mock-etag-1234"',
        }),
      });
    });

    render(<ApiExplorer />);

    await user.click(screen.getByRole("button", { name: "Try it" }));
    await user.click(screen.getByRole("button", { name: "Send Request" }));

    await waitFor(() => {
      expect(screen.getByText("304")).toBeDefined();
      expect(
        screen.getByText("✓ 304 Not Modified — データは変更されていません。"),
      ).toBeDefined();
    });
  });

  it("sends a request with query parameters when filters are filled", async () => {
    const user = userEvent.setup();
    const fetchMockFn = mock(async (...args: Parameters<typeof fetch>) => {
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: new Headers(),
      });
    });
    globalThis.fetch = fetchMockFn as unknown as typeof globalThis.fetch;

    render(<ApiExplorer />);

    // Open try it panel
    await user.click(screen.getByRole("button", { name: "Try it" }));

    // Fill in filter inputs
    const subjectInput = screen.getByLabelText("subject");
    const roomInput = screen.getByLabelText("room");
    const seasonInput = screen.getByLabelText("season");
    const timeInput = screen.getByLabelText("open_time");

    await user.type(subjectInput, "math");
    await user.type(roomInput, "101");
    // Leave season and time empty to verify they are omitted if empty

    await user.click(screen.getByRole("button", { name: "Send Request" }));

    await waitFor(() => {
      expect(fetchMockFn).toHaveBeenCalled();
    });

    // Check the URL passed to fetch
    const fetchArgs = fetchMockFn.mock.calls[0] as Parameters<typeof fetch>;
    expect(fetchArgs[0]).toBe("/api/fetch_syllabus?subject=math&room=101");

    // Add another parameter
    await user.type(seasonInput, "fall");
    await user.click(screen.getByRole("button", { name: "Send Request" }));

    await waitFor(() => {
      expect(fetchMockFn).toHaveBeenCalledTimes(2);
    });

    const fetchArgs2 = fetchMockFn.mock.calls[1] as Parameters<typeof fetch>;
    expect(fetchArgs2[0]).toBe(
      "/api/fetch_syllabus?subject=math&room=101&season=fall",
    );

    // Add yet another parameter
    await user.type(timeInput, "月1");
    await user.click(screen.getByRole("button", { name: "Send Request" }));

    await waitFor(() => {
      expect(fetchMockFn).toHaveBeenCalledTimes(3);
    });

    const fetchArgs3 = fetchMockFn.mock.calls[2] as Parameters<typeof fetch>;
    expect(fetchArgs3[0]).toBe(
      "/api/fetch_syllabus?subject=math&room=101&season=fall&open_time=%E6%9C%881",
    );
  });

  it("handles network errors", async () => {
    const user = userEvent.setup();
    setupFetchMock(async () => {
      throw new Error("Network Error");
    });

    render(<ApiExplorer />);

    await user.click(screen.getByRole("button", { name: "Try it" }));
    await user.click(screen.getByRole("button", { name: "Send Request" }));

    await waitFor(() => {
      expect(screen.getByText("エラー:")).toBeDefined();
      expect(screen.getByText(/Network Error/)).toBeDefined();
    });
  });
});
