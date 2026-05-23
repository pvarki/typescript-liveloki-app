export const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'BattleLog API',
    version: '1.1.0',
    description: 'Live OpenAPI documentation for the BattleLog backend.',
  },
  servers: [{ url: '/api/v1' }],
  tags: [
    { name: 'Events' },
    { name: 'Dashboards' },
    { name: 'Groups' },
    { name: 'Metrics' },
    { name: 'Uploads' },
  ],
  paths: {
    '/events': {
      get: {
        tags: ['Events'],
        summary: 'List events',
        parameters: [
          {
            name: 'search',
            in: 'query',
            required: false,
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: {
            description: 'Events',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Event' } },
              },
            },
          },
        },
      },
      post: {
        tags: ['Events'],
        summary: 'Create events',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['events'],
                properties: {
                  events: { type: 'array', items: { $ref: '#/components/schemas/EventInput' } },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Events added successfully' },
          400: { $ref: '#/components/responses/Error' },
        },
      },
    },
    '/event/{id}': {
      get: {
        tags: ['Events'],
        summary: 'Get one event',
        parameters: [{ $ref: '#/components/parameters/EventId' }],
        responses: {
          200: {
            description: 'Event',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Event' } } },
          },
          404: { $ref: '#/components/responses/Error' },
        },
      },
    },
    '/events/trending/day': {
      get: {
        tags: ['Events'],
        summary: 'Get trending events from the last day',
        responses: { 200: { description: 'Trending events' } },
      },
    },
    '/events/trending/week': {
      get: {
        tags: ['Events'],
        summary: 'Get trending events from the last week',
        responses: { 200: { description: 'Trending events' } },
      },
    },
    '/keywords': {
      get: {
        tags: ['Events'],
        summary: 'Get keyword counts',
        responses: {
          200: {
            description: 'Keyword counts keyed by keyword',
            content: {
              'application/json': {
                schema: { type: 'object', additionalProperties: { type: 'integer' } },
              },
            },
          },
        },
      },
    },
    '/locationsearch': {
      get: {
        tags: ['Events'],
        summary: 'Search events by location radius',
        parameters: [
          { name: 'longitude', in: 'query', required: true, schema: { type: 'number' } },
          { name: 'latitude', in: 'query', required: true, schema: { type: 'number' } },
          { name: 'radius', in: 'query', required: true, schema: { type: 'number' } },
        ],
        responses: {
          200: {
            description: 'Events inside radius',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Event' } },
              },
            },
          },
          400: { $ref: '#/components/responses/Error' },
        },
      },
    },
    '/metrics': {
      get: {
        tags: ['Metrics'],
        summary: 'Get event metrics',
        responses: { 200: { description: 'Metrics' } },
      },
    },
    '/upload': {
      post: {
        tags: ['Uploads'],
        summary: 'Upload event media',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  eventId: { type: 'string' },
                  files: { type: 'array', items: { type: 'string', format: 'binary' } },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Images uploaded successfully' } },
      },
    },
    '/groups': {
      get: {
        tags: ['Groups'],
        summary: 'List groups',
        responses: {
          200: {
            description: 'Groups',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Group' } },
              },
            },
          },
        },
      },
      post: {
        tags: ['Groups'],
        summary: 'Create a group from event ids',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['eventIds', 'groupName'],
                properties: {
                  eventIds: { type: 'array', items: { type: 'string' } },
                  groupName: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Group created' } },
      },
    },
    '/groups/{groupName}': {
      get: {
        tags: ['Groups'],
        summary: 'List events in a group',
        parameters: [{ name: 'groupName', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'Events',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Event' } },
              },
            },
          },
        },
      },
    },
    '/events/{eventId}/group': {
      put: {
        tags: ['Groups'],
        summary: 'Update event groups',
        parameters: [{ name: 'eventId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Event group updated' } },
      },
      delete: {
        tags: ['Groups'],
        summary: 'Remove event from group',
        parameters: [{ name: 'eventId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Event removed from group' } },
      },
    },
    '/dashboards': {
      get: {
        tags: ['Dashboards'],
        summary: 'List dashboards',
        responses: {
          200: {
            description: 'Dashboards',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Dashboard' } },
              },
            },
          },
        },
      },
      post: {
        tags: ['Dashboards'],
        summary: 'Create dashboard',
        requestBody: {
          required: false,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/DashboardInput' } } },
        },
        responses: { 201: { description: 'Dashboard created' } },
      },
      delete: {
        tags: ['Dashboards'],
        summary: 'Delete all dashboards',
        responses: { 200: { description: 'Dashboards deleted' } },
      },
    },
    '/dashboards/{id}': {
      get: {
        tags: ['Dashboards'],
        summary: 'Get dashboard',
        parameters: [{ $ref: '#/components/parameters/DashboardId' }],
        responses: { 200: { description: 'Dashboard' }, 404: { $ref: '#/components/responses/Error' } },
      },
      put: {
        tags: ['Dashboards'],
        summary: 'Update dashboard',
        parameters: [{ $ref: '#/components/parameters/DashboardId' }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/DashboardInput' } } },
        },
        responses: { 200: { description: 'Dashboard updated' } },
      },
      delete: {
        tags: ['Dashboards'],
        summary: 'Delete dashboard',
        parameters: [{ $ref: '#/components/parameters/DashboardId' }],
        responses: { 200: { description: 'Dashboard deleted' } },
      },
    },
  },
  components: {
    parameters: {
      EventId: { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      DashboardId: { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
    },
    responses: {
      Error: {
        description: 'Error response',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: { error: { type: 'string' } },
      },
      EventInput: {
        type: 'object',
        required: ['header'],
        properties: {
          header: { type: 'string' },
          link: { type: 'string' },
          source: { type: 'string' },
          admiralty_reliability: { type: 'string' },
          admiralty_accuracy: { type: 'string' },
          keywords: { type: 'array', items: { type: 'string' } },
          event_time: { type: 'string' },
          notes: { type: 'string' },
          hcoe_domains: { type: 'array', items: { type: 'string' } },
          location: { type: 'string' },
          location_lng: { type: 'number' },
          location_lat: { type: 'number' },
          author: { type: 'string' },
          groups: { type: 'array', items: { type: 'string' } },
        },
      },
      Event: {
        allOf: [
          { $ref: '#/components/schemas/EventInput' },
          {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              creation_time: { type: 'string' },
              images: { type: 'array', items: { type: 'string' } },
            },
          },
        ],
      },
      Group: {
        type: 'object',
        properties: {
          group_name: { type: 'string' },
          event_count: { type: 'integer' },
        },
      },
      DashboardInput: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          cols: { type: 'integer' },
          rowHeight: { type: 'integer' },
          layout: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'object' } }] },
          settings: { type: 'object' },
        },
      },
      Dashboard: {
        allOf: [
          { $ref: '#/components/schemas/DashboardInput' },
          {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              createdAt: { type: 'string' },
              updatedAt: { type: 'string' },
            },
          },
        ],
      },
    },
  },
};
