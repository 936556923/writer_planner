import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import {
  Backpack, Sword, Shield, Sparkles, Egg, FlaskConical, Star,
} from "lucide-react";
import { toast } from "sonner";

const RARITY_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  common: { label: "普通", color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-200" },
  rare: { label: "稀有", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
  epic: { label: "史诗", color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200" },
  legendary: { label: "传说", color: "text-amber-600", bg: "bg-gradient-to-br from-amber-50 to-yellow-50", border: "border-amber-300" },
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  equipment: <Sword className="w-5 h-5" />,
  pet_egg: <Egg className="w-5 h-5" />,
  consumable: <FlaskConical className="w-5 h-5" />,
};

export default function Inventory() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const { data: inventory = [], isLoading } = trpc.drops.inventory.useQuery({});
  const toggleEquip = trpc.drops.toggleEquip.useMutation({
    onSuccess: () => {
      utils.drops.inventory.invalidate();
      toast.success("装备状态已更新！");
    },
  });

  const equipment = inventory.filter(i => i.itemType === "equipment");
  const petEggs = inventory.filter(i => i.itemType === "pet_egg");
  const consumables = inventory.filter(i => i.itemType === "consumable");

  return (
    <DashboardLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Backpack className="w-6 h-6 text-primary" />
            我的背包
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            完成任务获得的装备、宠物蛋和消耗品都在这里 | 共 {inventory.length} 件物品
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Sword className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{equipment.length}</p>
                <p className="text-xs text-muted-foreground">装备</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <Egg className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{petEggs.length}</p>
                <p className="text-xs text-muted-foreground">宠物蛋</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <FlaskConical className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{consumables.length}</p>
                <p className="text-xs text-muted-foreground">消耗品</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Inventory Grid */}
        {inventory.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <Sparkles className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground">背包空空如也</h3>
              <p className="text-sm text-muted-foreground/60 mt-2">
                完成四象限任务或每日副本，就有机会获得装备、宠物蛋等奖励！
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Equipment */}
            {equipment.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
                  <Sword className="w-4 h-4 text-blue-500" /> 装备 ({equipment.length})
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {equipment.map(item => {
                    const rarity = RARITY_CONFIG[item.itemRarity ?? "common"] ?? RARITY_CONFIG.common;
                    return (
                      <Card key={item.id} className={`border shadow-sm overflow-hidden ${rarity.border} ${item.isEquipped ? "ring-2 ring-primary" : ""}`}>
                        <CardContent className={`p-4 ${rarity.bg}`}>
                          <div className="text-center">
                            <span className="text-3xl">{item.itemEmoji || "⚔️"}</span>
                            <p className="text-sm font-bold mt-2">{item.itemName}</p>
                            <Badge className={`mt-1 ${rarity.color} bg-white/50`}>{rarity.label}</Badge>
                            {item.itemDescription && (
                              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{item.itemDescription}</p>
                            )}
                            <Button
                              size="sm"
                              variant={item.isEquipped ? "default" : "outline"}
                              className="mt-3 w-full text-xs"
                              onClick={() => toggleEquip.mutate({ inventoryId: item.id })}
                            >
                              {item.isEquipped ? "已装备" : "装备"}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Pet Eggs */}
            {petEggs.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
                  <Egg className="w-4 h-4 text-purple-500" /> 宠物蛋 ({petEggs.length})
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {petEggs.map(item => {
                    const rarity = RARITY_CONFIG[item.itemRarity ?? "epic"] ?? RARITY_CONFIG.epic;
                    return (
                      <Card key={item.id} className={`border shadow-sm ${rarity.border}`}>
                        <CardContent className={`p-4 text-center ${rarity.bg}`}>
                          <span className="text-3xl">{item.itemEmoji || "🥚"}</span>
                          <p className="text-sm font-bold mt-2">{item.itemName}</p>
                          <Badge className={`mt-1 ${rarity.color} bg-white/50`}>{rarity.label}</Badge>
                          <p className="text-xs text-muted-foreground mt-2">等待孵化中...</p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Consumables */}
            {consumables.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
                  <FlaskConical className="w-4 h-4 text-green-500" /> 消耗品 ({consumables.length})
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {consumables.map(item => (
                    <Card key={item.id} className="border shadow-sm border-slate-200">
                      <CardContent className="p-4 text-center bg-slate-50">
                        <span className="text-3xl">{item.itemEmoji || "🧪"}</span>
                        <p className="text-sm font-bold mt-2">{item.itemName}</p>
                        {item.quantity > 1 && <Badge variant="outline" className="mt-1">x{item.quantity}</Badge>}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
