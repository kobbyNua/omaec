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

  return [];
};
