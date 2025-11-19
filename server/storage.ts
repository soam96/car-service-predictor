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
} from "@shared/schema";

export interface IStorage {
  // Workers
  getWorkers(): Promise<Worker[]>;
  getWorker(id: string): Promise<Worker | undefined>;
  getWorkersBySkill(skill: string): Promise<Worker[]>;
  updateWorkerLoad(id: string, loadPercent: number, activeJobs: string[]): Promise<void>;
  
  // Machines
  getMachines(): Promise<MachineBay[]>;
  getMachine(id: string): Promise<MachineBay | undefined>;
  updateMachineLoad(id: string, currentLoad: number, assignedWorkers: string[]): Promise<void>;
  
  // Inventory
  getInventory(): Promise<Inventory[]>;
  getInventoryItem(partName: string): Promise<Inventory | undefined>;
  updateStock(partName: string, quantity: number): Promise<void>;
  
  // Service Tasks
  getServiceTasks(): Promise<ServiceTask[]>;
  getServiceTask(name: string): Promise<ServiceTask | undefined>;
  
  // Active Services
  getActiveServices(): Promise<ActiveService[]>;
  getActiveService(id: string): Promise<ActiveService | undefined>;
  createActiveService(service: InsertActiveService & { id: string }): Promise<ActiveService>;
  updateServiceProgress(id: string, progress: number): Promise<void>;
  removeActiveService(id: string): Promise<void>;
  
  // Analytics
  getCompletedServicesCount(): Promise<number>;
  addCompletedService(serviceTime: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private workers: Map<string, Worker>;
  private machines: Map<string, MachineBay>;
  private inventoryItems: Map<string, Inventory>;
  private serviceTasks: Map<string, ServiceTask>;
  private activeServices: Map<string, ActiveService>;
  private completedServices: number;
  private totalServiceTime: number;

  constructor() {
    this.workers = new Map();
    this.machines = new Map();
    this.inventoryItems = new Map();
    this.serviceTasks = new Map();
    this.activeServices = new Map();
    this.completedServices = 0;
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
}

export const storage = new MemStorage();
