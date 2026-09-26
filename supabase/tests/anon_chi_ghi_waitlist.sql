DO $$
DECLARE ket text := '';
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  EXECUTE 'SET LOCAL ROLE anon';
  BEGIN
    INSERT INTO public.waitlist (email, company_name) VALUES ('kiem-thu-go-live@example.com', 'Kiểm thử');
    ket := ket || 'waitlist=DUOC;';
  EXCEPTION WHEN OTHERS THEN ket := ket || 'waitlist=LOI(' || SQLSTATE || ');';
  END;
  BEGIN
    INSERT INTO public.product_events (name, props) VALUES ('kiem_thu', '{}'::jsonb);
    ket := ket || 'product_events=LOT;';
  EXCEPTION WHEN insufficient_privilege THEN ket := ket || 'product_events=CHAN;';
  END;
  BEGIN
    UPDATE public.companies SET name = 'x' WHERE false;
    ket := ket || 'companies_update=LOT;';
  EXCEPTION WHEN insufficient_privilege THEN ket := ket || 'companies_update=CHAN;';
  END;
  BEGIN
    DELETE FROM public.transactions WHERE false;
    ket := ket || 'transactions_delete=LOT;';
  EXCEPTION WHEN insufficient_privilege THEN ket := ket || 'transactions_delete=CHAN;';
  END;
  EXECUTE 'RESET ROLE';
  RAISE EXCEPTION 'KET_QUA=%', ket;
END $$;
