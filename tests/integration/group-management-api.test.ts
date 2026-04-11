import axios from "axios";
import { describe, expect, it } from "vitest";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";

interface EventInput {
  header: string;
  link: string;
  source: string;
  admiralty_reliability: string;
  admiralty_accuracy: string;
  event_time: string;
  keywords: string[];
  hcoe_domains: string[];
  location: string;
  author: string;
  location_lat: string;
  location_lng: string;
}

function sampleEvent(header: string): EventInput {
  return {
    header,
    link: "https://example.com/group-test",
    source: "Group Integration Test",
    admiralty_reliability: "A",
    admiralty_accuracy: "1",
    event_time: new Date().toISOString(),
    keywords: ["group-test"],
    hcoe_domains: ["Cyber"],
    location: "Test Location",
    author: "Integration Tester",
    location_lat: "60.1695",
    location_lng: "24.9354",
  };
}

async function createEventAndReturnId(header: string): Promise<string> {
  await axios.post(`${API_BASE_URL}/api/events`, { events: [sampleEvent(header)] });
  const eventsResponse = await axios.get(`${API_BASE_URL}/api/events`);
  const created = eventsResponse.data.find((event: { header: string }) => event.header === header);
  expect(created).to.not.be.undefined;
  return String(created.id);
}

describe("Groups API Integration Tests", () => {
  describe("GET /api/groups", () => {
    it("should return a list of existing groups", async () => {
      const response = await axios.get(`${API_BASE_URL}/api/groups`);

      expect(response.status).to.equal(200);
      expect(response.data).to.be.an("array");

      if (response.data.length > 0) {
        const group = response.data[0];
        expect(group).to.have.property("group_name");
        expect(group.group_name).to.be.a("string");
      }
    });
  });

  describe("GET /api/groups/{groupName}", () => {
    it("should return group details for an existing group", async () => {
      const uniqueGroupName = `TestGroupDetails${Date.now()}`;
      const eventIds = [
        await createEventAndReturnId(`Group detail event A ${Date.now()}`),
        await createEventAndReturnId(`Group detail event B ${Date.now()}`),
      ];

      await axios.post(`${API_BASE_URL}/api/groups`, { groupName: uniqueGroupName, eventIds });

      const response = await axios.get(`${API_BASE_URL}/api/groups/${encodeURIComponent(uniqueGroupName)}`);

      expect(response.status).to.equal(200);
      expect(response.data).to.be.an("array");
      expect(response.data.length).to.be.at.least(1);
    });
  });

  describe("GET /api/event/{eventId}", () => {
    it("should handle existent event ID", async () => {
      const groupName = `EventDetailGroup${Date.now()}`;
      const eventId = await createEventAndReturnId(`Grouped event ${Date.now()}`);

      await axios.post(`${API_BASE_URL}/api/groups`, { groupName, eventIds: [eventId] });
      const response = await axios.get(`${API_BASE_URL}/api/event/${eventId}`);

      expect(response.status).to.equal(200);
      expect(response.data).to.be.an("object");
      expect(response.data.groups).to.be.an("array");
      expect(response.data.groups).to.contain(groupName);
    });

    it("should handle non-existent event ID", async () => {
      const nonExistentEventId = "00000000-0000-0000-0000-000000000000";

      try {
        await axios.get(`${API_BASE_URL}/api/event/${nonExistentEventId}`);
        throw new Error("Expected request to fail with 404 status");
      } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
          expect(error.response?.status).to.equal(404);
        } else {
          throw error;
        }
      }
    });
  });
});
