/**
 * Some API gateways return wrapped payloads (`{ status, data }`) or attach
 * non-fatal Google Calendar errors to auth responses. Normalize to a user
 * object or signal optional calendar failure so POS / dashboard still work.
 */
export function normalizeAuthProfilePayload(raw) {
  if (!raw || typeof raw !== "object") {
    return { user: null, calendarOptionalFailure: false };
  }

  const isCalendarMessage = (msg) =>
    typeof msg === "string" && msg.toLowerCase().includes("google calendar");

  if (raw.status === false) {
    const msg = raw?.data?.error?.message ?? raw?.message ?? "";
    return {
      user: null,
      calendarOptionalFailure: isCalendarMessage(msg),
    };
  }

  if (raw.status === true && raw.data && typeof raw.data === "object") {
    const d = raw.data;
    if (d.error && isCalendarMessage(d.error?.message)) {
      return { user: null, calendarOptionalFailure: true };
    }
    if (d.email || d._id) {
      return { user: d, calendarOptionalFailure: false };
    }
  }

  if (
    raw.data &&
    typeof raw.data === "object" &&
    (raw.data.email || raw.data._id) &&
    raw.status !== false
  ) {
    return { user: raw.data, calendarOptionalFailure: false };
  }

  if (raw.email || raw._id) {
    return { user: raw, calendarOptionalFailure: false };
  }

  return { user: null, calendarOptionalFailure: false };
}
