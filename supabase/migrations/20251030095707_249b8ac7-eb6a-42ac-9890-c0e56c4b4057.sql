-- Add extracted data columns to invoices table
ALTER TABLE public.invoices ADD COLUMN invoice_number TEXT;
ALTER TABLE public.invoices ADD COLUMN invoice_date DATE;
ALTER TABLE public.invoices ADD COLUMN vendor TEXT;
ALTER TABLE public.invoices ADD COLUMN line_items JSONB;
ALTER TABLE public.invoices ADD COLUMN analysis_status TEXT DEFAULT 'pending';

-- Create index for searching line items
CREATE INDEX idx_invoices_line_items ON public.invoices USING gin(line_items);

-- Create index for invoice number and vendor search
CREATE INDEX idx_invoices_invoice_number ON public.invoices(invoice_number);
CREATE INDEX idx_invoices_vendor ON public.invoices(vendor);