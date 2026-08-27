-- Admin-only tables: deny all client access, only service_role can operate
CREATE POLICY "No public access" ON public.admin_users FOR ALL USING (false);
CREATE POLICY "No public access" ON public.admin_logs FOR ALL USING (false);
CREATE POLICY "No public access" ON public.admin_sessions FOR ALL USING (false);
CREATE POLICY "No public access" ON public.inventory_items FOR ALL USING (false);