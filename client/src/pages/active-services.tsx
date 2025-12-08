import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, FileText, Clock, Car } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ActiveService, CompletedService } from "@shared/schema";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export default function ActiveServices() {
  const { toast } = useToast();
  const [editing, setEditing] = useState<CompletedService | null>(null);
  const [editItems, setEditItems] = useState<Array<{ description: string; quantity: number; unitPrice: number }>>([]);
  
  const { data: services, isLoading } = useQuery<ActiveService[]>({
    queryKey: ['/api/active-services'],
    refetchInterval: 5000,
    staleTime: 10000,
    refetchOnWindowFocus: false,
  });

  const { data: completed, isLoading: completedLoading } = useQuery<CompletedService[]>({
    queryKey: ['/api/completed-services'],
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const completeMutation = useMutation({
    mutationFn: async (serviceId: string) => {
      return await apiRequest('POST', `/api/complete-service/${serviceId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/active-services'] });
      queryClient.invalidateQueries({ queryKey: ['/api/workers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/completed-services'] });
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

  const updateInvoiceMutation = useMutation({
    mutationFn: async (payload: { id: string; items: Array<{ description: string; quantity: number; unitPrice: number }>; currency?: string }) => {
      return await apiRequest('PUT', `/api/completed-services/${payload.id}`, { items: payload.items, currency: payload.currency ?? 'INR' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/completed-services'] });
      toast({ title: 'Invoice Updated', description: 'Invoice items have been saved.' });
      setEditing(null);
    },
    onError: (error: Error) => {
      toast({ title: 'Update Failed', description: error.message, variant: 'destructive' });
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

  const calculateTimeRemaining = (estimatedCompletion: string | Date, progress: number) => {
    const now = new Date();
    const completion = new Date(estimatedCompletion as any);
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

  const calculateQueuedStartEta = (list: ActiveService[], current: ActiveService) => {
    const inProgress = list.filter(s => s.status === 'In Progress');
    if (inProgress.length === 0) return 'Waiting';
    const earliest = inProgress.reduce((min, s) => {
      const t = new Date(s.estimatedCompletion as any).getTime();
      return Math.min(min, t);
    }, Infinity);
    const now = Date.now();
    const diff = earliest - now;
    if (diff <= 0) return 'Starting soon';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const initials = (name: string) => name.split(' ').map((n) => n[0]).join('').slice(0,2).toUpperCase();

  const downloadReceipt = (record: CompletedService) => {
    const dateStr = new Date(record.completedAt).toLocaleString();
    const currencySymbol = record.currency === 'INR' ? '₹' : (record.currency || '$');
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"/>
    <title>Receipt ${record.id}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <style>
      body{font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial; background:#fff; color:#0f172a;}
      .card{max-width:720px;margin:24px auto;padding:24px;border:1px solid #CBD3DF;border-radius:16px;background:#F7F9FB}
      .row{display:flex;justify-content:space-between;gap:16px}
      .muted{color:#64748b;font-size:12px}
      h1{font-size:20px;margin:0 0 8px}
      table{width:100%;border-collapse:collapse;margin-top:16px}
      th,td{border:1px solid #CBD3DF;padding:10px;text-align:left;font-size:14px}
      th{background:#eaf1fb}
      .total{font-weight:600;color:#1A73E8}
      .badge{display:inline-block;padding:4px 8px;border:1px solid #CBD3DF;border-radius:8px;background:#fff;color:#1A73E8;font-size:12px}
    </style></head><body>
      <div class="card">
        <h1>Service Receipt</h1>
        <div class="muted">${dateStr}</div>
        <div class="row" style="margin-top:12px">
          <div>
            <div><strong>Service ID:</strong> ${record.id}</div>
            <div><strong>Vehicle:</strong> ${record.carModel} (${record.carNumber})</div>
            <div><strong>Type:</strong> ${record.serviceType}</div>
          </div>
          <div>
            <div><span class="badge">${record.assignedMachine}</span></div>
            <div class="muted" style="margin-top:6px">Workers: ${record.assignedWorkers.join(', ') || '—'}</div>
          </div>
        </div>
        <table>
          <thead><tr><th>Item</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
          <tbody>
            ${record.items.map(i => `
              <tr>
                <td>${i.description}</td>
                <td>${typeof i.quantity === 'number' ? i.quantity.toFixed(2) : i.quantity}</td>
                <td>${currencySymbol}${i.unitPrice.toFixed(2)}</td>
                <td>${currencySymbol}${i.amount.toFixed(2)}</td>
              </tr>
            `).join('')}
            <tr><td colspan="3" class="total">Total</td><td class="total">${currencySymbol}${record.amount.toFixed(2)}</td></tr>
          </tbody>
        </table>
        <div class="muted" style="margin-top:12px">Note: Parts priced separately if used.</div>
      </div>
    </body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${record.id}_receipt.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 p-6 bg-background min-h-[calc(100vh-64px)]">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">Active Services</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor ongoing and queued service requests
        </p>
      </div>

      <Card className="rounded-2xl border bg-card shadow">
        <CardHeader>
          <CardTitle>Services In Progress</CardTitle>
          <CardDescription>
            Real-time tracking of all active service jobs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {services && services.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-muted-foreground">Queue Lane</div>
                <Badge variant="outline" className="text-xs">{services.filter(s => s.status === 'Queued').length} queued</Badge>
              </div>
              <div className="relative h-16 rounded-md bg-muted overflow-hidden">
                <AnimatePresence>
                  {services.filter(s => s.status === 'Queued').map((s) => (
                    <motion.div
                      key={s.id}
                      initial={{ x: -80, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: 80, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                      className="absolute top-1/2 -translate-y-1/2 flex items-center gap-2"
                      style={{ left: Math.min(90, (s.queuePosition || 1) * 12) + '%' }}
                    >
                      <div className="p-2 rounded-full bg-primary/10">
                        <Car className="h-5 w-5 text-primary" />
                      </div>
                      <Badge variant="outline" className="text-xs">#{s.queuePosition || 1}</Badge>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}
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
                  <AnimatePresence>
                  {services.map((service) => (
                    <motion.tr key={service.id} data-testid={`row-service-${service.id}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
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
                        <motion.div className="space-y-1 min-w-[140px]" initial={{ opacity: 0.9 }} animate={{ opacity: 1 }}>
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium" data-testid={`text-progress-${service.id}`}>{service.progress}%</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                            <motion.div 
                              className="h-2 rounded-full"
                              style={{ backgroundImage: 'linear-gradient(90deg,#3b82f6,#06b6d4)', filter: 'brightness(1.1)' }}
                              initial={{ width: 0, backgroundPositionX: 0 }}
                              animate={{ width: `${service.progress}%`, backgroundPositionX: 40 }}
                              transition={{ type: 'spring', stiffness: 200, damping: 24 }}
                              aria-valuenow={service.progress}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              role="progressbar"
                            />
                          </div>
                        </motion.div>
                      </TableCell>
                      <TableCell data-testid={`text-time-remaining-${service.id}`}>
                        {service.status === 'Queued'
                          ? `Starts in ${calculateQueuedStartEta(services, service)}`
                          : calculateTimeRemaining(service.estimatedCompletion, service.progress)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2 max-w-[200px]">
                          {service.assignedWorkers.slice(0, 3).map((worker, idx) => (
                            <div key={idx} className="relative">
                              <div className="h-7 w-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-semibold ring-2 ring-[#0ABEFF]/60 shadow-[0_0_10px_rgba(10,190,255,0.35)]">
                                {initials(worker)}
                              </div>
                              <span className="absolute -inset-[2px] rounded-full ring-2 ring-[#0ABEFF]/30" />
                            </div>
                          ))}
                          {service.assignedWorkers.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{service.assignedWorkers.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <motion.div initial={{ scale: 0.98 }} animate={{ scale: 1 }}>
                          <Badge variant="outline" data-testid={`badge-machine-${service.id}`} className="backdrop-blur-sm">
                            {service.assignedMachine}
                          </Badge>
                        </motion.div>
                      </TableCell>
                      <TableCell>
                        <motion.div initial={{ y: -2 }} animate={{ y: 0 }}>
                          <Badge variant="outline" className={getStatusColor(service.status)} data-testid={`badge-status-${service.id}`}>
                            {service.status}
                          </Badge>
                        </motion.div>
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
                    </motion.tr>
                  ))}
                  </AnimatePresence>
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

      <Card className="rounded-2xl border bg-card shadow">
        <CardHeader>
          <CardTitle>Completed Services</CardTitle>
          <CardDescription>History of recently completed jobs</CardDescription>
        </CardHeader>
        <CardContent>
          {completedLoading ? (
            <div className="space-y-4">
              {[1,2].map(i => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ))}
            </div>
          ) : completed && completed.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service ID</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Service Type</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completed.map((rec) => (
                    <TableRow key={rec.id} data-testid={`row-completed-${rec.id}`}>
                      <TableCell className="font-mono text-sm">{rec.id}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{rec.carModel}</div>
                          <div className="text-sm text-muted-foreground">{rec.carNumber}</div>
                        </div>
                      </TableCell>
                      <TableCell>{rec.serviceType}</TableCell>
                      <TableCell>{rec.predictedHours.toFixed(2)}h</TableCell>
                      <TableCell className="text-[#1A73E8]">{rec.currency === 'INR' ? '₹' : (rec.currency || '$')}{rec.amount.toFixed(2)}</TableCell>
                      <TableCell>{new Date(rec.completedAt).toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => downloadReceipt(rec)} data-testid={`button-download-receipt-${rec.id}`}>
                            <FileText className="h-4 w-4 mr-1" />
                            Download Receipt
                          </Button>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="secondary" onClick={() => { setEditing(rec); setEditItems(rec.items.map(i => ({ description: i.description, quantity: i.quantity, unitPrice: i.unitPrice }))); }}>Edit Invoice</Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit Invoice</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-3">
                                {editItems.map((item, idx) => (
                                  <div key={idx} className="grid grid-cols-4 gap-2 items-center">
                                    <Input value={item.description} onChange={(e) => {
                                      const v = e.target.value; const next = [...editItems]; next[idx].description = v; setEditItems(next);
                                    }} placeholder="Description" />
                                    <Input type="number" value={item.quantity} onChange={(e) => {
                                      const v = parseFloat(e.target.value || '0'); const next = [...editItems]; next[idx].quantity = isNaN(v) ? 0 : v; setEditItems(next);
                                    }} placeholder="Qty" />
                                    <Input type="number" value={item.unitPrice} onChange={(e) => {
                                      const v = parseFloat(e.target.value || '0'); const next = [...editItems]; next[idx].unitPrice = isNaN(v) ? 0 : v; setEditItems(next);
                                    }} placeholder="Rate" />
                                    <Button variant="ghost" onClick={() => { const next = editItems.filter((_, i) => i !== idx); setEditItems(next); }}>Delete</Button>
                                  </div>
                                ))}
                                <div className="flex gap-2">
                                  <Button variant="outline" onClick={() => setEditItems([...editItems, { description: 'New Item', quantity: 1, unitPrice: 0 }])}>Add Item</Button>
                                  <div className="ml-auto font-medium">Total: ₹{editItems.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0).toFixed(2)}</div>
                                </div>
                              </div>
                              <DialogFooter>
                                <Button onClick={() => updateInvoiceMutation.mutate({ id: rec.id, items: editItems, currency: 'INR' })} disabled={updateInvoiceMutation.isPending}>Save</Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No completed services yet.</div>
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
