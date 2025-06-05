
"use client";

import type { MlOutputData } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, Clock, AlertTriangle, Presentation, Percent, ListChecks } from 'lucide-react';
import * as React from 'react';

interface MlPredictionOutputProps {
  isLoading: boolean;
  data: MlOutputData | null;
}

const MetricCard: React.FC<{ title: string; icon: React.ElementType; children: React.ReactNode }> = ({ title, icon: Icon, children }) => (
  <Card className="shadow-lg">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-5 w-5 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      {children}
    </CardContent>
  </Card>
);

export function MlPredictionOutput({ isLoading, data }: MlPredictionOutputProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="font-headline text-2xl font-semibold mb-4">ML Predictions</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-5 w-5 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-1/2 mb-2" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return null; // Or a placeholder message if no prediction has been run yet
  }

  // Helper to parse string lists (bullet points or numbered)
  const parseListString = (listString: string): string[] => {
    if (!listString) return [];
    return listString.split(/\n(?=\s*[-*]|\s*\d+\.\s*)/) // Split by newlines followed by list markers
      .map(item => item.trim().replace(/^[-*]|\d+\.\s*/, '').trim()) // Remove list markers
      .filter(item => item.length > 0);
  };

  const weakPointsList = parseListString(data.weakPoints as unknown as string); // AI returns string
  const powerpointOutlineList = parseListString(data.powerpointOutline);

  return (
    <div className="space-y-6">
      <h2 className="font-headline text-2xl font-semibold">ML Predictions</h2>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard title="Estimated Cost" icon={DollarSign}>
          <div className="text-2xl font-bold text-primary">{data.estimatedCost}</div>
        </MetricCard>

        <MetricCard title="Expected Duration" icon={Clock}>
          <div className="text-2xl font-bold">{data.expectedDuration}</div>
        </MetricCard>

        <MetricCard title="Win/Loss Probability" icon={Percent}>
          <div className="text-2xl font-bold text-accent">{data.winLossProbability}%</div>
          <Progress value={data.winLossProbability} className="h-2 mt-2 bg-accent/20 [&>div]:bg-accent" />
        </MetricCard>
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-lg font-medium">
              <AlertTriangle className="h-5 w-5 mr-2 text-destructive" /> Weak Points
            </CardTitle>
          </CardHeader>
          <CardContent>
            {weakPointsList.length > 0 ? (
              <ScrollArea className="h-48 custom-scrollbar pr-3">
                <ul className="space-y-2 list-disc list-inside pl-2 text-sm">
                  {weakPointsList.map((point, index) => (
                    <li key={index}>{point}</li>
                  ))}
                </ul>
              </ScrollArea>
            ) : (
              <p className="text-sm text-muted-foreground">No specific weak points identified or data not available.</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-lg font-medium">
              <ListChecks className="h-5 w-5 mr-2 text-primary" /> PowerPoint Outline
            </CardTitle>
          </CardHeader>
          <CardContent>
            {powerpointOutlineList.length > 0 ? (
            <ScrollArea className="h-48 custom-scrollbar pr-3">
              <ul className="space-y-2 list-disc list-inside pl-2 text-sm">
                {powerpointOutlineList.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </ScrollArea>
            ) : (
               <p className="text-sm text-muted-foreground">PowerPoint outline not available.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
