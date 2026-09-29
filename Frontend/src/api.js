export function currentUserId() {
  return localStorage.getItem("kph-user") || "u-saurav";
}

export function setCurrentUserId(id) {
  localStorage.setItem("kph-user", id);
}

export async function api(path, { method = "GET", body, headers } = {}) {
  const requestHeaders = { "X-User-Id": currentUserId(), ...headers };
  let payload;
  if (body instanceof FormData) payload = body;
  else if (body !== undefined) {
    requestHeaders["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  let response;
  try {
    response = await fetch(path, { method, headers: requestHeaders, body: payload });
  } catch {
    throw new Error("Coding Hub server is not reachable");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

export function uploadFile(file) {
  const body = new FormData();
  body.append("file", file);
  return api("/api/uploads", { method: "POST", body });
}
