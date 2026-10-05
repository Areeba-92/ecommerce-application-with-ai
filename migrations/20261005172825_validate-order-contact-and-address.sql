-- Server-side validation of an order's contact and shipping_address.
--
-- Both columns are jsonb and the INSERT grant is table-wide, so a direct SDK
-- insert could store anything: extra keys, nested objects, megabytes of text,
-- a bogus email. The checkout form only checks "not empty", which the browser
-- controls.
--
-- Its own trigger so orders_enforce_integrity (pricing) is left untouched.
-- Values are only validated, never rewritten. They are rendered through React,
-- which escapes text; '<' and '>' are rejected anyway as defence in depth, along
-- with control characters.

CREATE OR REPLACE FUNCTION public.validate_order_contact()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  -- field => max length. These are the ONLY keys accepted, and all are required.
  contact_fields  CONSTANT jsonb := '{"name":100,"email":254,"phone":30}';
  address_fields  CONSTANT jsonb := '{"address":200,"city":100,"zip":20,"country":60}';
  spec   record;
  val    jsonb;
  txt    text;
BEGIN
  IF current_user = 'project_admin' THEN
    RETURN NEW;
  END IF;

  IF jsonb_typeof(NEW.contact) IS DISTINCT FROM 'object'
     OR jsonb_typeof(NEW.shipping_address) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'invalid contact or shipping details';
  END IF;

  IF EXISTS (SELECT 1 FROM jsonb_object_keys(NEW.contact) k WHERE NOT contact_fields ? k)
     OR EXISTS (SELECT 1 FROM jsonb_object_keys(NEW.shipping_address) k WHERE NOT address_fields ? k) THEN
    RAISE EXCEPTION 'unexpected field in contact or shipping details';
  END IF;

  FOR spec IN
    SELECT 'contact' AS col, key, value::int AS maxlen FROM jsonb_each_text(contact_fields)
    UNION ALL
    SELECT 'shipping_address', key, value::int FROM jsonb_each_text(address_fields)
  LOOP
    val := CASE spec.col WHEN 'contact' THEN NEW.contact ELSE NEW.shipping_address END -> spec.key;
    IF val IS NULL OR jsonb_typeof(val) <> 'string' THEN
      RAISE EXCEPTION '% is required', spec.key;
    END IF;
    txt := val #>> '{}';
    IF length(btrim(txt)) = 0 THEN
      RAISE EXCEPTION '% is required', spec.key;
    END IF;
    IF length(txt) > spec.maxlen THEN
      RAISE EXCEPTION '% is too long (max % characters)', spec.key, spec.maxlen;
    END IF;
    IF txt ~ '[[:cntrl:]<>]' THEN
      RAISE EXCEPTION '% contains invalid characters', spec.key;
    END IF;
  END LOOP;

  IF (NEW.contact->>'email') !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' THEN
    RAISE EXCEPTION 'invalid email address';
  END IF;

  IF (NEW.contact->>'phone') !~ '^[0-9+() .-]{5,30}$' THEN
    RAISE EXCEPTION 'invalid phone number';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER orders_validate_contact
BEFORE INSERT ON orders
FOR EACH ROW EXECUTE FUNCTION public.validate_order_contact();
