export interface SkillEvolution {
  name: string;
  t1: number | null;
  t2: number | null;
  t3: number | null;
}

export interface GradeRow {
  submission_id: number;
  assignment_id: number;
  assignment_title: string;
  assignment_date: string | null;
  score: number | null;
  max_score: number;
}

export interface CorrectionRow {
  id: number;
  assignment_id: number;
  assignment_title: string;
  assignment_date: string | null;
  score: number | null;
  max_score: number;
  status: 'final' | 'to_confirm' | 'ai_processing' | 'pending';
}

export interface ProfileData {
  behavior: number | null;
  work_ethic: number | null;
  participation: number | null;
  autonomy: number | null;
  methodology: number | null;
  notes: string | null;
}

export interface OrientationReportRow {
  id: number;
  title: string;
  content: string;
  created_at: string;
}

export interface OrientationInterviewRow {
  id: number;
  interview_date: string;
  summary: string;
  decisions: string | null;
  next_steps: string | null;
}

export interface StudentDocumentRow {
  id: number;
  document_id: number;
  report_period_id: number | null;
  label: string | null;
  document_title: string;
  file_path: string;
  file_name: string;
  file_type: string;
  document_type_label: string | null;
  subject_label: string | null;
  period_label: string | null;
}
