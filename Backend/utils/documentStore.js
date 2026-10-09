const documentMap = new Map();

export const saveDocumentForThread = (threadId, data) => {
  documentMap.set(threadId, data);
};

export const getDocumentForThread = (threadId) => {
  return documentMap.get(threadId);
};

export const removeDocumentForThread = (threadId) => {
  return documentMap.delete(threadId);
};

export const hasDocumentForThread = (threadId) => {
  return documentMap.has(threadId);
};