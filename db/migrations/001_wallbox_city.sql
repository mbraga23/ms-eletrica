-- Aplicar uma vez a cada banco D1 existente antes de publicar o formulário novo.
-- A coluna é opcional para preservar registros e formulários anteriores.
ALTER TABLE wallbox_leads ADD COLUMN city TEXT;
