const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

export type AuthMode = "login" | "register";

export type AuthPayload = {
  email: string;
  password: string;
  full_name?: string;
};

export type User = {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
};

export type AuthResponse = {
  access_token: string;
  token_type: string;
  user: User;
};

export type DashboardSummary = {
  workspace: string;
  tracked_emails: number;
  opens: number;
  clicks: number;
  attachments: number;
  users: number;
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(error.detail ?? "Request failed");
  }

  return response.json() as Promise<T>;
}

export function authenticate(mode: AuthMode, payload: AuthPayload): Promise<AuthResponse> {
  const path = mode === "register" ? "/auth/register" : "/auth/login";
  return request<AuthResponse>(path, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function getDashboardSummary(token: string): Promise<DashboardSummary> {
  return request<DashboardSummary>("/dashboard/summary", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}
