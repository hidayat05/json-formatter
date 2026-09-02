export function parseUrl(urlStr) {
  if (typeof urlStr !== "string" || !urlStr.trim()) {
    throw new Error("URL cannot be empty");
  }

  let cleanUrl = urlStr.trim();
  if (!/^[a-zA-Z]+:\/\//.test(cleanUrl) && !cleanUrl.startsWith("//")) {
    cleanUrl = `http://${cleanUrl}`;
  }

  try {
    const parsed = new URL(cleanUrl);
    return {
      protocol: parsed.protocol,
      hostname: parsed.hostname,
      port: parsed.port,
      pathname: parsed.pathname,
      search: parsed.search,
      hash: parsed.hash,
      username: parsed.username,
      password: parsed.password,
    };
  } catch (err) {
    throw new Error(`Invalid URL format: ${err.message}`);
  }
}

export function formatFileSize(bytes) {
  if (typeof bytes !== "number" || isNaN(bytes) || bytes < 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function reconstructUrl({
  protocol,
  hostname,
  port,
  pathname,
  hash,
  params = [],
}) {
  if (!hostname || !hostname.trim()) {
    throw new Error("Hostname is required to reconstruct URL");
  }

  let url = "";
  const proto = protocol ? protocol.trim() : "";
  if (proto) {
    url += proto.endsWith(":") ? proto : `${proto}:`;
    url += "//";
  } else {
    url += "http://";
  }

  url += hostname.trim();
  if (port && port.trim()) {
    url += `:${port.trim()}`;
  }

  if (pathname && pathname.trim()) {
    const path = pathname.trim();
    url += path.startsWith("/") ? path : `/${path}`;
  }

  const validParams = params
    .filter(([k]) => Boolean(k && k.trim()))
    .map(
      ([k, v]) =>
        `${encodeURIComponent(k.trim())}=${encodeURIComponent(v || "")}`,
    );

  if (validParams.length > 0) {
    url += `?${validParams.join("&")}`;
  }

  if (hash && hash.trim()) {
    const h = hash.trim();
    url += h.startsWith("#") ? h : `#${h}`;
  }

  return url;
}
