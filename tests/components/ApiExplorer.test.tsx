import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ApiExplorer from "../../app/_components/ApiExplorer";

describe("ApiExplorer Component", () => {
  const setupFetchMock = (
    mockFn?: (...args: Parameters<typeof fetch>) => Promise<Response>,
  ) => {
    const defaultMockFn = async (..._args: Parameters<typeof fetch>) =>
      new Response(JSON.stringify({}), { status: 200 });
    const fetchMock = mock(mockFn || defaultMockFn);
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;
    return fetchMock;
  };

  const setupComponent = async () => {
    const user = userEvent.setup();
    render(<ApiExplorer />);
    return { user };
  };

  const setupAndOpenPanel = async () => {
    const setup = await setupComponent();
    await setup.user.click(screen.getByRole("button", { name: "Try it" }));
    return setup;
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
    const { user } = await setupComponent();

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

    const { user } = await setupAndOpenPanel();

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
    setupFetchMock(async () => {
      return new Response(null, {
        status: 304,
        headers: new Headers({
          etag: '"mock-etag-1234"',
        }),
      });
    });

    const { user } = await setupAndOpenPanel();

    await user.click(screen.getByRole("button", { name: "Send Request" }));

    await waitFor(() => {
      expect(screen.getByText("304")).toBeDefined();
      expect(
        screen.getByText("✓ 304 Not Modified — データは変更されていません。"),
      ).toBeDefined();
    });
  });

  it("sends a request with query parameters when filters are filled", async () => {
    const fetchMockFn = setupFetchMock();

    const { user } = await setupAndOpenPanel();

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
    expect(fetchMockFn.mock.calls[0][0]).toBe(
      "/api/fetch_syllabus?subject=math&room=101",
    );

    // Add another parameter
    await user.type(seasonInput, "fall");
    await user.click(screen.getByRole("button", { name: "Send Request" }));

    await waitFor(() => {
      expect(fetchMockFn).toHaveBeenCalledTimes(2);
    });

    expect(fetchMockFn.mock.calls[1][0]).toBe(
      "/api/fetch_syllabus?subject=math&room=101&season=fall",
    );

    // Add yet another parameter
    await user.type(timeInput, "月1");
    await user.click(screen.getByRole("button", { name: "Send Request" }));

    await waitFor(() => {
      expect(fetchMockFn).toHaveBeenCalledTimes(3);
    });

    expect(fetchMockFn.mock.calls[2][0]).toBe(
      "/api/fetch_syllabus?subject=math&room=101&season=fall&open_time=%E6%9C%881",
    );
  });

  it("handles network errors", async () => {
    setupFetchMock(async () => {
      throw new Error("Network Error");
    });

    const { user } = await setupAndOpenPanel();

    await user.click(screen.getByRole("button", { name: "Send Request" }));

    await waitFor(() => {
      expect(screen.getByText("エラー:")).toBeDefined();
      expect(screen.getByText(/Network Error/)).toBeDefined();
    });
  });

  it("copies the request URL to the clipboard and shows feedback", async () => {
    const { user } = await setupAndOpenPanel();

    // Mock navigator.clipboard
    const writeTextMock = mock(async (..._args: [string]) => {});
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: writeTextMock,
      },
      writable: true,
      configurable: true,
    });

    // Find and click the copy button
    const copyButton = screen.getByRole("button", { name: "Copy" });
    await user.click(copyButton);

    // Verify clipboard was called with the correct base URL
    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledTimes(1);
    });
    expect(writeTextMock.mock.calls[0][0]).toMatch(/\/api\/fetch_syllabus$/);

    // Verify feedback text changes to "Copied!"
    expect(screen.getByRole("button", { name: "Copied!" })).toBeDefined();

    // Type into a filter to change the URL
    const subjectInput = screen.getByLabelText("subject");
    await user.type(subjectInput, "math");

    // Click copy again on the updated URL
    // Wait for "Copy" to come back or click the same button instance since its label changed
    // For simplicity, click the "Copied!" button which will still trigger the updated state copy,
    // though the 2000ms timeout might execute during this text.
    await user.click(copyButton);

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledTimes(2);
    });

    // Ensure the new URL includes the query param
    expect(writeTextMock.mock.calls[1][0]).toMatch(
      /\/api\/fetch_syllabus\?subject=math$/,
    );
  });

  it("updates the displayed request URL correctly when query parameters are changed", async () => {
    const { user } = await setupAndOpenPanel();

    // Target the URL preview
    const urlPreview = screen.getByTestId("request-url-preview");

    // Initial state
    expect(urlPreview.textContent).toBe("/api/fetch_syllabus");

    // Type in subject
    const subjectInput = screen.getByLabelText("subject");
    await user.type(subjectInput, "math");
    expect(urlPreview.textContent).toBe("/api/fetch_syllabus?subject=math");

    // Type in room
    const roomInput = screen.getByLabelText("room");
    await user.type(roomInput, "101");
    expect(urlPreview.textContent).toBe(
      "/api/fetch_syllabus?subject=math&room=101",
    );

    // Clear subject parameter
    await user.clear(subjectInput);
    expect(urlPreview.textContent).toBe("/api/fetch_syllabus?room=101");
  });
});
