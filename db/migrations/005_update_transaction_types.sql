-- Drop existing constraint
ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;

-- Add updated constraint with slots types
ALTER TABLE wallet_transactions ADD CONSTRAINT wallet_transactions_type_check 
CHECK (type IN ('deposit', 'withdraw', 'bet_taixiu', 'win_taixiu', 'bet_baucua', 'win_baucua', 'bet_wheel', 'win_wheel', 'bet_slots', 'win_slots', 'subscription'));
