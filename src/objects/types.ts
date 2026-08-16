export type Project = {
  id: number;
  title: string;
  description: string;
  techStack: {
    frontend?: string[];
    backend?: string[];
    misc?: string[];
    devOps?: string[];
  };
  githubUrl: string | { frontend: string; backend: string };
  demoUrl?: string;
};
