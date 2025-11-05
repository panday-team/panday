"use client";

import { LEVEL_METADATA, type UserProfile } from "@/lib/profile-types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Home, Settings } from "lucide-react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";




interface ProfileCardProps {
  userProfile: UserProfile;
}

export function ProfileCard({ userProfile }: ProfileCardProps) {
    const { user } = useUser();
    const levelMeta = LEVEL_METADATA[userProfile.currentLevel];

  return (
    <Card className="bg-background/95 supports-[backdrop-filter]:bg-background/80 p-4 backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Badge
              variant="default"
              className="bg-teal-500/20 text-teal-700 ring-teal-500/30 dark:text-teal-300"
            >
              {levelMeta.shortLabel}
            </Badge>
            <span className="text-sm font-medium">
                Welcome{user?.firstName ? `, ${user.firstName}!` : " back!"}
            </span>
          </div>

          <p className="text-muted-foreground text-xs">
            {levelMeta.label}
          </p>

          {userProfile.specialization && (
            <p className="text-[11px] text-muted-foreground">
              Specialization:{" "}
              <span className="font-medium">
                {userProfile.specialization}
              </span>
            </p>
          )}
        </div>

        <div className="flex gap-1">
          <Link href="/">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Home className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/profile">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}
