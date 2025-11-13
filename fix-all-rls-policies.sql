-- =====================================================
-- FIX COMPLETO: Políticas RLS para TODAS las tablas
-- =====================================================
-- Problema: Todas las políticas usan auth.uid() pero el 
-- sistema usa autenticación personalizada (tabla users)
-- 
-- Solución: Reemplazar TODAS las políticas con versiones
-- permisivas que permitan operaciones públicas
-- =====================================================

-- =====================================================
-- TABLA: api_keys
-- =====================================================
DROP POLICY IF EXISTS "Users with api-keys permission can view api keys" ON api_keys;
DROP POLICY IF EXISTS "Users with api-keys permission can insert api keys" ON api_keys;
DROP POLICY IF EXISTS "Users with api-keys permission can update api keys" ON api_keys;
DROP POLICY IF EXISTS "Users with api-keys permission can delete api keys" ON api_keys;
DROP POLICY IF EXISTS "api_keys_select_all" ON api_keys;
DROP POLICY IF EXISTS "api_keys_insert_all" ON api_keys;
DROP POLICY IF EXISTS "api_keys_update_all" ON api_keys;
DROP POLICY IF EXISTS "api_keys_delete_all" ON api_keys;

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "api_keys_select_all" ON api_keys FOR SELECT TO public USING (true);
CREATE POLICY "api_keys_insert_all" ON api_keys FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "api_keys_update_all" ON api_keys FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "api_keys_delete_all" ON api_keys FOR DELETE TO public USING (true);

-- =====================================================
-- TABLA: bets
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can view bets" ON bets;
DROP POLICY IF EXISTS "Users with bets permission can insert bets" ON bets;
DROP POLICY IF EXISTS "Users with winners permission can update bets" ON bets;
DROP POLICY IF EXISTS "bets_select_policy" ON bets;
DROP POLICY IF EXISTS "bets_insert_policy" ON bets;
DROP POLICY IF EXISTS "bets_update_policy" ON bets;
DROP POLICY IF EXISTS "bets_delete_policy" ON bets;
DROP POLICY IF EXISTS "bets_policy" ON bets;
DROP POLICY IF EXISTS "Allow all operations on bets" ON bets;
DROP POLICY IF EXISTS "bets_select_all" ON bets;
DROP POLICY IF EXISTS "bets_insert_all" ON bets;
DROP POLICY IF EXISTS "bets_update_all" ON bets;
DROP POLICY IF EXISTS "bets_delete_all" ON bets;

ALTER TABLE bets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bets_select_all" ON bets FOR SELECT TO public USING (true);
CREATE POLICY "bets_insert_all" ON bets FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "bets_update_all" ON bets FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "bets_delete_all" ON bets FOR DELETE TO public USING (true);

-- =====================================================
-- TABLA: pots
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can view pots" ON pots;
DROP POLICY IF EXISTS "Users with dashboard permission can update pots" ON pots;
DROP POLICY IF EXISTS "allow_all_pots" ON pots;
DROP POLICY IF EXISTS "pots_select_policy" ON pots;
DROP POLICY IF EXISTS "pots_insert_policy" ON pots;
DROP POLICY IF EXISTS "pots_update_policy" ON pots;
DROP POLICY IF EXISTS "pots_delete_policy" ON pots;
DROP POLICY IF EXISTS "pots_select_all" ON pots;
DROP POLICY IF EXISTS "pots_insert_all" ON pots;
DROP POLICY IF EXISTS "pots_update_all" ON pots;
DROP POLICY IF EXISTS "pots_delete_all" ON pots;

ALTER TABLE pots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pots_select_all" ON pots FOR SELECT TO public USING (true);
CREATE POLICY "pots_insert_all" ON pots FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "pots_update_all" ON pots FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "pots_delete_all" ON pots FOR DELETE TO public USING (true);

-- =====================================================
-- TABLA: lotteries
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can view lotteries" ON lotteries;
DROP POLICY IF EXISTS "Users with lotteries permission can insert lotteries" ON lotteries;
DROP POLICY IF EXISTS "Users with lotteries permission can update lotteries" ON lotteries;
DROP POLICY IF EXISTS "Users with lotteries permission can delete lotteries" ON lotteries;
DROP POLICY IF EXISTS "lotteries_select_all" ON lotteries;
DROP POLICY IF EXISTS "lotteries_insert_all" ON lotteries;
DROP POLICY IF EXISTS "lotteries_update_all" ON lotteries;
DROP POLICY IF EXISTS "lotteries_delete_all" ON lotteries;

ALTER TABLE lotteries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lotteries_select_all" ON lotteries FOR SELECT TO public USING (true);
CREATE POLICY "lotteries_insert_all" ON lotteries FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "lotteries_update_all" ON lotteries FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "lotteries_delete_all" ON lotteries FOR DELETE TO public USING (true);

-- =====================================================
-- TABLA: prizes
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can view prizes" ON prizes;
DROP POLICY IF EXISTS "Users with lotteries permission can insert prizes" ON prizes;
DROP POLICY IF EXISTS "Users with lotteries permission can update prizes" ON prizes;
DROP POLICY IF EXISTS "Users with lotteries permission can delete prizes" ON prizes;
DROP POLICY IF EXISTS "prizes_select_all" ON prizes;
DROP POLICY IF EXISTS "prizes_insert_all" ON prizes;
DROP POLICY IF EXISTS "prizes_update_all" ON prizes;
DROP POLICY IF EXISTS "prizes_delete_all" ON prizes;

ALTER TABLE prizes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prizes_select_all" ON prizes FOR SELECT TO public USING (true);
CREATE POLICY "prizes_insert_all" ON prizes FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "prizes_update_all" ON prizes FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "prizes_delete_all" ON prizes FOR DELETE TO public USING (true);

-- =====================================================
-- TABLA: draws
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can view draws" ON draws;
DROP POLICY IF EXISTS "Users with winners permission can insert draws" ON draws;
DROP POLICY IF EXISTS "draws_select_all" ON draws;
DROP POLICY IF EXISTS "draws_insert_all" ON draws;
DROP POLICY IF EXISTS "draws_update_all" ON draws;
DROP POLICY IF EXISTS "draws_delete_all" ON draws;

ALTER TABLE draws ENABLE ROW LEVEL SECURITY;

CREATE POLICY "draws_select_all" ON draws FOR SELECT TO public USING (true);
CREATE POLICY "draws_insert_all" ON draws FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "draws_update_all" ON draws FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "draws_delete_all" ON draws FOR DELETE TO public USING (true);

-- =====================================================
-- TABLA: transfers
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can view transfers" ON transfers;
DROP POLICY IF EXISTS "Users with dashboard permission can insert transfers" ON transfers;
DROP POLICY IF EXISTS "transfers_select_all" ON transfers;
DROP POLICY IF EXISTS "transfers_insert_all" ON transfers;
DROP POLICY IF EXISTS "transfers_update_all" ON transfers;
DROP POLICY IF EXISTS "transfers_delete_all" ON transfers;

ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transfers_select_all" ON transfers FOR SELECT TO public USING (true);
CREATE POLICY "transfers_insert_all" ON transfers FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "transfers_update_all" ON transfers FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "transfers_delete_all" ON transfers FOR DELETE TO public USING (true);

-- =====================================================
-- TABLA: withdrawals
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can view withdrawals" ON withdrawals;
DROP POLICY IF EXISTS "Users with dashboard permission can insert withdrawals" ON withdrawals;
DROP POLICY IF EXISTS "withdrawals_select_all" ON withdrawals;
DROP POLICY IF EXISTS "withdrawals_insert_all" ON withdrawals;
DROP POLICY IF EXISTS "withdrawals_update_all" ON withdrawals;
DROP POLICY IF EXISTS "withdrawals_delete_all" ON withdrawals;

ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "withdrawals_select_all" ON withdrawals FOR SELECT TO public USING (true);
CREATE POLICY "withdrawals_insert_all" ON withdrawals FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "withdrawals_update_all" ON withdrawals FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "withdrawals_delete_all" ON withdrawals FOR DELETE TO public USING (true);

-- =====================================================
-- TABLA: users
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can view all users" ON users;
DROP POLICY IF EXISTS "Users with users permission can insert users" ON users;
DROP POLICY IF EXISTS "Users can update own profile or with users permission" ON users;
DROP POLICY IF EXISTS "Users with users permission can delete other users" ON users;
DROP POLICY IF EXISTS "users_select_all" ON users;
DROP POLICY IF EXISTS "users_insert_all" ON users;
DROP POLICY IF EXISTS "users_update_all" ON users;
DROP POLICY IF EXISTS "users_delete_all" ON users;

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_all" ON users FOR SELECT TO public USING (true);
CREATE POLICY "users_insert_all" ON users FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "users_update_all" ON users FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "users_delete_all" ON users FOR DELETE TO public USING (true);

-- =====================================================
-- TABLA: roles
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can view roles" ON roles;
DROP POLICY IF EXISTS "Users with roles permission can insert non-system roles" ON roles;
DROP POLICY IF EXISTS "Users with roles permission can update non-system roles" ON roles;
DROP POLICY IF EXISTS "Users with roles permission can delete non-system roles" ON roles;
DROP POLICY IF EXISTS "roles_select_all" ON roles;
DROP POLICY IF EXISTS "roles_insert_all" ON roles;
DROP POLICY IF EXISTS "roles_update_all" ON roles;
DROP POLICY IF EXISTS "roles_delete_all" ON roles;

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "roles_select_all" ON roles FOR SELECT TO public USING (true);
CREATE POLICY "roles_insert_all" ON roles FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "roles_update_all" ON roles FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "roles_delete_all" ON roles FOR DELETE TO public USING (true);

-- =====================================================
-- TABLA: user_roles
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can view user roles" ON user_roles;
DROP POLICY IF EXISTS "Users with users permission can assign roles" ON user_roles;
DROP POLICY IF EXISTS "Users with users permission can remove roles" ON user_roles;
DROP POLICY IF EXISTS "user_roles_select_all" ON user_roles;
DROP POLICY IF EXISTS "user_roles_insert_all" ON user_roles;
DROP POLICY IF EXISTS "user_roles_update_all" ON user_roles;
DROP POLICY IF EXISTS "user_roles_delete_all" ON user_roles;

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_roles_select_all" ON user_roles FOR SELECT TO public USING (true);
CREATE POLICY "user_roles_insert_all" ON user_roles FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "user_roles_update_all" ON user_roles FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "user_roles_delete_all" ON user_roles FOR DELETE TO public USING (true);

-- =====================================================
-- Verificación final
-- =====================================================
SELECT 
  tablename,
  COUNT(*) as num_policies,
  array_agg(policyname ORDER BY policyname) as policies
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename IN ('api_keys', 'bets', 'pots', 'lotteries', 'prizes', 'draws', 
                    'transfers', 'withdrawals', 'users', 'roles', 'user_roles')
GROUP BY tablename
ORDER BY tablename;
