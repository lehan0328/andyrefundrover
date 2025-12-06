-- Add source_email column to invoices table
ALTER TABLE public.invoices ADD COLUMN source_email text;