import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export const isTauri = () => "__TAURI_INTERNALS__" in window;

/**
 * A fetch() replacement that routes requests through the Rust backend via
 * Tauri IPC, bypassing WebView CORS restrictions for third-party AI APIs.
 *
 * Flow:
 *   1. JS registers four Tauri event listeners (sp_start / sp_chunk / sp_err / sp_done)
 *   2. JS invokes the Rust `stream_post` command
 *   3. Rust opens the HTTP connection; on success emits sp_start with status+headers
 *   4. Rust streams body chunks as sp_chunk events, then sp_done
 *   5. Each sp_chunk is fed into a ReadableStream that the AI SDK reads from
 */
export async function tauriProxyFetch(
  input: string | URL | Request,
  init?: RequestInit
): Promise<Response> {
  const url = input instanceof Request ? input.url : input.toString();

  const rawBody =
    input instanceof Request
      ? await input.text()
      : typeof init?.body === "string"
        ? init.body
        : "";

  const hdrs: Record<string, string> = {};
  const srcHeaders =
    input instanceof Request ? input.headers : new Headers(init?.headers);
  srcHeaders.forEach((v, k) => {
    hdrs[k] = v;
  });

  const eventId = crypto.randomUUID();
  const enc = new TextEncoder();

  // ctrl is assigned synchronously in ReadableStream's start() callback —
  // guaranteed to be non-null before any async event handlers run.
  let ctrl!: ReadableStreamDefaultController<Uint8Array>;
  const bodyStream = new ReadableStream<Uint8Array>({
    start(c) { ctrl = c; },
  });

  return new Promise<Response>((resolve, reject) => {
    let settled = false; // tracks whether the outer Promise has resolved or rejected
    let streamClosed = false;
    const unsubs: Array<() => void> = [];

    const cleanup = () => {
      if (streamClosed) return;
      streamClosed = true;
      unsubs.forEach((f) => f());
    };

    const closeStream = () => {
      if (!streamClosed) {
        ctrl.close();
        cleanup();
      }
    };

    const errorStream = (msg: string) => {
      if (!streamClosed) {
        ctrl.error(new Error(msg));
        cleanup();
      }
      // If the outer Promise hasn't resolved yet (sp_start never fired),
      // also reject it so the SDK gets the error.
      if (!settled) {
        settled = true;
        reject(new TypeError(msg));
      }
    };

    Promise.all([
      // sp_start: fires once with HTTP status + headers; resolves the outer Promise
      listen<string>(`sp_start_${eventId}`, ({ payload }) => {
        const { status, headers } = JSON.parse(payload) as {
          status: number;
          headers: Record<string, string>;
        };
        if (!settled) {
          settled = true;
          resolve(new Response(bodyStream, { status, headers }));
        }
      }),

      // sp_chunk: each body chunk, fed into the ReadableStream
      listen<string>(`sp_chunk_${eventId}`, ({ payload }) => {
        if (!streamClosed) ctrl.enqueue(enc.encode(payload));
      }),

      // sp_err: network/server error mid-stream
      listen<string>(`sp_err_${eventId}`, ({ payload }) => {
        errorStream(payload);
      }),

      // sp_done: stream finished normally
      listen(`sp_done_${eventId}`, () => {
        closeStream();
      }),
    ]).then((fns) => {
      unsubs.push(...fns);
      // Start the request only after all listeners are confirmed registered
      invoke<void>("stream_post", {
        eventId,
        url,
        headers: hdrs,
        body: rawBody,
      }).catch((e: unknown) => {
        errorStream(String(e));
      });
    });
  });
}
