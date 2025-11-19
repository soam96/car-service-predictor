import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, FileText, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ActiveService } from "@shared/schema";

export default function ActiveServices() {
  const { toast } = useToast();
  
  const { data: services, isLoading } = useQuery<ActiveService[]>({
    queryKey: ['/api/active-services'],
    refetchInterval: 5000,
  });

  const completeMutation = useMutation({
    mutationFn: async (serviceId: string) => {
      return await apiRequest('POST', `/api/complete-service/${serviceId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/active-services'] });
      queryClient.invalidateQueries({ queryKey: ['/api/workers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard-stats'] });
      toast({
        title: "Service Completed",
        description: "Service has been completed and resources have been freed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'In Progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Queued':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Completing':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Completed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const calculateTimeRemaining = (estimatedCompletion: string, progress: number) => {
    const now = new Date();
    const completion = new Date(estimatedCompletion);
    const totalTime = completion.getTime() - now.getTime();
    const remainingTime = (totalTime * (100 - progress)) / 100;
    
    if (remainingTime <= 0) return 'Completing';
    
    const hours = Math.floor(remainingTime / (1000 * 60 * 60));
    const minutes = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">Active Services</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor ongoing and queued service requests
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Services In Progress</CardTitle>
          <CardDescription>
            Real-time tracking of all active service jobs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ))}
            </div>
          ) : services && services.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service ID</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Service Type</TableHead>
                    <TableHead>Predicted Time</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Time Left</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Machine</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.map((service) => (
                    <TableRow key={service.id} data-testid={`row-service-${service.id}`}>
                      <TableCell className="font-mono text-sm" data-testid={`text-service-id-${service.id}`}>
                        {service.id}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium" data-testid={`text-car-model-${service.id}`}>{service.carModel}</div>
                          <div className="text-sm text-muted-foreground">{service.carNumber}</div>
                        </div>
                      </TableCell>
                      <TableCell data-testid={`text-service-type-${service.id}`}>{service.serviceType}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span data-testid={`text-predicted-hours-${service.id}`}>{service.predictedHours.toFixed(2)}h</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 min-w-[120px]">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium" data-testid={`text-progress-${service.id}`}>{service.progress}%</span>
                          </div>
                          <Progress value={service.progress} className="h-2" />
                        </div>
                      </TableCell>
                      <TableCell data-testid={`text-time-remaining-${service.id}`}>
                        {calculateTimeRemaining(service.estimatedCompletion, service.progress)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[150px]">
                          {service.assignedWorkers.slice(0, 2).map((worker, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs" data-testid={`badge-worker-${service.id}-${idx}`}>
                              {worker}
                            </Badge>
                          ))}
                          {service.assignedWorkers.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{service.assignedWorkers.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" data-testid={`badge-machine-${service.id}`}>
                          {service.assignedMachine}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusColor(service.status)} data-testid={`badge-status-${service.id}`}>
                          {service.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => completeMutation.mutate(service.id)}
                            disabled={completeMutation.isPending || service.status === 'Completed'}
                            data-testid={`button-complete-${service.id}`}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Complete
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            data-testid={`button-report-${service.id}`}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Wrench className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Active Services</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                There are currently no services in progress. New service requests will appear here automatically.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const Wrench = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
  </svg>
);
