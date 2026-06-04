export function getTimestampMs(timestamp) {
  const value = Number(timestamp);
  return Number.isFinite(value) ? value : null;
}

export function formatTimestamp(timestamp) {
  const value = getTimestampMs(timestamp);
  if (!value) return 'Unknown';

  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function formatChartTime(timestamp) {
  return formatTimestamp(timestamp);
}

export function formatRelativeTime(timestamp) {
  const value = getTimestampMs(timestamp);
  if (!value) return null;

  const diff = Date.now() - value;
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;

  const days = Math.floor(hours / 24);
  return `${days} d ago`;
}
