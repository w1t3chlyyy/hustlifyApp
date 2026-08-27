import { Skeleton } from '@/components/ui/skeleton';

const ProductCardSkeleton = () => (
  <div className="bg-card border border-border/50 rounded-xl overflow-hidden">
    <Skeleton className="h-36 sm:h-44 w-full" />
    <div className="p-3 sm:p-4 space-y-2">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <div className="flex justify-between items-center pt-3 border-t border-border/30">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>
    </div>
  </div>
);

export default ProductCardSkeleton;
