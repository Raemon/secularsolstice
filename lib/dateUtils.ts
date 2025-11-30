export const formatRelativeTimestamp = (dateStr: string) => {
  const date = new Date(dateStr).getTime();
  const now = Date.now();
  const diffMs = Math.max(0, now - date);
  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;
  const monthMs = 30 * dayMs;
  const minutes = Math.round(diffMs / minuteMs);
  if (diffMs < hourMs) {
    return `${Math.max(1, minutes)}m`;
  }
  const hours = Math.round(diffMs / hourMs);
  if (diffMs < dayMs) {
    return `${Math.max(1, hours)}h`;
  }
  const days = Math.round(diffMs / dayMs);
  if (diffMs < monthMs) {
    return `${Math.max(1, days)}d`;
  }
  const months = Math.round(diffMs / monthMs);
  if (months < 12) {
    return `${Math.max(1, months)}mo`;
  }
  return new Date(dateStr).getFullYear().toString();
};

