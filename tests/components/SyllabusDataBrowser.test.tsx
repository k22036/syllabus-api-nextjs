import { describe, expect, it } from "bun:test";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SyllabusDataBrowser from "../../app/_components/SyllabusDataBrowser";
import type { SyllabusData } from "../../app/_types/syllabus";

// ============================================================================
// Mock Data Helpers
// ============================================================================

const mockData: SyllabusData = {
  "101教室": [
    {
      subject: "COMP101 : プログラミング基礎",
      room: "101教室",
      season: "前期",
      open_time: "月1",
    },
    {
      subject: "MATH101 : 基礎数学",
      room: "101教室",
      season: "後期",
      open_time: "火2",
    },
  ],
  "202教室": [
    {
      subject: "ENG201 : 英語講読",
      room: "202教室",
      season: "前期",
      open_time: "水3",
    },
    {
      subject: "HIST101 : 歴史学",
      room: "202教室",
      season: "後期",
      open_time: "木4",
    },
    {
      subject: "ART101 : 美術史",
      room: "202教室",
      season: "前期",
      open_time: "金5",
    },
  ],
};

const generateMockData = (length: number, roomName = "Room"): SyllabusData => ({
  [roomName]: Array.from({ length }).map((_, i) => ({
    subject: `TEST${i} : テスト科目${i}`,
    room: roomName,
    season: "前期",
    open_time: `時限${i}`,
  })),
});

// ============================================================================
// Test Helpers
// ============================================================================

function expectStatCard(label: string, value: string) {
  const parentContainer = screen.getByText(label).parentElement as HTMLElement;
  expect(within(parentContainer).getByText(value)).toBeDefined();
}

function renderComponent(
  props: Partial<React.ComponentProps<typeof SyllabusDataBrowser>> = {},
) {
  const defaultProps = {
    data: mockData,
    totalRooms: 2,
    totalSubjects: 5,
  };
  const result = render(<SyllabusDataBrowser {...defaultProps} {...props} />);
  const user = userEvent.setup();
  return { ...result, user };
}

// ============================================================================
// Tests
// ============================================================================

describe("SyllabusDataBrowser Component", () => {
  describe("Rendering", () => {
    it("renders correctly with given stats", () => {
      renderComponent();

      // Stats
      expectStatCard("教室数", "2");
      expectStatCard("授業数", "5");
      expectStatCard("絞り込み結果", "5");

      // Table items
      expect(screen.getByText("プログラミング基礎")).toBeDefined();
      expect(screen.getByText("基礎数学")).toBeDefined();
      expect(screen.getByText("英語講読")).toBeDefined();
      expect(screen.getByText("歴史学")).toBeDefined();
      expect(screen.getByText("美術史")).toBeDefined();
    });
  });

  describe("Filtering", () => {
    it("filters correctly by search text", async () => {
      const { user } = renderComponent();
      const input = screen.getByPlaceholderText("科目名・教室名で検索...");

      await user.type(input, "プログラミング");

      expect(screen.getByText("プログラミング基礎")).toBeDefined();
      expect(screen.queryByText("基礎数学")).toBeNull();
      expect(screen.queryByText("英語講読")).toBeNull();
    });

    it("filters correctly by room text", async () => {
      const { user } = renderComponent();
      const input = screen.getByPlaceholderText("科目名・教室名で検索...");

      await user.type(input, "202");

      expect(screen.queryByText("プログラミング基礎")).toBeNull();
      expect(screen.getByText("英語講読")).toBeDefined();
      expect(screen.getByText("歴史学")).toBeDefined();
    });

    it("filters correctly by season", async () => {
      const { user } = renderComponent();
      const zenkiButton = screen.getByRole("button", { name: "前期" });

      await user.click(zenkiButton);

      expect(screen.getByText("プログラミング基礎")).toBeDefined();
      expect(screen.queryByText("基礎数学")).toBeNull(); // it's 後期
      expect(screen.getByText("英語講読")).toBeDefined();
      expect(screen.queryByText("歴史学")).toBeNull(); // it's 後期
    });

    it("shows empty state and disables CSV export when no results found", async () => {
      const { user } = renderComponent();
      const input = screen.getByPlaceholderText("科目名・教室名で検索...");

      await user.type(input, "存在しない科目");

      expect(screen.getByText("該当するデータがありません")).toBeDefined();

      const csvButton = screen.getByRole("button", { name: "CSVエクスポート" });
      expect(csvButton).toHaveProperty("disabled", true);
    });

    it("resets to page 1 when filter conditions change", async () => {
      const { user } = renderComponent({
        data: generateMockData(25, "LargeRoom"),
        totalRooms: 1,
        totalSubjects: 25,
      });

      // Go to page 2 first
      const nextButton = screen.getByRole("button", { name: "次 →" });
      await user.click(nextButton);
      expect(screen.getByText("21–25 / 25 件")).toBeDefined();

      // Change search text
      const input = screen.getByPlaceholderText("科目名・教室名で検索...");
      await user.type(input, "TEST");

      // Should be back to page 1 immediately
      expect(screen.getByText("1–20 / 25 件")).toBeDefined();
    });
  });

  describe("Pagination", () => {
    it("handles pagination correctly", async () => {
      const { user } = renderComponent({
        data: generateMockData(25, "LargeRoom"),
        totalRooms: 1,
        totalSubjects: 25,
      });

      // Should show items up to PAGE_SIZE (20)
      expect(screen.getByText("テスト科目0")).toBeDefined();
      expect(screen.getByText("テスト科目19")).toBeDefined();
      expect(screen.queryByText("テスト科目20")).toBeNull();

      // Check pagination metadata text
      expect(screen.getByText("1–20 / 25 件")).toBeDefined();

      // Go to next page
      const nextButton = screen.getByRole("button", { name: "次 →" });
      await user.click(nextButton);

      expect(screen.queryByText("テスト科目0")).toBeNull();
      expect(screen.getByText("テスト科目20")).toBeDefined();
      expect(screen.getByText("テスト科目24")).toBeDefined();
      expect(screen.getByText("21–25 / 25 件")).toBeDefined();
    });

    it("handles previous page navigation correctly", async () => {
      const { user } = renderComponent({
        data: generateMockData(25, "LargeRoom"),
        totalRooms: 1,
        totalSubjects: 25,
      });

      const prevButton = screen.getByRole("button", { name: "← 前" });
      const nextButton = screen.getByRole("button", { name: "次 →" });

      // Prev button should be disabled initially
      expect(prevButton).toHaveProperty("disabled", true);

      // Go to next page
      await user.click(nextButton);
      expect(screen.getByText("21–25 / 25 件")).toBeDefined();
      expect(prevButton).toHaveProperty("disabled", false); // Now enabled

      // Go back to previous page
      await user.click(prevButton);
      expect(screen.getByText("1–20 / 25 件")).toBeDefined();
      expect(prevButton).toHaveProperty("disabled", true); // Disabled again
    });

    it("handles out-of-bounds page navigation correctly when data shrinks securely using safePage", async () => {
      const hugeData = generateMockData(45);
      const shrunkData = generateMockData(25);

      const { user, rerender } = renderComponent({
        data: hugeData,
        totalRooms: 1,
        totalSubjects: 45,
      });

      // Go to page 3
      const nextButton = screen.getByRole("button", { name: "次 →" });
      await user.click(nextButton); // to page 2
      await user.click(nextButton); // to page 3

      expect(screen.getByText("テスト科目40")).toBeDefined();
      expect(screen.getByText("41–45 / 45 件")).toBeDefined();

      // Shrink data (dynamic prop update)
      rerender(
        <SyllabusDataBrowser
          data={shrunkData}
          totalRooms={1}
          totalSubjects={25}
        />,
      );

      // Safe page falls back to max (page 2)
      expect(screen.getByText("テスト科目20")).toBeDefined();
      expect(screen.getByText("21–25 / 25 件")).toBeDefined();
    });
  });
});
