
CREATE OR REPLACE FUNCTION public.encrypt_token(p_token text, p_key text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  RETURN encode(extensions.pgp_sym_encrypt(p_token, p_key), 'base64');
END;
$function$;

CREATE OR REPLACE FUNCTION public.decrypt_token(p_encrypted text, p_key text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  RETURN extensions.pgp_sym_decrypt(decode(p_encrypted, 'base64'), p_key);
END;
$function$;
