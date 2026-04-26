export type SyllabusItem = {
  subject: string;
  room: string;
  season: string;
  open_time: string;
};

export type SyllabusData = Record<string, SyllabusItem[]>;
