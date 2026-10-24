export function extractError(error, fallback = 'Something went wrong. Please try again.') {
  if (!error) return fallback;
  return (
    error?.response?.data?.error ||
    error?.data?.error ||
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
}