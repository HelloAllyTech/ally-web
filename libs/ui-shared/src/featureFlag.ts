const getEnvVar = (viteKey: string, nextKey: string): boolean => {
  // Support both Vite (import.meta.env) and Next.js (process.env)
  if (typeof process !== "undefined" && process.env?.[nextKey]) {
    return process.env[nextKey] === "true";
  }
  if (typeof import.meta !== "undefined" && import.meta.env?.[viteKey]) {
    return import.meta.env[viteKey] === "true";
  }
  return false;
};

export const FEATURE_FLAGS_MAP = {
  DUPLICATE_SIMULATION_FLAG: getEnvVar(
    "VITE_DUPLICATE_SIMULATION_FLAG",
    "NEXT_PUBLIC_DUPLICATE_SIMULATION_FLAG",
  ),
  NEW_CREATE_SIMULATION_FLAG: getEnvVar(
    "VITE_NEW_CREATE_SIMULATION_FLAG",
    "NEXT_PUBLIC_NEW_CREATE_SIMULATION_FLAG",
  ),
};
