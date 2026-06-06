import type { ReactDoctorConfig } from "react-doctor/api";

export default {
  verbose: true,
  diff: false,
  ignore: {
    files: ["tests/**"],
  },
} satisfies ReactDoctorConfig;
