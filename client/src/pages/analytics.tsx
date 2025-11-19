import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Clock, Users, DollarSign } from "lucide-react";
import type { Analytics } from "@shared/schema";

export default function AnalyticsPage() {
  const { data: analytics, isLoading } = useQuery<Analytics>({
    queryKey: ['/api/analytics'],
    refetchInterval: 10000,
  });

  const metricCards = [
    {
      title: "Completed Services",
      value: analytics?.completedServices || 0,
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-50",
      suffix: "",
    },
    {
      title: "Avg Service Time",
      value: analytics?.averageServiceTime || 0,
      icon: Clock,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      suffix: " hrs",
      decimals: 2,
    },
    {
      title: "Worker Utilization",
      value: analytics?.workerUtilization || 0,
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      suffix: "%",
      decimals: 1,
    },
    {
      title: "Machine Utilization",
      value: analytics?.machineUtilization || 0,
      icon: DollarSign,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      suffix: "%",
      decimals: 1,
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">Analytics & Performance</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Workshop performance metrics and insights
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-10 w-10 rounded-md" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-24 mb-2" />
                  <Skeleton className="h-3 w-full" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          metricCards.map((metric, index) => (
            <Card key={index} data-testid={`card-metric-${index}`}>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {metric.title}
                </CardTitle>
                <div className={`p-2 rounded-md ${metric.bgColor}`}>
                  <metric.icon className={`h-5 w-5 ${metric.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold" data-testid={`text-metric-value-${index}`}>
                  {metric.decimals !== undefined 
                    ? metric.value.toFixed(metric.decimals)
                    : metric.value}
                  {metric.suffix}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {index === 0 && "Total services completed today"}
                  {index === 1 && "Average time per service"}
                  {index === 2 && "Average worker capacity usage"}
                  {index === 3 && "Average machine capacity usage"}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Performance Summary</CardTitle>
            <CardDescription>Key operational metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <>
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </>
            ) : (
              <>
                <div className="p-4 rounded-md bg-muted">
                  <div className="text-sm text-muted-foreground mb-1">Efficiency Score</div>
                  <div className="text-2xl font-semibold" data-testid="text-efficiency-score">
                    {analytics && analytics.workerUtilization > 0 && analytics.machineUtilization > 0
                      ? ((analytics.workerUtilization + analytics.machineUtilization) / 2).toFixed(1)
                      : '0.0'}%
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Combined resource utilization
                  </div>
                </div>

                <div className="p-4 rounded-md bg-muted">
                  <div className="text-sm text-muted-foreground mb-1">Service Throughput</div>
                  <div className="text-2xl font-semibold" data-testid="text-throughput">
                    {analytics?.completedServices || 0}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Total completed services
                  </div>
                </div>

                <div className="p-4 rounded-md bg-muted">
                  <div className="text-sm text-muted-foreground mb-1">Average Turnaround</div>
                  <div className="text-2xl font-semibold" data-testid="text-turnaround">
                    {analytics?.averageServiceTime.toFixed(2) || '0.00'} hrs
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Mean service completion time
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Insights</CardTitle>
            <CardDescription>AI-powered recommendations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <>
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </>
            ) : (
              <>
                {analytics && analytics.workerUtilization > 80 && (
                  <div className="p-3 rounded-md bg-amber-50 border border-amber-200">
                    <div className="text-sm font-medium text-amber-800">High Worker Utilization</div>
                    <div className="text-xs text-amber-700 mt-1">
                      Worker capacity is at {analytics.workerUtilization.toFixed(1)}%. Consider scheduling additional staff during peak hours.
                    </div>
                  </div>
                )}

                {analytics && analytics.machineUtilization > 80 && (
                  <div className="p-3 rounded-md bg-amber-50 border border-amber-200">
                    <div className="text-sm font-medium text-amber-800">High Machine Utilization</div>
                    <div className="text-xs text-amber-700 mt-1">
                      Machine capacity is at {analytics.machineUtilization.toFixed(1)}%. Expect longer queue times for new services.
                    </div>
                  </div>
                )}

                {analytics && analytics.averageServiceTime > 3 && (
                  <div className="p-3 rounded-md bg-blue-50 border border-blue-200">
                    <div className="text-sm font-medium text-blue-800">Service Time Trend</div>
                    <div className="text-xs text-blue-700 mt-1">
                      Average service time is {analytics.averageServiceTime.toFixed(2)} hours. Monitor for potential efficiency improvements.
                    </div>
                  </div>
                )}

                {analytics && analytics.workerUtilization < 50 && analytics.machineUtilization < 50 && (
                  <div className="p-3 rounded-md bg-green-50 border border-green-200">
                    <div className="text-sm font-medium text-green-800">Optimal Capacity</div>
                    <div className="text-xs text-green-700 mt-1">
                      Workshop is operating at optimal capacity with good availability for new service requests.
                    </div>
                  </div>
                )}

                {(!analytics || (analytics.completedServices === 0 && analytics.workerUtilization === 0)) && (
                  <div className="p-3 rounded-md bg-muted">
                    <div className="text-sm font-medium">No Data Available</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Submit service requests to generate analytics and insights.
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
