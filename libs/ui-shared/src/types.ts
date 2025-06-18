// TODO: Refactor export of types; refer tsconfig.app.json of helpline dashboard
export interface Resource {
  id: string;
  heading: string;
  content: string;
  category: string;
  tags: string[];
  score: number;
}
