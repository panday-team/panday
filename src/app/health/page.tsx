import { AuthControls } from "@/components/AuthControls";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getSystemStatus,
  type ServiceStatus,
} from "@/server/status/systemStatus";

const stateLabels: Record<ServiceStatus["state"], string> = {
  ok: "Connected",
  warn: "Check config",
  error: "Unavailable",
};

const stateVariants: Record<ServiceStatus["state"], BadgeProps["variant"]> = {
  ok: "success",
  warn: "warning",
  error: "destructive",
};

const toTitleCase = (value: string) =>
  value.slice(0, 1).toUpperCase() + value.slice(1);

const formatLatency = (latencyMs?: number) =>
  typeof latencyMs === "number"
    ? `${latencyMs.toLocaleString()} ms`
    : undefined;

const getDatabaseLabel = (host?: string, name?: string) => {
  if (host && name) return `${name} @ ${host}`;
  if (host) return host;
  return "Unknown";
};

export default async function StatusPage() {
  const { environment, services } = await getSystemStatus();

  return (
    <main className="bg-background min-h-dvh">
      <div className="mx-auto flex min-h-dvh max-w-5xl flex-col gap-12 px-6 py-16">
        <header className="border-border/50 bg-card/60 flex flex-col gap-10 rounded-3xl border p-10 backdrop-blur-sm lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-6">
            <Badge
              variant="outline"
              className="text-muted-foreground w-fit border-dashed px-3 py-1 text-[0.625rem] tracking-[0.32em] uppercase"
            >
              Runtime status
            </Badge>
            <div className="space-y-3">
              <h1 className="text-foreground text-4xl font-semibold tracking-tight">
                Deployment diagnostics
              </h1>
              <p className="text-muted-foreground max-w-xl text-sm">
                Live overview of upstream services wired into this instance. Use
                it to verify connections after environment changes.
              </p>
            </div>
            <dl className="text-muted-foreground grid gap-4 text-sm sm:grid-cols-2">
              <EnvironmentItem
                label="Deployment target"
                value={toTitleCase(environment.deploymentTarget)}
              />
              <EnvironmentItem
                label="Node environment"
                value={toTitleCase(environment.nodeEnv)}
              />
              <EnvironmentItem
                label="Database"
                value={getDatabaseLabel(
                  environment.databaseHost,
                  environment.databaseName,
                )}
              />
              <EnvironmentItem
                label="Cache"
                value={environment.redisProvider}
              />
            </dl>
          </div>
          <div className="flex justify-end lg:min-w-[160px]">
            <AuthControls />
          </div>
        </header>

        <section className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-foreground text-lg font-semibold">
              Connected services
            </h2>
            <p className="text-muted-foreground text-sm">
              Health checks run on each request so you can confirm the stack
              before shipping.
            </p>
          </div>
          <div className="space-y-4">
            {services.map((service) => (
              <Card key={service.name} className="bg-card/90 shadow-2xl">
                <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-base font-semibold">
                        {service.name}
                      </CardTitle>
                      <StatusBadge state={service.state} />
                    </div>
                    <CardDescription className="leading-relaxed">
                      {service.detail}
                    </CardDescription>
                    {service.error ? (
                      <p className="text-destructive text-sm font-medium">
                        {service.error}
                      </p>
                    ) : null}
                  </div>
                  <ServiceMeta
                    latency={formatLatency(service.latencyMs)}
                    target={service.target}
                  />
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

const EnvironmentItem = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <div className="border-border/50 bg-muted/10 rounded-xl border px-4 py-3 shadow-sm">
    <dt className="text-muted-foreground text-[0.625rem] font-semibold tracking-[0.32em] uppercase">
      {label}
    </dt>
    <dd className="text-foreground mt-1 text-sm font-semibold">{value}</dd>
  </div>
);

const StatusBadge = ({ state }: { state: ServiceStatus["state"] }) => (
  <Badge
    variant={stateVariants[state]}
    className="px-3 py-1 text-[0.625rem] font-semibold tracking-[0.26em] uppercase"
  >
    {stateLabels[state]}
  </Badge>
);

const ServiceMeta = ({
  latency,
  target,
}: {
  latency?: string;
  target?: string;
}) => {
  if (!latency && !target) return null;

  return (
    <dl className="text-muted-foreground flex flex-col gap-2 text-xs">
      {target ? (
        <div>
          <dt className="text-[0.625rem] font-semibold tracking-[0.32em] uppercase">
            Target
          </dt>
          <dd className="text-foreground mt-1 text-sm font-medium">{target}</dd>
        </div>
      ) : null}
      {latency ? (
        <div>
          <dt className="text-[0.625rem] font-semibold tracking-[0.32em] uppercase">
            Latency
          </dt>
          <dd className="text-foreground mt-1 text-sm font-medium">
            {latency}
          </dd>
        </div>
      ) : null}
    </dl>
  );
};
