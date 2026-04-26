import { describe, expect, it } from "bun:test";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SyllabusDataBrowser from "../../app/_components/SyllabusDataBrowser";
import type { SyllabusData } from "../../app/_types/syllabus";

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

const largeMockData: SyllabusData = {
  LargeRoom: Array.from({ length: 25 }).map((_, i) => ({
    subject: `TEST${i} : テスト科目${i}`,
    room: "LargeRoom",
    season: "前期",
    open_time: `時限${i}`,
  })),
};

describe("SyllabusDataBrowser Component", () => {
  it("renders correctly with given stats", () => {
    render(
      <SyllabusDataBrowser data={mockData} totalRooms={2} totalSubjects={5} />,
    );

    // Stats
    expect(screen.getByText("2")).toBeDefined(); // totalRooms
    expect(screen.getAllByText("5").length).toBe(2); // totalSubjects / highlight count

    // Table items
    expect(screen.getByText("プログラミング基礎")).toBeDefined();
    expect(screen.getByText("基礎数学")).toBeDefined();
    expect(screen.getByText("英語講読")).toBeDefined();
    expect(screen.getByText("歴史学")).toBeDefined();
    expect(screen.getByText("美術史")).toBeDefined();
  });

  it("filters correctly by search text", async () => {
    const user = userEvent.setup();
    render(
      <SyllabusDataBrowser data={mockData} totalRooms={2} totalSubjects={5} />,
    );

    const input = screen.getByPlaceholderText("科目名・教室名で検索...");

    // Type "プログラミング"
    await user.type(input, "プログラミング");

    expect(screen.getByText("プログラミング基礎")).toBeDefined();
    expect(screen.queryByText("基礎数学")).toBeNull();
    expect(screen.queryByText("英語講読")).toBeNull();
  });

  it("filters correctly by room text", async () => {
    const user = userEvent.setup();
    render(
      <SyllabusDataBrowser data={mockData} totalRooms={2} totalSubjects={5} />,
    );

    const input = screen.getByPlaceholderText("科目名・教室名で検索...");

    // Type "202教室"
    await user.type(input, "202");

    expect(screen.queryByText("プログラミング基礎")).toBeNull();
    expect(screen.getByText("英語講読")).toBeDefined();
    expect(screen.getByText("歴史学")).toBeDefined();
  });

  it("filters correctly by season", async () => {
    const user = userEvent.setup();
    render(
      <SyllabusDataBrowser data={mockData} totalRooms={2} totalSubjects={5} />,
    );

    const zenkiButton = screen.getByRole("button", { name: "前期" });
    await user.click(zenkiButton);

    expect(screen.getByText("プログラミング基礎")).toBeDefined();
    expect(screen.queryByText("基礎数学")).toBeNull(); // it's 後期
    expect(screen.getByText("英語講読")).toBeDefined();
    expect(screen.queryByText("歴史学")).toBeNull(); // it's 後期
  });

  it("handles pagination correctly", async () => {
    const user = userEvent.setup();
    render(
      <SyllabusDataBrowser
        data={largeMockData}
        totalRooms={1}
        totalSubjects={25}
      />,
    );

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

  it("handles out-of-bounds page navigation correctly when data shrinks securely using safePage", async () => {
    const user = userEvent.setup();
    const hugeMockData: SyllabusData = {
      Room: Array.from({ length: 45 }).map((_, i) => ({
        subject: `TEST${i} : テスト科目${i}`,
        room: "Room",
        season: "前期",
        open_time: `時限${i}`,
      })),
    };

    const shrunkMockData: SyllabusData = {
      Room: Array.from({ length: 25 }).map((_, i) => ({
        subject: `TEST${i} : テスト科目${i}`,
        room: "Room",
        season: "前期",
        open_time: `時限${i}`,
      })),
    };

    const { rerender } = render(
      <SyllabusDataBrowser
        data={hugeMockData}
        totalRooms={1}
        totalSubjects={45}
      />,
    );

    // Go to page 3
    const nextButton = screen.getByRole("button", { name: "次 →" });
    await user.click(nextButton); // to page 2
    await user.click(nextButton); // to page 3

    expect(screen.getByText("テスト科目40")).toBeDefined();
    expect(screen.getByText("41–45 / 45 件")).toBeDefined();

    // Shrink data (e.g., dynamic prop update filtering external to the component)
    rerender(
      <SyllabusDataBrowser
        data={shrunkMockData}
        totalRooms={1}
        totalSubjects={25}
      />,
    );

    // Because the max page is now 2, safePage shows page 2 items
    expect(screen.getByText("テスト科目20")).toBeDefined();
    expect(screen.getByText("21–25 / 25 件")).toBeDefined();

    // Click Prev
    const prevButton = screen.getByRole("button", { name: "← 前" });
    await user.click(prevButton);

    // safePage is 2, so clicking Prev should bring us to page 1 !
    expect(screen.getByText("テスト科目0")).toBeDefined();
    expect(screen.getByText("1–20 / 25 件")).toBeDefined();
  });

  it("shows empty state when no data matches", async () => {
    const user = userEvent.setup();
    render(
      <SyllabusDataBrowser data={mockData} totalRooms={2} totalSubjects={5} />,
    );

    const input = screen.getByPlaceholderText("科目名・教室名で検索...");
    await user.type(input, "NO_MATCH_TEXT");

    expect(screen.getByText("該当するデータがありません")).toBeDefined();
    expect(screen.getByText("0")).toBeDefined(); // items count updated
  });
});
