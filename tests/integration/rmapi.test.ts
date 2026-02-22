import axios from "axios";
import { describe, it, expect } from "vitest";

// API base URL
const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";
const RM_MTLS_HEADERS = { "X-ClientCert-DN": "CN=rasenmaeher,O=N/A" };
const MAIN_UI_CARD_VISIBLE = ["1", "true", "yes", "on"].includes(
  String(process.env.BL_MAIN_UI_CARD_VISIBLE || "false").trim().toLowerCase(),
);


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
  });

  describe("GET /rmapi/description endpoints", () => {
    it("should return a valid v1 description response", async () => {
      const response = await axios.get(`${API_BASE_URL}/rmapi/api/v1/description/en`, {
        headers: RM_MTLS_HEADERS,
        validateStatus: () => true,
      });

      if (MAIN_UI_CARD_VISIBLE) {
        expect(response.status).to.equal(200);
        expect(response.data).to.be.an("object");
        expect(response.data).to.have.property("shortname");
        expect(response.data.shortname).to.equal("bl");
        expect(response.data).to.have.property("title");
        expect(response.data).to.not.have.property("component");
      } else {
        expect(response.status).to.equal(404);
      }
    });

    it("should return a valid v2 description response", async () => {
      const response = await axios.get(`${API_BASE_URL}/rmapi/api/v2/description/en`, {
        headers: RM_MTLS_HEADERS,
        validateStatus: () => true,
      });

      if (MAIN_UI_CARD_VISIBLE) {
        expect(response.status).to.equal(200);
        expect(response.data).to.be.an("object");
        expect(response.data).to.have.property("shortname");
        expect(response.data.shortname).to.equal("bl");
        expect(response.data).to.have.property("component");
        expect(response.data.component).to.have.property("type");
        expect(response.data.component.type).to.equal("link");
      } else {
        expect(response.status).to.equal(404);
      }
    });

    it("should return a valid admin description response", async () => {
      const response = await axios.get(
        `${API_BASE_URL}/rmapi/api/v2/admin/description/en`,
        { headers: RM_MTLS_HEADERS },
      );

      expect(response.status).to.equal(200);
      expect(response.data).to.be.an("object");
      expect(response.data).to.have.property("shortname");
      expect(response.data.shortname).to.equal("bl");
    });
  });

  describe("POST /rmapi/instructions and data endpoints", () => {
    const userPayload = {
      uuid: "7f6d7c20-5cb7-4f9f-8a4b-4d2d825f1d2a",
      callsign: "RMIntegrationTest",
      x509cert: "-----BEGIN CERTIFICATE-----\\nTEST\\n-----END CERTIFICATE-----",
    };

    it("should return valid instructions payload", async () => {
      const response = await axios.post(
        `${API_BASE_URL}/rmapi/api/v1/instructions/en`,
        userPayload,
        { headers: RM_MTLS_HEADERS },
      );

      expect(response.status).to.equal(200);
      expect(response.data).to.be.an("object");
      expect(response.data).to.have.property("callsign");
      expect(response.data.callsign).to.equal(userPayload.callsign);
      expect(response.data).to.have.property("instructions");
      expect(response.data.instructions).to.be.an("array");
    });

    it("should return valid v2 client data payload", async () => {
      const response = await axios.post(
        `${API_BASE_URL}/rmapi/api/v2/clients/data`,
        userPayload,
        { headers: RM_MTLS_HEADERS },
      );

      expect(response.status).to.equal(200);
      expect(response.data).to.have.property("data");
      expect(response.data.data).to.have.property("url");
    });

    it("should return valid v2 admin client data payload", async () => {
      const response = await axios.post(
        `${API_BASE_URL}/rmapi/api/v2/admin/clients/data`,
        userPayload,
        { headers: RM_MTLS_HEADERS },
      );

      expect(response.status).to.equal(200);
      expect(response.data).to.have.property("data");
      expect(response.data.data).to.have.property("url");
      expect(response.data.data).to.have.property("admin");
      expect(response.data.data.admin).to.equal(true);
    });
  });
});
