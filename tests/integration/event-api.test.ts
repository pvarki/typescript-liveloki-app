import axios from "axios";
import { describe, it, expect } from "vitest";
import type { AxiosResponse } from "axios";

// API base URL
const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";

// Type definitions based on the OpenAPI schema
interface Event {
  id: string;
  header: string;
  link: string;
  source: string;
  admiralty_reliability: string;
  admiralty_accuracy: string;
  keywords: string[];
  event_time: string;
  creation_time: string;
  notes: string;
  hcoe_domains: string | string[];
  location: string;
  location_lng: string | number;
  location_lat: string | number;
  author: string;
  groups: string[];
  type: string;
  data: Record<string, unknown>;
}

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
  notes?: string;
  groups?: string[];
  type?: string;
  data?: Record<string, unknown>;
}

interface KeywordCount {
  [keyword: string]: number;
}

// Test data for creating a new event
const sampleEvent: EventInput = {
  header: "Test Event",
  link: "https://example.com/test-event",
  source: "Integration Test",
  admiralty_reliability: "A",
  admiralty_accuracy: "1",
  event_time: new Date().toISOString(),
  keywords: ["test", "integration", "TESTI"],
  hcoe_domains: ["Cyber", "Information"],
  location: "Test Location",
  author: "Integration Tester",
  location_lat: "60.1695",
  location_lng: "24.9354",
};

const expectCreated = (response: AxiosResponse) => {
  expect(response.status, JSON.stringify(response.data)).to.equal(201);
};

describe("Event API Integration Tests", () => {
  describe("GET /api/v1/events", () => {
    it("should return an array of events", async () => {
      const response: AxiosResponse<Event[]> = await axios.get(
        `${API_BASE_URL}/api/v1/events`,
      );

      // Status code should be 200
      expect(response.status).to.equal(200);

      // Response should be an array
      expect(response.data).to.be.an("array");

      // If there are events, check the structure of the first event
      if (response.data.length > 0) {
        const event = response.data[0];
        expect(event).to.have.property("id");
        expect(event).to.have.property("header");
        expect(event).to.have.property("link");
        expect(event).to.have.property("source");
        expect(event).to.have.property("admiralty_reliability");
        expect(event).to.have.property("admiralty_accuracy");
        expect(event).to.have.property("keywords").that.is.an("array");
        expect(event).to.have.property("event_time");
        expect(event).to.have.property("creation_time");
        expect(event).to.have.property("notes");
        expect(event).to.have.property("location");
        expect(event).to.have.property("location_lng");
        expect(event).to.have.property("location_lat");
        expect(event).to.have.property("author");
      }
    });

    it("should return all event table columns for created events", async () => {
      const uniqueHeader = `GET Columns Test Event ${Date.now()}`;
      const eventWithAllColumns: EventInput = {
        header: uniqueHeader,
        link: "https://example.com/get-columns-test",
        source: "Integration Test Source",
        admiralty_reliability: "B",
        admiralty_accuracy: "2",
        keywords: ["get-test", "columns", "TESTI"],
        event_time: "2026-05-23T10:15:00.000Z",
        notes: "GET should return every event table column.",
        hcoe_domains: ["Cyber", "Space"],
        location: "Helsinki",
        location_lng: "24.9384",
        location_lat: "60.1699",
        author: "Integration Tester",
        groups: ["GET Test Group", "Column Coverage"],
        type: "integration-test",
        data: {
          severity: "medium",
          observedBy: "vitest",
          nested: { verified: true },
        },
      };

      const createResponse = await axios.post(`${API_BASE_URL}/api/v1/events`, {
        events: [eventWithAllColumns],
      }, { validateStatus: () => true });
      expectCreated(createResponse);

      const response: AxiosResponse<Event[]> = await axios.get(
        `${API_BASE_URL}/api/v1/events`,
      );
      const foundEvent = response.data.find((event) => event.header === uniqueHeader);

      expect(foundEvent).to.not.be.undefined;
      expect(foundEvent).to.include({
        header: eventWithAllColumns.header,
        link: eventWithAllColumns.link,
        source: eventWithAllColumns.source,
        admiralty_reliability: eventWithAllColumns.admiralty_reliability,
        admiralty_accuracy: eventWithAllColumns.admiralty_accuracy,
        event_time: eventWithAllColumns.event_time,
        notes: eventWithAllColumns.notes,
        location: eventWithAllColumns.location,
        author: eventWithAllColumns.author,
        type: eventWithAllColumns.type,
      });
      expect(foundEvent).to.have.property("id").that.is.a("string");
      expect(foundEvent).to.have.property("creation_time").that.is.a("string");
      expect(foundEvent?.keywords).to.deep.equal(eventWithAllColumns.keywords);
      expect(foundEvent?.hcoe_domains).to.deep.equal(eventWithAllColumns.hcoe_domains);
      expect(Number(foundEvent?.location_lng)).to.equal(Number(eventWithAllColumns.location_lng));
      expect(Number(foundEvent?.location_lat)).to.equal(Number(eventWithAllColumns.location_lat));
      expect(foundEvent?.groups).to.deep.equal(eventWithAllColumns.groups);
      expect(foundEvent?.data).to.deep.equal(eventWithAllColumns.data);
    });
  });

  describe("POST /api/v1/events", () => {
    it("should create a new event", async () => {
      const response = await axios.post(`${API_BASE_URL}/api/v1/events`, {
        events: [sampleEvent],
      }, { validateStatus: () => true });

      // Status code should be 201 (Created)
      expectCreated(response);

      // Response should have a message property
      expect(response.data).to.have.property("message");
    });

    it("should persist notes and HCOE domains columns", async () => {
      const uniqueHeader = `Columns Test Event ${Date.now()}`;
      const eventWithColumns = {
        ...sampleEvent,
        header: uniqueHeader,
        notes: "This note verifies the notes column.",
        hcoe_domains: ["Cyber", "Information"],
      };

      const createResponse = await axios.post(`${API_BASE_URL}/api/v1/events`, {
        events: [eventWithColumns],
      }, { validateStatus: () => true });
      expectCreated(createResponse);

      const eventsResponse: AxiosResponse<Event[]> = await axios.get(
        `${API_BASE_URL}/api/v1/events`,
      );
      const foundEvent = eventsResponse.data.find((event) => event.header === uniqueHeader);

      expect(foundEvent).to.not.be.undefined;
      expect(foundEvent?.notes).to.equal(eventWithColumns.notes);
      expect(foundEvent?.hcoe_domains).to.deep.equal(eventWithColumns.hcoe_domains);
    });

    it("should reject an invalid event submission", async () => {
      // Missing required fields
      const invalidEvent = {
        events: [{ hcoe_domains: "H" }],
      };

      // Expect the request to be rejected
      try {
        await axios.post(`${API_BASE_URL}/api/v1/events`, invalidEvent);
        // If we reach here, the request didn't fail as expected
        throw new Error("Expected request to fail with 400 status");
      } catch (error: any) {
        if (axios.isAxiosError(error)) {
          expect(error.response?.status).to.equal(400);
        } else {
          throw error; // Re-throw if it's not an axios error
        }
      }
    });
  });

  describe("GET /api/v1/keywords", () => {
    it("should return a dictionary of keywords with counts", async () => {
      const response: AxiosResponse<KeywordCount> = await axios.get(
        `${API_BASE_URL}/api/v1/keywords`,
      );

      // Status code should be 200
      expect(response.status).to.equal(200);

      // Response should be an object
      expect(response.data).to.be.an("object");

      // Each value should be a number (count)
      for (const count of Object.values(response.data)) {
        expect(count).to.be.a("number");
      }

      // Check if our test keyword exists (after posting a test event)
      // Note: This test might fail if the test event wasn't successfully created
      if (response.data["TESTI"] !== undefined) {
        expect(response.data["TESTI"]).to.be.a("number");
        expect(response.data["TESTI"]).to.be.at.least(1);
      }
    });
  });

  describe("End-to-end flow", () => {
    it("should create an event and then retrieve it", async () => {
      // First, create a unique test event
      const uniqueHeader = `Test Event ${Date.now()}`;
      const uniqueEvent = {
        ...sampleEvent,
        header: uniqueHeader,
      };

      // Create the event
      const createResponse = await axios.post(`${API_BASE_URL}/api/v1/events`, {
        events: [uniqueEvent],
      }, { validateStatus: () => true });
      expectCreated(createResponse);

      // Get all events
      const getAllResponse: AxiosResponse<Event[]> = await axios.get(
        `${API_BASE_URL}/api/v1/events`,
      );
      expect(getAllResponse.status).to.equal(200);

      // Find our created event
      const foundEvent = getAllResponse.data.find(
        (event) => event.header === uniqueHeader,
      );
      expect(foundEvent).to.not.be.undefined;

      if (foundEvent) {
        expect(foundEvent.header).to.equal(uniqueHeader);
        expect(foundEvent.source).to.equal(uniqueEvent.source);
        expect(foundEvent.author).to.equal(uniqueEvent.author);

        // Check if keywords were properly associated
        uniqueEvent.keywords.forEach((keyword) => {
          expect(foundEvent.keywords).to.include(keyword);
        });
      }
    });
  });
});

describe("Keywords API Integration Tests", () => {
  it("should verify that keywords posted with events appear in the keywords endpoint", async () => {
    // Create a unique keyword for this test
    const uniqueKeyword = `TestKeyword${Date.now()}`;

    // Create an event with this unique keyword
    const eventWithUniqueKeyword = {
      ...sampleEvent,
      keywords: [uniqueKeyword, "TESTI"],
      header: `Event with ${uniqueKeyword}`,
    };

    // Create the event
    const createResponse = await axios.post(`${API_BASE_URL}/api/v1/events`, {
      events: [eventWithUniqueKeyword],
    }, { validateStatus: () => true });
    expectCreated(createResponse);

    // Wait a moment for backend processing
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Get keywords
    const keywordsResponse: AxiosResponse<KeywordCount> = await axios.get(
      `${API_BASE_URL}/api/v1/keywords`,
    );

    // The unique keyword should be in the response
    // Note: This test may be flaky if the API has a delay in updating keyword counts
    expect(keywordsResponse.data).to.have.property(uniqueKeyword);
    if (keywordsResponse.data[uniqueKeyword]) {
      expect(keywordsResponse.data[uniqueKeyword]).to.be.at.least(1);
    }
  });
});
