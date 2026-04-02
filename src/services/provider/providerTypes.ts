export interface FinancialSummary {
  recebidoHoje: number;
  qtdRecebidoHoje: number;
  abertoHoje: number;
  qtdAbertoHoje: number;
  pagoMes: number;
  qtdPagoMes: number;
  abertoMes: number;
  qtdAbertoMes: number;
}

export interface ProviderReport {
  totalAtivos: number;
  vendasHoje: number;
  canceladosHoje: number;
  financeiro: FinancialSummary;
  errors: string[];
}
