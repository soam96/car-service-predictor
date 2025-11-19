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

  return (
    <div className="space-y-6 p-6">
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
                <Card data-testid={`card-stat-${index}`}>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </CardTitle>
                    <div className={`p-2 rounded-md ${stat.bgColor}`}>
                      <stat.icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-semibold" data-testid={`text-stat-value-${index}`}>{stat.value}</div>
                    {stat.title === "Queue Count" && stat.value > 0 && (
                      <p className="text-xs text-amber-600 mt-2">Workshop at capacity</p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
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
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Capacity Used</span>
                    <AnimatePresence mode="popLayout">
                      <motion.span 
                        key={stats?.lastUpdated}
                        className="font-medium"
                        data-testid="text-capacity-used"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        {stats?.capacityUsed || 0}%
                      </motion.span>
                    </AnimatePresence>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                    {(() => {
                      const cap = Math.min(100, Math.max(0, stats?.capacityUsed || 0));
                      return (
                        <motion.div 
                          className={`h-2 rounded-full ${cap >= 90 ? 'animate-pulse' : ''}`}
                          style={{ width: `${cap}%`, backgroundImage: 'linear-gradient(90deg,var(--tw-gradient-stops))', backgroundColor: 'var(--primary)' }}
                          initial={{ width: 0 }}
                          animate={{ width: `${cap}%` }}
                          transition={{ type: 'spring', stiffness: 180, damping: 25 }}
                          aria-valuenow={cap}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          role="progressbar"
                        />
                      );
                    })()}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Machines Active</div>
                    <div className="text-2xl font-semibold" data-testid="text-machines-active">
                      {stats?.machinesActive || 0}/6
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Low Stock Items</div>
                    <div className="text-2xl font-semibold text-amber-600" data-testid="text-low-stock">
                      {stats?.lowStockItems || 0}
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-md bg-green-50 border border-green-200">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-sm font-medium">AI Prediction Engine</span>
                </div>
                <span className="text-xs text-green-700 font-medium">Operational</span>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-md bg-green-50 border border-green-200">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-sm font-medium">Resource Allocator</span>
                </div>
                <span className="text-xs text-green-700 font-medium">Operational</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-md bg-green-50 border border-green-200">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-sm font-medium">Inventory Tracker</span>
                </div>
                <span className="text-xs text-green-700 font-medium">Operational</span>
              </div>

              {stats && stats.lowStockItems > 0 && (
                <div className="flex items-center justify-between p-3 rounded-md bg-amber-50 border border-amber-200">
                  <div className="flex items-center gap-3">
                    <Package className="h-4 w-4 text-amber-600" />
                    <span className="text-sm font-medium text-amber-800">Stock Alert</span>
                  </div>
                  <span className="text-xs text-amber-700 font-medium">{stats.lowStockItems} items low</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
