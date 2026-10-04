import type { FastifyInstance } from 'fastify';

import type { OpenCodeEvent } from '@ai-monitor/dto/opencode';

import { completeToolCall, startToolCall } from '../tool/tool.repository';

import { saveModelRequest } from './opencode.repository';
import { addOpenCodeEvent, getOpenCodeEvents, subscribeToOpenCodeEvents } from './opencode.store';
import { parseModelRequest, parseToolCallCompleted, parseToolCallStarted } from './opencode.parser';

export default async function openCodeRoutes(app: FastifyInstance) {
  app.post<{ Body: OpenCodeEvent }>(
    '/opencode/events',
    async (request, reply) => {
      const event = request.body;

      addOpenCodeEvent(event);

      const modelRequest =
        parseModelRequest(event);

      if (modelRequest) {
        await saveModelRequest(
          modelRequest
        );
      }

      const startedTool =
        parseToolCallStarted(event);

      if (startedTool) {
        await startToolCall(
          startedTool
        );
      }

      const completedTool =
        parseToolCallCompleted(event);

      if (completedTool) {
        await completeToolCall({
          id: completedTool.id,

          status:
            completedTool.status,

          completedAt:
            completedTool.completedAt,

          title:
            completedTool.title,

          arguments:
            completedTool.arguments,
        });
      }

      return reply
        .code(202)
        .send({
          success: true,
        });
    }
  );

  app.get('/opencode/events', async request => {
    const query = request.query as {
      limit?: string;
    };

    const limit = Math.min(
      Number(query.limit ?? 100),
      200
    );

    return {
      events: getOpenCodeEvents(limit),
    };
  });

  app.get('/opencode/events/stream', async (request, reply) => {
    reply.hijack();

    const origin = request.headers.origin;

    const allowedOrigins = new Set([
      'http://localhost:7000',
      'http://127.0.0.1:7000',
    ]);

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      ...(origin && allowedOrigins.has(origin)
        ? {
          'Access-Control-Allow-Origin': origin,
        }
        : {}),
    });

    reply.raw.write(': connected\n\n');

    const unsubscribe = subscribeToOpenCodeEvents(event => {
      reply.raw.write(
        `event: opencode\ndata: ${JSON.stringify(event)}\n\n`
      );
    });

    const heartbeat = setInterval(() => {
      reply.raw.write(': heartbeat\n\n');
    }, 15_000);

    request.raw.on('close', () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  });
}