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

export type TrackedEmailCreate = {
  recipient_email: string;
  subject: string;
};

export type TrackedEmail = {
  id: string;
  recipient_email: string;
  subject: string;
  tracking_pixel_url: string;
  pixel_html: string;
  opens: number;
  created_at: string;
};

export type TrackedLinkCreate = {
  label: string;
  destination_url: string;
};

export type TrackedLink = {
  id: string;
  label: string;
  destination_url: string;
  tracking_url: string;
  link_html: string;
  clicks: number;
  created_at: string;
};

export type TrackedAttachment = {
  id: string;
  label: string;
  original_filename: string;
  content_type: string;
  size_bytes: number;
  download_url: string;
  link_html: string;
  downloads: number;
  created_at: string;
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

async function multipartRequest<T>(path: string, token: string, body: FormData): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body
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

export function createTrackedEmail(
  token: string,
  payload: TrackedEmailCreate
): Promise<TrackedEmail> {
  return request<TrackedEmail>("/tracked-emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
}

export function listTrackedEmails(token: string): Promise<TrackedEmail[]> {
  return request<TrackedEmail[]>("/tracked-emails", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function createTrackedLink(token: string, payload: TrackedLinkCreate): Promise<TrackedLink> {
  return request<TrackedLink>("/tracked-links", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
}

export function listTrackedLinks(token: string): Promise<TrackedLink[]> {
  return request<TrackedLink[]>("/tracked-links", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function createTrackedAttachment(
  token: string,
  label: string,
  file: File
): Promise<TrackedAttachment> {
  const body = new FormData();
  body.append("label", label);
  body.append("file", file);
  return multipartRequest<TrackedAttachment>("/tracked-attachments", token, body);
}

export function listTrackedAttachments(token: string): Promise<TrackedAttachment[]> {
  return request<TrackedAttachment[]>("/tracked-attachments", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}
