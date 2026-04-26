import type { Metadata } from "next";
import ApiExplorer from "./_components/ApiExplorer";
import SyllabusDataBrowser from "./_components/SyllabusDataBrowser";
import type { SyllabusData } from "./_types/syllabus";
import syllabusData from "./data/shaped_data.json";

export const metadata: Metadata = {
  title: "Syllabus API",
  description: "シラバス情報取得 REST API",
};

const data = syllabusData as unknown as SyllabusData;

export default function Home() {
  const totalRooms = Object.keys(data).length;
  const totalSubjects = Object.values(data).reduce(
    (sum, items) => sum + items.length,
    0,
  );

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="bg-slate-900 text-white px-4 sm:px-6 py-6 shadow-sm">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-baseline gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Syllabus API</h1>
            <span className="text-xs font-mono bg-slate-700 px-2 py-0.5 rounded text-slate-300">
              v1
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            シラバス情報取得 REST API —
            エンドポイントの確認とデータの閲覧ができます
          </p>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-10">
        <section>
          <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
            Endpoints
          </h2>
          <ApiExplorer />
        </section>

        <section>
          <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
            Data Browser
          </h2>
          <SyllabusDataBrowser
            data={data}
            totalRooms={totalRooms}
            totalSubjects={totalSubjects}
          />
        </section>
      </div>
    </main>
  );
}
