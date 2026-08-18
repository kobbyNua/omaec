export const extractResponseCollection = (payload, preferredKeys = []) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const keyCandidates = [
    'data',
    'items',
    'result',
    'results',
    'records',
    'content',
    'list',
    'rows',
    'entries',
    ...preferredKeys,
  ];

  for (const key of keyCandidates) {
    const value = payload[key];
    if (Array.isArray(value)) {
      return value;
    }
  }

  const nestedData = payload.data;
  if (nestedData && typeof nestedData === 'object') {
    for (const key of keyCandidates) {
      const value = nestedData[key];
      if (Array.isArray(value)) {
        return value;
      }
    }

    for (const value of Object.values(nestedData)) {
      if (Array.isArray(value)) {
        return value;
      }
    }
  }

  for (const key of preferredKeys) {
    const value = payload[key];
    if (Array.isArray(value)) {
      return value;
    }
  }

  for (const value of Object.values(payload)) {
    if (Array.isArray(value)) {
      return value;
    }
  }
  // Helper: recursive search for the first array anywhere (hoisted as function)
  function findArrayDeep(obj, visited = new WeakSet()) {
    if (!obj || typeof obj !== 'object' || visited.has(obj)) return null;
    visited.add(obj);
    if (Array.isArray(obj)) return obj;
    for (const val of Object.values(obj)) {
      if (Array.isArray(val)) return val;
      if (val && typeof val === 'object') {
        const found = findArrayDeep(val, visited);
        if (found) return found;
      }
    }
    return null;
  }
  // If payload uses numeric keys like {0: {...}, 1: {...}}, convert to array
  const numericKeys = Object.keys(payload).filter((k) => String(parseInt(k, 10)) === k).sort((a,b)=>Number(a)-Number(b));
  if (numericKeys.length > 0) {
    const arr = numericKeys.map((k) => payload[k]);
    // Common backend pattern: {0: status, 1: dataArray} — prefer returning the data array
    if (arr.length > 1) {
      if (Array.isArray(arr[1])) return arr[1];
      if (arr[1] && typeof arr[1] === 'object') {
        const nested = findArrayDeep(arr[1]);
        if (Array.isArray(nested)) return nested;
      }
      // If no array found in second slot, fall back to the first array found among entries
      for (const v of arr) {
        if (Array.isArray(v)) return v;
      }
    }
    return arr;
  }
  // Some backends return objects keyed by numeric indexes: {0: {...}, 1: {...}, count: N}
  // Convert such numeric-keyed objects into an array of their values (sorted by numeric keys)
  const isNumericKeyedObject = (obj) => {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
    const keys = Object.keys(obj);
    if (keys.length === 0) return false;
    // ignore common meta keys
    const metaKeys = ['status','message','count','error'];
    const numericKeys = keys.filter(k => String(Number(k)) === k);
    return numericKeys.length > 0 && numericKeys.length >= Math.max(1, keys.length - metaKeys.length);
  };

  if (isNumericKeyedObject(payload)) {
    const numericEntries = Object.entries(payload)
      .filter(([k]) => String(Number(k)) === k)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([, v]) => v);
    if (numericEntries.length > 0) return numericEntries;
  }
  const deepFound = findArrayDeep(payload);
  return Array.isArray(deepFound) ? deepFound : [];
};
