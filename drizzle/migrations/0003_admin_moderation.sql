CREATE TYPE public.app_role AS ENUM ('admin');
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- grant admin to the owner's email once that email is confirmed
CREATE OR REPLACE FUNCTION public.grant_owner_admin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF lower(NEW.email) = 'salechaavdesh@gmail.com' AND NEW.email_confirmed_at IS NOT NULL THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_owner_admin AFTER INSERT OR UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.grant_owner_admin();

CREATE OR REPLACE FUNCTION public.admin_list_players()
RETURNS TABLE(id uuid, nickname text, banned boolean, created_at timestamptz, week_score integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'not allowed'; END IF;
  RETURN QUERY SELECT p.id, p.nickname, p.banned, p.created_at, wb.score
    FROM public.players p
    LEFT JOIN public.weekly_best wb ON wb.player_id = p.id AND wb.week_key = public.current_week_key()
    ORDER BY wb.score DESC NULLS LAST, p.created_at DESC;
END $$;

CREATE OR REPLACE FUNCTION public.admin_set_banned(p_player_id uuid, p_banned boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'not allowed'; END IF;
  UPDATE public.players SET banned = p_banned WHERE id = p_player_id;
END $$;

REVOKE ALL ON FUNCTION public.admin_list_players() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_banned(uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.grant_owner_admin() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_players() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_banned(uuid, boolean) TO authenticated;