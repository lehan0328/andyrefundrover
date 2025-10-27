-- Remove customers that are not needed
DELETE FROM customers 
WHERE company_name IN ('Tech Innovations LLC', 'Global Enterprises');