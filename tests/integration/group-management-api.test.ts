import axios from "axios";
import { describe, it, expect } from "vitest";
import type { AxiosResponse } from "axios";

// API base URL
const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";

// Add these interface definitions after the existing ones
interface Group {
  groupName: string;
  eventIds: string[];
}

interface GroupCreateRequest {
  groupName: string;
  eventIds: string[];
}

interface GroupCreateResponse {
  message: string;
  eventCount: number;
}

// Add this test data after the existing sampleEvent
const sampleGroupRequest: GroupCreateRequest = {
  groupName: `TestGroup${Date.now()}`,
  eventIds: [
    "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    "550e8400-e29b-41d4-a716-446655440000"
  ]
};

// Add this new test suite at the end of the file
describe("Groups API Integration Tests", () => {

  describe("GET /api/v1/groups", () => {
    it("should return a list of existing groups", async () => {
      const response = await axios.get(`${API_BASE_URL}/api/v1/groups`);

      // Status code should be 200
      expect(response.status).to.equal(200);

      // Response should be an array
      expect(response.data).to.be.an("array");

      // Each group should have the expected structure if any exist
      if (response.data.length > 0) {
        const group = response.data[0];
        expect(group).to.have.property("group_name");
        expect(group.group_name).to.be.a("string");
      }
    });
  });

  describe("GET /api/v1/groups/{groupName}", () => {
    it("should return group details for an existing group", async () => {
      // First create a group
      const uniqueGroupName = `TestGroupDetails${Date.now()}`;
      const groupRequest = {
        ...sampleGroupRequest,
        groupName: uniqueGroupName,
        eventIds: ["0197b30c-9acd-7e4a-b757-e51550b03376", "0197b30c-9acd-7006-8446-e6ee745686ee"] // From preseed data
      };

      await axios.post(`${API_BASE_URL}/api/v1/groups`, groupRequest);

      // Then get the group details
      const response = await axios.get(`${API_BASE_URL}/api/v1/groups/${uniqueGroupName}`);

      // Status code should be 200
      expect(response.status).to.equal(200);

      // Response should contain group information
      expect(response.data).to.be.an("array");
      // Note: The actual response structure may vary based on implementation
      // Adjust these assertions based on your API's actual response format
    });
  });

  describe("GET /api/event/{eventId}", () => {

    it("should handle existent event ID", async () => {
      const eventId = "0197b30c-9acd-7f21-94d6-0fb19cb05543";

      const response = await axios.get(`${API_BASE_URL}/api/v1/event/${eventId}`);

      expect(response.status).to.equal(200);
      expect(response.data).to.be.an("object");
      expect(response.data.groups).to.be.an("array");
      expect(response.data.groups.length).to.equal(1);
      expect(response.data.groups).to.contain("Group 1");
    });

    it("should handle non-existent event ID", async () => {
      const nonExistentEventId = "00000000-0000-0000-0000-000000000000";

      try {
        await axios.get(`${API_BASE_URL}/api/event/${nonExistentEventId}`);
        throw new Error("Expected request to fail with 404 status");
      } catch (error: any) {
        if (axios.isAxiosError(error)) {
          expect(error.response?.status).to.equal(404);
        } else {
          throw error;
        }
      }
    });

  });
});