declare namespace Deno {
  const env: { get(name: string): string | undefined };
  function serve(handler: (request: Request) => Response | Promise<Response>): void;
  function serve(
    options: { hostname?: string; port?: number },
    handler: (request: Request) => Response | Promise<Response>,
  ): void;
}
