export interface FinancialSummary {
  totalAberto: number;
  totalPago: number;
  percentualConversao: number;
}

export interface ProviderReport {
  totalAtivos: number;
  vendasHoje: number;
  canceladosHoje: number;
  financeiro: FinancialSummary;
  errors: string[];
}
