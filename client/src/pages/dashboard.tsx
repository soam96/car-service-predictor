import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Wrench, Clock, Package, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardStats {
  totalWorkers: number;
  activeJobs: number;
  availableWorkers: number;
  queueCount: number;
  capacityUsed: number;
  totalMachines: number;
  machinesActive: number;
  lowStockItems: number;
  lastUpdated: string;
}

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard-stats'],
    refetchInterval: 5000,
    staleTime: 10000,
    refetchOnWindowFocus: false,
  });

  const statCards = [
    {
      title: "Total Workers",
      value: stats?.totalWorkers || 0,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Active Jobs",
      value: stats?.activeJobs || 0,
      icon: Wrench,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Available Workers",
      value: stats?.availableWorkers || 0,
      icon: Activity,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Queue Count",
      value: stats?.queueCount || 0,
      icon: Clock,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
  ];

  const Donut = ({ value }: { value: number }) => {
    const size = 140;
    const stroke = 12;
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const pct = Math.min(100, Math.max(0, value));
    const offset = c - (pct / 100) * c;
    return (
      <motion.svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} initial={{ rotate: -90 }} animate={{ rotate: -90 }}>
        <circle cx={size/2} cy={size/2} r={r} stroke="#CBD3DF" strokeWidth={stroke} fill="none" />
        <motion.circle 
          cx={size/2} cy={size/2} r={r} 
          stroke="url(#grad)" strokeWidth={stroke} fill="none" 
          strokeDasharray={c} 
          strokeDashoffset={offset}
          transition={{ type: 'spring', stiffness: 160, damping: 24 }}
        />
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1A73E8" />
            <stop offset="100%" stopColor="#45C9FF" />
          </linearGradient>
        </defs>
        <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" className="fill-white" fontSize="20" fontWeight={600}>{pct}%</text>
      </motion.svg>
    );
  };

  return (
    <div className="space-y-6 p-6 bg-background min-h-[calc(100vh-64px)]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">Workshop Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time workshop status and performance metrics
          </p>
        </div>
        {stats && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" data-testid="indicator-live" />
            <span>Last updated: {new Date(stats.lastUpdated).toLocaleTimeString()}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-10 rounded-md" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <AnimatePresence>
            {statCards.map((stat, index) => (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
              >
                <Card data-testid={`card-stat-${index}`} className="rounded-2xl border bg-card shadow">
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </CardTitle>
                    <div className="p-2 rounded-md bg-secondary/20">
                      <stat.icon className="h-5 w-5 text-[#1A73E8]" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-semibold" data-testid={`text-stat-value-${index}`}><AnimatedNumber value={stat.value as number} /></div>
                    {stat.title === "Queue Count" && stat.value > 0 && (
                      <p className="text-xs text-[#1A73E8] mt-2">Workshop at capacity</p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-2xl border bg-card shadow">
          <CardHeader>
            <CardTitle>Workshop Capacity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </>
            ) : (
              <>
                <div className="flex items-center justify-center">
                  <Donut value={Math.min(100, Math.max(0, (() => {
                    const tm = stats?.totalMachines || 0;
                    const ma = stats?.machinesActive || 0;
                    if (tm > 0) return (ma / tm) * 100;
                    return stats?.capacityUsed || 0;
                  })()))} />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Machines Active</div>
                    <div className="text-2xl font-semibold" data-testid="text-machines-active">
                      <AnimatedNumber value={stats?.machinesActive || 0} />/{stats?.totalMachines || 0}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Low Stock Items</div>
                    <div className="text-2xl font-semibold text-[#1A73E8]" data-testid="text-low-stock">
                      <AnimatedNumber value={stats?.lowStockItems || 0} />
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border bg-card shadow">
          <CardHeader>
            <CardTitle>System Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-md bg-card border">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-[#1A73E8] animate-pulse" />
                  <span className="text-sm font-medium">AI Prediction Engine</span>
                </div>
                <span className="text-xs text-[#1A73E8] font-medium">Operational</span>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-md bg-card border">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-[#1A73E8] animate-pulse" />
                  <span className="text-sm font-medium">Resource Allocator</span>
                </div>
                <span className="text-xs text-[#1A73E8] font-medium">Operational</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-md bg-card border">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-[#1A73E8] animate-pulse" />
                  <span className="text-sm font-medium">Inventory Tracker</span>
                </div>
                <span className="text-xs text-[#1A73E8] font-medium">Operational</span>
              </div>

              {stats && stats.lowStockItems > 0 && (
                <div className="flex items-center justify-between p-3 rounded-md bg-card border">
                  <div className="flex items-center gap-3">
                    <Package className="h-4 w-4 text-[#1A73E8]" />
                    <span className="text-sm font-medium text-[#1A73E8]">Stock Alert</span>
                  </div>
                  <span className="text-xs text-[#1A73E8] font-medium">{stats.lowStockItems} items low</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
  const AnimatedNumber = ({ value }: { value: number }) => {
    const v = Math.max(0, value || 0);
    return (
      <motion.span
        initial={{ opacity: 0.6 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
      >
        {v}
      </motion.span>
    );
  };