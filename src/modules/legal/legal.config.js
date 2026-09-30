const trim = (value) => (value ? String(value).trim() : "");

export const getLegalConfig = () => {
  const supportEmail = trim(process.env.SUPPORT_EMAIL) || trim(process.env.CONSULTATION_NOTIFY_TO) || "support@vernita.app";
  const companyName = trim(process.env.COMPANY_NAME) || "Vernita";
  const publicApiBase =
    trim(process.env.PUBLIC_API_BASE_URL) ||
    trim(process.env.API_PUBLIC_URL) ||
    "";

  return {
    companyName,
    supportEmail,
    lastUpdated: "2026-03-30",
    publicApiBase,
  };
};
