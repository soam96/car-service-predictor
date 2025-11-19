import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, Plus, AlertTriangle, Trash2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Inventory } from "@shared/schema";

export default function InventoryPage() {
  const { toast } = useToast();
  
  const { data: inventory, isLoading } = useQuery<Inventory[]>({
    queryKey: ['/api/inventory'],
    refetchInterval: 5000,
  });

  const restockMutation = useMutation({
    mutationFn: async (partName: string) => {
      return await apiRequest('POST', `/api/restock/${encodeURIComponent(partName)}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard-stats'] });
      toast({
        title: "Restock Successful",
        description: "5 units have been added to inventory.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Restock Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: { partName: string; quantity: number; minimumStock: number }) => {
      return await apiRequest('POST', '/api/inventory', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
      toast({ title: 'Item Added', description: 'Inventory item created.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Create Failed', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, quantity, minimumStock, partName }: { id: string; quantity?: number; minimumStock?: number; partName?: string }) => {
      return await apiRequest('PUT', `/api/inventory/${id}`, { quantity, minimumStock, partName });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
      toast({ title: 'Item Updated', description: 'Inventory item updated.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Update Failed', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/inventory/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
      toast({ title: 'Item Deleted', description: 'Inventory item removed.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Delete Failed', description: error.message, variant: 'destructive' });
    },
  });

  const getStockStatus = (quantity: number, minimumStock: number) => {
    if (quantity === 0) {
      return { label: 'Out of Stock', color: 'bg-red-100 text-red-800 border-red-200' };
    } else if (quantity < minimumStock) {
      return { label: 'Low Stock', color: 'bg-amber-100 text-amber-800 border-amber-200' };
    } else {
      return { label: 'In Stock', color: 'bg-green-100 text-green-800 border-green-200' };
    }
  };

  const lowStockCount = inventory?.filter(item => item.quantity < item.minimumStock).length || 0;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">Inventory Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track and manage workshop parts and supplies
          </p>
        </div>
        {lowStockCount > 0 && (
          <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200" data-testid="badge-low-stock-alert">
            <AlertTriangle className="h-3 w-3 mr-1" />
            {lowStockCount} items need restocking
          </Badge>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Parts Inventory</CardTitle>
          <CardDescription>
            Current stock levels and restock management
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 items-end mb-6">
            <div className="flex-1 grid grid-cols-3 gap-3">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Part Name</div>
                <input className="w-full border rounded-md h-9 px-2" id="new-part-name" placeholder="e.g., Brake Pads" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Quantity</div>
                <input className="w-full border rounded-md h-9 px-2" id="new-quantity" type="number" defaultValue={0} />
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Minimum Stock</div>
                <input className="w-full border rounded-md h-9 px-2" id="new-min" type="number" defaultValue={5} />
              </div>
            </div>
            <Button
              onClick={() => {
                const nameEl = document.getElementById('new-part-name') as HTMLInputElement;
                const qtyEl = document.getElementById('new-quantity') as HTMLInputElement;
                const minEl = document.getElementById('new-min') as HTMLInputElement;
                const partName = nameEl?.value?.trim();
                const quantity = parseInt(qtyEl?.value || '0');
                const minimumStock = parseInt(minEl?.value || '5');
                if (!partName) return toast({ title: 'Part name required', variant: 'destructive' });
                createMutation.mutate({ partName, quantity, minimumStock });
              }}
              disabled={createMutation.isPending}
            >
              Add Item
            </Button>
          </div>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-9 w-24" />
                </div>
              ))}
            </div>
          ) : inventory && inventory.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Part Name</TableHead>
                    <TableHead>Current Stock</TableHead>
                    <TableHead>Minimum Stock</TableHead>
                    <TableHead>Stock Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventory.map((item) => {
                    const status = getStockStatus(item.quantity, item.minimumStock);
                    return (
                      <TableRow key={item.id} data-testid={`row-inventory-${item.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-md bg-muted">
                              <Package className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="font-medium" data-testid={`text-part-name-${item.id}`}>{item.partName}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <input
                            className="w-24 border rounded-md h-8 px-2"
                            type="number"
                            defaultValue={item.quantity}
                            onBlur={(e) => updateMutation.mutate({ id: item.id, quantity: parseInt(e.target.value) })}
                          />
                        </TableCell>
                        <TableCell className="text-muted-foreground" data-testid={`text-min-stock-${item.id}`}>
                          <input
                            className="w-24 border rounded-md h-8 px-2"
                            type="number"
                            defaultValue={item.minimumStock}
                            onBlur={(e) => updateMutation.mutate({ id: item.id, minimumStock: parseInt(e.target.value) })}
                          />
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={status.color} data-testid={`badge-status-${item.id}`}>
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => restockMutation.mutate(item.partName)}
                            disabled={restockMutation.isPending}
                            data-testid={`button-restock-${item.id}`}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Restock +5
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600"
                            onClick={() => deleteMutation.mutate(item.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Inventory Items</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                No parts are currently tracked in the inventory system.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
