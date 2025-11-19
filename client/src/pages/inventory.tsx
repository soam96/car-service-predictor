import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, Plus, AlertTriangle } from "lucide-react";
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
                          <span className={`text-lg font-semibold ${item.quantity < item.minimumStock ? 'text-amber-600' : ''}`} data-testid={`text-quantity-${item.id}`}>
                            {item.quantity}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground" data-testid={`text-min-stock-${item.id}`}>
                          {item.minimumStock}
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
