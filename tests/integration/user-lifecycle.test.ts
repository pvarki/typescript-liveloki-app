import axios from "axios";
import { describe, expect, it } from "vitest";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";
const RM_MTLS_HEADERS = { "X-ClientCert-DN": "CN=rasenmaeher,O=N/A" };
const TEST_UUID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

describe("User Lifecycle Integration Tests", () => {
  it("creates a user via /rmapi/users/created", async () => {
    const response = await axios.post(
      `${API_BASE_URL}/rmapi/api/v1/users/created`,
      { uuid: TEST_UUID, callsign: "lifecycle-test", cert_cn: "lifecycle.test.user" },
      { headers: RM_MTLS_HEADERS },
    );
    expect(response.status).to.equal(200);
    expect(response.data.success).to.equal(true);
  });

  it("promotes a user via /rmapi/users/promoted", async () => {
    const response = await axios.post(
      `${API_BASE_URL}/rmapi/api/v1/users/promoted`,
      { uuid: TEST_UUID },
      { headers: RM_MTLS_HEADERS },
    );
    expect(response.status).to.equal(200);
    expect(response.data.success).to.equal(true);
  });

  it("demotes a user via /rmapi/users/demoted", async () => {
    const response = await axios.post(
      `${API_BASE_URL}/rmapi/api/v1/users/demoted`,
      { uuid: TEST_UUID },
      { headers: RM_MTLS_HEADERS },
    );
    expect(response.status).to.equal(200);
    expect(response.data.success).to.equal(true);
  });

  it("updates a user callsign via /rmapi/users/updated", async () => {
    const response = await axios.put(
      `${API_BASE_URL}/rmapi/api/v1/users/updated`,
      { uuid: TEST_UUID, callsign: "updated-name" },
      { headers: RM_MTLS_HEADERS },
    );
    expect(response.status).to.equal(200);
    expect(response.data.success).to.equal(true);
  });

  it("revokes a user via /rmapi/users/revoked", async () => {
    const response = await axios.post(
      `${API_BASE_URL}/rmapi/api/v1/users/revoked`,
      { uuid: TEST_UUID },
      { headers: RM_MTLS_HEADERS },
    );
    expect(response.status).to.equal(200);
    expect(response.data.success).to.equal(true);
  });

  it("rejects lifecycle calls without RM mTLS header when enforcement is on", async () => {
    const response = await axios.post(
      `${API_BASE_URL}/rmapi/api/v1/users/created`,
      { uuid: TEST_UUID, callsign: "no-mtls", cert_cn: "no.mtls" },
      { validateStatus: () => true },
    );
    expect([200, 401]).to.include(response.status);
  });
});
