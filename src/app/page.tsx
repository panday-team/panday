import { AuthControls } from "@/components/AuthControls";
import {
  getSystemStatus,
  type ServiceStatus,
} from "@/server/status/systemStatus";

const stateStyles: Record<ServiceStatus["state"], string> = {
  ok: "bg-emerald-500/10 text-emerald-300 ring-emerald-500/40",
  warn: "bg-amber-500/10 text-amber-300 ring-amber-500/40",
  error: "bg-rose-500/20 text-rose-300 ring-rose-500/40",
};

const stateLabels: Record<ServiceStatus["state"], string> = {
  ok: "Connected",
  warn: "Check config",
  error: "Unavailable",
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
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-4xl flex-col gap-12 px-6 py-16">
        <header className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-5">
            <span className="inline-flex rounded-full border border-white/10 px-3 py-1 text-xs tracking-[0.2em] text-slate-400 uppercase">
              Runtime status
            </span>
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold text-white">
                Deployment diagnostics
              </h1>
              <p className="max-w-xl text-sm text-slate-300">
                Live overview of upstream services wired into this instance. Use
                it to verify connections after environment changes.
              </p>
            </div>
            <dl className="grid gap-4 text-sm text-slate-300 sm:grid-cols-2">
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
            <h2 className="text-lg font-semibold text-white">
              Connected services
            </h2>
            <p className="text-sm text-slate-400">
              Health checks run on each request so you can confirm the stack
              before shipping.
            </p>
          </div>
          <div className="space-y-4">
            {services.map((service) => (
              <article
                key={service.name}
                className="rounded-xl border border-white/10 bg-white/5 p-5 shadow-sm shadow-sky-500/10"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-semibold text-white">
                        {service.name}
                      </h3>
                      <StatusBadge state={service.state} />
                    </div>
                    <p className="text-sm text-slate-300">{service.detail}</p>
                    {service.error ? (
                      <p className="text-sm text-rose-300">{service.error}</p>
                    ) : null}
                  </div>
                  <ServiceMeta
                    latency={formatLatency(service.latencyMs)}
                    target={service.target}
                  />
                </div>
              </article>
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
  <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
    <dt className="text-xs tracking-widest text-slate-500 uppercase">
      {label}
    </dt>
    <dd className="mt-1 text-sm font-medium text-white">{value}</dd>
  </div>
);

const StatusBadge = ({ state }: { state: ServiceStatus["state"] }) => (
  <span
    className={`${stateStyles[state]} inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold tracking-widest uppercase ring-1`}
  >
    {stateLabels[state]}
  </span>
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
    <dl className="flex flex-col gap-2 text-xs text-slate-400">
      {target ? (
        <div>
          <dt className="tracking-widest uppercase">Target</dt>
          <dd className="mt-1 text-sm text-slate-200">{target}</dd>
        </div>
      ) : null}
      {latency ? (
        <div>
          <dt className="tracking-widest uppercase">Latency</dt>
          <dd className="mt-1 text-sm text-slate-200">{latency}</dd>
        </div>
      ) : null}
    </dl>
  );
};
