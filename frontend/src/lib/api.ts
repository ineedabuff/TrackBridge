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

export type AnalyticsOverview = {
  totals: {
    tracked_emails: number;
    tracked_links: number;
    tracked_attachments: number;
    opens: number;
    clicks: number;
    downloads: number;
    total_events: number;
  };
  rates: {
    open_rate: number;
    click_rate: number;
    download_rate: number;
  };
  series: Array<{
    date: string;
    opens: number;
    clicks: number;
    downloads: number;
  }>;
  recent_activity: Array<{
    event_type: "open" | "click" | "download";
    title: string;
    target: string;
    occurred_at: string;
    ip_address: string | null;
    user_agent: string | null;
  }>;
  top_items: Array<{
    item_type: string;
    title: string;
    target: string;
    events: number;
  }>;
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

export type ReportPreferences = {
  id: string;
  recipient_email: string;
  daily_enabled: boolean;
  weekly_enabled: boolean;
  immediate_open_enabled: boolean;
  immediate_click_enabled: boolean;
  immediate_download_enabled: boolean;
  updated_at: string;
};

export type ReportPreferencesUpdate = {
  recipient_email: string;
  daily_enabled: boolean;
  weekly_enabled: boolean;
  immediate_open_enabled: boolean;
  immediate_click_enabled: boolean;
  immediate_download_enabled: boolean;
};

export type ReportHistoryItem = {
  id: string;
  report_type: string;
  recipient_email: string;
  subject: string;
  status: string;
  message: string | null;
  sent_at: string;
};

export type ReportSendResult = {
  sent: boolean;
  message: string;
  subject: string;
  preview_text: string;
  preview_html: string;
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

export function getAnalyticsOverview(token: string): Promise<AnalyticsOverview> {
  return request<AnalyticsOverview>("/analytics/overview", {
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


export function getReportPreferences(token: string): Promise<ReportPreferences> {
  return request<ReportPreferences>("/reports/preferences", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function updateReportPreferences(
  token: string,
  payload: ReportPreferencesUpdate
): Promise<ReportPreferences> {
  return request<ReportPreferences>("/reports/preferences", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
}

export function sendReportNow(token: string): Promise<ReportSendResult> {
  return request<ReportSendResult>("/reports/send-now", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function listReportHistory(token: string): Promise<ReportHistoryItem[]> {
  return request<ReportHistoryItem[]>("/reports/history", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}
