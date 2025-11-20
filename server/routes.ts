import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { serviceRequestSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  function applyBusinessHours(start: Date, hours: number): Date {
    const WORK_START = 10; // 10:00
    const WORK_END = 19;   // 19:00
    const minutesToAdd = Math.round(hours * 60);
    let current = new Date(start);
    // align to business hours window
    const sHour = current.getHours() + current.getMinutes()/60;
    if (sHour < WORK_START) {
      current.setHours(WORK_START, 0, 0, 0);
    } else if (sHour >= WORK_END) {
      current.setDate(current.getDate() + 1);
      current.setHours(WORK_START, 0, 0, 0);
    }
    let remaining = minutesToAdd;
    while (remaining > 0) {
      const endToday = new Date(current);
      endToday.setHours(WORK_END, 0, 0, 0);
      const minutesAvailable = Math.max(0, Math.round((endToday.getTime() - current.getTime()) / (1000*60)));
      if (remaining <= minutesAvailable) {
        current = new Date(current.getTime() + remaining * 60 * 1000);
        remaining = 0;
      } else {
        // consume today's window and move to next day
        remaining -= minutesAvailable;
        current.setDate(current.getDate() + 1);
        current.setHours(WORK_START, 0, 0, 0);
      }
    }
    return current;
  }
  
  // GET /api/service-tasks - Get all available service tasks
  app.get("/api/service-tasks", async (_req, res) => {
    try {
      const tasks = await storage.getServiceTasks();
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch service tasks" });
    }
  });

  // GET /api/workers - Get all workers
  app.get("/api/workers", async (_req, res) => {
    try {
      const workers = await storage.getWorkers();
      res.json(workers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch workers" });
    }
  });

  // POST /api/workers - Create a new worker
  app.post("/api/workers", async (req, res) => {
    try {
      const { name, skill, experienceLevel, rating, certifications } = req.body || {};
      if (!name || !skill || typeof experienceLevel !== 'number') {
        return res.status(400).json({ error: "name, skill, experienceLevel are required" });
      }
      const worker = await storage.createWorker({
        name,
        skill,
        experienceLevel,
        rating: typeof rating === 'number' ? rating : 4.0,
        certifications: Array.isArray(certifications) ? certifications : [],
        loadPercent: 0,
        activeJobs: [],
        status: 'Available',
      } as any);
      res.json(worker);
    } catch (error) {
      res.status(500).json({ error: "Failed to create worker" });
    }
  });

  // DELETE /api/workers/:id - Delete a worker (only if no active jobs)
  app.delete("/api/workers/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const worker = await storage.getWorker(id);
      if (!worker) {
        return res.status(404).json({ error: "Worker not found" });
      }
      if (worker.activeJobs.length > 0 || worker.status !== 'Available') {
        return res.status(400).json({ error: "Cannot delete a busy worker" });
      }
      const ok = await storage.deleteWorker(id);
      res.json({ success: ok });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete worker" });
    }
  });

  // GET /api/active-services - Get all active services
  app.get("/api/active-services", async (_req, res) => {
    try {
      const services = await storage.getActiveServices();
      res.json(services);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch active services" });
    }
  });

  // GET /api/inventory - Get inventory
  app.get("/api/inventory", async (_req, res) => {
    try {
      const inventory = await storage.getInventory();
      res.json(inventory);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch inventory" });
    }
  });

  // POST /api/inventory - Create inventory item
  app.post("/api/inventory", async (req, res) => {
    try {
      const { partName, quantity, minimumStock } = req.body || {};
      if (!partName || typeof partName !== 'string') {
        return res.status(400).json({ error: "partName is required" });
      }
      const created = await storage.createInventoryItem({ partName, quantity, minimumStock });
      res.json(created);
    } catch (error) {
      res.status(500).json({ error: "Failed to create inventory item" });
    }
  });

  // PUT /api/inventory/:id - Update inventory item
  app.put("/api/inventory/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body || {};
      const updated = await storage.updateInventoryItem(id, updates);
      if (!updated) return res.status(404).json({ error: "Item not found" });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update inventory item" });
    }
  });

  // DELETE /api/inventory/:id - Delete inventory item
  app.delete("/api/inventory/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const ok = await storage.deleteInventoryItem(id);
      if (!ok) return res.status(404).json({ error: "Item not found" });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete inventory item" });
    }
  });

  // GET /api/analytics - Get analytics data
  app.get("/api/analytics", async (_req, res) => {
    try {
      const completedServices = await storage.getCompletedServicesCount();
      const averageServiceTime = storage.getAverageServiceTime();
      
      const workers = await storage.getWorkers();
      const totalLoad = workers.reduce((sum, w) => sum + w.loadPercent, 0);
      const workerUtilization = workers.length > 0 ? totalLoad / workers.length : 0;

      const machines = await storage.getMachines();
      const totalMachineLoad = machines.reduce((sum, m) => sum + m.currentLoad, 0);
      const machineUtilization = machines.length > 0 ? totalMachineLoad / machines.length : 0;

      res.json({
        completedServices,
        averageServiceTime,
        totalRevenue: completedServices * 250, // Mock revenue calculation
        workerUtilization,
        machineUtilization,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  // GET /api/dashboard-stats - Get dashboard statistics
  app.get("/api/dashboard-stats", async (_req, res) => {
    try {
      const workers = await storage.getWorkers();
      const activeServices = await storage.getActiveServices();
      const inventory = await storage.getInventory();
      const machines = await storage.getMachines();

      const availableWorkers = workers.filter(w => w.status === "Available").length;
      const queueCount = activeServices.filter(s => s.status === "Queued").length;
      const lowStockItems = inventory.filter(i => i.quantity < i.minimumStock).length;
      const machinesActive = machines.filter(m => m.assignedWorkers.length > 0).length;
      
      const totalLoad = workers.reduce((sum, w) => sum + w.loadPercent, 0);
      const capacityUsed = workers.length > 0 ? totalLoad / workers.length : 0;

      res.json({
        totalWorkers: workers.length,
        activeJobs: activeServices.filter(s => s.status === "In Progress").length,
        availableWorkers,
        queueCount,
        capacityUsed: Math.round(capacityUsed),
        machinesActive,
        lowStockItems,
        lastUpdated: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  // POST /api/restock/:partName - Restock inventory
  app.post("/api/restock/:partName", async (req, res) => {
    try {
      const { partName } = req.params;
      const item = await storage.getInventoryItem(decodeURIComponent(partName));
      
      if (!item) {
        return res.status(404).json({ error: "Part not found" });
      }

      await storage.updateStock(item.partName, item.quantity + 5);
      res.json({ success: true, newQuantity: item.quantity + 5 });
    } catch (error) {
      res.status(500).json({ error: "Failed to restock item" });
    }
  });

  // POST /api/complete-service/:id - Complete a service
  app.post("/api/complete-service/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const service = await storage.getActiveService(id);
      
      if (!service) {
        return res.status(404).json({ error: "Service not found" });
      }

      // Free up workers
      for (const workerId of service.assignedWorkers) {
        const worker = await storage.getWorker(workerId);
        if (worker) {
          const updatedJobs = worker.activeJobs.filter(jobId => jobId !== id);
          const newLoad = Math.max(0, worker.loadPercent - (100 / 3)); // Each job is ~33% load
          await storage.updateWorkerLoad(workerId, Math.round(newLoad), updatedJobs);
        }
      }

      // Free up machine
      const machines = await storage.getMachines();
      const machine = machines.find(m => m.assignedWorkers.some(w => service.assignedWorkers.includes(w)));
      if (machine) {
        const updatedWorkers = machine.assignedWorkers.filter(w => !service.assignedWorkers.includes(w));
        const newLoad = Math.max(0, machine.currentLoad - 50); // Reduce load
        await storage.updateMachineLoad(machine.id, newLoad, updatedWorkers);
      }

      // Add to completed services
      await storage.addCompletedService(service.predictedHours);
      // Build completed service record for receipt/history
      const workerNames: string[] = [];
      for (const workerId of service.assignedWorkers) {
        const w = await storage.getWorker(workerId);
        if (w) workerNames.push(w.name);
      }
      const completedRecord = {
        id: service.id,
        carNumber: service.carNumber,
        carModel: service.carModel,
        serviceType: service.serviceType,
        selectedTasks: (service.selectedTasks as any) as string[],
        predictedHours: service.predictedHours,
        assignedMachine: service.assignedMachine,
        assignedWorkers: workerNames,
        completedAt: new Date().toISOString(),
        amount: parseFloat((service.predictedHours * 250).toFixed(2)),
      };
      await storage.addCompletedServiceRecord(completedRecord);
      
      // Remove from active services
      await storage.removeActiveService(id);

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to complete service" });
    }
  });

  // GET /api/completed-services - Get completed services records
  app.get("/api/completed-services", async (_req, res) => {
    try {
      const records = await storage.getCompletedServices();
      res.json(records);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch completed services" });
    }
  });

  // POST /api/service-request - Submit service request with AI prediction
  app.post("/api/service-request", async (req, res) => {
    try {
      // Validate request
      const validatedData = serviceRequestSchema.parse(req.body);

      // Step 1: Calculate base time from selected tasks
      let baseTime = 0;
      const selectedTaskDetails = [];
      const requiredParts: string[] = [];

      for (const taskName of validatedData.selectedTasks) {
        const task = await storage.getServiceTask(taskName);
        if (task) {
          baseTime += task.baseTimeHours;
          selectedTaskDetails.push(task);
          requiredParts.push(...task.requiredParts);
        }
      }

      // Step 2: AI Service Time Prediction
      // Car age factor (older cars take longer)
      const carAge = new Date().getFullYear() - validatedData.manufactureYear;
      const carAgeFactor = carAge > 10 ? 0.2 : carAge > 5 ? 0.1 : 0;

      // Condition multipliers
      const healthFactor = (100 - validatedData.healthScore) / 200;
      
      const rustMultiplier = {
        "None": 0,
        "Minor": 0.1,
        "Moderate": 0.2,
        "Severe": 0.4,
      }[validatedData.rustLevel];

      const damageMultiplier = {
        "None": 0,
        "Minor": 0.05,
        "Moderate": 0.15,
        "Severe": 0.3,
      }[validatedData.bodyDamage];

      // Mileage factor
      const kmFactor = validatedData.kmSinceLastService > 10000 ? 0.15 : validatedData.kmSinceLastService > 5000 ? 0.08 : 0;

      // Error codes factor
      const errorCodesFactor = validatedData.errorCodes.length * 0.25;

      const batteryFactor = validatedData.fuelType === "Electric" ? (100 - validatedData.batterySOH) / 300 : 0;
      const fluidsFactor = validatedData.fluidDegradation / 300;
      const wearTearFactor = validatedData.wearTearScore / 300;

      const packageFactor = {
        Basic: 0,
        Standard: 0.05,
        Premium: 0.12,
      }[validatedData.servicePackage];

      const approvalFactor = {
        Fast: 0,
        Normal: 0.05,
        Slow: 0.15,
      }[validatedData.customerApprovalSpeed];

      // Shop load factor
      const activeServices = await storage.getActiveServices();
      const shopLoadFactor = activeServices.length >= 6 ? 0.3 : activeServices.length >= 4 ? 0.2 : 0;
      const appointmentFactor = validatedData.appointmentType === "Walk-in" ? 0.1 : 0;
      const peakHoursFactor = validatedData.peakHours ? 0.08 : 0;
      const weatherFactor = {
        Clear: 0,
        Rain: 0.05,
        Extreme: 0.12,
      }[validatedData.weather];

      // Calculate predicted time
      const conditionAdjustment = baseTime * (
        carAgeFactor +
        healthFactor +
        rustMultiplier +
        damageMultiplier +
        kmFactor +
        errorCodesFactor +
        batteryFactor +
        fluidsFactor +
        wearTearFactor +
        packageFactor +
        approvalFactor +
        appointmentFactor +
        peakHoursFactor +
        weatherFactor
      );
      const predictedHours = baseTime + conditionAdjustment + shopLoadFactor;

      // Step 3: Check inventory
      const warnings: string[] = [];
      for (const partName of Array.from(new Set(requiredParts))) {
        const item = await storage.getInventoryItem(partName);
        if (item) {
          if (item.quantity === 0) {
            warnings.push(`${partName} is out of stock`);
          } else if (item.quantity < item.minimumStock) {
            warnings.push(`${partName} stock is running low`);
          }
          // Reduce inventory
          await storage.updateStock(partName, Math.max(0, item.quantity - 1));
        }
      }

      // Step 4: Determine primary skill needed
      const primarySkill = selectedTaskDetails.length > 0 
        ? selectedTaskDetails.sort((a, b) => b.baseTimeHours - a.baseTimeHours)[0].category
        : "General";

      // Step 5: Assign workers (max 3 workers per machine, max 3 jobs per worker)
      const workers = await storage.getWorkers();
      const skillMatchedWorkers = workers
        .filter(w => w.skill === primarySkill || primarySkill === "General")
        .filter(w => w.activeJobs.length < 3)
        .sort((a, b) => {
          // Sort by: availability, then load, then rating
          if (a.loadPercent !== b.loadPercent) return a.loadPercent - b.loadPercent;
          return b.rating - a.rating;
        });

      let assignedWorkers: string[] = [];
      const numWorkersNeeded = Math.min(3, Math.ceil(predictedHours / 2)); // 1-3 workers based on time
      
      for (let i = 0; i < numWorkersNeeded && i < skillMatchedWorkers.length; i++) {
        assignedWorkers.push(skillMatchedWorkers[i].id);
      }

      if (assignedWorkers.length === 0) {
        // Fallback to any available worker
        const anyAvailable = workers.filter(w => w.activeJobs.length < 3);
        if (anyAvailable.length > 0) {
          assignedWorkers.push(anyAvailable[0].id);
        } else {
          warnings.push("All workers are at maximum capacity");
        }
      }

      // Step 6: Assign machine
      const machines = await storage.getMachines();
      const availableMachines = machines
        .filter(m => m.assignedWorkers.length < 3 && m.currentLoad < 90)
        .sort((a, b) => a.currentLoad - b.currentLoad);

      let assignedMachine = "";
      let queuePosition: number | undefined = undefined;

      if (activeServices.length >= 6) {
        // Queue the service
        queuePosition = activeServices.filter(s => s.status === "Queued").length + 1;
        assignedMachine = "QUEUED";
        warnings.push(`Workshop at capacity. Service queued at position ${queuePosition}`);
      } else if (availableMachines.length > 0) {
        assignedMachine = `Bay ${availableMachines[0].bayNumber}`;
      } else {
        queuePosition = 1;
        assignedMachine = "QUEUED";
        warnings.push("All machines are currently in use");
      }

      // Step 7: Generate Service ID (VOL_YYYYMMDDHHMMSS_WID format)
      const now = new Date();
      const dateStr = now.toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
      const workerId = assignedWorkers.length > 0 ? assignedWorkers[0].slice(0, 3).toUpperCase() : "QUE";
      const serviceId = `VOL_${dateStr}_${workerId}`;

      // Step 8: Calculate estimated completion
      const estimatedCompletion = applyBusinessHours(now, predictedHours);

      // Step 9: Create active service
      const activeService = await storage.createActiveService({
        id: serviceId,
        carNumber: validatedData.carNumber,
        carModel: validatedData.carModel,
        manufactureYear: validatedData.manufactureYear,
        fuelType: validatedData.fuelType,
        totalKilometers: validatedData.totalKilometers,
        kmSinceLastService: validatedData.kmSinceLastService,
        daysSinceLastService: validatedData.daysSinceLastService,
        serviceType: validatedData.serviceType,
        selectedTasks: validatedData.selectedTasks as any,
        healthScore: validatedData.healthScore,
        errorCodes: validatedData.errorCodes,
        rustLevel: validatedData.rustLevel,
        bodyDamage: validatedData.bodyDamage,
        predictedHours,
        estimatedCompletion,
        progress: 0,
        assignedWorkers,
        assignedMachine,
        queuePosition,
        status: queuePosition ? "Queued" : "In Progress",
      });

      // Step 10: Update worker loads
      for (const workerId of assignedWorkers) {
        const worker = await storage.getWorker(workerId);
        if (worker) {
          const newJobs = [...worker.activeJobs, serviceId];
          const newLoad = Math.min(100, worker.loadPercent + (100 / 3)); // Each job adds ~33% load
          await storage.updateWorkerLoad(workerId, Math.round(newLoad), newJobs);
        }
      }

      // Step 11: Update machine load
      if (!queuePosition && availableMachines.length > 0) {
        const machine = availableMachines[0];
        const newWorkers = Array.from(new Set([...machine.assignedWorkers, ...assignedWorkers]));
        const newLoad = Math.min(100, machine.currentLoad + 50);
        await storage.updateMachineLoad(machine.id, newLoad, newWorkers);
      }

      // Step 12: Return prediction result
      res.json({
        serviceId,
        predictedHours: parseFloat(predictedHours.toFixed(2)),
        assignedWorkers: assignedWorkers.map(id => {
          const w = workers.find(worker => worker.id === id);
          return w ? w.name : id;
        }),
        assignedMachine,
        estimatedCompletion: estimatedCompletion.toISOString(),
        queuePosition,
        warnings,
      });
    } catch (error: any) {
      console.error("Service request error:", error);
      res.status(400).json({ error: error.message || "Invalid service request" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
