import axios from "axios";
import { afterAll, describe, expect, it } from "vitest";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";
const RM_MTLS_HEADERS = { "X-ClientCert-DN": "CN=rasenmaeher,O=N/A" };
const ADMIN_CERT = { "X-ClientCert-DN": "CN=rbac.admin,O=Test" };
const USER_CERT = { "X-ClientCert-DN": "CN=rbac.user,O=Test" };
const ADMIN_UUID = "11111111-aaaa-bbbb-cccc-111111111111";
const USER_UUID = "22222222-aaaa-bbbb-cccc-222222222222";

const createdDashboardIds: string[] = [];

afterAll(async () => {
  for (const id of createdDashboardIds) {
    await axios.delete(`${API_BASE_URL}/api/dashboards/${id}`, {
      headers: ADMIN_CERT,
      validateStatus: () => true,
    });
  }
});

describe("RBAC Dashboard Access Integration Tests", () => {
  it("creates admin and normal user via lifecycle", async () => {
    await axios.post(
      `${API_BASE_URL}/rmapi/api/v1/users/created`,
      { uuid: ADMIN_UUID, callsign: "RBAC Admin", cert_cn: "rbac.admin" },
      { headers: RM_MTLS_HEADERS },
    );
    await axios.post(
      `${API_BASE_URL}/rmapi/api/v1/users/promoted`,
      { uuid: ADMIN_UUID },
      { headers: RM_MTLS_HEADERS },
    );
    await axios.post(
      `${API_BASE_URL}/rmapi/api/v1/users/created`,
      { uuid: USER_UUID, callsign: "RBAC User", cert_cn: "rbac.user" },
      { headers: RM_MTLS_HEADERS },
    );
  });

  it("allows admin to create dashboards", async () => {
    const response = await axios.post(
      `${API_BASE_URL}/api/dashboards`,
      { name: "RBAC Test Dashboard", layout: [] },
      { headers: ADMIN_CERT, validateStatus: () => true },
    );
    if (response.status === 201) {
      createdDashboardIds.push(response.data.id);
    }
    expect(response.status).to.equal(201);
  });

  it("allows any authenticated user to list dashboards", async () => {
    const response = await axios.get(`${API_BASE_URL}/api/dashboards`, {
      headers: USER_CERT,
    });
    expect(response.status).to.equal(200);
    expect(response.data).to.be.an("array");
  });

  it("allows any authenticated user to get a dashboard", async () => {
    if (createdDashboardIds.length === 0) return;
    const response = await axios.get(
      `${API_BASE_URL}/api/dashboards/${createdDashboardIds[0]}`,
      { headers: USER_CERT },
    );
    expect(response.status).to.equal(200);
  });

  it("blocks normal user from creating dashboards", async () => {
    const response = await axios.post(
      `${API_BASE_URL}/api/dashboards`,
      { name: "Should Not Create", layout: [] },
      { headers: USER_CERT, validateStatus: () => true },
    );
    expect(response.status).to.equal(403);
  });

  it("blocks normal user from updating dashboards", async () => {
    if (createdDashboardIds.length === 0) return;
    const response = await axios.put(
      `${API_BASE_URL}/api/dashboards/${createdDashboardIds[0]}`,
      { name: "Should Not Update" },
      { headers: USER_CERT, validateStatus: () => true },
    );
    expect(response.status).to.equal(403);
  });

  it("blocks normal user from deleting dashboards", async () => {
    if (createdDashboardIds.length === 0) return;
    const response = await axios.delete(
      `${API_BASE_URL}/api/dashboards/${createdDashboardIds[0]}`,
      { headers: USER_CERT, validateStatus: () => true },
    );
    expect(response.status).to.equal(403);
  });

  it("returns 401 for unauthenticated dashboard write", async () => {
    const response = await axios.post(
      `${API_BASE_URL}/api/dashboards`,
      { name: "No Auth" },
      { validateStatus: () => true },
    );
    expect(response.status).to.equal(401);
  });

  it("cleans up test users", async () => {
    await axios.post(
      `${API_BASE_URL}/rmapi/api/v1/users/revoked`,
      { uuid: ADMIN_UUID },
      { headers: RM_MTLS_HEADERS },
    );
    await axios.post(
      `${API_BASE_URL}/rmapi/api/v1/users/revoked`,
      { uuid: USER_UUID },
      { headers: RM_MTLS_HEADERS },
    );
  });
});
