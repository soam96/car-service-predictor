import { randomUUID } from "crypto";
import type {
  Worker,
  InsertWorker,
  MachineBay,
  InsertMachineBay,
  Inventory,
  InsertInventory,
  ServiceTask,
  InsertServiceTask,
  ActiveService,
  InsertActiveService,
  CompletedService,
} from "@shared/schema";

export interface IStorage {
  // Workers
  getWorkers(): Promise<Worker[]>;
  getWorker(id: string): Promise<Worker | undefined>;
  getWorkersBySkill(skill: string): Promise<Worker[]>;
  createWorker(worker: InsertWorker): Promise<Worker>;
  deleteWorker(id: string): Promise<boolean>;
  updateWorkerLoad(id: string, loadPercent: number, activeJobs: string[]): Promise<void>;
  
  // Machines
  getMachines(): Promise<MachineBay[]>;
  getMachine(id: string): Promise<MachineBay | undefined>;
  updateMachineLoad(id: string, currentLoad: number, assignedWorkers: string[]): Promise<void>;
  
  // Inventory
  getInventory(): Promise<Inventory[]>;
  getInventoryItem(partName: string): Promise<Inventory | undefined>;
  updateStock(partName: string, quantity: number): Promise<void>;
  createInventoryItem(item: InsertInventory): Promise<Inventory>;
  updateInventoryItem(id: string, updates: Partial<InsertInventory>): Promise<Inventory | undefined>;
  deleteInventoryItem(id: string): Promise<boolean>;
  
  // Service Tasks
  getServiceTasks(): Promise<ServiceTask[]>;
  getServiceTask(name: string): Promise<ServiceTask | undefined>;
  
  // Active Services
  getActiveServices(): Promise<ActiveService[]>;
  getActiveService(id: string): Promise<ActiveService | undefined>;
  createActiveService(service: InsertActiveService & { id: string }): Promise<ActiveService>;
  updateServiceProgress(id: string, progress: number): Promise<void>;
  updateActiveService(id: string, updates: Partial<ActiveService>): Promise<ActiveService | undefined>;
  removeActiveService(id: string): Promise<void>;
  
  // Analytics
  getCompletedServicesCount(): Promise<number>;
  addCompletedService(serviceTime: number): Promise<void>;

  // Completed Services records
  getCompletedServices(): Promise<CompletedService[]>;
  getCompletedService(id: string): Promise<CompletedService | undefined>;
  addCompletedServiceRecord(record: CompletedService): Promise<void>;
}

export class MemStorage implements IStorage {
  private workers: Map<string, Worker>;
  private machines: Map<string, MachineBay>;
  private inventoryItems: Map<string, Inventory>;
  private serviceTasks: Map<string, ServiceTask>;
  private activeServices: Map<string, ActiveService>;
  private completedServices: number;
  private completedServiceRecords: Map<string, CompletedService>;
  private totalServiceTime: number;

  constructor() {
    this.workers = new Map();
    this.machines = new Map();
    this.inventoryItems = new Map();
    this.serviceTasks = new Map();
    this.activeServices = new Map();
    this.completedServices = 0;
    this.completedServiceRecords = new Map();
    this.totalServiceTime = 0;
    
    this.initializeData();
  }

  private initializeData() {
    // Initialize 20 workers with varied skills
    const workerNames = [
      "Alex Johnson", "Maria Garcia", "James Smith", "Sofia Rodriguez", "Michael Chen",
      "Emma Wilson", "David Brown", "Isabella Martinez", "Robert Taylor", "Olivia Anderson",
      "William Thomas", "Ava Jackson", "John White", "Mia Harris", "Daniel Martin",
      "Charlotte Thompson", "Christopher Garcia", "Amelia Robinson", "Matthew Clark", "Harper Lewis"
    ];

    const skills = ["Engine", "Brake", "AC", "General"];
    
    workerNames.forEach((name, idx) => {
      const skill = skills[idx % 4];
      const worker: Worker = {
        id: randomUUID(),
        name,
        skill,
        experienceLevel: Math.floor(Math.random() * 15) + 3, // 3-17 years
        certifications: [
          skill === "Engine" ? "Advanced Engine Diagnostics" : "",
          skill === "Brake" ? "Brake System Specialist" : "",
          skill === "AC" ? "HVAC Certified" : "",
          "Volvo Certified Technician"
        ].filter(Boolean),
        rating: parseFloat((3.5 + Math.random() * 1.5).toFixed(1)), // 3.5-5.0
        loadPercent: 0,
        activeJobs: [],
        status: "Available",
      };
      this.workers.set(worker.id, worker);
    });

    // Initialize 6 machine bays
    for (let i = 1; i <= 6; i++) {
      const machine: MachineBay = {
        id: randomUUID(),
        bayNumber: i,
        bayType: i <= 2 ? "Diagnostic Bay" : i <= 4 ? "General Service Bay" : "Heavy Repair Bay",
        isAvailable: true,
        assignedWorkers: [],
        currentLoad: 0,
        toolsPresent: ["Hydraulic Lift", "Diagnostic Scanner", "Air Compressor", "Tool Set"],
      };
      this.machines.set(machine.id, machine);
    }

    // Initialize inventory
    const inventoryData: { partName: string; quantity: number; minimumStock: number }[] = [
      { partName: "AC Cleaner", quantity: 15, minimumStock: 5 },
      { partName: "Air Filter", quantity: 25, minimumStock: 10 },
      { partName: "Engine Oil (5W-30)", quantity: 30, minimumStock: 15 },
      { partName: "Spark Plugs", quantity: 40, minimumStock: 20 },
      { partName: "Brake Pads", quantity: 20, minimumStock: 8 },
      { partName: "Coolant", quantity: 18, minimumStock: 10 },
      { partName: "Transmission Fluid", quantity: 12, minimumStock: 8 },
      { partName: "Battery (12V)", quantity: 8, minimumStock: 5 },
    ];

    inventoryData.forEach((item) => {
      const inv: Inventory = {
        id: randomUUID(),
        ...item,
      };
      this.inventoryItems.set(inv.partName, inv);
    });

    // Initialize service tasks
    const tasks: Omit<ServiceTask, 'id'>[] = [
      { name: "Oil Change", baseTimeHours: 0.5, category: "General", requiredParts: ["Engine Oil (5W-30)"] },
      { name: "Air Filter Replacement", baseTimeHours: 0.25, category: "General", requiredParts: ["Air Filter"] },
      { name: "Brake Inspection", baseTimeHours: 0.75, category: "Brake", requiredParts: [] },
      { name: "Brake Pad Replacement", baseTimeHours: 2.0, category: "Brake", requiredParts: ["Brake Pads"] },
      { name: "Engine Diagnostic", baseTimeHours: 1.5, category: "Engine", requiredParts: [] },
      { name: "Spark Plug Replacement", baseTimeHours: 1.0, category: "Engine", requiredParts: ["Spark Plugs"] },
      { name: "AC Service", baseTimeHours: 1.5, category: "AC", requiredParts: ["AC Cleaner"] },
      { name: "Coolant Flush", baseTimeHours: 1.0, category: "General", requiredParts: ["Coolant"] },
      { name: "Transmission Service", baseTimeHours: 2.5, category: "General", requiredParts: ["Transmission Fluid"] },
      { name: "Battery Replacement", baseTimeHours: 0.5, category: "General", requiredParts: ["Battery (12V)"] },
      { name: "Tire Rotation", baseTimeHours: 0.5, category: "General", requiredParts: [] },
      { name: "Wheel Alignment", baseTimeHours: 1.0, category: "General", requiredParts: [] },
    ];

    tasks.forEach((task) => {
      const serviceTask: ServiceTask = {
        id: randomUUID(),
        ...task,
      };
      this.serviceTasks.set(serviceTask.name, serviceTask);
    });
  }

  // Workers
  async getWorkers(): Promise<Worker[]> {
    return Array.from(this.workers.values());
  }

  async getWorker(id: string): Promise<Worker | undefined> {
    return this.workers.get(id);
  }

  async getWorkersBySkill(skill: string): Promise<Worker[]> {
    return Array.from(this.workers.values()).filter((w) => w.skill === skill);
  }

  async createWorker(worker: InsertWorker): Promise<Worker> {
    const id = randomUUID();
    const newWorker: Worker = {
      id,
      name: worker.name,
      skill: worker.skill,
      experienceLevel: worker.experienceLevel,
      certifications: worker.certifications ?? [],
      rating: worker.rating ?? 4.0,
      loadPercent: 0,
      activeJobs: [],
      status: 'Available',
    };
    this.workers.set(id, newWorker);
    return newWorker;
  }

  async deleteWorker(id: string): Promise<boolean> {
    return this.workers.delete(id);
  }

  async updateWorkerLoad(id: string, loadPercent: number, activeJobs: string[]): Promise<void> {
    const worker = this.workers.get(id);
    if (worker) {
      worker.loadPercent = loadPercent;
      worker.activeJobs = activeJobs;
      worker.status = activeJobs.length === 0 ? "Available" : "Busy";
    }
  }

  // Machines
  async getMachines(): Promise<MachineBay[]> {
    return Array.from(this.machines.values());
  }

  async getMachine(id: string): Promise<MachineBay | undefined> {
    return this.machines.get(id);
  }

  async updateMachineLoad(id: string, currentLoad: number, assignedWorkers: string[]): Promise<void> {
    const machine = this.machines.get(id);
    if (machine) {
      machine.currentLoad = currentLoad;
      machine.assignedWorkers = assignedWorkers;
      machine.isAvailable = assignedWorkers.length < 3;
    }
  }

  // Inventory
  async getInventory(): Promise<Inventory[]> {
    return Array.from(this.inventoryItems.values());
  }

  async getInventoryItem(partName: string): Promise<Inventory | undefined> {
    return this.inventoryItems.get(partName);
  }

  async updateStock(partName: string, quantity: number): Promise<void> {
    const item = this.inventoryItems.get(partName);
    if (item) {
      item.quantity = quantity;
    }
  }

  async createInventoryItem(item: InsertInventory): Promise<Inventory> {
    const exists = this.inventoryItems.get(item.partName);
    if (exists) {
      exists.quantity = item.quantity ?? exists.quantity;
      exists.minimumStock = item.minimumStock ?? exists.minimumStock;
      return exists;
    }
    const inv: Inventory = {
      id: randomUUID(),
      partName: item.partName,
      quantity: item.quantity ?? 0,
      minimumStock: item.minimumStock ?? 5,
    };
    this.inventoryItems.set(inv.partName, inv);
    return inv;
  }

  async updateInventoryItem(id: string, updates: Partial<InsertInventory>): Promise<Inventory | undefined> {
    const item = Array.from(this.inventoryItems.values()).find(i => i.id === id);
    if (!item) return undefined;
    if (updates.partName && updates.partName !== item.partName) {
      // re-key map
      this.inventoryItems.delete(item.partName);
      item.partName = updates.partName;
      this.inventoryItems.set(item.partName, item);
    }
    if (typeof updates.quantity === 'number') item.quantity = updates.quantity;
    if (typeof updates.minimumStock === 'number') item.minimumStock = updates.minimumStock;
    return item;
  }

  async deleteInventoryItem(id: string): Promise<boolean> {
    const item = Array.from(this.inventoryItems.values()).find(i => i.id === id);
    if (!item) return false;
    return this.inventoryItems.delete(item.partName);
  }

  // Service Tasks
  async getServiceTasks(): Promise<ServiceTask[]> {
    return Array.from(this.serviceTasks.values());
  }

  async getServiceTask(name: string): Promise<ServiceTask | undefined> {
    return this.serviceTasks.get(name);
  }

  // Active Services
  async getActiveServices(): Promise<ActiveService[]> {
    return Array.from(this.activeServices.values());
  }

  async getActiveService(id: string): Promise<ActiveService | undefined> {
    return this.activeServices.get(id);
  }

  async createActiveService(service: InsertActiveService & { id: string }): Promise<ActiveService> {
    const activeService: ActiveService = {
      ...service,
      actualStartTime: new Date(),
      status: service.status ?? (service.queuePosition ? "Queued" : "In Progress"),
      progress: service.progress ?? 0,
      errorCodes: service.errorCodes ?? [],
      queuePosition: service.queuePosition ?? null,
    };
    this.activeServices.set(activeService.id, activeService);
    return activeService;
  }

  async updateServiceProgress(id: string, progress: number): Promise<void> {
    const service = this.activeServices.get(id);
    if (service) {
      service.progress = progress;
      if (progress >= 100) {
        service.status = "Completing";
      }
    }
  }

  async updateActiveService(id: string, updates: Partial<ActiveService>): Promise<ActiveService | undefined> {
    const service = this.activeServices.get(id);
    if (!service) return undefined;
    const updated: ActiveService = {
      ...service,
      ...updates,
    };
    // preserve id
    updated.id = service.id;
    this.activeServices.set(id, updated);
    return updated;
  }

  async removeActiveService(id: string): Promise<void> {
    this.activeServices.delete(id);
  }

  // Analytics
  async getCompletedServicesCount(): Promise<number> {
    return this.completedServices;
  }

  async addCompletedService(serviceTime: number): Promise<void> {
    this.completedServices++;
    this.totalServiceTime += serviceTime;
  }

  getAverageServiceTime(): number {
    return this.completedServices > 0 ? this.totalServiceTime / this.completedServices : 0;
  }

  // Completed Services records
  async getCompletedServices(): Promise<CompletedService[]> {
    return Array.from(this.completedServiceRecords.values()).sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
  }

  async getCompletedService(id: string): Promise<CompletedService | undefined> {
    return this.completedServiceRecords.get(id);
  }

  async addCompletedServiceRecord(record: CompletedService): Promise<void> {
    this.completedServiceRecords.set(record.id, record);
  }
}

export const storage = new MemStorage();