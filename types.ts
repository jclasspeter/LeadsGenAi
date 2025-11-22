
export interface Lead {
  id: string;
  name: string;
  category: string;
  address?: string;
  phone?: string;
  website?: string;
  email?: string;
  socials: {
    platform: 'Facebook' | 'Instagram' | 'LinkedIn' | 'Twitter' | 'Other';
    url: string;
  }[];
  notes?: string;
}

export interface SearchParams {
  industry: string;
  location: string;
}

export interface GroundingSource {
  title?: string;
  uri: string;
}

export interface GenerationResult {
  leads: Lead[];
  sources: GroundingSource[];
  rawText?: string;
}

export interface SearchHistoryItem {
  industry: string;
  location: string;
  timestamp: number;
}
