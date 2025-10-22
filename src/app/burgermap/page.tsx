import { buildRoadmap } from "@/lib/roadmap-loader";
import { RoadmapFlow } from "@/components/roadmap-flow";

export default function Page() {
  const burgermap = buildRoadmap("burgermap");

  return (
    <>
      <main>
        <h1>test</h1>
      </main>
    </>
  );
}
