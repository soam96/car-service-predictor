import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Worker Schema
export const workers = pgTable("workers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  skill: text("skill").notNull(), // Engine, Brake, AC, General
  experienceLevel: integer("experience_level").notNull(), // years
  certifications: text("certifications").array().notNull().default(sql`ARRAY[]::text[]`),
  rating: real("rating").notNull(), // 1-5
  loadPercent: integer("load_percent").notNull().default(0),
  activeJobs: text("active_jobs").array().notNull().default(sql`ARRAY[]::text[]`), // max 3
  status: text("status").notNull().default('Available'), // Available, Busy, Offline
});

export const insertWorkerSchema = createInsertSchema(workers).omit({ id: true });
export type InsertWorker = z.infer<typeof insertWorkerSchema>;
export type Worker = typeof workers.$inferSelect;

// Machine Bay Schema
export const machineBays = pgTable("machine_bays", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bayNumber: integer("bay_number").notNull(),
  bayType: text("bay_type").notNull(),
  isAvailable: boolean("is_available").notNull().default(true),
  assignedWorkers: text("assigned_workers").array().notNull().default(sql`ARRAY[]::text[]`), // max 3
  currentLoad: integer("current_load").notNull().default(0),
  toolsPresent: text("tools_present").array().notNull().default(sql`ARRAY[]::text[]`),
});

export const insertMachineBaySchema = createInsertSchema(machineBays).omit({ id: true });
export type InsertMachineBay = z.infer<typeof insertMachineBaySchema>;
export type MachineBay = typeof machineBays.$inferSelect;

// Inventory Schema
export const inventory = pgTable("inventory", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  partName: text("part_name").notNull().unique(),
  quantity: integer("quantity").notNull().default(0),
  minimumStock: integer("minimum_stock").notNull().default(5),
});

export const insertInventorySchema = createInsertSchema(inventory).omit({ id: true });
export type InsertInventory = z.infer<typeof insertInventorySchema>;
export type Inventory = typeof inventory.$inferSelect;

// Service Task Schema (predefined tasks with base times)
export const serviceTasks = pgTable("service_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  baseTimeHours: real("base_time_hours").notNull(),
  category: text("category").notNull(), // Engine, Brake, AC, General
  requiredParts: text("required_parts").array().notNull().default(sql`ARRAY[]::text[]`),
});

export const insertServiceTaskSchema = createInsertSchema(serviceTasks).omit({ id: true });
export type InsertServiceTask = z.infer<typeof insertServiceTaskSchema>;
export type ServiceTask = typeof serviceTasks.$inferSelect;

// Active Service Schema
export const activeServices = pgTable("active_services", {
  id: varchar("id").primaryKey(), // VOL_YYYYMMDDHHMMSS_WID format
  carNumber: text("car_number").notNull(),
  carModel: text("car_model").notNull(),
  manufactureYear: integer("manufacture_year").notNull(),
  fuelType: text("fuel_type").notNull(),
  totalKilometers: integer("total_kilometers").notNull(),
  kmSinceLastService: integer("km_since_last_service").notNull(),
  daysSinceLastService: integer("days_since_last_service").notNull(),
  serviceType: text("service_type").notNull(),
  selectedTasks: jsonb("selected_tasks").notNull(), // array of task names
  healthScore: integer("health_score").notNull(), // 1-100
  errorCodes: text("error_codes").array().notNull().default(sql`ARRAY[]::text[]`),
  rustLevel: text("rust_level").notNull(), // None, Minor, Moderate, Severe
  bodyDamage: text("body_damage").notNull(), // None, Minor, Moderate, Severe
  predictedHours: real("predicted_hours").notNull(),
  actualStartTime: timestamp("actual_start_time").notNull().defaultNow(),
  estimatedCompletion: timestamp("estimated_completion").notNull(),
  progress: integer("progress").notNull().default(0), // 0-100
  assignedWorkers: text("assigned_workers").array().notNull(),
  assignedMachine: text("assigned_machine").notNull(),
  queuePosition: integer("queue_position"),
  status: text("status").notNull().default('In Progress'), // Queued, In Progress, Completing, Completed
});

export const insertActiveServiceSchema = createInsertSchema(activeServices).omit({ 
  id: true,
  actualStartTime: true,
});
export type InsertActiveService = z.infer<typeof insertActiveServiceSchema>;
export type ActiveService = typeof activeServices.$inferSelect;

// Service Request Schema (for user input)
export const serviceRequestSchema = z.object({
  carNumber: z.string().min(1, "Car number is required"),
  carModel: z.enum(["XC40", "XC60", "XC90", "S60", "S90", "V60", "V90"]),
  manufactureYear: z.number().min(2000).max(new Date().getFullYear()),
  fuelType: z.enum(["Petrol", "Diesel", "Hybrid", "Electric"]),
  totalKilometers: z.number().min(0),
  kmSinceLastService: z.number().min(0),
  daysSinceLastService: z.number().min(0),
  serviceType: z.enum(["Regular Service", "Major Service", "Repair", "Diagnostic"]),
  selectedTasks: z.array(z.string()).min(1, "Select at least one task"),
  healthScore: z.number().min(0).max(100).default(100),
  errorCodes: z.array(z.string()).default([]),
  rustLevel: z.enum(["None", "Minor", "Moderate", "Severe"]).default("None"),
  bodyDamage: z.enum(["None", "Minor", "Moderate", "Severe"]).default("None"),
  warrantyStatus: z.enum(["In Warranty", "Out of Warranty"]).default("Out of Warranty"),
  batterySOH: z.number().min(0).max(100).default(100),
  fluidDegradation: z.number().min(0).max(100).default(0),
  wearTearScore: z.number().min(0).max(100).default(0),
  appointmentType: z.enum(["Appointment", "Walk-in"]).default("Appointment"),
  servicePackage: z.enum(["Basic", "Standard", "Premium"]).default("Standard"),
  customerApprovalSpeed: z.enum(["Fast", "Normal", "Slow"]).default("Normal"),
  weather: z.enum(["Clear", "Rain", "Extreme"]).default("Clear"),
  peakHours: z.boolean().default(false),
});

export type ServiceRequest = z.infer<typeof serviceRequestSchema>;

// Analytics Schema
export const analyticsSchema = z.object({
  completedServices: z.number(),
  averageServiceTime: z.number(),
  totalRevenue: z.number(),
  workerUtilization: z.number(),
  machineUtilization: z.number(),
});

export type Analytics = z.infer<typeof analyticsSchema>;

// Completed Service Record (for receipts and history)
export type CompletedService = {
  id: string;
  carNumber: string;
  carModel: string;
  serviceType: string;
  selectedTasks: string[];
  predictedHours: number;
  assignedMachine: string;
  assignedWorkers: string[]; // worker names
  completedAt: string; // ISO string
  amount: number; // simple billing amount aligned with analytics revenue calc
};