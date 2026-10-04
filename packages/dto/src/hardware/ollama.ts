export interface OllamaModel {
  name: string;
  size: number;
}

export interface OllamaStatus {
  healthy: boolean;
  models: OllamaModel[];
}