import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import type { Dispatch, SetStateAction } from "react";

const TUTORIAL_STEPS = [
  {
    id: 420,
    title: "Pan",
    description: "Click and drag empty space to move around the roadmap.",
  },
  {
    id: 69,
    title: "Zoom",
    description:
      "Use CTRL + Scroll wheel on mouse and keyboard; Use a pinching motion with your fingers on trackpad",
  },
  {
    id: 67,
    title: "Select",
    description:
      "Click a node to open its details panel and update its status.",
  },
  {
    id: 41,
    title: "Chat",
    description:
      "Get more assistance on your current progress with our AI Chatbot in the bottom-right corner",
  },
];

export default function RoadmapTutorialWidget({
  setShowTutorial,
  showTutorial,
}: {
  setShowTutorial: Dispatch<SetStateAction<boolean>>;
  showTutorial: boolean;
}) {
  return (
    <>
      <AlertDialog open={showTutorial ? true : false}>
        <AlertDialogContent className="mx-50">
          <AlertDialogHeader className="text-center">
            <AlertDialogTitle className="text-2xl">
              Roadmap Tutorial
            </AlertDialogTitle>
            <AlertDialogDescription>
              3 simple controls to navigate your career!
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div id="instructions" className="flex flex-col gap-4 text-center">
            {TUTORIAL_STEPS.map((step) => (
              <Card key={step.id} className="">
                <CardHeader>
                  <CardTitle>{step.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{step.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
          <AlertDialogAction onClick={() => setShowTutorial(false)}>
            Let&apos;s Go!
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
