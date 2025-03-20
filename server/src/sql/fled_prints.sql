CREATE OR REPLACE FUNCTION update_fled_prints()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE "CardCatalog"
  SET "fledPrints" = array_append("fledPrints", jsonb_build_object('print', OLD.print, 'rarity', OLD.rarity))
  WHERE id = OLD."cardId";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;
