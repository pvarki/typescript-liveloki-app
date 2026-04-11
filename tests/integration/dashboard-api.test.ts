import axios from "axios";
import { describe, expect, it } from "vitest";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";

interface DashboardResponse {
  id: string;
  name: string;
  cols: number;
  rowHeight: number;
  layout: string;
  createdAt: string;
  updatedAt: string;
}

function uniqueName() {
  return `Dashboard ${Date.now()} ${Math.random().toString(36).slice(2, 8)}`;
}

describe("Dashboard API Integration Tests", () => {
  it("creates a dashboard with default values", async () => {
    const response = await axios.post<DashboardResponse>(`${API_BASE_URL}/api/dashboards`, {});

    expect(response.status).to.equal(201);
    expect(response.data.name).to.equal("Untitled Dashboard");
    expect(response.data.cols).to.equal(24);
    expect(response.data.rowHeight).to.equal(50);
    expect(response.data.layout).to.equal("[]");

    await axios.delete(`${API_BASE_URL}/api/dashboards/${response.data.id}`);
  });

  it("deletes only the requested dashboard", async () => {
    const first = await axios.post<DashboardResponse>(`${API_BASE_URL}/api/dashboards`, { name: uniqueName(), layout: [] });
    const second = await axios.post<DashboardResponse>(`${API_BASE_URL}/api/dashboards`, { name: uniqueName(), layout: [] });

    await axios.delete(`${API_BASE_URL}/api/dashboards/${first.data.id}`);

    const deleted = await axios.get(`${API_BASE_URL}/api/dashboards/${first.data.id}`, { validateStatus: () => true });
    const retained = await axios.get<DashboardResponse>(`${API_BASE_URL}/api/dashboards/${second.data.id}`);

    expect(deleted.status).to.equal(404);
    expect(retained.status).to.equal(200);

    await axios.delete(`${API_BASE_URL}/api/dashboards/${second.data.id}`);
  });

  it("rejects invalid update layout without mutating the dashboard", async () => {
    const createResponse = await axios.post<DashboardResponse>(`${API_BASE_URL}/api/dashboards`, {
      name: uniqueName(),
      layout: [],
    });

    const invalidUpdate = await axios.put(
      `${API_BASE_URL}/api/dashboards/${createResponse.data.id}`,
      { name: "Should Not Persist", layout: { invalid: true } },
      { validateStatus: () => true },
    );
    expect(invalidUpdate.status).to.equal(400);

    const after = await axios.get<DashboardResponse>(`${API_BASE_URL}/api/dashboards/${createResponse.data.id}`);
    expect(after.data.name).to.equal(createResponse.data.name);
    expect(after.data.layout).to.equal("[]");

    await axios.delete(`${API_BASE_URL}/api/dashboards/${createResponse.data.id}`);
  });

  it("creates, lists, fetches, updates, and deletes a dashboard", async () => {
    const createResponse = await axios.post<DashboardResponse>(`${API_BASE_URL}/api/dashboards`, {
      name: uniqueName(),
      cols: 24,
      rowHeight: 50,
      layout: [],
    });

    expect(createResponse.status).to.equal(201);
    expect(createResponse.data.id).to.be.a("string");
    expect(createResponse.data.layout).to.equal("[]");

    const listResponse = await axios.get<DashboardResponse[]>(`${API_BASE_URL}/api/dashboards`);
    expect(listResponse.status).to.equal(200);
    expect(listResponse.data.some((dashboard) => dashboard.id === createResponse.data.id)).to.equal(true);

    const getResponse = await axios.get<DashboardResponse>(`${API_BASE_URL}/api/dashboards/${createResponse.data.id}`);
    expect(getResponse.status).to.equal(200);
    expect(getResponse.data.id).to.equal(createResponse.data.id);

    const nextLayout = [
      {
        id: "table-1",
        type: "table",
        gridPosition: { x: 0, y: 0, w: 8, h: 5, minW: 5, minH: 4 },
        config: { mode: "battlelog" },
      },
    ];
    const updateResponse = await axios.put<DashboardResponse>(`${API_BASE_URL}/api/dashboards/${createResponse.data.id}`, {
      name: "Updated Dashboard",
      cols: 18,
      rowHeight: 42,
      layout: nextLayout,
    });

    expect(updateResponse.status).to.equal(200);
    expect(updateResponse.data.name).to.equal("Updated Dashboard");
    expect(updateResponse.data.cols).to.equal(18);
    expect(updateResponse.data.rowHeight).to.equal(42);
    expect(JSON.parse(updateResponse.data.layout)).to.deep.equal(nextLayout);

    const deleteResponse = await axios.delete(`${API_BASE_URL}/api/dashboards/${createResponse.data.id}`);
    expect(deleteResponse.status).to.equal(200);
  });

  it("rejects invalid dashboard layout", async () => {
    const response = await axios.post(`${API_BASE_URL}/api/dashboards`, {
      name: uniqueName(),
      layout: { not: "an array" },
    }, { validateStatus: () => true });

    expect(response.status).to.equal(400);
  });

  it("supports /api/v1 dashboard route parity", async () => {
    const response = await axios.post<DashboardResponse>(`${API_BASE_URL}/api/v1/dashboards`, {
      name: uniqueName(),
      layout: [],
    });

    expect(response.status).to.equal(201);
    expect(response.data.id).to.be.a("string");
    await axios.delete(`${API_BASE_URL}/api/v1/dashboards/${response.data.id}`);
  });
});
