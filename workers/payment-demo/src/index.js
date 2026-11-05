const allowedWebOrigins = new Set([
  "https://mesaflow-desarrollo.web.app"
]);

const allowedSandboxCheckoutHosts = new Set([
  "sandbox.mercadopago.com",
  "sandbox.mercadopago.com.ar"
]);

const catalog = Object.freeze({
  "burger-casa": Object.freeze({ name: "Burger de la casa", priceMinor: 1290000 }),
  "ravioles-espinaca": Object.freeze({ name: "Ravioles de espinaca", priceMinor: 1180000 }),
  "bowl-estacion": Object.freeze({ name: "Bowl de estación", priceMinor: 980000 }),
  "torta-chocolate": Object.freeze({ name: "Torta de chocolate", priceMinor: 620000 }),
  "empanadas-criollas": Object.freeze({ name: "Empanadas criollas", priceMinor: 590000 }),
  provoleta: Object.freeze({ name: "Provoleta grillada", priceMinor: 710000 }),
  "papas-bravas": Object.freeze({ name: "Papas bravas", priceMinor: 540000 }),
  "milanesa-napolitana": Object.freeze({ name: "Milanesa napolitana", priceMinor: 1370000 }),
  "pollo-grillado": Object.freeze({ name: "Pollo grillado", priceMinor: 1210000 }),
  "bondiola-barbeque": Object.freeze({ name: "Bondiola barbecue", priceMinor: 1450000 }),
  "risotto-hongos": Object.freeze({ name: "Risotto de hongos", priceMinor: 1260000 }),
  "ensalada-citrica": Object.freeze({ name: "Ensalada cítrica", priceMinor: 890000 }),
  "tacos-vegetales": Object.freeze({ name: "Tacos de vegetales", priceMinor: 990000 }),
  "flan-casero": Object.freeze({ name: "Flan casero", priceMinor: 490000 }),
  "cheesecake-frutos-rojos": Object.freeze({ name: "Cheesecake de frutos rojos", priceMinor: 650000 }),
  "limonada-menta": Object.freeze({ name: "Limonada con menta", priceMinor: 390000 }),
  gaseosa: Object.freeze({ name: "Gaseosa", priceMinor: 320000 }),
  "cafe-especialidad": Object.freeze({ name: "Café de especialidad", priceMinor: 280000 })
});

const exactKeys = (value, expected) => {
  const keys = Object.keys(value).sort();
  return keys.length === expected.length &&
    keys.every((key, index) => key === expected[index]);
};

function corsHeaders(request) {
  const origin = request.headers.get("Origin");
  if (origin === null) return {};
  if (!allowedWebOrigins.has(origin)) throw new Error("origin-not-allowed");
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "Content-Type, X-MesaFlow-Client",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin"
  };
}

function jsonResponse(request, status, body) {
  let cors;
  try {
    cors = corsHeaders(request);
  } catch {
    cors = {};
  }
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...cors
    }
  });
}

export function parsePaymentRequest(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value) ||
      !exactKeys(value, ["items", "sessionId", "tableId"])) {
    throw new Error("invalid-request");
  }
  if (value.sessionId !== "sesion-demo-android" || value.tableId !== "mesa-01" ||
      !Array.isArray(value.items) || value.items.length < 1 || value.items.length > 18) {
    throw new Error("invalid-request");
  }
  const seen = new Set();
  const items = value.items.map((item) => {
    if (item === null || typeof item !== "object" || Array.isArray(item) ||
        !exactKeys(item, ["productId", "quantity"]) ||
        typeof item.productId !== "string" ||
        !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20 ||
        seen.has(item.productId)) {
      throw new Error("invalid-request");
    }
    const product = catalog[item.productId];
    if (product === undefined) throw new Error("invalid-request");
    seen.add(item.productId);
    return Object.freeze({
      productId: item.productId,
      name: product.name,
      priceMinor: product.priceMinor,
      quantity: item.quantity
    });
  });
  const amountMinor = items.reduce(
    (total, item) => total + item.priceMinor * item.quantity,
    0
  );
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 100 || amountMinor > 50000000) {
    throw new Error("invalid-request");
  }
  return Object.freeze({
    sessionId: value.sessionId,
    tableId: value.tableId,
    items: Object.freeze(items),
    amountMinor
  });
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")).join("");
}

function validatedProviderResult(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value) ||
      typeof value.id !== "string" || value.id.length < 1 ||
      typeof value.sandbox_init_point !== "string") {
    console.error("mercado-pago-provider-result-invalid", {
      hasId: typeof value?.id === "string",
      hasSandboxUrl: typeof value?.sandbox_init_point === "string"
    });
    throw new Error("provider-unavailable");
  }
  const checkoutUrl = new URL(value.sandbox_init_point);
  if (checkoutUrl.protocol !== "https:" ||
      !allowedSandboxCheckoutHosts.has(checkoutUrl.hostname)) {
    console.error("mercado-pago-checkout-url-invalid", {
      protocol: checkoutUrl.protocol,
      hostname: checkoutUrl.hostname
    });
    throw new Error("provider-unavailable");
  }
  return Object.freeze({ preferenceId: value.id, checkoutUrl: checkoutUrl.toString() });
}

async function providerJson(response, stage) {
  if (!response.ok) {
    console.error("mercado-pago-request-failed", {
      stage,
      status: response.status
    });
    throw new Error("provider-unavailable");
  }
  return response.json().catch(() => {
    throw new Error("provider-unavailable");
  });
}

export async function createOrRecoverPreference(input, env, fetcher = fetch) {
  if (typeof env.MERCADO_PAGO_ACCESS_TOKEN !== "string" ||
      env.MERCADO_PAGO_ACCESS_TOKEN.trim().length < 16) {
    throw new Error("provider-unavailable");
  }
  const customerBaseUrl = new URL(env.CUSTOMER_PUBLIC_BASE_URL);
  if (customerBaseUrl.protocol !== "https:" ||
      customerBaseUrl.hostname !== "mesaflow-desarrollo.web.app") {
    throw new Error("provider-unavailable");
  }
  const normalizedItems = [...input.items]
    .sort((left, right) => left.productId.localeCompare(right.productId))
    .map((item) => `${item.productId}:${item.quantity}`)
    .join("|");
  const intentId = await sha256(
    `${input.sessionId}|${input.tableId}|${normalizedItems}`
  );
  const headers = {
    Authorization: `Bearer ${env.MERCADO_PAGO_ACCESS_TOKEN}`,
    "Content-Type": "application/json"
  };
  const searchUrl = new URL("https://api.mercadopago.com/checkout/preferences/search");
  searchUrl.searchParams.set("external_reference", intentId);
  searchUrl.searchParams.set("limit", "10");
  const searchResponse = await fetcher(searchUrl, { method: "GET", headers });
  const searchBody = await providerJson(searchResponse, "preference-search");
  if (searchBody !== null && typeof searchBody === "object" &&
      !Array.isArray(searchBody) && Array.isArray(searchBody.elements)) {
    const recovered = searchBody.elements.find((item) =>
      item !== null && typeof item === "object" && !Array.isArray(item) &&
      item.external_reference === intentId && typeof item.id === "string");
    if (recovered !== undefined) {
      const existingResponse = await fetcher(
        `https://api.mercadopago.com/checkout/preferences/${encodeURIComponent(recovered.id)}`,
        { method: "GET", headers }
      );
      return Object.freeze({
        intentId,
        ...validatedProviderResult(
          await providerJson(existingResponse, "preference-recovery")
        )
      });
    }
  }
  const returnPath = "/e/mesa-flow-demo/table/mesa-01";
  const backUrl = (result) => {
    const url = new URL(`/payment/${result}`, customerBaseUrl);
    url.searchParams.set("returnTo", returnPath);
    return url.toString();
  };
  const createResponse = await fetcher(
    "https://api.mercadopago.com/checkout/preferences",
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        items: [{
          id: intentId,
          title: "Cuenta MesaFlow - Mesa 1",
          quantity: 1,
          currency_id: "ARS",
          unit_price: input.amountMinor / 100
        }],
        external_reference: intentId,
        back_urls: {
          success: backUrl("success"),
          pending: backUrl("pending"),
          failure: backUrl("failure")
        },
        auto_return: "approved"
      })
    }
  );
  return Object.freeze({
    intentId,
    ...validatedProviderResult(await providerJson(createResponse, "preference-create"))
  });
}

export async function handleRequest(request, env, fetcher = fetch) {
  const url = new URL(request.url);
  if (request.method === "GET" && url.pathname === "/health") {
    return jsonResponse(request, 200, { status: "ok", environment: "sandbox" });
  }
  if (request.method === "OPTIONS" && url.pathname === "/preferences") {
    try {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    } catch {
      return jsonResponse(request, 403, { error: "origin-not-allowed" });
    }
  }
  if (request.method !== "POST" || url.pathname !== "/preferences") {
    return jsonResponse(request, 404, { error: "not-found" });
  }
  try {
    corsHeaders(request);
    const contentLength = Number(request.headers.get("Content-Length") ?? "0");
    if (contentLength > 4096 ||
        !request.headers.get("Content-Type")?.toLowerCase().startsWith("application/json")) {
      throw new Error("invalid-request");
    }
    const input = parsePaymentRequest(await request.json());
    const preference = await createOrRecoverPreference(input, env, fetcher);
    return jsonResponse(request, 200, {
      intentId: preference.intentId,
      preferenceId: preference.preferenceId,
      checkoutUrl: preference.checkoutUrl,
      amountMinor: input.amountMinor,
      currency: "ARS",
      status: "ready"
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "provider-unavailable";
    if (code === "origin-not-allowed") {
      return jsonResponse(request, 403, { error: code });
    }
    if (code === "invalid-request") {
      return jsonResponse(request, 400, { error: code });
    }
    return jsonResponse(request, 503, { error: "provider-unavailable" });
  }
}

export default {
  fetch(request, env) {
    return handleRequest(request, env);
  }
};
