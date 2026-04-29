import { describe, expect, it } from "bun:test";
import {
  formatJsonBody,
  getStatusBadgeClass,
  parseSubject,
} from "../../app/_utils/formatters";

describe("formatters", () => {
  describe("parseSubject", () => {
    it("should split subject code and name separated by ' : '", () => {
      const result = parseSubject("1234 : Introduction to Computer Science");
      expect(result.code).toBe("1234");
      expect(result.name).toBe("Introduction to Computer Science");
    });

    it("should return empty code if separator is missing", () => {
      const result = parseSubject("Introduction to Computer Science");
      expect(result.code).toBe("");
      expect(result.name).toBe("Introduction to Computer Science");
    });
  });

  describe("formatJsonBody", () => {
    it("should format valid JSON and add preview comment", () => {
      const sample = {
        RoomA: [1, 2],
        RoomB: [3, 4],
        RoomC: [5, 6],
        RoomD: [7, 8],
      };

      const result = formatJsonBody(JSON.stringify(sample), 2, "rooms");

      expect(result).toContain("// Showing 2 of 4 rooms");
      expect(result).toContain('"RoomA"');
      expect(result).toContain('"RoomB"');
      expect(result).not.toContain('"RoomC"');
    });

    it("should return raw string if json is invalid", () => {
      const result = formatJsonBody("not valid json", 2, "rooms");
      expect(result).toBe("not valid json");
    });
  });

  describe("getStatusBadgeClass", () => {
    it("should return emerald class for 2xx status", () => {
      expect(getStatusBadgeClass(200)).toContain("emerald");
      expect(getStatusBadgeClass(299)).toContain("emerald");
    });

    it("should return blue class for 3xx status", () => {
      expect(getStatusBadgeClass(304)).toContain("blue");
      expect(getStatusBadgeClass(399)).toContain("blue");
    });

    it("should return red class for 4xx and 5xx status", () => {
      expect(getStatusBadgeClass(404)).toContain("red");
      expect(getStatusBadgeClass(500)).toContain("red");
    });
  });
});
