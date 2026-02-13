// File: apps/ally-helpline-dashboard/src/types/json.d.ts
// Allow TypeScript to import JSON modules without type errors
declare module "*.json" {
  const value: any;
  export default value;
}
