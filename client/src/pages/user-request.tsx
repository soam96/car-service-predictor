import { useState, useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { serviceRequestSchema, type ServiceRequest } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Clock, Users, Wrench, AlertCircle, CheckCircle2, Calendar } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface ServiceTask {
  id: string;
  name: string;
  baseTimeHours: number;
  category: string;
}

interface PredictionResult {
  serviceId: string;
  predictedHours: number;
  assignedWorkers: string[];
  assignedMachine: string;
  estimatedCompletion: string;
  queuePosition?: number;
  warnings: string[];
}

export default function UserRequest() {
  const { toast } = useToast();
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);

  const { data: tasks, isLoading: tasksLoading } = useQuery<ServiceTask[]>({
    queryKey: ['/api/service-tasks'],
  });

  const form = useForm<ServiceRequest>({
    resolver: zodResolver(serviceRequestSchema),
    defaultValues: {
      carNumber: "",
      carModel: "XC60",
      manufactureYear: new Date().getFullYear(),
      fuelType: "Petrol",
      totalKilometers: 0,
      kmSinceLastService: 0,
      daysSinceLastService: 0,
      serviceType: "Regular Service",
      selectedTasks: [],
      healthScore: 100,
      errorCodes: [],
      rustLevel: "None",
      bodyDamage: "None",
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: ServiceRequest) => {
      return await apiRequest<PredictionResult>('POST', '/api/service-request', data);
    },
    onSuccess: (data) => {
      setPrediction(data);
      toast({
        title: "Service Request Submitted",
        description: `Service ID: ${data.serviceId}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ServiceRequest) => {
    submitMutation.mutate(data);
  };

  const selectedTasks = form.watch("selectedTasks");
  const totalBaseTime = tasks
    ?.filter((task) => selectedTasks.includes(task.name))
    .reduce((sum, task) => sum + task.baseTimeHours, 0) || 0;

  const [fluidDegradation, wearTearScore, batterySOH, kmSinceLastService, daysSinceLastService, rustLevel, bodyDamage, fuelType] = useWatch({
    control: form.control,
    name: [
      'fluidDegradation',
      'wearTearScore',
      'batterySOH',
      'kmSinceLastService',
      'daysSinceLastService',
      'rustLevel',
      'bodyDamage',
      'fuelType',
    ],
  }) as any[];
  useEffect(() => {
    const rustMap: Record<string, number> = { None: 0, Minor: 10, Moderate: 20, Severe: 35 };
    const damageMap: Record<string, number> = { None: 0, Minor: 5, Moderate: 15, Severe: 30 };
    let score = 100;
    const fluids = Number(fluidDegradation || 0);
    const wear = Number(wearTearScore || 0);
    const battery = Number(batterySOH || 100);
    const km = Number(kmSinceLastService || 0);
    const days = Number(daysSinceLastService || 0);
    const rust = rustMap[String(rustLevel || 'None')];
    const damage = damageMap[String(bodyDamage || 'None')];
    const ft = String(fuelType || 'Petrol');
    score -= fluids * 0.5;
    score -= wear * 0.4;
    score -= rust;
    score -= damage;
    if (ft === 'Electric') score -= (100 - battery) * 0.3;
    if (km > 10000) score -= 10; else if (km > 5000) score -= 5;
    if (days > 365) score -= 10; else if (days > 180) score -= 7; else if (days > 90) score -= 4;
    score = Math.max(0, Math.min(100, Math.round(score)));
    form.setValue('healthScore', score, { shouldValidate: true, shouldDirty: true });
  }, [fluidDegradation, wearTearScore, batterySOH, kmSinceLastService, daysSinceLastService, rustLevel, bodyDamage, fuelType, form]);

  if (prediction) {
    return (
      <div className="container mx-auto max-w-4xl p-6 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">Service Request Confirmed</CardTitle>
                <CardDescription>Your vehicle service has been scheduled</CardDescription>
              </div>
              <CheckCircle2 className="h-12 w-12 text-green-600" data-testid="icon-success" />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Service ID</div>
                <div className="font-mono text-lg font-semibold" data-testid="text-service-id">{prediction.serviceId}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Predicted Time</div>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  <span className="text-lg font-semibold" data-testid="text-predicted-hours">
                    {typeof prediction.predictedHours === 'number' ? prediction.predictedHours.toFixed(2) : '0.00'} hours
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">Assigned Workers</div>
                <div className="flex flex-wrap gap-2">
                  {prediction.assignedWorkers?.map((worker, idx) => (
                    <Badge key={idx} variant="secondary" data-testid={`badge-worker-${idx}`}>
                      <Users className="h-3 w-3 mr-1" />
                      {worker}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">Assigned Machine</div>
                <Badge variant="outline" data-testid="badge-machine">
                  <Wrench className="h-3 w-3 mr-1" />
                  {prediction.assignedMachine}
                </Badge>
              </div>

              <div>
                <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">Estimated Completion</div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium" data-testid="text-completion-time">
                    {prediction.estimatedCompletion ? new Date(prediction.estimatedCompletion).toLocaleString() : 'N/A'}
                  </span>
                </div>
              </div>

              {prediction.queuePosition !== undefined && prediction.queuePosition > 0 && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">Queue Position</div>
                  <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200" data-testid="badge-queue">
                    Position #{prediction.queuePosition}
                  </Badge>
                </div>
              )}

              {prediction.warnings && prediction.warnings.length > 0 && (
                <div className="rounded-md bg-amber-50 border border-amber-200 p-4">
                  <div className="flex gap-2">
                    <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-amber-800">Warnings</div>
                      <ul className="text-sm text-amber-700 space-y-1">
                        {prediction.warnings.map((warning, idx) => (
                          <li key={idx} data-testid={`text-warning-${idx}`}>• {warning}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Button onClick={() => setPrediction(null)} className="w-full" data-testid="button-new-request">
              Submit New Request
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Service Request</CardTitle>
          <CardDescription>Submit your vehicle details for AI-powered service time prediction</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <motion.form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Vehicle Information</h3>
                  
                  <FormField
                    control={form.control}
                    name="carNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Car Number</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., AB-1234-CD" {...field} data-testid="input-car-number" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="warrantyStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Warranty Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select warranty" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="In Warranty">In Warranty</SelectItem>
                            <SelectItem value="Out of Warranty">Out of Warranty</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="batterySOH"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Battery SOH</FormLabel>
                        <FormDescription>Drag slider to set 0–100</FormDescription>
                        <FormControl>
                          <div className="space-y-2">
                            <Slider value={[field.value ?? 100]} onValueChange={(v) => field.onChange(v[0])} min={0} max={100} step={1} />
                            <div className="text-sm text-muted-foreground">{field.value ?? 100}%</div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="fluidDegradation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fluid Degradation (0-100)</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" max="100" {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="wearTearScore"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Wear & Tear</FormLabel>
                        <Select onValueChange={(v) => field.onChange(parseInt(v))} defaultValue={String(field.value ?? 0)}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select level" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="0">None</SelectItem>
                            <SelectItem value="25">Low</SelectItem>
                            <SelectItem value="50">Medium</SelectItem>
                            <SelectItem value="75">High</SelectItem>
                            <SelectItem value="100">Severe</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="appointmentType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Appointment Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Appointment">Appointment</SelectItem>
                            <SelectItem value="Walk-in">Walk-in</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  

                  <FormField
                    control={form.control}
                    name="servicePackage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Service Package</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select package" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Basic">Basic</SelectItem>
                            <SelectItem value="Standard">Standard</SelectItem>
                            <SelectItem value="Premium">Premium</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="customerApprovalSpeed"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer Approval Speed</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select speed" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Fast">Fast</SelectItem>
                            <SelectItem value="Normal">Normal</SelectItem>
                            <SelectItem value="Slow">Slow</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  

                  <FormField
                    control={form.control}
                    name="weather"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Weather</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select weather" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Clear">Clear</SelectItem>
                            <SelectItem value="Rain">Rain</SelectItem>
                            <SelectItem value="Extreme">Extreme</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="peakHours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Peak Hours</FormLabel>
                        <FormControl>
                          <Checkbox checked={!!field.value} onCheckedChange={(c) => field.onChange(!!c)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="carModel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Car Model</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-car-model">
                              <SelectValue placeholder="Select model" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="XC40">XC40</SelectItem>
                            <SelectItem value="XC60">XC60</SelectItem>
                            <SelectItem value="XC90">XC90</SelectItem>
                            <SelectItem value="S60">S60</SelectItem>
                            <SelectItem value="S90">S90</SelectItem>
                            <SelectItem value="V60">V60</SelectItem>
                            <SelectItem value="V90">V90</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="manufactureYear"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Manufacture Year</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                            data-testid="input-year"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="fuelType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fuel Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-fuel-type">
                              <SelectValue placeholder="Select fuel type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Petrol">Petrol</SelectItem>
                            <SelectItem value="Diesel">Diesel</SelectItem>
                            <SelectItem value="Hybrid">Hybrid</SelectItem>
                            <SelectItem value="Electric">Electric</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="totalKilometers"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Kilometers</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                            data-testid="input-total-km"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="kmSinceLastService"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>KM Since Last Service</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                            data-testid="input-km-since-service"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="daysSinceLastService"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Service Date</FormLabel>
                        <FormControl>
                          <Input 
                            type="date"
                            onChange={(e) => {
                              const val = e.target.value;
                              const d = new Date(val + "T00:00:00");
                              const now = new Date();
                              const diffDays = Math.max(0, Math.floor((now.getTime() - d.getTime()) / (1000*60*60*24)));
                              form.setValue("daysSinceLastService", diffDays);
                            }}
                          />
                        </FormControl>
                        <FormDescription>Calendar sets days automatically</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Service Details</h3>

                  <FormField
                    control={form.control}
                    name="serviceType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Service Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-service-type">
                              <SelectValue placeholder="Select service type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Regular Service">Regular Service</SelectItem>
                            <SelectItem value="Major Service">Major Service</SelectItem>
                            <SelectItem value="Repair">Repair</SelectItem>
                            <SelectItem value="Diagnostic">Diagnostic</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="healthScore"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vehicle Health Score (0-100)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0" 
                            max="100" 
                            {...field} 
                            readOnly
                            aria-readonly="true"
                            data-testid="input-health-score"
                          />
                        </FormControl>
                        <FormDescription>100 = Excellent, 0 = Critical</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="rustLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rust Level</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-rust-level">
                              <SelectValue placeholder="Select rust level" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="None">None</SelectItem>
                            <SelectItem value="Minor">Minor</SelectItem>
                            <SelectItem value="Moderate">Moderate</SelectItem>
                            <SelectItem value="Severe">Severe</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bodyDamage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Body Damage</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-body-damage">
                              <SelectValue placeholder="Select damage level" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="None">None</SelectItem>
                            <SelectItem value="Minor">Minor</SelectItem>
                            <SelectItem value="Moderate">Moderate</SelectItem>
                            <SelectItem value="Severe">Severe</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="selectedTasks"
                    render={() => (
                      <FormItem>
                        <FormLabel>Service Tasks</FormLabel>
                        <FormDescription>Select all tasks required</FormDescription>
                        {tasksLoading ? (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Loading tasks...</span>
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-64 overflow-y-auto border rounded-md p-4">
                            {tasks?.map((task) => (
                              <FormField
                                key={task.id}
                                control={form.control}
                                name="selectedTasks"
                                render={({ field }) => {
                                  return (
                                    <FormItem
                                      key={task.id}
                                      className="flex flex-row items-start space-x-3 space-y-0"
                                    >
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value?.includes(task.name)}
                                          onCheckedChange={(checked) => {
                                            return checked
                                              ? field.onChange([...field.value, task.name])
                                              : field.onChange(
                                                  field.value?.filter(
                                                    (value) => value !== task.name
                                                  )
                                                )
                                          }}
                                          data-testid={`checkbox-task-${task.id}`}
                                        />
                                      </FormControl>
                                      <div className="flex-1 flex justify-between items-center">
                                        <FormLabel className="font-normal cursor-pointer">
                                          {task.name}
                                        </FormLabel>
                                        <Badge variant="outline" className="text-xs">
                                          {task.baseTimeHours}h
                                        </Badge>
                                      </div>
                                    </FormItem>
                                  );
                                }}
                              />
                            ))}
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {selectedTasks.length > 0 && (
                    <div className="p-4 bg-primary/5 rounded-md border border-primary/20">
                      <div className="text-sm font-medium text-muted-foreground">Base Time Estimate</div>
                      <div className="text-2xl font-semibold text-primary" data-testid="text-base-time">
                        {totalBaseTime.toFixed(2)} hours
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        AI will adjust based on vehicle condition
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                size="lg" 
                disabled={submitMutation.isPending}
                data-testid="button-submit-request"
              >
                {submitMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Predicting Service Time...
                  </>
                ) : (
                  "Submit Service Request"
                )}
              </Button>
            </motion.form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
