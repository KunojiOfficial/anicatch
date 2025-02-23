CREATE OR REPLACE FUNCTION update_fled_prints()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE "CardCatalog"
  SET "fledPrints" = jsonb_set("fledPrints", '{-1}', jsonb_build_object('print', OLD.print, 'rarity', OLD.rarity), true)
  WHERE id = OLD."cardId";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER card_instance_delete
AFTER DELETE ON "CardInstance"
FOR EACH ROW
EXECUTE FUNCTION update_fled_prints();
