
CREATE UNIQUE INDEX IF NOT EXISTS bank_connections_company_bank_unique 
ON public.bank_connections (company_id, bank_code);
