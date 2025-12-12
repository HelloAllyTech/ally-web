declare module "*.svg" {
  const content: any;
  export const ReactComponent: any;
  export default content;
}

declare module "*.svg?url" {
  const content: string;
  export default content;
}

declare module "*.mp3" {
  const src: string;
  export default src;
}

declare module "*.wav" {
  const src: string;
  export default src;
}

declare module "*.ogg" {
  const src: string;
  export default src;
}
