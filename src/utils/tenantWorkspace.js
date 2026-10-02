export const TENANT_ROOT_DOMAIN = String(
  import.meta.env.VITE_TENANT_ROOT_DOMAIN || "wisershifts.com",
)
  .trim()
  .toLowerCase()
  .replace(/^\.+|\.+$/g, "");

export const isLocalWorkspaceHost = (hostname = window.location.hostname) =>
  ["localhost", "127.0.0.1"].includes(String(hostname || "").toLowerCase());

export const getWorkspaceDomainLabel = (hostname = window.location.hostname) =>
  isLocalWorkspaceHost(hostname) ? "localhost" : TENANT_ROOT_DOMAIN;

export const isRootWorkspaceHost = (hostname = window.location.hostname) => {
  const normalizedHost = String(hostname || "").toLowerCase();
  return (
    normalizedHost === "localhost" ||
    normalizedHost === "127.0.0.1" ||
    normalizedHost === "easishift.netlify.app" ||
    normalizedHost === TENANT_ROOT_DOMAIN ||
    normalizedHost === `www.${TENANT_ROOT_DOMAIN}`
  );
};

export const isTenantWorkspaceHost = (hostname = window.location.hostname) => {
  const normalizedHost = String(hostname || "").toLowerCase();
  const tenantDomainSuffix = `.${TENANT_ROOT_DOMAIN}`;
  if (normalizedHost.endsWith(tenantDomainSuffix)) {
    const subdomain = normalizedHost.slice(0, -tenantDomainSuffix.length);
    return (
      Boolean(subdomain) && !subdomain.includes(".") && subdomain !== "www"
    );
  }
  if (normalizedHost.endsWith(".localhost")) {
    const subdomain = normalizedHost.slice(0, -".localhost".length);
    return Boolean(subdomain) && !subdomain.includes(".");
  }
  return false;
};

export const getTenantLoginUrl = (subdomain) => {
  if (isLocalWorkspaceHost()) {
    const port = window.location.port ? `:${window.location.port}` : "";
    return `http://${subdomain}.localhost${port}/login`;
  }
  return `https://${subdomain}.${TENANT_ROOT_DOMAIN}/login`;
};

export const getTenantSubdomain = (hostname = window.location.hostname) => {
  const normalizedHost = String(hostname || "")
    .trim()
    .toLowerCase()
    .replace(/\.$/, "");

  if (isLocalWorkspaceHost(normalizedHost)) return null;
  if (
    normalizedHost === TENANT_ROOT_DOMAIN ||
    normalizedHost === `www.${TENANT_ROOT_DOMAIN}`
  ) {
    return null;
  }

  if (normalizedHost.endsWith(".localhost")) {
    const subdomain = normalizedHost.slice(0, -".localhost".length);
    return subdomain && !subdomain.includes(".") ? subdomain : null;
  }

  const suffix = `.${TENANT_ROOT_DOMAIN}`;
  if (!normalizedHost.endsWith(suffix)) return null;

  const subdomain = normalizedHost.slice(0, -suffix.length);
  return subdomain && !subdomain.includes(".") && subdomain !== "www"
    ? subdomain
    : null;
};
