import { describe, expect, it } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";
import SyllabusDataBrowser from "../../app/_components/SyllabusDataBrowser";

const mockData = {
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

  it("filters correctly by search text", () => {
    render(
      <SyllabusDataBrowser data={mockData} totalRooms={2} totalSubjects={5} />,
    );

    const input = screen.getByPlaceholderText("科目名・教室名で検索...");

    // Type "プログラミング"
    fireEvent.change(input, { target: { value: "プログラミング" } });

    expect(screen.getByText("プログラミング基礎")).toBeDefined();
    expect(screen.queryByText("基礎数学")).toBeNull();
    expect(screen.queryByText("英語講読")).toBeNull();
  });

  it("filters correctly by room text", () => {
    render(
      <SyllabusDataBrowser data={mockData} totalRooms={2} totalSubjects={5} />,
    );

    const input = screen.getByPlaceholderText("科目名・教室名で検索...");

    // Type "202教室"
    fireEvent.change(input, { target: { value: "202" } });

    expect(screen.queryByText("プログラミング基礎")).toBeNull();
    expect(screen.getByText("英語講読")).toBeDefined();
    expect(screen.getByText("歴史学")).toBeDefined();
  });

  it("filters correctly by season", () => {
    render(
      <SyllabusDataBrowser data={mockData} totalRooms={2} totalSubjects={5} />,
    );

    const zenkiButton = screen.getByRole("button", { name: "前期" });
    fireEvent.click(zenkiButton);

    expect(screen.getByText("プログラミング基礎")).toBeDefined();
    expect(screen.queryByText("基礎数学")).toBeNull(); // it's 後期
    expect(screen.getByText("英語講読")).toBeDefined();
    expect(screen.queryByText("歴史学")).toBeNull(); // it's 後期
  });

  it("handles pagination correctly", () => {
    // Generate 25 items to test pagination
    const largeMockData: Record<
      string,
      { subject: string; room: string; season: string; open_time: string }[]
    > = {
      LargeRoom: Array.from({ length: 25 }).map((_, i) => ({
        subject: `TEST${i} : テスト科目${i}`,
        room: "LargeRoom",
        season: "前期",
        open_time: `時限${i}`,
      })),
    };

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
    fireEvent.click(nextButton);

    expect(screen.queryByText("テスト科目0")).toBeNull();
    expect(screen.getByText("テスト科目20")).toBeDefined();
    expect(screen.getByText("テスト科目24")).toBeDefined();
    expect(screen.getByText("21–25 / 25 件")).toBeDefined();
  });

  it("shows empty state when no data matches", () => {
    render(
      <SyllabusDataBrowser data={mockData} totalRooms={2} totalSubjects={5} />,
    );

    const input = screen.getByPlaceholderText("科目名・教室名で検索...");
    fireEvent.change(input, { target: { value: "NO_MATCH_TEXT" } });

    expect(screen.getByText("該当するデータがありません")).toBeDefined();
    expect(screen.getByText("0")).toBeDefined(); // items count updated
  });
});
