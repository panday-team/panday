import Link from "next/link";
import { Construction } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UnderConstructionProps {
    title: string;
    description?: string;
}

export function UnderConstruction({
    title,
    description = "This page is currently under construction. Check back soon!",
}: UnderConstructionProps) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800 p-4">
            <div className="flex flex-col items-center gap-8 text-center">
                <Construction className="h-24 w-24 text-yellow-500 animate-pulse" />

                <div className="flex flex-col gap-4">
                    <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
                        {title}
                    </h1>
                    <p className="text-slate-300 text-lg sm:text-xl max-w-2xl">
                        {description}
                    </p>
                </div>

                <Link href="/">
                    <Button
                        size="lg"
                        className="bg-orange-500 hover:bg-orange-400 text-white"
                    >
                        Back to Home
                    </Button>
                </Link>
            </div>
        </div>
    );
}
