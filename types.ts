
export enum FrontStatus {
  CONTROLLED = 'Controlado',
  OBSERVATION = 'En observación',
  ATTENTION = 'Requiere atención',
  NO_RECENT_REVIEW = 'Sin revisión reciente'
}

export type RiskLevel = 'ALTO' | 'MEDIO' | 'BAJO' | 'NO_APLICA';

export interface RiskOption {
  level: RiskLevel;
  description: string;
}

export interface RiskDefinition {
  id: string;
  name: string;
  category: string;
  icon: string;
  options: Record<RiskLevel, string>;
  eppMap: Partial<Record<RiskLevel, string[]>>;
}

export interface SelectedRisk {
  riskId: string;
  level: RiskLevel;
}

export interface User {
  name: string;
  company: string;
  role: string;
  photo?: string;
  phone?: string;
  email?: string;
}

export interface WorkFront {
  id: string;
  name: string;
  status: FrontStatus;
  lastReview: string;
  selectedRisks: SelectedRisk[];
  epp: string[];
  frequency: string;
  supervisor: string;
  location?: string;
  siteName: string; 
}

export interface Question {
  id: string;
  text: string;
  subtext?: string;
  category: string;
  icon: string;
  image?: string;
  riskId?: string; 
}

// NUEVOS TIPOS PARA HALLAZGOS PROFESIONALES
export type Severity = 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';
export type ActionTaken = 'CORREGIDO' | 'DETENIDO' | 'PENDIENTE' | 'INSTRUIDO';

export interface Deviation {
  questionId: string;
  questionText: string;
  description: string;
  photo: string; // Base64
  date: string;
  severity: Severity;      // Nuevo
  actionTaken: ActionTaken; // Nuevo
}

export interface RoutineRecord {
  id: string;
  date: string; // ISO string
  frontName: string;
  siteName: string;
  supervisorName: string;
  supervisorSignature: string; // Base64
  deviations: Deviation[];
  questionsChecked: number;
  statusResult: FrontStatus;
}
