-- Add expense tracking columns to vehicle_issues
ALTER TABLE vehicle_issues
ADD COLUMN expense_amount numeric DEFAULT NULL,
ADD COLUMN expense_method text DEFAULT NULL;
