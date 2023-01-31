export function isValidTimeZone(tz) {
  // This function won't be valid for some web-browsers, but this works on Node.js
  // Should recognize timezones as defined in https://www.iana.org/time-zones
  if (!Intl || !Intl.DateTimeFormat().resolvedOptions().timeZone) {
    throw new Error('Time zones are not available in this environment');
  }

  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch (ex) {
    return false;
  }
}
