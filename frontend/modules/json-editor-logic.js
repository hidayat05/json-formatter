export function getValueType(val) {
  if (val === null) return "null";
  if (Array.isArray(val)) return "array";
  return typeof val;
}

export function tryParseJsonString(val) {
  if (typeof val !== "string") return null;
  const trimmed = val.trim();
  if (
    !(
      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("[") && trimmed.endsWith("]"))
    )
  ) {
    return null;
  }
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed !== null && typeof parsed === "object") {
      return parsed;
    }
  } catch {}
  return null;
}

export function unpackAllStringifiedJson(data) {
  if (typeof data === "string") {
    const parsed = tryParseJsonString(data);
    if (parsed !== null) {
      return unpackAllStringifiedJson(parsed);
    }
    return data;
  }
  if (Array.isArray(data)) {
    return data.map((item) => unpackAllStringifiedJson(item));
  }
  if (data && typeof data === "object") {
    const res = {};
    for (const [k, v] of Object.entries(data)) {
      res[k] = unpackAllStringifiedJson(v);
    }
    return res;
  }
  return data;
}

export function generateDefaultFromSchema(sample) {
  if (sample === null || sample === undefined) return null;
  if (Array.isArray(sample)) {
    if (sample.length === 0) return [];
    return [generateDefaultFromSchema(sample[0])];
  }
  if (typeof sample === "object") {
    const res = {};
    for (const k of Object.keys(sample)) {
      res[k] = generateDefaultFromSchema(sample[k]);
    }
    return res;
  }
  if (typeof sample === "string") return "";
  if (typeof sample === "number") return 0;
  if (typeof sample === "boolean") return false;
  return "";
}

export function getDefaultValueForType(type) {
  switch (type) {
    case "string":
      return "";
    case "number":
      return 0;
    case "boolean":
      return false;
    case "null":
      return null;
    case "array":
      return [];
    case "object":
      return {};
    default:
      return "";
  }
}

export function getValueAtPath(data, path) {
  let curr = data;
  for (const seg of path) {
    if (curr === null || curr === undefined) return undefined;
    curr = curr[seg];
  }
  return curr;
}

export function setValueAtPath(data, path, value) {
  if (path.length === 0) return value;
  let curr = data;
  for (let i = 0; i < path.length - 1; i++) {
    curr = curr[path[i]];
  }
  curr[path[path.length - 1]] = value;
  return data;
}

export function deleteValueAtPath(data, path) {
  if (path.length === 0) return {};
  let curr = data;
  for (let i = 0; i < path.length - 1; i++) {
    curr = curr[path[i]];
  }
  const lastKey = path[path.length - 1];
  if (Array.isArray(curr)) {
    curr.splice(Number(lastKey), 1);
  } else if (curr && typeof curr === "object") {
    delete curr[lastKey];
  }
  return data;
}

export function autoFixMalformedJsonText(text) {
  if (!text || !text.trim()) return "{}";
  let cleaned = text.trim();
  cleaned = cleaned.replace(/\/\/.*$/gm, "");
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, "");
  cleaned = cleaned.replace(/([{,]\s*)([a-zA-Z0-9_$]+)\s*:/g, '$1"$2":');
  cleaned = cleaned.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, (_m, content) => {
    return `"${content.replace(/"/g, '\\"')}"`;
  });
  cleaned = cleaned.replace(/,\s*([}\]])/g, "$1");
  return cleaned;
}

export function convertKeyCase(str, targetCase) {
  const words = str
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .trim()
    .toLowerCase()
    .split(/\s+/);
  if (words.length === 0 || words[0] === "") return str;

  switch (targetCase) {
    case "camel":
      return (
        words[0] +
        words
          .slice(1)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join("")
      );
    case "snake":
      return words.join("_");
    case "kebab":
      return words.join("-");
    case "pascal":
      return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("");
    default:
      return str;
  }
}

export function convertAllKeysCase(data, targetCase) {
  if (Array.isArray(data)) {
    return data.map((item) => convertAllKeysCase(item, targetCase));
  }
  if (data && typeof data === "object") {
    const res = {};
    for (const [k, v] of Object.entries(data)) {
      const newKey = convertKeyCase(k, targetCase);
      res[newKey] = convertAllKeysCase(v, targetCase);
    }
    return res;
  }
  return data;
}

export function maskPiiData(data) {
  if (typeof data === "string") {
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data)) {
      const parts = data.split("@");
      const name = parts[0];
      const maskedName = name.length > 2 ? `${name.slice(0, 2)}***` : "***";
      return `${maskedName}@${parts[1]}`;
    }
    if (/^\+?[0-9\s\-()]{8,20}$/.test(data) && /\d{4,}/.test(data)) {
      return `${data.slice(0, 3)}****${data.slice(-2)}`;
    }
    return data;
  }
  if (Array.isArray(data)) {
    return data.map(maskPiiData);
  }
  if (data && typeof data === "object") {
    const res = {};
    for (const [k, v] of Object.entries(data)) {
      const lowerKey = k.toLowerCase();
      if (
        lowerKey.includes("password") ||
        lowerKey.includes("secret") ||
        lowerKey.includes("token") ||
        lowerKey.includes("api_key") ||
        lowerKey.includes("auth")
      ) {
        res[k] = "********";
      } else {
        res[k] = maskPiiData(v);
      }
    }
    return res;
  }
  return data;
}

export function formatJsonPath(path) {
  if (path.length === 0) return "$";
  let str = "$";
  for (const seg of path) {
    if (typeof seg === "number" || /^\d+$/.test(seg)) {
      str += `[${seg}]`;
    } else if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(seg)) {
      str += `.${seg}`;
    } else {
      str += `["${seg}"]`;
    }
  }
  return str;
}
