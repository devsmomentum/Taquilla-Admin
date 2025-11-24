-- 💰 INICIALIZAR BALANCES DE POTES PARA PROBAR RETIROS

-- Insertar o actualizar potes con balance
INSERT INTO pots (name, percentage, balance, color, description) 
VALUES 
  ('Pote de Premios', 70.00, 5000.00, '#10b981', 'Dinero disponible para pagar premios a los ganadores'),
  ('Pote de Reserva', 20.00, 2000.00, '#f59e0b', 'Fondo de reserva para contingencias'),
  ('Pote de Ganancias', 10.00, 1500.00, '#ef4444', 'Ganancias netas del negocio')
ON CONFLICT (name) DO UPDATE SET
  balance = EXCLUDED.balance,
  percentage = EXCLUDED.percentage,
  color = EXCLUDED.color,
  description = EXCLUDED.description;

-- Verificar que se actualizaron correctamente
SELECT 
  name as "Pote",
  'Bs. ' || balance::text as "Balance",
  percentage::text || '%' as "Porcentaje"
FROM pots 
ORDER BY id;