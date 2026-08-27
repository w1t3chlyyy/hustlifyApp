import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useStorefrontPath } from "@/contexts/StorefrontContext";

const NotFound = () => {
  const location = useLocation();
  const buildPath = useStorefrontPath();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="container-main mx-auto px-4 flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="text-6xl sm:text-8xl font-display font-bold text-primary/30 mb-4">404</div>
        <h1 className="font-display text-xl sm:text-2xl font-bold mb-2">Страница не найдена</h1>
        <p className="text-sm text-muted-foreground mb-6">Страница, которую вы ищете, не существует или была перемещена.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to={buildPath('/')}><Button variant="hero">На главную</Button></Link>
          <Link to={buildPath('/catalog')}><Button variant="outline">Перейти в каталог</Button></Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
