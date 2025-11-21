export type Trait = 'conceptual' | 'commercial' | 'fine_art' | 'design' | 'tech' | 'fashion';

export interface Option {
  text: string;
  traits: Trait[];
}

export interface Question {
  id: number;
  question: string;
  options: Option[];
}

export interface School {
  id: string;
  name: string;
  shortName: string;
  location: string;
  description: string;
  tags: Trait[];
  color: string;
  textColor: string;
  bgAccent: string;
}

export interface AIAnalysisResult {
  persona: string;
  whyMatch: string;
  advice: string;
}
