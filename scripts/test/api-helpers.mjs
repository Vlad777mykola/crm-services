/**
 * Parse GET /companies/public — envelope { message, data, meta } or legacy array.
 * @param {unknown} body
 */
export function parsePublicCompanies(body) {
  if (Array.isArray(body)) return body;
  if (body && typeof body === 'object' && Array.isArray(body.data)) return body.data;
  throw new Error(`Expected published companies in data[], got: ${JSON.stringify(body)}`);
}
