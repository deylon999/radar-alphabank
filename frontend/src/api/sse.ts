export interface ServerEvent {
  event: string;
  data: string;
}

/**
 * Разбирает поток text/event-stream: события разделены пустой строкой, поля `event:` и
 * `data:` (несколько `data:` склеиваются через перевод строки), строки с «:» — комментарии.
 */
export async function* readEventStream(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<ServerEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let event = 'message';
  let data: string[] = [];

  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      // «\r» в конце куска может оказаться началом «\r\n» — ждём следующий кусок.
      const cut = buffer.endsWith('\r') ? buffer.length - 1 : buffer.length;
      const lines = buffer.slice(0, cut).split(/\r\n|\r|\n/);
      buffer = (lines.pop() ?? '') + buffer.slice(cut);
      for (const line of lines) {
        if (line === '') {
          if (data.length > 0) yield { event, data: data.join('\n') };
          event = 'message';
          data = [];
        } else if (!line.startsWith(':')) {
          const colon = line.indexOf(':');
          const field = colon === -1 ? line : line.slice(0, colon);
          const raw = colon === -1 ? '' : line.slice(colon + 1);
          const text = raw.startsWith(' ') ? raw.slice(1) : raw;
          if (field === 'event') event = text;
          if (field === 'data') data.push(text);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
