-- 🏦 CONFIGURACIÓN COMPLETA DEL MÓDULO DE RETIROS
-- Ejecutar en Supabase SQL Editor

-- 1️⃣ CREAR/VERIFICAR TABLAS NECESARIAS
-- ====================================

-- Tabla de potes (si no existe)
CREATE TABLE IF NOT EXISTS pots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  percentage DECIMAL(5,2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
  balance DECIMAL(15,2) DEFAULT 0.00 CHECK (balance >= 0),
  color VARCHAR(20) DEFAULT '#10b981',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de retiros (si no existe)
CREATE TABLE IF NOT EXISTS withdrawals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pot_id UUID NOT NULL REFERENCES pots(id) ON DELETE CASCADE,
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  reason TEXT,
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID -- Se puede conectar con auth.users si usas autenticación
);

-- Tabla de transferencias (si no existe)
CREATE TABLE IF NOT EXISTS transfers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_pot_id UUID NOT NULL REFERENCES pots(id),
  to_pot_id UUID NOT NULL REFERENCES pots(id),
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID
);

-- 2️⃣ ÍNDICES PARA OPTIMIZAR CONSULTAS
-- ===================================

CREATE INDEX IF NOT EXISTS idx_withdrawals_pot_id ON withdrawals(pot_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_created_at ON withdrawals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_transfers_from_pot ON transfers(from_pot_id);
CREATE INDEX IF NOT EXISTS idx_transfers_to_pot ON transfers(to_pot_id);
CREATE INDEX IF NOT EXISTS idx_transfers_created_at ON transfers(created_at DESC);

-- 3️⃣ FUNCIÓN PARA ACTUALIZAR updated_at AUTOMÁTICAMENTE
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para la tabla pots
DROP TRIGGER IF EXISTS update_pots_updated_at ON pots;
CREATE TRIGGER update_pots_updated_at
    BEFORE UPDATE ON pots
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4️⃣ FUNCIÓN SEGURA PARA PROCESAR RETIROS
-- =======================================

CREATE OR REPLACE FUNCTION process_withdrawal(
    p_pot_id UUID,
    p_amount DECIMAL(15,2),
    p_reason TEXT DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_current_balance DECIMAL(15,2);
    v_withdrawal_id UUID;
    v_pot_name VARCHAR(100);
BEGIN
    -- Verificar que el pote existe y obtener balance actual
    SELECT balance, name INTO v_current_balance, v_pot_name
    FROM pots 
    WHERE id = p_pot_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Pote no encontrado',
            'code', 'POT_NOT_FOUND'
        );
    END IF;
    
    -- Verificar que hay suficiente balance
    IF v_current_balance < p_amount THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Balance insuficiente',
            'code', 'INSUFFICIENT_BALANCE',
            'current_balance', v_current_balance,
            'requested_amount', p_amount
        );
    END IF;
    
    -- Crear el retiro
    INSERT INTO withdrawals (pot_id, amount, reason, created_by)
    VALUES (p_pot_id, p_amount, p_reason, p_created_by)
    RETURNING id INTO v_withdrawal_id;
    
    -- Actualizar el balance del pote
    UPDATE pots 
    SET balance = balance - p_amount 
    WHERE id = p_pot_id;
    
    -- Retornar éxito
    RETURN json_build_object(
        'success', true,
        'withdrawal_id', v_withdrawal_id,
        'pot_name', v_pot_name,
        'amount', p_amount,
        'new_balance', v_current_balance - p_amount,
        'message', 'Retiro procesado exitosamente'
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', 'Error interno del servidor',
        'code', 'INTERNAL_ERROR',
        'details', SQLERRM
    );
END;
$$ LANGUAGE plpgsql;

-- 5️⃣ INICIALIZAR DATOS DE POTES
-- =============================

-- Insertar o actualizar potes con balances para pruebas
INSERT INTO pots (name, percentage, balance, color, description) 
VALUES 
  ('Pote de Premios', 70.00, 15000.00, '#10b981', 'Dinero disponible para pagar premios a los ganadores'),
  ('Pote de Reserva', 20.00, 8000.00, '#f59e0b', 'Fondo de reserva para contingencias y gastos operativos'),
  ('Pote de Ganancias', 10.00, 5000.00, '#ef4444', 'Ganancias netas del negocio para reinversión')
ON CONFLICT (name) DO UPDATE SET
  balance = EXCLUDED.balance,
  percentage = EXCLUDED.percentage,
  color = EXCLUDED.color,
  description = EXCLUDED.description,
  updated_at = NOW();

-- 6️⃣ INSERTAR ALGUNOS RETIROS DE EJEMPLO
-- ======================================

-- Limpiar retiros anteriores para evitar duplicados
DELETE FROM withdrawals;

-- Insertar retiros de ejemplo
INSERT INTO withdrawals (pot_id, amount, reason, status, created_at) 
SELECT 
    p.id,
    CASE 
        WHEN p.name = 'Pote de Premios' THEN 2500.00
        WHEN p.name = 'Pote de Reserva' THEN 1200.00
        ELSE 800.00
    END,
    CASE 
        WHEN p.name = 'Pote de Premios' THEN 'Pago de premio mayor - Lotería Nacional'
        WHEN p.name = 'Pote de Reserva' THEN 'Gastos operativos mensuales'
        ELSE 'Retiro de ganancias - Inversión en marketing'
    END,
    'completed',
    NOW() - INTERVAL '2 days'
FROM pots p;

-- Actualizar balances después de los retiros de ejemplo
UPDATE pots SET balance = balance - 2500.00 WHERE name = 'Pote de Premios';
UPDATE pots SET balance = balance - 1200.00 WHERE name = 'Pote de Reserva';
UPDATE pots SET balance = balance - 800.00 WHERE name = 'Pote de Ganancias';

-- 7️⃣ VERIFICACIÓN FINAL
-- =====================

-- Mostrar estado actual de los potes
SELECT 
    '🏦 ESTADO ACTUAL DE LOS POTES' as info;

SELECT 
    name as "Nombre del Pote",
    'Bs. ' || COALESCE(balance, 0)::text as "Balance Actual",
    percentage::text || '%' as "Porcentaje",
    color as "Color",
    description as "Descripción"
FROM pots 
ORDER BY percentage DESC;

-- Mostrar últimos retiros
SELECT 
    '💸 ÚLTIMOS RETIROS REGISTRADOS' as info;

SELECT 
    p.name as "Pote",
    'Bs. ' || w.amount::text as "Monto",
    w.reason as "Motivo",
    w.status as "Estado",
    w.created_at::date as "Fecha"
FROM withdrawals w
JOIN pots p ON w.pot_id = p.id
ORDER BY w.created_at DESC
LIMIT 5;

-- Mostrar resumen
SELECT 
    '📊 RESUMEN DEL SISTEMA' as info;

SELECT 
    'Total en potes: Bs. ' || SUM(balance)::text as "Balance Total",
    COUNT(*) || ' potes activos' as "Potes",
    (SELECT COUNT(*) FROM withdrawals) || ' retiros registrados' as "Retiros"
FROM pots;

-- 8️⃣ MENSAJE FINAL
-- ================

SELECT 
    '🎉 ¡CONFIGURACIÓN COMPLETADA!' as "ESTADO",
    'El módulo de retiros está listo para usar' as "MENSAJE",
    'Ve a http://localhost:5000 y prueba el botón Retirar' as "PRÓXIMO_PASO";