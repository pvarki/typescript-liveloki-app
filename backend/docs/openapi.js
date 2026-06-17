export const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'BattleLog API',
    version: '1.1.0',
    description: 'Live OpenAPI documentation for the BattleLog backend.',
  },
  servers: [{ url: '/api/v1' }],
  paths: {
    '/events': {
      get: {
        tags: ['Events'],
        summary: 'List events',
        description: 'Returns events ordered by newest creation time first. Query parameters are combined with AND. Repeated group values require the event to contain every requested group; repeated type values match any requested type.',
        parameters: [
          { name: 'header', in: 'query', required: false, schema: { type: 'string' }, description: 'Exact header match.' },
          { name: 'source', in: 'query', required: false, schema: { type: 'string' }, description: 'Exact source match.' },
          { name: 'max_admiralty_reliability', in: 'query', required: false, schema: { type: 'string', enum: ['A', 'B', 'C', 'D', 'E', 'F'] }, description: 'Maximum admiralty reliability threshold. A is highest; F is lowest.' },
          { name: 'max_admiralty_accuracy', in: 'query', required: false, schema: { type: 'number' }, description: 'Maximum admiralty accuracy threshold.' },
          { name: 'keyword', in: 'query', required: false, schema: { type: 'string' }, description: 'Exact keyword match against any event keyword.' },
          { name: 'event_time_start', in: 'query', required: false, schema: { type: 'string' }, description: 'Inclusive event_time lower bound. Use ISO-like values for reliable ordering.' },
          { name: 'event_time_end', in: 'query', required: false, schema: { type: 'string' }, description: 'Inclusive event_time upper bound. Use ISO-like values for reliable ordering.' },
          { name: 'top_left_lat', in: 'query', required: false, schema: { type: 'number' }, description: 'Bounding box top-left latitude.' },
          { name: 'top_left_lng', in: 'query', required: false, schema: { type: 'number' }, description: 'Bounding box top-left longitude.' },
          { name: 'bottom_right_lat', in: 'query', required: false, schema: { type: 'number' }, description: 'Bounding box bottom-right latitude.' },
          { name: 'bottom_right_lng', in: 'query', required: false, schema: { type: 'number' }, description: 'Bounding box bottom-right longitude.' },
          { name: 'author', in: 'query', required: false, schema: { type: 'string' }, description: 'Exact author match.' },
          {
            name: 'group',
            in: 'query',
            required: false,
            schema: { type: 'array', items: { type: 'string' } },
            style: 'form',
            explode: true,
            description: 'Exact group filters. Repeat the parameter to require multiple groups.',
          },
          {
            name: 'type',
            in: 'query',
            required: false,
            schema: { type: 'array', items: { type: 'string' } },
            style: 'form',
            explode: true,
            description: 'Exact type filters. Repeat the parameter to allow any of the requested types.',
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
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: {
            description: 'Event',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Event' } } },
          },
          404: { $ref: '#/components/responses/Error' },
        },
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
    },
  },
  components: {
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
          type: { type: 'string' },
          data: { type: 'object', additionalProperties: true },
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
      Dashboard: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          cols: { type: 'integer' },
          rowHeight: { type: 'integer' },
          layout: { type: 'string' },
          settings: { type: 'object' },
          createdAt: { type: 'string' },
          updatedAt: { type: 'string' },
        },
      },
    },
  },
};
