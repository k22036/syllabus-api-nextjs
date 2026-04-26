import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ApiExplorer from "../../app/_components/ApiExplorer";

/* @testing-library/react provides cleanups automatically but we verify the environment here */

describe("ApiExplorer Component", () => {
  beforeEach(() => {
    // Reset any previous mocks
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

    // Check header
    expect(screen.getByText("GET")).toBeDefined();
    expect(screen.getByText("/api/fetch_syllabus")).toBeDefined();

    // Check that "Try it" button exists
    expect(screen.getByRole("button", { name: "Try it" })).toBeDefined();

    // Check that the try-it panel is NOT visible initially
    expect(screen.queryByText("Send Request")).toBeNull();
  });

  it("toggles the try-it panel when clicking the Try it button", async () => {
    render(<ApiExplorer />);

    const toggleButton = screen.getByRole("button", { name: "Try it" });

    // Open
    fireEvent.click(toggleButton);
    expect(screen.getByText("閉じる")).toBeDefined();
    expect(screen.getByRole("button", { name: "Send Request" })).toBeDefined();

    // Close
    fireEvent.click(screen.getByRole("button", { name: "閉じる" }));
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
    globalThis.fetch = mock(async () => {
      return new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: new Headers({
          "Content-Type": "application/json; charset=UTF-8",
          etag: '"mock-etag-1234"',
        }),
      });
    }) as unknown as typeof globalThis.fetch;

    render(<ApiExplorer />);

    // Open panel
    fireEvent.click(screen.getByRole("button", { name: "Try it" }));

    // Click send
    const sendButton = screen.getByRole("button", { name: "Send Request" });
    fireEvent.click(sendButton);

    // Wait for the fetch to resolve
    await waitFor(() => {
      expect(screen.getByText("200")).toBeDefined(); // Status badge
      expect(screen.getAllByText('"mock-etag-1234"').length).toBeGreaterThan(0); // ETag stored
    });

    // Check response header rendering
    expect(
      screen.getAllByText("application/json; charset=UTF-8").length,
    ).toBeGreaterThan(0);
  });

  it("handles 304 Not Modified response correctly", async () => {
    globalThis.fetch = mock(async () => {
      return new Response(null, {
        status: 304,
        headers: new Headers({
          etag: '"mock-etag-1234"',
        }),
      });
    }) as unknown as typeof globalThis.fetch;

    render(<ApiExplorer />);

    fireEvent.click(screen.getByRole("button", { name: "Try it" }));
    fireEvent.click(screen.getByRole("button", { name: "Send Request" }));

    await waitFor(() => {
      expect(screen.getByText("304")).toBeDefined();
      expect(
        screen.getByText("✓ 304 Not Modified — データは変更されていません。"),
      ).toBeDefined();
    });
  });

  it("handles network errors", async () => {
    globalThis.fetch = mock(async () => {
      throw new Error("Network Error");
    }) as unknown as typeof globalThis.fetch;

    render(<ApiExplorer />);

    fireEvent.click(screen.getByRole("button", { name: "Try it" }));
    fireEvent.click(screen.getByRole("button", { name: "Send Request" }));

    await waitFor(() => {
      expect(screen.getByText("エラー:")).toBeDefined();
      expect(screen.getByText(/Network Error/)).toBeDefined();
    });
  });
});
