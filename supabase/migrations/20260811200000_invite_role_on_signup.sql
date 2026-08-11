-- Assign a role from an invite when the profile is created.
--
-- The role must never come from the sign-up form. Anything the browser sends is
-- attacker-controlled, so a client-supplied "role" field is the same as letting
-- people choose to be an admin. The invite is created server-side by someone who
-- already is one, and this trigger is the only thing that reads it.

CREATE OR REPLACE FUNCTION public.apply_invite_on_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv public.invites%ROWTYPE;
BEGIN
  SELECT * INTO inv
  FROM public.invites
  WHERE lower(email) = lower(NEW.email)
    AND accepted_at IS NULL
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    NEW.role := inv.role;
    UPDATE public.invites
      SET accepted_at = now(), accepted_by = NEW.user_id
      WHERE id = inv.id;
  END IF;

  RETURN NEW;
END;
$$;

-- BEFORE INSERT so the role is set on the row being written, rather than
-- inserted as 'owner' and then updated — which would leave a window where the
-- profile exists with the wrong role.
DROP TRIGGER IF EXISTS apply_invite_on_profile_trg ON public.profiles;
CREATE TRIGGER apply_invite_on_profile_trg
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.apply_invite_on_profile();

COMMENT ON FUNCTION public.apply_invite_on_profile() IS
  'Reads profiles.role from a matching unaccepted invite. The only path by which a role above owner can be granted.';
