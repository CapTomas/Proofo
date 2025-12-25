import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function PrivateDealLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Back Navigation */}
        <div className="mb-6">
          <Skeleton className="h-5 w-32" />
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div className="flex items-start gap-4">
            <Skeleton className="h-14 w-14 rounded-2xl shrink-0" />
            <div>
              <Skeleton className="h-8 w-64 mb-2" />
              <div className="flex items-center gap-3">
                <Skeleton className="h-6 w-28" />
                <Skeleton className="h-6 w-20" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>

        {/* Parties */}
        <div className="grid gap-4 md:grid-cols-2 mb-6">
          {[1, 2].map((i) => (
            <Card key={i} className="border shadow-card rounded-2xl overflow-hidden">
              <CardHeader className="pb-3 bg-muted/30 border-b">
                <Skeleton className="h-5 w-20" />
              </CardHeader>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div>
                    <Skeleton className="h-5 w-32 mb-1" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Terms */}
        <Card className="border shadow-card rounded-2xl overflow-hidden mb-6">
          <CardHeader className="pb-3 bg-muted/30 border-b">
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex justify-between py-3 border-b last:border-0">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Audit Trail */}
        <Card className="border shadow-card rounded-2xl overflow-hidden">
          <CardHeader className="pb-3 bg-muted/30 border-b">
            <Skeleton className="h-5 w-24" />
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-48 mb-1" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
