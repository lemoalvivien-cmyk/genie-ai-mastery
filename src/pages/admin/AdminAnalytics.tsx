import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Users, MessageCircle, GraduationCap, CreditCard, TrendingUp } from "lucide-react";
import { Helmet } from "react-helmet-async";

interface AnalyticsData {
  newUsers7d: number;
  chatMessages7d: number;
  onboardingRate: number;
  conversionRate: number;
  topFeatures: { event_name: string; count: number }[];
  loading: boolean;
}

export default function AdminAnalytics() {
  const [data, setData] = useState<AnalyticsData>({
    newUsers7d: 0,
    chatMessages7d: 0,
    onboardingRate: 0,
    conversionRate: 0,
    topFeatures: [],
    loading: true,
  });

  useEffect(() => {
    async function fetchAnalytics() {
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

      const [usersRes, chatRes, onboardedRes, totalUsersRes, proUsersRes, topRes] =
        await Promise.all([
          // 1. New users last 7 days
          supabase
            .from("profiles")
            .select("id", { count: "exact", head: true })
            .gte("created_at", sevenDaysAgo),
          // 2. Chat messages last 7 days
          supabase
            .from("analytics_events")
            .select("id", { count: "exact", head: true })
            .eq("event_name", "chat_message")
            .gte("created_at", sevenDaysAgo),
          // 3. Users who completed onboarding
          supabase
            .from("profiles")
            .select("id", { count: "exact", head: true })
            .eq("onboarding_completed", true),
          // Total users
          supabase
            .from("profiles")
            .select("id", { count: "exact", head: true }),
          // 4. Pro users (plan = pro)
          supabase
            .from("profiles")
            .select("id", { count: "exact", head: true })
            .eq("plan", "pro"),
          // 5. Top features
          supabase
            .from("analytics_events")
            .select("event_name")
            .gte("created_at", sevenDaysAgo)
            .limit(1000),
        ]);

      // Count top features manually
      const featureCounts: Record<string, number> = {};
      for (const row of topRes.data ?? []) {
        featureCounts[row.event_name] = (featureCounts[row.event_name] ?? 0) + 1;
      }
      const topFeatures = Object.entries(featureCounts)
        .map(([event_name, count]) => ({ event_name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const totalUsers = totalUsersRes.count ?? 1;
      const onboarded = onboardedRes.count ?? 0;
      const totalSubs = totalSubsRes.count ?? 1;
      const activeSubs = activeSubsRes.count ?? 0;

      setData({
        newUsers7d: usersRes.count ?? 0,
        chatMessages7d: chatRes.count ?? 0,
        onboardingRate: totalUsers > 0 ? Math.round((onboarded / totalUsers) * 100) : 0,
        conversionRate: totalSubs > 0 ? Math.round((activeSubs / totalSubs) * 100) : 0,
        topFeatures,
        loading: false,
      });
    }

    fetchAnalytics();
  }, []);

  if (data.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const metrics = [
    {
      title: "Nouveaux inscrits (7j)",
      value: data.newUsers7d,
      icon: Users,
      color: "text-blue-500",
    },
    {
      title: "Messages chat (7j)",
      value: data.chatMessages7d,
      icon: MessageCircle,
      color: "text-green-500",
    },
    {
      title: "Taux d'onboarding",
      value: `${data.onboardingRate}%`,
      icon: GraduationCap,
      color: "text-amber-500",
    },
    {
      title: "Conversion trial → paid",
      value: `${data.conversionRate}%`,
      icon: CreditCard,
      color: "text-purple-500",
    },
  ];

  return (
    <div className="min-h-screen bg-background p-6 max-w-6xl mx-auto space-y-6">
      <Helmet>
        <title>Analytics — Admin Formetoialia</title>
      </Helmet>

      <h1 className="text-2xl font-bold text-foreground">📊 Analytics internes</h1>
      <p className="text-muted-foreground text-sm">Données en temps réel depuis la base de données.</p>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <Card key={m.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{m.title}</CardTitle>
              <m.icon className={`h-5 w-5 ${m.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{m.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Top Features */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Top fonctionnalités (7j)</CardTitle>
        </CardHeader>
        <CardContent>
          {data.topFeatures.length === 0 ? (
            <p className="text-muted-foreground text-sm">Aucun événement enregistré sur les 7 derniers jours.</p>
          ) : (
            <div className="space-y-3">
              {data.topFeatures.map((f, i) => {
                const maxCount = data.topFeatures[0]?.count ?? 1;
                const pct = Math.round((f.count / maxCount) * 100);
                return (
                  <div key={f.event_name} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-foreground">
                        {i + 1}. {f.event_name}
                      </span>
                      <span className="text-muted-foreground">{f.count}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
