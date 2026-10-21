/** @vitest-environment node */
import { describe, expect, it } from 'vitest';

import { readEventStream, type ServerEvent } from './sse';

function streamOf(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

async function collect(chunks: string[]): Promise<ServerEvent[]> {
  const events: ServerEvent[] = [];
  for await (const event of readEventStream(streamOf(chunks))) events.push(event);
  return events;
}

describe('readEventStream', () => {
  it('разбирает события, разрезанные на произвольные куски', async () => {
    expect(
      await collect(['event: st', 'ep\ndata: {"a"', ':1}\n', '\nevent: answer\ndata: 2\n\n']),
    ).toEqual([
      { event: 'step', data: '{"a":1}' },
      { event: 'answer', data: '2' },
    ]);
  });

  it('понимает \\r\\n, даже разрезанный между кусками, и склеивает несколько data', async () => {
    expect(await collect(['data: a\r', '\ndata: b\r\n\r\n'])).toEqual([
      { event: 'message', data: 'a\nb' },
    ]);
  });

  it('пропускает комментарии и события без data', async () => {
    expect(await collect([': ping\n\nevent: step\n\nevent: answer\ndata: x\n\n'])).toEqual([
      { event: 'answer', data: 'x' },
    ]);
  });
});
