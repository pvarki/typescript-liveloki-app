import axios from "axios";
import { describe, it, expect } from "vitest";
import type { AxiosResponse } from "axios";

// API base URL
const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";


describe("RMAPI Integration Tests", () => {

  describe("GET /rmapi/healthcheck", () => {
    it("should return a valid healthcheck response", async () => {
      const response = await axios.get(`${API_BASE_URL}/rmapi/api/v1/healthcheck`);

      // Status code should be 200
      expect(response.status).to.equal(200);

      // Response should be an array
      expect(response.data).to.be.an("object");

      const hcResult = response.data;
      expect(hcResult).to.have.property("healthy");
      expect(hcResult.healthy).to.equal(true);
    });

    it("should return a valid description response", async () => {
      const response = await axios.get(`${API_BASE_URL}/rmapi/api/v2/admin/description/en`);

      // Status code should be 200
      expect(response.status).to.equal(200);

      // Response should be an array
      expect(response.data).to.be.an("object");

      const hcResult = response.data;
      expect(hcResult).to.have.property("shortname");
      expect(hcResult.shortname).to.equal("battlelog");
    });
  });
})
