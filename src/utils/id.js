// src/utils/id.js
export const uid = (prefix) =>
  `${prefix}_${
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  }`;
