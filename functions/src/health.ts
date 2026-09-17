export const healthPayload = Object.freeze({
  status: "ok",
  service: "mesaflow-functions",
  version: 1
});

export interface HealthRequest {
  method?: string;
}

export interface HealthResponse {
  end(): void;
  json(body: typeof healthPayload): void;
  setHeader(name: string, value: string): void;
  status(code: number): HealthResponse;
}

export function handleHealthRequest(
  request: HealthRequest,
  response: HealthResponse
): void {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Allow", "GET, HEAD");

  if (request.method !== "GET" && request.method !== "HEAD") {
    response.status(405).end();
    return;
  }

  response.status(200);
  if (request.method === "HEAD") {
    response.end();
    return;
  }
  response.json(healthPayload);
}
