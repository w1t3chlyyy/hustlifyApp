import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DbCase {
  id: string;
  slug: string;
  title: string;
  short_description: string;
  full_description: string;
  price: number;
  old_price: number | null;
  image_url: string | null;
  badge_type: 'none' | 'hit' | 'custom';
  badge_text: string;
  spots_left: number | null;
  highlight_enabled: boolean;
  highlight_color: string;
  background_color: string | null;
  cta_text: string;
  support_username: string | null;
  external_link: string | null;
  product_id: string | null;
  miniapp_product_id: string | null;
  is_active: boolean;
  sort_order: number;
}

export const useCases = () =>
  useQuery({
    queryKey: ['cases'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cases' as any)
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data as unknown as DbCase[];
    },
  });
