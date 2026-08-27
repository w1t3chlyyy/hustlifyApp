CREATE POLICY "Users can read sold inventory items"
ON public.inventory_items
FOR SELECT
TO public
USING (order_id IS NOT NULL);