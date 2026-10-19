/** "Late payment" -> "late-payment". Same name on different events = same metric in reports. */
export const metricKey = (label: string) =>
  label
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
