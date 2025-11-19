import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Star } from "lucide-react";
import type { Worker } from "@shared/schema";

export default function Workers() {
  const { data: workers, isLoading } = useQuery<Worker[]>({
    queryKey: ['/api/workers'],
    refetchInterval: 5000,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Available':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Busy':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Offline':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSkillColor = (skill: string) => {
    switch (skill) {
      case 'Engine':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Brake':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'AC':
        return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case 'General':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">Worker Management</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor and manage workshop technicians
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Workers</CardTitle>
          <CardDescription>
            Real-time status of all workshop technicians
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Worker</TableHead>
                    <TableHead>Skill</TableHead>
                    <TableHead>Experience</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Load</TableHead>
                    <TableHead>Jobs</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Current Jobs</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workers?.map((worker) => (
                    <TableRow key={worker.id} data-testid={`row-worker-${worker.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback className="bg-primary/10 text-primary font-medium">
                              {getInitials(worker.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="font-medium" data-testid={`text-worker-name-${worker.id}`}>{worker.name}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getSkillColor(worker.skill)} data-testid={`badge-skill-${worker.id}`}>
                          {worker.skill}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground" data-testid={`text-experience-${worker.id}`}>
                        {worker.experienceLevel} years
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                          <span className="font-medium" data-testid={`text-rating-${worker.id}`}>{worker.rating.toFixed(1)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 min-w-[120px]">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium" data-testid={`text-load-${worker.id}`}>{worker.loadPercent}%</span>
                          </div>
                          <Progress value={worker.loadPercent} className="h-2" />
                        </div>
                      </TableCell>
                      <TableCell className="text-center" data-testid={`text-job-count-${worker.id}`}>
                        {worker.activeJobs.length}/3
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusColor(worker.status)} data-testid={`badge-status-${worker.id}`}>
                          {worker.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {worker.activeJobs.length > 0 ? (
                            worker.activeJobs.map((jobId, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs font-mono" data-testid={`badge-job-${worker.id}-${idx}`}>
                                {jobId.slice(-6)}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-sm text-muted-foreground">No active jobs</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
