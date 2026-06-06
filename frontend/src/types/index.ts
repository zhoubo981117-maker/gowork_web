export interface User {
  id: number;
  username: string;
  email: string;
  created_at: string;
}

export interface AuthResponse {
  user_id: number;
  token: string;
  expires_at: string;
}

export interface JobPosition {
  id: number;
  user_id: number;
  company_name: string;
  job_title: string;
  job_description: string;
  salary_range?: string;
  location?: string;
  status: string;
  application_date: string;
  match_score?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PositionDocument {
  id: number;
  user_id: number;
  position_id: number;
  filename: string;       // stored (hashed) name on disk
  original_name: string;  // friendly name shown to the user
  file_type: string;
  mime_type?: string;
  file_size?: number;
  is_image?: number | boolean;
  upload_timestamp?: string;
}

export interface InterviewEvent {
  id: number;
  user_id: number;
  position_id: number;
  event_type: string;
  content: string;
  scheduled_at?: string;
  created_at: string;
}

export interface SimulationArchive {
  id: number;
  user_id: number;
  position_id: number;
  session_data: string;
  score?: number;
  created_at: string;
}

export type ProviderType = "llm" | "deterministic";

export interface ToolTraceEntry {
  name: string;
  purpose: string;
  status: "ok" | "error";
  summary: string;
}

export interface JDAnalysis {
  title_hint?: string;
  responsibilities: string[];
  requirements: string[];
  keywords_by_category: Record<string, string[]>;
  seniority_signals: string[];
}

export interface ResumeAnalysis {
  skills_by_category: Record<string, string[]>;
  project_evidence: string[];
  summary: string;
}

export interface MatchCategoryScore {
  category: string;
  score: number;
  matched: string[];
  missing: string[];
}

export interface LLMInsights {
  // Primary fields
  match_score: number;
  company_hint: string;
  title_hint: string;
  matched_skills: string[];
  missing_skills: string[];
  verdict: string;
  // Legacy fields
  contextual_skills: Record<string, unknown>[];
  seniority_match: Record<string, unknown>;
  experience_relevance: number;
}

export interface AnalyzeResponse {
  match_score: number;
  verdict: string;
  jd_summary: JDAnalysis;
  resume_summary: ResumeAnalysis;
  category_scores: MatchCategoryScore[];
  gaps: string[];
  recommendations: string[];
  rewritten_project_bullets: string[];
  interview_questions: string[];
  tool_trace: ToolTraceEntry[];
  llm_insights?: LLMInsights;
  provider_used: ProviderType;
  company_hint?: string;
  title_hint?: string;
}

export interface RewriteEntry {
  original: string;
  rewritten: string;
  changes: string[];
  relevance_score: number;
}

export interface RewriteResponse {
  rewrites: RewriteEntry[];
  provider_used: string;
  confidence: number;
}

export interface InterviewQuestion {
  id: number;
  question_text: string;
  category: string;
  difficulty: string;
  expected_topics: string[];
}

export interface InterviewFeedback {
  evaluation: string;
  strengths: string[];
  improvements: string[];
  suggested_answer: string;
  score?: number;
}

export interface InterviewSession {
  session_id: string;
  position_id?: number;
  questions: InterviewQuestion[];
  current_index: number;
  feedback: InterviewFeedback[];
  is_complete: boolean;
  total_score?: number;
}

// Backend response types (actual API shapes)
export interface InterviewStartResponse {
  session_id: number;
  status: string;
  total_questions: number;
  current_question_index: number;
  message: string;
  first_question: { id: number; text: string; category: string; difficulty: string } | null;
  started_at: string;
}

export interface InterviewAnswerResponse {
  feedback: { evaluation: string; score: number; strengths: string[]; improvements: string[]; suggested_answer: string | null };
  next_question: { id: number; text: string; category: string; difficulty: string; order: number } | null;
  message: string;
  status: string;
  summary: { session_id: number; total_questions: number; overall_score: number; strengths: string[]; weaknesses: string[]; recommendations: string[]; category_scores: Record<string, number> } | null;
}

export interface InterviewEndResponse {
  status: string;
  summary: { session_id: number; total_questions: number; overall_score: number; strengths: string[]; weaknesses: string[]; recommendations: string[]; category_scores: Record<string, number> } | null;
}

export interface DashboardSummary {
  total_positions: number;
  by_status: Record<string, number>;
  recent_activities: DashboardActivity[];
}

export interface DashboardActivity {
  id: number;
  user_id: number;
  activity_type: string;
  description: string;
  created_at: string;
}

export interface DocumentUpload {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  extracted_text?: string;
  metadata?: Record<string, unknown>;
  status: string;
  error_message?: string;
  created_at: string;
}

export interface LLMConfig {
  provider: string;
  model: string;
  base_url: string;
  timeout: number;
  is_available: boolean;
}

export interface ScrapedJob {
  id: number;
  source: string;
  company: string;
  title: string;
  original_jd?: string;
  salary?: string;
  location?: string;
  experience?: string;
  education?: string;
  parsed_data?: Record<string, unknown>;
  detail_url?: string;
  created_at?: string;
}

export function getSkills(job: ScrapedJob): string[] {
  const pd = job.parsed_data;
  if (pd && Array.isArray(pd.skills)) return pd.skills as string[];
  return [];
}

// Feature 008: Scraper enhancement types
export interface ScraperSource {
  name: string;
  display_name: string;
  status: "available" | "unavailable" | "untested";
}

export interface SearchResponse {
  jobs: ScrapedJob[];
  total: number;
  source_counts: Record<string, number>;
  warnings: string[];
}

// Feature 002: UX Improvements

export interface OCRResult {
  text: string;
  confidence: number;
  processing_time_ms: number;
}

export interface PositionPickerItem {
  id: number;
  company_name: string;
  job_title: string;
  match_score?: number;
  job_description: string;
  has_resume: boolean;
  resume_text: string;
}

export interface ParsedJdImport {
  region: { province: string; city: string; district: string };
  job_category: string;
  skills: string[];
  salary_range: { min: number; max: number; currency: string };
  experience_years: { min: number; max: number };
  education: string;
  provider: string;
  raw_text: string;
}

export interface InterviewHistoryItem {
  id: number;
  position_id?: number;
  session_data: string;
  score?: number;
  created_at: string;
}
